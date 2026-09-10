import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

export async function POST(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { courseId, title, type, contentUrl, contentText, summary, order } = await req.json();

    if (!courseId || !title) {
      return NextResponse.json({ error: "courseId and title are required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, trainerId: true, competencyBlockId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (auth.session.role !== "ADMIN") {
      if (course.trainerId !== auth.session.id) {
        return NextResponse.json(
          { error: "Forbidden. You can only add modules to your own authored courses." },
          { status: 403 }
        );
      }
      if (auth.session.assignedBlockId && course.competencyBlockId !== auth.session.assignedBlockId) {
        return NextResponse.json(
          { error: "Forbidden. You cannot add modules to courses outside your assigned subject." },
          { status: 403 }
        );
      }
    }

    const moduleRecord = await prisma.module.create({
      data: {
        courseId,
        title,
        type: type || "TEXT",
        contentUrl: contentUrl || null,
        contentText: contentText || null,
        summary: summary || null,
        order: typeof order === "number" ? order : 1,
      },
    });

    return NextResponse.json(moduleRecord);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { moduleId, title, type, contentUrl, contentText, summary, order } = await req.json();
    if (!moduleId) {
      return NextResponse.json({ error: "moduleId is required" }, { status: 400 });
    }

    const moduleRecord = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { trainerId: true, competencyBlockId: true } } },
    });

    if (!moduleRecord) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (auth.session.role !== "ADMIN") {
      if (moduleRecord.course.trainerId !== auth.session.id) {
        return NextResponse.json(
          { error: "Forbidden. You may only edit modules in your own courses." },
          { status: 403 }
        );
      }
      if (auth.session.assignedBlockId && moduleRecord.course.competencyBlockId !== auth.session.assignedBlockId) {
        return NextResponse.json(
          { error: "Forbidden. You cannot edit modules in courses outside your assigned subject." },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.module.update({
      where: { id: moduleId },
      data: {
        ...(title ? { title } : {}),
        ...(type ? { type } : {}),
        ...(contentUrl !== undefined ? { contentUrl } : {}),
        ...(contentText !== undefined ? { contentText } : {}),
        ...(summary !== undefined ? { summary } : {}),
        ...(typeof order === "number" ? { order } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    if (!moduleId) {
      return NextResponse.json({ error: "moduleId parameter is required" }, { status: 400 });
    }

    const moduleRecord = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { trainerId: true, competencyBlockId: true } } },
    });

    if (!moduleRecord) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (auth.session.role !== "ADMIN") {
      if (moduleRecord.course.trainerId !== auth.session.id) {
        return NextResponse.json(
          { error: "Forbidden. You may only delete modules from your own courses." },
          { status: 403 }
        );
      }
      if (auth.session.assignedBlockId && moduleRecord.course.competencyBlockId !== auth.session.assignedBlockId) {
        return NextResponse.json(
          { error: "Forbidden. You cannot delete modules in courses outside your assigned subject." },
          { status: 403 }
        );
      }
    }

    await prisma.module.delete({ where: { id: moduleId } });
    return NextResponse.json({ success: true, message: "Module deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
