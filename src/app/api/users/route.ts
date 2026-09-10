import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireApiAuth, safeUserSelect } from "@/lib/api-auth";

// Only admins may list personnel. Called solely from /admin/users.
export async function GET() {
  const auth = await requireApiAuth(["ADMIN"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const users = await prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const ASSIGNABLE_ROLES = ["ADMIN", "TRAINER", "TRAINEE"] as const;

export async function POST(req: Request) {
  // Only admins may invite/onboard users (single or bulk CSV).
  const auth = await requireApiAuth(["ADMIN"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const body = await req.json();

    // Bulk CSV onboard support
    if (Array.isArray(body)) {
      const defaultPassword = await bcrypt.hash("password123", 10);
      const createdUsers = [];
      for (const item of body) {
        if (item.email && item.name) {
          const role = ASSIGNABLE_ROLES.includes(item.role) ? item.role : "TRAINEE";
          const user = await prisma.user.upsert({
            where: { email: item.email.toLowerCase().trim() },
            update: {
              name: item.name,
              department: item.department || "MoES",
              role,
            },
            create: {
              name: item.name,
              email: item.email.toLowerCase().trim(),
              passwordHash: defaultPassword,
              role,
              department: item.department || "MoES",
            },
            select: safeUserSelect,
          });
          createdUsers.push(user);
        }
      }
      return NextResponse.json({ count: createdUsers.length, users: createdUsers });
    }

    // Single user invite
    const { name, email, role, department, password } = body;
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const safeRole = ASSIGNABLE_ROLES.includes(role) ? role : "TRAINEE";
    const passwordHash = await bcrypt.hash(password || "password123", 10);
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {
        name,
        role: safeRole,
        department: department || "MoES General",
      },
      create: {
        name,
        email: email.toLowerCase().trim(),
        role: safeRole,
        department: department || "MoES General",
        passwordHash,
      },
      select: safeUserSelect,
    });

    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // Only admins may modify personnel roles/departments/specializations
  const auth = await requireApiAuth(["ADMIN"]);
  if ("unauthorized" in auth) return auth.unauthorized;
  try {
    const { userId, role, department, trainerStatus, assignedBlockId, specialization } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (role && !ASSIGNABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    let finalSpecialization = specialization;
    if (assignedBlockId) {
      const block = await prisma.competencyBlock.findUnique({
        where: { id: assignedBlockId },
        select: { title: true },
      });
      if (block) {
        finalSpecialization = block.title;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role ? { role } : {}),
        ...(department ? { department } : {}),
        ...(trainerStatus ? { trainerStatus } : {}),
        ...(assignedBlockId !== undefined ? { assignedBlockId: assignedBlockId || null } : {}),
        ...(finalSpecialization !== undefined ? { specialization: finalSpecialization || null } : {}),
      },
      select: safeUserSelect,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
