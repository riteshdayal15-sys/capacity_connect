import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth, ownsRecordOrAdmin, sanitizeCourseForRole, canTrainerManageCourse } from "@/lib/api-auth";

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const traineeId = searchParams.get("traineeId");

    // Trainees may only read their own enrollments.
    if (traineeId && !ownsRecordOrAdmin(auth.session, traineeId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (!traineeId && auth.session.role === "TRAINEE") {
      return NextResponse.json(
        { error: "traineeId is required." },
        { status: 400 }
      );
    }

    const where: any = {};
    if (traineeId) where.traineeId = traineeId;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        course: {
          include: {
            competencyBlock: true,
            modules: {
              include: {
                assessments: {
                  include: { questions: true, attempts: true },
                },
              },
            },
            certificates: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return NextResponse.json(sanitizeCourseForRole(enrollments, auth.session.role));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { courseId, traineeId } = await req.json();

    if (!courseId || !traineeId) {
      return NextResponse.json({ error: "courseId and traineeId are required" }, { status: 400 });
    }

    // Trainee can enroll themselves; Admin can enroll anyone;
    // Trainer can enroll trainees into courses they manage within their assigned subject.
    let isAuthorized = ownsRecordOrAdmin(auth.session, traineeId);

    const targetCourse = await prisma.course.findUnique({
      where: { id: courseId },
      include: { competencyBlock: true },
    });

    if (!targetCourse) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (!isAuthorized && auth.session.role === "TRAINER") {
      if (canTrainerManageCourse(auth.session, targetCourse)) {
        isAuthorized = true;
      } else {
        return NextResponse.json(
          { error: "Forbidden. You can only deliver and enroll trainees into courses you author within your assigned subject pathway." },
          { status: 403 }
        );
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: {
        courseId_traineeId: { courseId, traineeId },
      },
      update: {},
      create: {
        courseId,
        traineeId,
        status: "IN_PROGRESS",
        progressPercent: 0,
        completedModuleIds: "[]",
      },
    });

    return NextResponse.json(enrollment);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { enrollmentId, moduleId } = await req.json();

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: { modules: true },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    // Trainees may only update their own progress.
    if (!ownsRecordOrAdmin(auth.session, enrollment.traineeId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // The module must belong to the enrolled course — otherwise fabricated
    // IDs could inflate progress to 100% and mint bogus certificates.
    const validModuleIds = new Set(enrollment.course.modules.map((m) => m.id));
    if (!moduleId || !validModuleIds.has(moduleId)) {
      return NextResponse.json(
        { error: "moduleId does not belong to this course." },
        { status: 400 }
      );
    }

    // Verify whether the module has assessments and if trainee passed them
    const moduleWithAssessments = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        assessments: {
          include: {
            attempts: {
              where: { traineeId: enrollment.traineeId },
            },
          },
        },
      },
    });

    if (moduleWithAssessments && moduleWithAssessments.assessments.length > 0) {
      for (const assessment of moduleWithAssessments.assessments) {
        const hasPassed = assessment.attempts.some((att) => {
          const max = att.maxScore || 1;
          return (att.score / max) >= 0.6;
        });

        if (!hasPassed) {
          return NextResponse.json(
            { error: `Assessment "${assessment.title}" must be passed (minimum 60%) before completing this module.` },
            { status: 400 }
          );
        }
      }
    }

    let completedIds: string[] = [];
    try {
      completedIds = JSON.parse(enrollment.completedModuleIds || "[]");
    } catch (e) {
      completedIds = [];
    }

    if (!completedIds.includes(moduleId)) {
      completedIds.push(moduleId);
    }

    const totalModules = enrollment.course.modules.length;
    const rawPercent = totalModules > 0 ? Math.round((completedIds.length / totalModules) * 100) : 0;
    const progressPercent = Math.min(rawPercent, 100);
    const isCompleted = totalModules > 0 && progressPercent >= 100;

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        completedModuleIds: JSON.stringify(completedIds),
        progressPercent,
        status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
      },
    });

    if (isCompleted) {
      await prisma.certificate.upsert({
        where: {
          traineeId_courseId: {
            traineeId: enrollment.traineeId,
            courseId: enrollment.courseId,
          },
        },
        update: {},
        create: {
          traineeId: enrollment.traineeId,
          courseId: enrollment.courseId,
          certificateUrl: `/certificate/${enrollment.id}`,
          note: `Certified MoES Competency in ${enrollment.course.title}`,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
