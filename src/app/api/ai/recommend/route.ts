import { groqChat } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth, ownsRecordOrAdmin } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if ("unauthorized" in auth) return auth.unauthorized;

  const limitCheck = checkRateLimit(`ai-recommend:${auth.session.id}`, 15, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Too many recommendation requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const { traineeId } = await req.json();

    if (!traineeId || !ownsRecordOrAdmin(auth.session, traineeId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const trainee = await prisma.user.findUnique({
      where: { id: traineeId },
      include: {
        enrollments: {
          include: {
            course: true,
          },
        },
        attempts: {
          include: {
            assessment: true,
          },
        },
      },
    });

    if (!trainee) {
      return NextResponse.json({ error: "Trainee not found" }, { status: 404 });
    }

    const allBlocks = await prisma.competencyBlock.findMany();
    const completedBlockIds = new Set(
      trainee.enrollments
        .filter((e) => e.status === "COMPLETED")
        .map((e) => e.course.competencyBlockId)
    );

    const availableBlocks = allBlocks.filter((b) => !completedBlockIds.has(b.id));

    const systemPrompt = `You are a training advisor for Ministry of Earth Sciences field staff. You recommend the most useful next courses based on a trainee's progress and scores. Be concise and specific about why each recommendation matters for their role.`;

    const userPrompt = `Trainee profile:
- Department: ${trainee.department}
- Completed competency blocks: ${Array.from(completedBlockIds).join(", ") || "None yet"}
- Assessment scores: ${JSON.stringify(trainee.attempts.map((a) => ({ score: a.score, max: a.maxScore })))}
- Not-yet-completed competency blocks available: ${JSON.stringify(availableBlocks.map((b) => ({ id: b.id, title: b.title, category: b.category })))}

Recommend the top 2-3 competency blocks this trainee should take next.
Return ONLY valid JSON, no markdown, in this exact shape:
[{"competencyBlockId": "...", "reason": "one sentence, under 20 words"}]`;

    const recommendations = await groqChat(systemPrompt, userPrompt, true);

    return NextResponse.json({ recommendations });
  } catch (err: any) {
    console.error("AI recommend error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
