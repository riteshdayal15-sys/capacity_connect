import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth, sanitizeCourseForRole } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
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
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Only the course authoring trainer or an admin may view the full trainee roster
    if (auth.session.role === "TRAINER" && course.trainerId !== auth.session.id) {
      const { enrollments, ...safeCourse } = course;
      return NextResponse.json(sanitizeCourseForRole(safeCourse, auth.session.role));
    }

    return NextResponse.json(sanitizeCourseForRole(course, auth.session.role));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const { title, description } = await req.json();

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { id: true, trainerId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (auth.session.role !== "ADMIN" && course.trainerId !== auth.session.id) {
      return NextResponse.json(
        { error: "Forbidden. You may only edit your own authored courses." },
        { status: 403 }
      );
    }

    const updated = await prisma.course.update({
      where: { id: params.courseId },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
      },
    });

    return NextResponse.json({ success: true, course: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { id: true, trainerId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (auth.session.role !== "ADMIN" && course.trainerId !== auth.session.id) {
      return NextResponse.json(
        { error: "Forbidden. You may only delete your own authored courses." },
        { status: 403 }
      );
    }

    await prisma.course.delete({ where: { id: params.courseId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
