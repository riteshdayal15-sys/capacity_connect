import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth, safeUserSelect } from "@/lib/api-auth";

// GET /api/trainer-requests: Trainee gets their status, Admin gets list of all pending requests
export async function GET() {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    if (auth.session.role === "ADMIN") {
      const pendingRequests = await prisma.user.findMany({
        where: {
          trainerStatus: "PENDING",
        },
        select: safeUserSelect,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(pendingRequests);
    }

    // Trainee views their own request status
    const me = await prisma.user.findUnique({
      where: { id: auth.session.id },
      select: {
        id: true,
        role: true,
        trainerStatus: true,
        trainerRequestNote: true,
      },
    });

    return NextResponse.json(me);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/trainer-requests: Trainee submits an application to become a trainer
export async function POST(req: Request) {
  const auth = await requireApiAuth(["TRAINEE"]);
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const { note } = await req.json();

    const updated = await prisma.user.update({
      where: { id: auth.session.id },
      data: {
        trainerStatus: "PENDING",
        trainerRequestNote: note ? String(note).trim().slice(0, 500) : "Trainee submitted trainer accreditation application.",
      },
      select: safeUserSelect,
    });

    return NextResponse.json({
      success: true,
      message: "Trainer application submitted to Ministry HRD Administrator for accreditation review.",
      user: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/trainer-requests: Admin approves or rejects a request
export async function PATCH(req: Request) {
  const auth = await requireApiAuth(["ADMIN"]);
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const { userId, action } = await req.json(); // action: "APPROVE" | "REJECT"

    if (!userId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "userId and valid action (APPROVE/REJECT) required" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: action === "APPROVE" ? "TRAINER" : "TRAINEE",
        trainerStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
      },
      select: safeUserSelect,
    });

    return NextResponse.json({
      success: true,
      action,
      user: updated,
      message: action === "APPROVE" ? "Officer accredited as TRAINER." : "Application declined.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
