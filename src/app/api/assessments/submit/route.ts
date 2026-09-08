import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth, ownsRecordOrAdmin } from "@/lib/api-auth";

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { assessmentId, traineeId, userAnswers } = await req.json();

    if (!assessmentId || typeof assessmentId !== "string") {
      return NextResponse.json({ error: "Valid assessmentId is required." }, { status: 400 });
    }

    // Trainees may only submit as themselves.
    if (!traineeId || !ownsRecordOrAdmin(auth.session, traineeId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Limit to 5 attempts per assessment to protect certification integrity
    const priorAttempts = await prisma.assessmentAttempt.count({
      where: { assessmentId, traineeId },
    });
    if (priorAttempts >= 5) {
      return NextResponse.json(
        { error: "Maximum assessment attempts (5) reached for this module. Please contact your cadre instructor." },
        { status: 429 }
      );
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
        module: {
          include: { course: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Verify trainee is enrolled in this course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_traineeId: {
          courseId: assessment.module.courseId,
          traineeId,
        },
      },
      include: {
        course: {
          include: { modules: true },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "You must be enrolled in this course to take assessments." },
        { status: 403 }
      );
    }

    let score = 0;
    const maxScore = assessment.questions.length;
    const answersMap = userAnswers && typeof userAnswers === "object" ? userAnswers : {};

    assessment.questions.forEach((q) => {
      if (Number(answersMap[q.id]) === q.correctOptionIndex) {
        score += 1;
      }
    });

    const passed = maxScore > 0 ? score / maxScore >= 0.6 : true;

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        traineeId,
        score,
        maxScore,
      },
    });

    return NextResponse.json({
      score,
      maxScore,
      passed,
      attemptId: attempt.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
