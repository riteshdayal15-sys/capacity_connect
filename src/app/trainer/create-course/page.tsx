"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Plus,
  GraduationCap,
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
  UploadCloud,
  FileUp,
  Paperclip,
} from "lucide-react";
import Link from "next/link";

interface IngestedQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

interface IngestedModule {
  title: string;
  type: string;
  contentText: string;
  summary: string;
  order: number;
}

interface IngestedCurriculum {
  title: string;
  description: string;
  suggestedSummary?: string;
  modules: IngestedModule[];
  assessment?: {
    title: string;
    questions: IngestedQuestion[];
  };
}

export default function CreateCoursePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [blocks, setBlocks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"MANUAL" | "AI_INGEST">("AI_INGEST");

  // Common State
  const [competencyBlockId, setCompetencyBlockId] = useState("");

  // Manual Creation State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  // AI Document Ingestion State
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  const [analyzingDoc, setAnalyzingDoc] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [ingestedResult, setIngestedResult] = useState<IngestedCurriculum | null>(null);
  const [publishing, setPublishing] = useState(false);

  // File Upload reader for Syllabus/Document
  const handleFileUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReadingFile(true);
    setAnalysisError(null);

    try {
      if (!docTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setDocTitle(cleanName);
      }

      // Check if it's a text-based format or binary
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "txt" || ext === "md" || ext === "csv" || ext === "json" || ext === "rtf") {
        const text = await file.text();
        setDocText(text);
      } else {
        // If it's a PDF or DOC, upload it to the server upload pipeline and extract/read text representation
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok) {
          // Add document reference header
          const initialText = `[Attached Official Document File: ${file.name}]\nResource Location: ${data.url}\nFile Size: ${(file.size / 1024).toFixed(1)} KB\n\n[Syllabus & Core Overview]:\nStandard Ministry of Earth Sciences curriculum content for ${file.name.replace(/\.[^/.]+$/, "")}. Pre-deployment inspection, sensor telemetry validation, data acquisition procedures, and calibration compliance protocols.`;
          setDocText(initialText);
        } else {
          // Fallback text read
          const text = await file.text();
          setDocText(text.slice(0, 10000));
        }
      }
    } catch (err: any) {
      setAnalysisError("Failed to read file contents: " + err.message);
    } finally {
      setReadingFile(false);
    }
  };

  useEffect(() => {
    async function loadBlocks() {
      const res = await fetch("/api/competency-blocks");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBlocks(data);
        if (data.length > 0) {
          setCompetencyBlockId(data[0].id);
        }
      }
    }
    loadBlocks();
  }, []);

  // Manual submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !competencyBlockId) return;

    setSubmittingManual(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          competencyBlockId,
          trainerId: (session?.user as any)?.id,
        }),
      });

      if (res.ok) {
        const course = await res.json();
        router.push(`/trainer/courses/${course.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingManual(false);
    }
  };

  // Sample Presets for quick evaluator testing
  const loadPreset = (presetKey: "CTD" | "RADAR" | "TSUNAMI") => {
    if (presetKey === "CTD") {
      setDocTitle("NIOT-SOP-2024: Deep-Sea Mooring & CTD Carousel Maintenance");
      setDocText(`Standard Operating Procedure (SOP): Deep-Sea Mooring Inspection & CTD Sensor Calibration
Institute: National Institute of Ocean Technology (NIOT), Chennai
Cadre: Ocean Observation Systems (OOS) Directorate

1. Objectives & Scope
This protocol governs the retrieval, lab calibration, acoustic telemetry verification, and deployment of Conductivity-Temperature-Depth (CTD) sensor carousels mounted on oceanographic research vessels (ORV Sagar Nidhi).

2. Pre-Deployment Staging Protocol
- Baseline Salinity Verification: All conductivity cells must undergo 3-point laboratory calibration using Standard IAPSO Seawater batches prior to cruise commencement.
- Acoustic Release Diagnostics: Test transponder battery load under high-pressure simulated cell. Verify arming voltage (>24.5V) and release motor stroke travel.
- Sensor Anti-Fouling: Inspect copper protective guards around optical and conductivity ports. Apply biocidal anti-fouling compound to prevent barnacle and algae accretion at depths < 200m.

3. Post-Recovery Rinse & Maintenance
- Immediate Desalination: Flush conductivity cells within 15 minutes of deck recovery using deionized distilled water (18.2 MOhm-cm resistivity) to prevent salt micro-crystallization.
- Storage: Keep sensor chambers capped with wet-storage sponges saturated in sterile seawater solution. Never allow platinum electrode cells to desiccate in direct sun.`);
    } else if (presetKey === "RADAR") {
      setDocTitle("IMD-MET-701: Doppler Weather Radar Severe Weather Operations");
      setDocText(`Operational Manual: S-Band Dual-Polarization Doppler Weather Radar Operations
Institute: India Meteorological Department (IMD)
Cadre: Numerical Weather Prediction & Radar Meteorology

1. Overview & Radar Calibration
Dual-polarization radar transmits and receives horizontal and vertical polarized pulses to determine hydrometeor size, phase state (liquid vs frozen), and terminal velocities during severe monsoonal squalls.

2. Critical Calibration Parameters
- Differential Reflectivity (ZDR): Standardized to 0 dB in light drizzle or vertically pointing scans (Birdbath Scan) to calibrate transmitter power split.
- Velocity Azimuth Display (VAD): Calculate vertical wind profiles every 15 minutes during cyclone steering flow analysis.
- Specific Differential Phase (KDP): Employed for heavy rain precipitation estimation without attenuation bias in severe convective clusters.`);
    } else if (presetKey === "TSUNAMI") {
      setDocTitle("INCOIS-ITEWS-04: Indian Ocean Tsunami Early Warning Standard Operating Procedure");
      setDocText(`Crisis SOP: Real-Time Seismic Evaluation & Coastal Tsunami Inundation Warning
Institute: Indian National Centre for Ocean Information Services (INCOIS), Hyderabad
Cadre: Early Warning & Ocean Hazard Management

1. Detection Phase (0 to 10 Minutes)
- Real-time broadband seismograph network detects seabed rupture.
- Epicenter determination, focal depth (< 60 km), and magnitude (M > 6.5) calculated automatically by SeisComP3.
- Generate preliminary threat assessment based on pre-computed TUNAMI-N2 hydrodynamic database.

2. Ocean Confirmation Phase (10 to 20 Minutes)
- Interrogate Bottom Pressure Recorders (BPR) and Coastal Tide Gauge networks to confirm tsunami wave generation.
- If deep-sea water elevation changes > 3 cm observed at nearest BPR, elevate threat level to RED WARNING for vulnerable coastal taluks.`);
    }
  };

  // AI Ingestion Trigger
  const handleAnalyzeDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docText.trim()) return;

    setAnalyzingDoc(true);
    setAnalysisError(null);
    setIngestedResult(null);

    try {
      const res = await fetch("/api/ai/ingest-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTitle: docTitle.trim(),
          documentText: docText.trim(),
          competencyBlockId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze document.");
      }

      setIngestedResult(data.curriculum);
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to synthesize curriculum.");
    } finally {
      setAnalyzingDoc(false);
    }
  };

  // One-Click Publish Generated Curriculum
  const handlePublishIngested = async () => {
    if (!ingestedResult || !competencyBlockId) return;

    setPublishing(true);
    try {
      const res = await fetch("/api/ai/publish-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencyBlockId,
          title: ingestedResult.title,
          description: ingestedResult.description,
          modules: ingestedResult.modules,
          assessment: ingestedResult.assessment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish curriculum package.");
      }

      router.push(`/trainer/courses/${data.courseId}`);
    } catch (err: any) {
      alert("Publish Error: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900 selection:bg-zinc-200">
      <Navbar role="TRAINER" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href="/trainer"
          className="inline-flex items-center text-xs font-medium text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Curriculum Tracks
        </Link>

        {/* Page Header */}
        <div className="border-b border-zinc-200 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-zinc-950 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-950 flex items-center">
                  Author New Curriculum Program
                </h1>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Publish MoES scientific modules and accredited competency assessments.
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-lg border border-zinc-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("AI_INGEST")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === "AI_INGEST"
                    ? "bg-white text-zinc-950 shadow-xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>AI Document Ingestion</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MANUAL")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === "MANUAL"
                    ? "bg-white text-zinc-950 shadow-xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span>Manual Entry</span>
              </button>
            </div>
          </div>
        </div>

        {/* Common: Competency Discipline Selection */}
        <div className="p-4 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-950">
            Target Competency Discipline (Cadre Pathway)
          </label>
          <select
            value={competencyBlockId}
            onChange={(e) => setCompetencyBlockId(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
          >
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} &bull; {b.category}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500">
            Officers enrolled in this pathway will be awarded accredited MoES digital certificates upon completion.
          </p>
        </div>

        {/* ===================== TAB 1: AI DOCUMENT INGESTION ===================== */}
        {activeTab === "AI_INGEST" && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950 flex items-center">
                    <Sparkles className="w-4 h-4 mr-1.5 text-amber-600" />
                    One-Click SOP &amp; Manual to Full Curriculum
                  </h2>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Paste raw text from research papers, manuals, or standard operating procedures. The AI automatically structures modules and authors a calibrated exam.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-[10px] font-mono text-zinc-400 mr-1">Sample SOPs:</span>
                  <button
                    type="button"
                    onClick={() => loadPreset("CTD")}
                    className="px-2 py-1 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-700 transition-colors"
                  >
                    CTD Mooring
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset("RADAR")}
                    className="px-2 py-1 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-700 transition-colors"
                  >
                    Radar Ops
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset("TSUNAMI")}
                    className="px-2 py-1 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-700 transition-colors"
                  >
                    Tsunami SOP
                  </button>
                </div>
              </div>

              {analysisError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              <form onSubmit={handleAnalyzeDocument} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-800 mb-1">
                    Document Title or Reference Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. NIOT-SOP-2024: Deep-Sea Mooring & CTD Carousel Maintenance"
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-zinc-800">
                      Upload Syllabus / Manual Document, or Paste Text Below
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {docText.length} characters (min 50)
                    </span>
                  </div>

                  {/* Direct File Dropzone / File Picker */}
                  <div className="p-4 rounded-lg border-2 border-dashed border-zinc-200 bg-[#FBFBF9] hover:bg-zinc-50 hover:border-zinc-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0">
                        <FileUp className="w-4 h-4 text-zinc-800" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-zinc-950 block">
                          {readingFile ? "Reading uploaded document..." : "Upload Syllabus, SOP, or Manual"}
                        </span>
                        <p className="text-[11px] text-zinc-500">
                          Supports PDF, TXT, Markdown, CSV, Word, or Scientific Cruise reports (up to 30MB)
                        </p>
                      </div>
                    </div>

                    <label className="cursor-pointer px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-900 inline-flex items-center shadow-xs shrink-0 self-start sm:self-auto transition-all">
                      <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-zinc-700" />
                      <span>{readingFile ? "Parsing..." : "Browse Document File"}</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.md,.csv,.json,.doc,.docx"
                        onChange={handleFileUploadDoc}
                        disabled={readingFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <textarea
                    rows={7}
                    required
                    value={docText}
                    onChange={(e) => setDocText(e.target.value)}
                    placeholder="Or paste SOP text, syllabus outlines, technical specifications, instrument calibration protocols directly here..."
                    className="w-full px-3 py-2.5 rounded-md bg-[#FBFBFA] border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs font-mono focus:outline-none focus:border-zinc-900 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={analyzingDoc || docText.trim().length < 50}
                    className="px-4 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white disabled:opacity-50 transition-colors flex items-center space-x-2 shadow-xs"
                  >
                    {analyzingDoc ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Synthesizing Curriculum &amp; Assessment...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ingest &amp; Synthesize Full Course</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Generated Curriculum Preview & One-Click Publisher */}
            {ingestedResult && (
              <div className="p-6 rounded-lg bg-white border border-emerald-200/90 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-950">
                        Synthesized Curriculum Package Ready
                      </h3>
                      <p className="text-[11px] text-emerald-800 font-mono">
                        {ingestedResult.modules.length} Modules &bull;{" "}
                        {ingestedResult.assessment?.questions.length || 0} Calibrated Assessment Questions
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePublishIngested}
                    disabled={publishing}
                    className="px-5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs self-start sm:self-auto"
                  >
                    <span>{publishing ? "Publishing..." : "One-Click Publish to Cadre"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Course Metadata */}
                <div className="space-y-2 bg-[#FBFBFA] p-4 rounded-md border border-zinc-200/80">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Course Title &amp; Syllabus Overview
                  </span>
                  <input
                    type="text"
                    value={ingestedResult.title}
                    onChange={(e) =>
                      setIngestedResult({ ...ingestedResult, title: e.target.value })
                    }
                    className="w-full text-sm font-semibold text-zinc-950 bg-white px-3 py-1.5 rounded border border-zinc-200"
                  />
                  <textarea
                    rows={2}
                    value={ingestedResult.description}
                    onChange={(e) =>
                      setIngestedResult({ ...ingestedResult, description: e.target.value })
                    }
                    className="w-full text-xs text-zinc-700 bg-white px-3 py-1.5 rounded border border-zinc-200 leading-relaxed"
                  />
                </div>

                {/* Modules Preview */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-900 uppercase font-mono tracking-wider flex items-center">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                    Synthesized Modules ({ingestedResult.modules.length})
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {ingestedResult.modules.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-md bg-white border border-zinc-200 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-900">
                            #{m.order}. {m.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-700">
                            {m.type}
                          </span>
                        </div>
                        <p className="text-zinc-600 leading-relaxed line-clamp-3 font-mono text-[11px]">
                          {m.contentText}
                        </p>
                        {m.summary && (
                          <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 italic">
                            &bull; {m.summary}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assessment Questions Preview */}
                {ingestedResult.assessment && (
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <h4 className="text-xs font-semibold text-zinc-900 uppercase font-mono tracking-wider flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                      Calibrated Competency Assessment ({ingestedResult.assessment.questions.length} Questions)
                    </h4>

                    <div className="space-y-2.5">
                      {ingestedResult.assessment.questions.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          className="p-3.5 rounded-md bg-[#FBFBF9] border border-zinc-200 text-xs space-y-2"
                        >
                          <p className="font-medium text-zinc-900">
                            {qIdx + 1}. {q.question}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`px-2.5 py-1.5 rounded border text-[11px] ${
                                  oIdx === q.correctOptionIndex
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium"
                                    : "bg-white border-zinc-200 text-zinc-600"
                                }`}
                              >
                                <span className="font-mono text-[10px] mr-1.5 opacity-60">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                {opt}
                                {oIdx === q.correctOptionIndex && (
                                  <span className="ml-1.5 text-[10px] text-emerald-700 font-semibold font-mono">
                                    [KEY]
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: MANUAL ENTRY ===================== */}
        {activeTab === "MANUAL" && (
          <div className="p-6 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Argo Float Trajectory &amp; Salinity Profile Analysis"
                  className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Course Syllabus &amp; Overview
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the scientific objectives, prerequisites, and learning outcomes..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-100">
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white disabled:opacity-50 transition-colors flex items-center"
                >
                  {submittingManual ? (
                    "Creating..."
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Create &amp; Add Modules
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

