import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Extract client IP or generic key for signup rate-limiting (5 signups per minute)
  const ip = req.headers.get("x-forwarded-for") || "signup-client";
  const limitCheck = checkRateLimit(`signup:${ip}`, 5, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const {
      name,
      email,
      password,
      department,
      applyTrainer,
      trainerRequestNote,
      assignedBlockId,
      specialization,
    } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid official email address." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in." },
        { status: 409 }
      );
    }

    // Hash the password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user in the database.
    // SECURITY: public self-registration can only ever create TRAINEES initially.
    // If applyTrainer is true, trainerStatus is set to PENDING for Admin review.
    // Also record their requested subject pathway (assignedBlockId and specialization).
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        department: department || "IMD New Delhi",
        role: "TRAINEE",
        trainerStatus: applyTrainer ? "PENDING" : "NONE",
        trainerRequestNote: applyTrainer && trainerRequestNote ? String(trainerRequestNote).trim().slice(0, 500) : null,
        assignedBlockId: applyTrainer && assignedBlockId ? String(assignedBlockId).trim() : null,
        specialization: applyTrainer && specialization ? String(specialization).trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        trainerStatus: true,
        trainerRequestNote: true,
        assignedBlockId: true,
        specialization: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, user, message: "Account created successfully." },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create account." },
      { status: 500 }
    );
  }
}
