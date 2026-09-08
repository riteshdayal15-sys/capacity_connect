import fs from "fs";
import path from "path";

// Manually parse .env without external dotenv dependency
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { groqChat } from "../src/lib/groq";

async function testGroq() {
  console.log("=== Testing Groq API Key ===");
  console.log("GROQ_API_KEY detected:", process.env.GROQ_API_KEY?.substring(0, 10) + "...");

  console.log("\n[1] Testing Natural Language Chat (Model: llama-3.3-70b-versatile)...");
  const insight = await groqChat(
    "You are a scientific training advisor for the Ministry of Earth Sciences.",
    "Give a 2-sentence actionable recommendation for IMD meteorologists learning radar calibration.",
    false
  );
  console.log("Result:\n" + insight);

  console.log("\n[2] Testing JSON Mode Completion...");
  const questions = await groqChat(
    "You are an instructional designer. Return ONLY valid JSON.",
    'Generate 1 multiple-choice question on CTD ocean sensors. Return in this shape: [{"question": "...", "options": ["...", "...", "...", "..."], "correctOptionIndex": 0}]',
    true
  );
  console.log("JSON Result:\n", JSON.stringify(questions, null, 2));

  console.log("\n>>> SUCCESS: Groq API Key is 100% active and working with llama-3.3-70b-versatile! <<<");
}

testGroq().catch(console.error);
