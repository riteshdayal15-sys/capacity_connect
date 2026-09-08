import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const blocks = await prisma.competencyBlock.findMany({
      include: {
        courses: {
          include: {
            trainer: { select: { name: true, department: true } },
            modules: true,
          },
        },
      },
    });
    return NextResponse.json(blocks);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireApiAuth(["ADMIN"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { title, description, category } = await req.json();
    if (!title || !category) {
      return NextResponse.json({ error: "Title and Category required" }, { status: 400 });
    }
    const block = await prisma.competencyBlock.create({
      data: { title, description: description || "", category },
    });
    return NextResponse.json(block);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
