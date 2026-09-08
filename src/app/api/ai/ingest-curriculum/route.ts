import { groqChat } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;

  // Rate limit: 6 document ingestion requests per minute per trainer
  const limitCheck = checkRateLimit(`ai-ingest:${auth.session.id}`, 6, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit reached for AI curriculum generation. Please wait 1 minute." },
      { status: 429 }
    );
  }

  try {
    const { documentText, documentTitle, competencyBlockId } = await req.json();

    if (!documentText || typeof documentText !== "string" || documentText.trim().length < 50) {
      return NextResponse.json(
        { error: "Please provide substantial document text (minimum 50 characters) to analyze." },
        { status: 400 }
      );
    }

    let blockContext = "";
    if (competencyBlockId) {
      const block = await prisma.competencyBlock.findUnique({
        where: { id: competencyBlockId },
        select: { title: true, category: true },
      });
      if (block) {
        blockContext = `Target Competency Discipline: ${block.title} (${block.category})`;
      }
    }

    const cleanInput = documentText.trim().slice(0, 15000);

    const systemPrompt = `You are a senior Earth Sciences curriculum designer & psychometrician for the Ministry of Earth Sciences (MoES), Government of India.
Your mission is to ingest raw scientific documentation, SOPs, cruise reports, instrument manuals, or policy papers, and synthesize an operational training curriculum and a calibrated competency assessment.

Output strictly valid JSON with this exact JSON schema:
{
  "title": "A concise, professional course title",
  "description": "2-3 sentences explaining learning objectives, practical competencies, and operational importance.",
  "suggestedSummary": "Executive overview of the protocol",
  "modules": [
    {
      "title": "Module 1: Title (e.g., Pre-Deployment Protocols & Staging)",
      "type": "TEXT",
      "contentText": "Detailed instructional text (3-4 paragraphs), covering operational specifications, checklists, steps, and safety warnings.",
      "summary": "3-4 concise bullet points summarizing critical takeaways.",
      "order": 1
    },
    {
      "title": "Module 2: Title (e.g., Data Acquisition & Telemetry Validation)",
      "type": "TEXT",
      "contentText": "Detailed instructional text (3-4 paragraphs), covering execution, calibration verification, and error handling.",
      "summary": "3-4 concise bullet points summarizing critical takeaways.",
      "order": 2
    }
  ],
  "assessment": {
    "title": "Calibrated Competency Assessment",
    "questions": [
      {
        "question": "Clear, technically rigorous scenario question testing comprehension",
        "options": [
          "Option A (correct or plausible distractor)",
          "Option B (correct or plausible distractor)",
          "Option C (correct or plausible distractor)",
          "Option D (correct or plausible distractor)"
        ],
        "correctOptionIndex": 0
      }
    ]
  }
}
Generate between 2 to 4 modules based on document depth, and exactly 10 comprehensive multiple-choice questions covering all critical aspects of the document. All options must be technically sound. Do not output markdown code blocks.`;

    const userPrompt = `Document Reference Title: ${documentTitle || "Unspecified MoES Technical Document"}
${blockContext}

Source Document Text:
${cleanInput}

Analyze the documentation above, extract core competencies, and generate the full curriculum package JSON with exactly 10 calibrated assessment questions.`;

    const result = await groqChat<any>(systemPrompt, userPrompt, true, { maxTokens: 3500 });

    if (!result || typeof result !== "object" || !Array.isArray(result.modules)) {
      throw new Error("Failed to parse synthesized curriculum package.");
    }

    // Sanitize and validate modules
    const validatedModules = result.modules.map((m: any, idx: number) => ({
      title: m.title || `Module ${idx + 1}`,
      type: m.type || "TEXT",
      contentText: m.contentText || m.content || "Instructional content pending field review.",
      summary: m.summary || null,
      order: typeof m.order === "number" ? m.order : idx + 1,
    }));

    // Sanitize and validate assessment questions
    let validatedAssessment = null;
    if (result.assessment && Array.isArray(result.assessment.questions)) {
      const sanitizedQuestions = result.assessment.questions.map((q: any) => {
        const rawOpts = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Option A", "Option B", "Option C", "Option D"];
        const rawIdx = typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0;
        const validIdx = Math.max(0, Math.min(rawOpts.length - 1, rawIdx));
        return {
          question: q.question || q.text || "Assessment question",
          options: rawOpts,
          correctOptionIndex: validIdx,
        };
      });

      validatedAssessment = {
        title: result.assessment.title || "Calibrated Competency Assessment",
        questions: sanitizedQuestions,
      };
    }

    return NextResponse.json({
      success: true,
      curriculum: {
        title: result.title || documentTitle || "MoES Synthesized Curriculum",
        description: result.description || "Operational curriculum ingested from scientific documentation.",
        suggestedSummary: result.suggestedSummary || null,
        modules: validatedModules,
        assessment: validatedAssessment,
      },
    });
  } catch (err: any) {
    console.error("Curriculum ingestion error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process document into curriculum." },
      { status: 500 }
    );
  }
}
