import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

export async function POST(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { moduleId, title, questions } = await req.json();

    if (!moduleId || !title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const moduleRecord = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { trainerId: true } } },
    });

    if (!moduleRecord) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (auth.session.role !== "ADMIN" && moduleRecord.course.trainerId !== auth.session.id) {
      return NextResponse.json(
        { error: "Forbidden. You can only create assessments for your own course modules." },
        { status: 403 }
      );
    }

    const assessment = await prisma.assessment.create({
      data: {
        moduleId,
        title,
        questions: {
          create: questions.map((q: any) => {
            const rawIdx = typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0;
            const validIdx = Math.max(0, Math.min(3, rawIdx));
            const optionsArray = Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Option A", "Option B"];
            return {
              text: q.question || q.text || "Question",
              options: JSON.stringify(optionsArray),
              correctOptionIndex: validIdx,
            };
          }),
        },
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json(assessment);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json({ error: "assessmentId parameter is required" }, { status: 400 });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        module: {
          include: { course: { select: { trainerId: true } } },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (auth.session.role !== "ADMIN" && assessment.module.course.trainerId !== auth.session.id) {
      return NextResponse.json(
        { error: "Forbidden. You may only delete assessments from your own courses." },
        { status: 403 }
      );
    }

    await prisma.assessment.delete({ where: { id: assessmentId } });
    return NextResponse.json({ success: true, message: "Assessment deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
