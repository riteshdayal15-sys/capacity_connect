import { groqChat } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;

  const limitCheck = checkRateLimit(`ai-summarize:${auth.session.id}`, 15, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Too many summarize requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const { moduleId, text } = await req.json();

    let moduleText = text || "";
    let moduleRecord = null;

    if (moduleId) {
      moduleRecord = await prisma.module.findUnique({
        where: { id: moduleId },
        include: { course: { select: { trainerId: true } } },
      });
      if (moduleRecord && !moduleText) {
        moduleText = moduleRecord.contentText || moduleRecord.title;
      }
    }

    if (!moduleText || moduleText.trim().length === 0) {
      return NextResponse.json({ error: "No module content to summarize" }, { status: 400 });
    }

    const systemPrompt = `You summarize training material into short, scannable key takeaways for busy field staff who may be reading on a low-bandwidth or offline device.`;

    const userPrompt = `Module content: ${moduleText}

Summarize this into 3-5 bullet points, each under 15 words. Return ONLY valid JSON: {"bullets": ["...", "...", "..."]}`;

    const summaryResult: any = await groqChat(systemPrompt, userPrompt, true);
    const bullets = summaryResult?.bullets || [];
    const formattedSummary = Array.isArray(bullets)
      ? bullets.map((b: string) => `- ${b}`).join("\n")
      : "";

    // Only instructors who own the course or admins can persist the summary to the database
    const canPersist =
      auth.session.role === "ADMIN" ||
      (moduleRecord && (moduleRecord as any).course?.trainerId === auth.session.id);

    if (moduleId && moduleRecord && formattedSummary && canPersist) {
      await prisma.module.update({
        where: { id: moduleId },
        data: { summary: formattedSummary },
      });
    }

    return NextResponse.json({ bullets, summary: formattedSummary });
  } catch (err: any) {
    console.error("AI summarize error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
