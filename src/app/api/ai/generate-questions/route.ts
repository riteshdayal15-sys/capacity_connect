import { groqChat } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;

  // Rate limit: 10 requests per minute per trainer
  const limitCheck = checkRateLimit(`ai-generate:${auth.session.id}`, 10, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before generating more questions." },
      { status: 429 }
    );
  }

  try {
    const { moduleId, customText, topic } = await req.json();

    let moduleTitle = topic || "MoES Earth Science Module";
    let moduleText = customText || "";

    if (moduleId) {
      const moduleRecord = await prisma.module.findUnique({
        where: { id: moduleId },
        include: {
          course: {
            select: { trainerId: true },
          },
        },
      });

      if (!moduleRecord) {
        return NextResponse.json({ error: "Module not found" }, { status: 404 });
      }

      // Ensure trainer owns the module's course
      if (auth.session.role !== "ADMIN" && moduleRecord.course.trainerId !== auth.session.id) {
        return NextResponse.json(
          { error: "Forbidden. You can only generate assessment questions for your own authored courses." },
          { status: 403 }
        );
      }

      moduleTitle = moduleRecord.title;
      moduleText = moduleRecord.contentText || moduleRecord.summary || moduleRecord.title;
    }

    if (!moduleText || moduleText.trim().length === 0) {
      return NextResponse.json({ error: "No module content provided" }, { status: 400 });
    }

    const systemPrompt = `You are an instructional designer creating multiple-choice assessment questions for a professional training module. Questions must test genuine understanding, not trivia. Distractors must be plausible.`;

    const userPrompt = `Module topic: ${moduleTitle}
Module content: ${moduleText.slice(0, 4000)}

Generate 5 multiple-choice questions. Return ONLY valid JSON, no markdown, in this exact shape:
[{"question": "...", "options": ["...", "...", "...", "..."], "correctOptionIndex": 0}]`;

    const rawQuestions = await groqChat(systemPrompt, userPrompt, true);

    // Normalize and validate generated questions
    const questions = Array.isArray(rawQuestions)
      ? rawQuestions.map((q: any) => ({
          question: q.question || q.text || "Question",
          options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["True", "False"],
          correctOptionIndex:
            typeof q.correctOptionIndex === "number" && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3
              ? q.correctOptionIndex
              : 0,
        }))
      : [];

    return NextResponse.json({ questions });
  } catch (err: any) {
    console.error("AI question generator error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
