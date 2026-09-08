import { groqChat } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;

  // Rate limit: 15 questions per minute per user
  const limitCheck = checkRateLimit(`ai-ask:${auth.session.id}`, 15, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Too many questions submitted. Please wait a minute before asking again." },
      { status: 429 }
    );
  }

  try {
    const { courseId, moduleId, moduleTitle, question } = await req.json();

    if (!courseId || !question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing courseId or question" }, { status: 400 });
    }

    const cleanQuestion = question.trim().slice(0, 500);
    if (!cleanQuestion) {
      return NextResponse.json({ error: "Question cannot be empty" }, { status: 400 });
    }

    // Trainees must be enrolled in the course to use the course AI tutor
    if (auth.session.role === "TRAINEE") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          courseId_traineeId: {
            courseId,
            traineeId: auth.session.id,
          },
        },
      });

      if (!enrollment) {
        return NextResponse.json(
          { error: "You must be enrolled in this course to access the AI tutor." },
          { status: 403 }
        );
      }
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        competencyBlock: true,
        modules: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseText = course.modules
      .map(
        (m) =>
          `Module #${m.order || 1}: ${m.title} (${m.type})\n${m.contentText || m.summary || "No extended text provided."}`
      )
      .join("\n\n");

    const systemPrompt = `You are the Ministry of Earth Sciences (MoES) Digital Cadre AI Scientific Tutor.
Your mission is to guide trainees and scientific officers through course material, technical protocols, and domain concepts.
Ground your explanation in the provided course curriculum (${course.title}, domain: ${course.competencyBlock?.title || "MoES Scientific Cadre"}).
- If the question directly references module text, explain it clearly with relevant operational, physical, or field considerations.
- If the course or module is concise or brief, synthesize an authoritative, scientifically accurate answer consistent with the course topic and standard Earth science / meteorological / oceanographic principles.
- Only decline if the question is completely irrelevant to Earth sciences or this curriculum (e.g. pop culture, politics, unrelated software).
- Maintain an encouraging, precise, and professional tone suitable for a government scientific research officer.`;

    const userPrompt = `Course Title: ${course.title}
Course Overview: ${course.description || "Specialized training cadre"}
${course.competencyBlock ? `Domain Focus: ${course.competencyBlock.title} - ${course.competencyBlock.description}` : ""}
${moduleTitle ? `Current Module Active: ${moduleTitle}` : ""}

Curriculum Modules:
${courseText}

[TRAINEE INQUIRY]
${cleanQuestion}
[/TRAINEE INQUIRY]`;

    const answer = await groqChat(systemPrompt, userPrompt, false);

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("AI course ask error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
