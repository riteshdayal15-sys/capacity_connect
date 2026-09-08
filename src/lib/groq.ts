/**
 * Centralized Groq API helper for Ministry of Earth Sciences LMS (Capacity Connect)
 * Default model is openai/gpt-oss-20b: verified live against this API key
 * (fast ~1000 tok/s inference, free quota 30 RPM / 8K TPM / 1K RPD).
 * Override per-deploy with GROQ_MODEL in .env.
 * Includes instant failover across GROQ_API_KEY / GROQ_API_KEY_BACKUP on
 * 429/401, graceful timeout, error-fallback, and JSON parsing.
 */

export async function groqChat<T = any>(
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean = false,
  options?: { maxTokens?: number; temperature?: number }
): Promise<T | string> {
  // Primary + backup keys: on 429/401 we fail over to the next key instantly
  // instead of waiting out the rate-limit window.
  const apiKeys = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_BACKUP]
    .filter((k): k is string => !!k && k.trim() !== "")
    .map((k) => k.trim());

  if (apiKeys.length === 0) {
    console.warn("GROQ_API_KEY is not set. Returning fallback data.");
    if (jsonMode) {
      return getFallbackJson(systemPrompt, userPrompt) as T;
    }
    return "AI insights and assistance are currently unavailable. (GROQ_API_KEY is not configured)";
  }

  // Free-tier friendly default, verified live against this API key.
  // Override per-deploy with GROQ_MODEL in .env
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const makeBody = () => {
    const body: any = {
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1024,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }
    return body;
  };

  // Try each key in order; fail over instantly on 429/401, then fall back gracefully
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second cap for snappy UX

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(makeBody()),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if ((res.status === 429 || res.status === 401) && keyIndex < apiKeys.length - 1) {
        console.warn(
          `Groq key ${keyIndex + 1} got ${res.status}, failing over to backup key...`
        );
        await res.text().catch(() => {});
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Groq API error ${res.status}:`, errText);
        throw new Error(`Groq API returned ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "";

      if (jsonMode) {
        try {
          // Strip any markdown fences if present
          const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
          return JSON.parse(cleaned) as T;
        } catch (parseErr) {
          console.warn("Failed to parse Groq response as JSON:", content);
          return getFallbackJson(systemPrompt, userPrompt) as T;
        }
      }

      return content;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn("Groq request failed or timed out:", err.message);
      if (jsonMode) {
        return getFallbackJson(systemPrompt, userPrompt) as T;
      }
      return "AI insight is currently unavailable right now. Please check back later.";
    }
  }

  // Unreachable in practice (loop always returns), kept for type safety
  if (jsonMode) {
    return getFallbackJson(systemPrompt, userPrompt) as T;
  }
  return "AI insight is currently unavailable right now. Please check back later.";
}

function getFallbackJson(systemPrompt: string, userPrompt: string): any {
  if (systemPrompt.includes("training advisor") || userPrompt.includes("Recommend the top")) {
    return [
      {
        competencyBlockId: "default",
        reason: "Recommended to strengthen foundational Earth science data acquisition skills.",
      },
    ];
  }
  if (systemPrompt.includes("instructional designer") || userPrompt.includes("Generate 5 multiple-choice")) {
    return [
      {
        question: "What is the primary objective of oceanographic data buoys?",
        options: [
          "Real-time meteorological and surface ocean observation",
          "Underwater seismic mining",
          "Satellite signal jamming",
          "Commercial fishing routing",
        ],
        correctOptionIndex: 0,
      },
      {
        question: "Which calibration frequency is standard for precision CTD sensors?",
        options: ["Every 6 to 12 months", "Once every 10 years", "Only when broken", "Daily at midnight"],
        correctOptionIndex: 0,
      },
      {
        question: "Why is metadata provenance essential in MoES observational archives?",
        options: [
          "To guarantee reproducibility and sensor tracking across decades",
          "To increase file sizes",
          "To satisfy formatting aesthetics",
          "To restrict public access",
        ],
        correctOptionIndex: 0,
      },
    ];
  }
  if (systemPrompt.includes("summarize") || userPrompt.includes("bullets")) {
    return {
      bullets: [
        "Comprehensive overview of field protocols and instrumentation.",
        "Essential safety checklists for harsh maritime and arctic operations.",
        "Data validation procedures prior to central repository sync.",
      ],
    };
  }
  if (systemPrompt.includes("curriculum designer") || userPrompt.includes("SOP or technical documentation")) {
    return {
      title: "MoES Operational Scientific Protocol & Calibration Framework",
      description: "Comprehensive curriculum synthesized from official standard operating procedure documentation covering equipment setup, telemetry verification, and calibrated field deployments.",
      modules: [
        {
          title: "Standard Operational Architecture & Equipment Handling",
          type: "TEXT",
          contentText: "Core operational specifications, safety protocols, and pre-deployment inspection routines aligned with Ministry of Earth Sciences guidelines.",
          summary: "Pre-deployment checks, sensor staging, and adherence to MoES observation guidelines.",
          order: 1
        },
        {
          title: "Field Deployment & Calibration Execution",
          type: "TEXT",
          contentText: "Step-by-step calibration methodology, environmental corrections, and operational data telemetry validation.",
          summary: "Telemetry validation, zero-point calibrations, and quality assurance logs.",
          order: 2
        }
      ],
      assessment: {
        title: "Operational Protocol Competency Evaluation",
        questions: [
          {
            question: "What is the primary validation step before deploying sensitive marine or atmospheric observation payloads?",
            options: [
              "Laboratory sensor zero-point calibration and telemetry link verification",
              "Bypassing pre-deployment diagnostic checks",
              "Disabling telemetry logging to save local memory",
              "Using uncalibrated reference instruments"
            ],
            correctOptionIndex: 0
          },
          {
            question: "Why must field measurement metadata be archived alongside raw sensor streams?",
            options: [
              "To preserve traceability, calibration coefficients, and observation provenance",
              "To increase telemetry packet latency",
              "Metadata is not required in MoES repositories",
              "Only to satisfy file naming conventions"
            ],
            correctOptionIndex: 0
          },
          {
            question: "Which water standard is mandated for flushing conductivity cells immediately post-recovery?",
            options: [
              "Deionized distilled water (18.2 MOhm-cm resistivity)",
              "Unfiltered coastal harbor seawater",
              "Chlorinated tap water without rinse",
              "Alcohol solvent wash without hydration"
            ],
            correctOptionIndex: 0
          },
          {
            question: "What is the threshold arming voltage required for acoustic release transponders prior to deployment?",
            options: [
              "> 24.5V under simulated load test",
              "< 12.0V under ambient room temperature",
              "Acoustic transponders do not require voltage testing",
              "Variable between 1V and 5V"
            ],
            correctOptionIndex: 0
          },
          {
            question: "Why are platinum electrode conductivity cells capped with wet-storage sponges during cruise transit?",
            options: [
              "To prevent cell desiccation and maintain electrode wetting characteristics",
              "To shield against mechanical vibration only",
              "To decrease sensor weight",
              "To allow biological growth on electrodes"
            ],
            correctOptionIndex: 0
          },
          {
            question: "In Doppler Weather Radar operations, what does a Differential Reflectivity (ZDR) standardized to 0 dB in vertical scans indicate?",
            options: [
              "Balanced transmitter power split and calibrated polarization bias",
              "Complete transmitter hardware failure",
              "Excessive ground clutter attenuation",
              "Incorrect antenna elevation angle"
            ],
            correctOptionIndex: 0
          },
          {
            question: "During severe cyclone tracking, how often should Velocity Azimuth Display (VAD) wind profiles be calculated?",
            options: [
              "Every 15 minutes for steering flow monitoring",
              "Once every 24 hours",
              "Only after landfall",
              "VAD profiles are not used in cyclones"
            ],
            correctOptionIndex: 0
          },
          {
            question: "In the INCOIS Tsunami Early Warning System, what oceanographic instrument confirms tsunami wave generation after a seismic trigger?",
            options: [
              "Bottom Pressure Recorders (BPR) and coastal tide gauges",
              "Meteorological rain gauges",
              "Satellite infrared cloud cameras only",
              "Shipboard echo sounders in dock"
            ],
            correctOptionIndex: 0
          },
          {
            question: "What minimum deep-sea water elevation displacement at a BPR elevates an alert to a RED WARNING for vulnerable coastal zones?",
            options: [
              "> 3 cm water column elevation change",
              "> 10 meters water column change",
              "< 0.1 mm atmospheric pressure change",
              "BPR readings are not quantified for warning levels"
            ],
            correctOptionIndex: 0
          },
          {
            question: "What is the primary operational safeguard against fouling on oceanographic optical and conductivity ports at depths < 200m?",
            options: [
              "Application of certified biocidal anti-fouling guards and copper sleeves",
              "Frequent manual scraping by divers during mooring deployment",
              "Disabling the optical emitter",
              "Allowing algal crust to settle naturally"
            ],
            correctOptionIndex: 0
          }
        ]
      }
    };
  }
  return {};
}
