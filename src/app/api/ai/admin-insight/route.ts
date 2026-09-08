import { groqChat } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const auth = await requireApiAuth(["ADMIN"]);
  if ("unauthorized" in auth) return auth.unauthorized;

  const limitCheck = checkRateLimit(`ai-admin:${auth.session.id}`, 20, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Too many admin insights requested. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    // Pull real data from the analytics API logic inline
    const enrollments = await prisma.enrollment.findMany({
      include: { trainee: { select: { department: true } } },
    });

    const deptMap: Record<string, { total: number; completed: number }> = {};
    for (const enr of enrollments) {
      const dept = enr.trainee.department || "Other";
      if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0 };
      deptMap[dept].total += 1;
      if (enr.status === "COMPLETED") deptMap[dept].completed += 1;
    }

    const completionByDept = Object.entries(deptMap).map(([dept, d]) => ({
      department: dept,
      rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    }));

    // Real module drop-off from DB
    const modules = await prisma.module.findMany({
      include: { course: { include: { enrollments: true } } },
    });

    const moduleDropOff = modules.map((m) => {
      const totalEnrolled = m.course.enrollments.length;
      if (totalEnrolled === 0) return null;
      const completed = m.course.enrollments.filter((e) => {
        try { return JSON.parse(e.completedModuleIds || "[]").includes(m.id); }
        catch { return false; }
      }).length;
      return {
        module: m.title,
        dropOffRate: `${Math.round(((totalEnrolled - completed) / totalEnrolled) * 100)}%`,
      };
    }).filter(Boolean).slice(0, 5);

    // Real avg scores per competency block
    const blockAttempts = await prisma.assessmentAttempt.findMany({
      include: {
        assessment: {
          include: {
            module: { include: { course: { include: { competencyBlock: { select: { title: true } } } } } },
          },
        },
      },
    });

    const blockScoreMap: Record<string, { total: number; max: number }> = {};
    for (const a of blockAttempts) {
      const title = a.assessment.module.course.competencyBlock.title;
      if (!blockScoreMap[title]) blockScoreMap[title] = { total: 0, max: 0 };
      blockScoreMap[title].total += a.score;
      blockScoreMap[title].max += a.maxScore;
    }

    const avgScoresByBlock = Object.entries(blockScoreMap).map(([block, d]) => ({
      block,
      avgScore: d.max > 0 ? `${Math.round((d.total / d.max) * 100)}%` : "N/A",
    }));

    const systemPrompt = `You are a data analyst producing a short, plain-English insight for a training administrator. Focus on the single most actionable pattern, not a generic recap of the numbers.`;

    const userPrompt = `Department completion rates: ${JSON.stringify(completionByDept)}
Module drop-off points: ${JSON.stringify(moduleDropOff.length ? moduleDropOff : [{ module: "No modules with drop-off data yet", dropOffRate: "N/A" }])}
Average assessment scores by competency block: ${JSON.stringify(avgScoresByBlock.length ? avgScoresByBlock : [{ block: "No assessment data yet", avgScore: "N/A" }])}

Write a 3-4 sentence insight highlighting the most important pattern and one concrete suggested action.`;

    const insight = await groqChat(systemPrompt, userPrompt, false);

    return NextResponse.json({ insight, completionByDept });
  } catch (err: any) {
    console.error("AI admin insight error:", err);
    return NextResponse.json({
      insight: "Data is being collected. Run more trainee enrollments and assessments to generate AI insights.",
      completionByDept: [],
    });
  }
}
