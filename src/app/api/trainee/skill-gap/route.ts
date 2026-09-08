import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth, ownsRecordOrAdmin } from "@/lib/api-auth";

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const traineeId = searchParams.get("traineeId") || auth.session.id;

    if (!ownsRecordOrAdmin(auth.session, traineeId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const [trainee, allBlocks, attempts, enrollments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: traineeId },
        select: { id: true, name: true, department: true, role: true },
      }),
      prisma.competencyBlock.findMany({
        include: {
          courses: {
            include: {
              modules: {
                include: { assessments: { include: { questions: true } } },
              },
            },
          },
        },
      }),
      prisma.assessmentAttempt.findMany({
        where: { traineeId },
        include: {
          assessment: {
            include: {
              module: {
                include: {
                  course: {
                    include: { competencyBlock: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.enrollment.findMany({
        where: { traineeId },
        include: {
          course: {
            include: { competencyBlock: true },
          },
        },
      }),
    ]);

    if (!trainee) {
      return NextResponse.json({ error: "Trainee not found" }, { status: 404 });
    }

    // Map competency blocks with mastery score and gap status
    const competencyAnalysis = allBlocks.map((block) => {
      // Find attempts matching this competency block
      const blockAttempts = attempts.filter(
        (a) => a.assessment.module.course.competencyBlockId === block.id
      );

      const blockEnrollments = enrollments.filter(
        (e) => e.course.competencyBlockId === block.id
      );

      const isEnrolled = blockEnrollments.length > 0;
      const isCompleted = blockEnrollments.some((e) => e.status === "COMPLETED");

      let averageScore = 0;
      let totalPoints = 0;
      let maxPoints = 0;

      if (blockAttempts.length > 0) {
        // Group by assessment to take best attempt
        const bestScores: Record<string, { score: number; max: number }> = {};
        blockAttempts.forEach((att) => {
          const aId = att.assessmentId;
          if (!bestScores[aId] || att.score > bestScores[aId].score) {
            bestScores[aId] = { score: att.score, max: att.maxScore };
          }
        });

        Object.values(bestScores).forEach((b) => {
          totalPoints += b.score;
          maxPoints += b.max;
        });

        averageScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
      }

      // Classification: MASTERED (>=80%), COMPETENT (60-79%), NEEDS_IMPROVEMENT (<60% with attempts), UNTESTED (no attempts)
      let status: "MASTERED" | "COMPETENT" | "NEEDS_IMPROVEMENT" | "UNTESTED" = "UNTESTED";
      let gapLevel: "NONE" | "MODERATE" | "CRITICAL" = "CRITICAL";

      if (blockAttempts.length > 0) {
        if (averageScore >= 80) {
          status = "MASTERED";
          gapLevel = "NONE";
        } else if (averageScore >= 60) {
          status = "COMPETENT";
          gapLevel = "MODERATE";
        } else {
          status = "NEEDS_IMPROVEMENT";
          gapLevel = "CRITICAL";
        }
      } else if (isCompleted) {
        status = "COMPETENT";
        gapLevel = "NONE";
        averageScore = 75;
      } else if (isEnrolled) {
        status = "UNTESTED";
        gapLevel = "MODERATE";
      }

      // Targeted practical suggestion based on status
      let suggestion = "";
      if (status === "NEEDS_IMPROVEMENT") {
        suggestion = `Assessment accuracy in ${block.title} is below 60%. Review module technical manuals and retake the evaluation.`;
      } else if (status === "UNTESTED" && isEnrolled) {
        suggestion = `Course underway. Complete the remaining reading and take the calibrated competency assessment.`;
      } else if (status === "UNTESTED" && !isEnrolled) {
        suggestion = `Critical cadre requirement. Enroll in ${block.title} to bridge foundational skills for ${trainee.department || "MoES"}.`;
      } else if (status === "COMPETENT") {
        suggestion = `Solid baseline (${averageScore}%). Consider advanced SOP modules to reach full master certification.`;
      } else {
        suggestion = `Mastered (${averageScore}%). Ready to mentor peer trainees in this discipline.`;
      }

      return {
        blockId: block.id,
        title: block.title,
        category: block.category,
        status,
        gapLevel,
        masteryScore: averageScore,
        attemptsCount: blockAttempts.length,
        isEnrolled,
        isCompleted,
        courseId: block.courses[0]?.id || null,
        suggestion,
      };
    });

    // Identify gaps
    const criticalGaps = competencyAnalysis.filter(
      (c) => c.gapLevel === "CRITICAL" || c.status === "NEEDS_IMPROVEMENT"
    );
    const moderateGaps = competencyAnalysis.filter((c) => c.gapLevel === "MODERATE");
    const masteredSkills = competencyAnalysis.filter((c) => c.status === "MASTERED");

    // Compute overall Cadre Readiness index (0 - 100)
    const overallReadiness =
      competencyAnalysis.length > 0
        ? Math.round(
            competencyAnalysis.reduce((acc, c) => acc + c.masteryScore, 0) /
              competencyAnalysis.length
          )
        : 0;

    return NextResponse.json({
      trainee: {
        id: trainee.id,
        name: trainee.name,
        department: trainee.department,
      },
      overallReadiness,
      competencies: competencyAnalysis,
      summary: {
        totalCompetencies: competencyAnalysis.length,
        masteredCount: masteredSkills.length,
        criticalGapsCount: criticalGaps.length,
        moderateGapsCount: moderateGaps.length,
      },
      criticalGaps,
      moderateGaps,
      masteredSkills,
    });
  } catch (err: any) {
    console.error("Skill gap analysis error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to analyze skill gaps." },
      { status: 500 }
    );
  }
}
