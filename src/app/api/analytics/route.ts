import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiAuth(["ADMIN"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    // 1. Real completion rates by department from actual Enrollment + User tables
    const enrollments = await prisma.enrollment.findMany({
      include: {
        trainee: { select: { department: true } },
      },
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
      total: d.total,
      completed: d.completed,
    }));

    // 2. Real monthly enrollment growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const allEnrollments = await prisma.enrollment.findMany({
      where: { enrolledAt: { gte: sixMonthsAgo } },
      select: { enrolledAt: true },
      orderBy: { enrolledAt: "asc" },
    });

    const monthlyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    }
    for (const enr of allEnrollments) {
      const d = new Date(enr.enrolledAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyMap) monthlyMap[key]++;
    }

    const monthLabels = Object.keys(monthlyMap).map((k) => {
      const [y, m] = k.split("-");
      return new Date(parseInt(y), parseInt(m) - 1).toLocaleString("en-IN", { month: "short" });
    });
    const monthCounts = Object.values(monthlyMap);

    // 3. Real skill-gap matrix: avg assessment scores per department per competency block
    const attempts = await prisma.assessmentAttempt.findMany({
      include: {
        trainee: { select: { department: true } },
        assessment: {
          include: {
            module: {
              include: {
                course: {
                  include: { competencyBlock: { select: { title: true, category: true } } },
                },
              },
            },
          },
        },
      },
    });

    const skillMap: Record<string, Record<string, { totalScore: number; maxScore: number; count: number }>> = {};
    for (const attempt of attempts) {
      const dept = attempt.trainee.department || "Other";
      const block = attempt.assessment.module.course.competencyBlock.title;
      if (!skillMap[dept]) skillMap[dept] = {};
      if (!skillMap[dept][block]) skillMap[dept][block] = { totalScore: 0, maxScore: 0, count: 0 };
      skillMap[dept][block].totalScore += attempt.score;
      skillMap[dept][block].maxScore += attempt.maxScore;
      skillMap[dept][block].count += 1;
    }

    const skillGapMatrix = Object.entries(skillMap).map(([dept, blocks]) => ({
      department: dept,
      scores: Object.fromEntries(
        Object.entries(blocks).map(([block, data]) => [
          block,
          data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0,
        ])
      ),
    }));

    // 4. Real module drop-off: modules with low completion ratios
    const modules = await prisma.module.findMany({
      include: { course: { include: { enrollments: true } } },
    });

    const moduleDropOff = modules.map((m) => {
      const totalEnrolled = m.course.enrollments.length;
      if (totalEnrolled === 0) return null;
      const completed = m.course.enrollments.filter((e) => {
        try {
          return JSON.parse(e.completedModuleIds || "[]").includes(m.id);
        } catch {
          return false;
        }
      }).length;
      const dropOffRate = Math.round(((totalEnrolled - completed) / totalEnrolled) * 100);
      return { module: m.title, dropOffRate: `${dropOffRate}%`, completed, totalEnrolled };
    }).filter(Boolean).sort((a: any, b: any) => parseInt(b.dropOffRate) - parseInt(a.dropOffRate));

    // 5. Real avg assessment scores per competency block
    const blockAttempts = await prisma.assessmentAttempt.findMany({
      include: {
        assessment: {
          include: {
            module: {
              include: {
                course: {
                  include: { competencyBlock: { select: { title: true } } },
                },
              },
            },
          },
        },
      },
    });

    const blockScoreMap: Record<string, { total: number; max: number }> = {};
    for (const a of blockAttempts) {
      const blockTitle = a.assessment.module.course.competencyBlock.title;
      if (!blockScoreMap[blockTitle]) blockScoreMap[blockTitle] = { total: 0, max: 0 };
      blockScoreMap[blockTitle].total += a.score;
      blockScoreMap[blockTitle].max += a.maxScore;
    }

    const avgScoresByBlock = Object.entries(blockScoreMap).map(([block, d]) => ({
      block,
      avgScore: d.max > 0 ? `${Math.round((d.total / d.max) * 100)}%` : "N/A",
    }));

    // 6. Competency block real completion rates for admin dashboard mini cards
    const allBlocks = await prisma.competencyBlock.findMany({
      include: {
        courses: {
          include: { enrollments: true },
        },
      },
    });

    const blockCompletionRates = allBlocks.map((block) => {
      let total = 0;
      let completed = 0;
      for (const course of block.courses) {
        total += course.enrollments.length;
        completed += course.enrollments.filter((e) => e.status === "COMPLETED").length;
      }
      return {
        id: block.id,
        title: block.title,
        category: block.category,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalEnrollments: total,
      };
    });

    return NextResponse.json({
      completionByDept,
      monthlyEnrollment: { labels: monthLabels, counts: monthCounts },
      skillGapMatrix,
      moduleDropOff: moduleDropOff.slice(0, 5),
      avgScoresByBlock,
      blockCompletionRates,
    });
  } catch (err: any) {
    console.error("Analytics API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
