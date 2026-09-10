import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth, validateTrainerSubjectAccess } from "@/lib/api-auth";

export async function POST(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const { competencyBlockId, title, description, modules, assessment } = await req.json();

    if (!competencyBlockId || !title || !Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields (competencyBlockId, title, and at least 1 module)." },
        { status: 400 }
      );
    }

    // Enforce subject-specific RBAC: trainers can only publish courses in their assigned pathway
    const subjectCheck = validateTrainerSubjectAccess(auth.session, competencyBlockId);
    if (!subjectCheck.allowed) {
      return NextResponse.json({ error: subjectCheck.reason }, { status: 403 });
    }

    const trainerId = auth.session.id;

    // Use Prisma transaction to atomically create the whole curriculum package
    const createdCourse = await prisma.$transaction(async (tx) => {
      // 1. Create Course
      const course = await tx.course.create({
        data: {
          title: title.trim(),
          description: description || "Operational curriculum ingested from scientific documentation.",
          competencyBlockId,
          trainerId,
        },
      });

      // 2. Create Modules
      const createdModules = [];
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        const mRecord = await tx.module.create({
          data: {
            courseId: course.id,
            title: mod.title || `Module ${i + 1}`,
            type: mod.type || "TEXT",
            contentUrl: mod.contentUrl || null,
            contentText: mod.contentText || null,
            summary: mod.summary || null,
            order: typeof mod.order === "number" ? mod.order : i + 1,
          },
        });
        createdModules.push(mRecord);
      }

      // 3. Create Assessment attached to the last module if provided
      if (
        assessment &&
        assessment.questions &&
        Array.isArray(assessment.questions) &&
        assessment.questions.length > 0 &&
        createdModules.length > 0
      ) {
        const targetModule = createdModules[createdModules.length - 1];
        await tx.assessment.create({
          data: {
            moduleId: targetModule.id,
            title: assessment.title || "Calibrated Competency Assessment",
            questions: {
              create: assessment.questions.map((q: any) => {
                const rawIdx = typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0;
                const validIdx = Math.max(0, Math.min(3, rawIdx));
                const optionsArray = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Option A", "Option B"];
                return {
                  text: q.question || q.text || "Question prompt",
                  options: JSON.stringify(optionsArray),
                  correctOptionIndex: validIdx,
                };
              }),
            },
          },
        });
      }

      return course;
    });

    return NextResponse.json({
      success: true,
      courseId: createdCourse.id,
      message: "Curriculum and competency assessment published successfully.",
    });
  } catch (err: any) {
    console.error("Failed to publish ingested curriculum:", err);
    return NextResponse.json(
      { error: err.message || "Failed to publish curriculum package." },
      { status: 500 }
    );
  }
}
