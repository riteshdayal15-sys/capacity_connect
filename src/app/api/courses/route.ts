import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth, sanitizeCourseForRole, validateTrainerSubjectAccess } from "@/lib/api-auth";

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get("trainerId");

    const where: any = {};
    if (trainerId) {
      where.trainerId = trainerId;
    }

    // For trainers, restrict to their own courses in their assigned specialization subject
    if (auth.session.role === "TRAINER") {
      where.trainerId = auth.session.id;
      if (auth.session.assignedBlockId) {
        where.competencyBlockId = auth.session.assignedBlockId;
      }
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        competencyBlock: true,
        trainer: { select: { id: true, name: true, email: true, department: true } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            assessments: {
              include: { questions: true },
            },
          },
        },
        enrollments: {
          include: {
            trainee: { select: { id: true, name: true, email: true, department: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sanitizeCourseForRole(courses, auth.session.role));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { title, description, competencyBlockId, trainerId } = await req.json();
    const effectiveTrainerId = auth.session.role === "ADMIN" && trainerId ? trainerId : auth.session.id;

    if (!title || !competencyBlockId || !effectiveTrainerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Enforce subject-specific RBAC: trainers can only create courses in their assigned pathway
    const subjectCheck = validateTrainerSubjectAccess(auth.session, competencyBlockId);
    if (!subjectCheck.allowed) {
      return NextResponse.json({ error: subjectCheck.reason }, { status: 403 });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description: description || "",
        competencyBlockId,
        trainerId: effectiveTrainerId,
      },
    });

    return NextResponse.json(course);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
