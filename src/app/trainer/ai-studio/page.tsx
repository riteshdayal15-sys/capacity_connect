"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { BrainCircuit, AlertCircle, Save, CheckCircle2 } from "lucide-react";

export default function TrainerAiStudioPage() {
  const { data: session } = useSession();
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Real course & module linking
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [savingToDb, setSavingToDb] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadCourses() {
      const trainerId = (session?.user as any)?.id;
      const role = (session?.user as any)?.role;
      try {
        const url = role === "ADMIN" || !trainerId ? "/api/courses" : `/api/courses?trainerId=${trainerId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
          if (data.length > 0) {
            setSelectedCourseId(data[0].id);
            if (data[0].modules?.length > 0) {
              setSelectedModuleId(data[0].modules[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      }
    }
    loadCourses();
  }, [session]);

  const handleCourseChange = (cId: string) => {
    setSelectedCourseId(cId);
    const match = courses.find((c) => c.id === cId);
    if (match && match.modules?.length > 0) {
      setSelectedModuleId(match.modules[0].id);
    } else {
      setSelectedModuleId("");
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !content) return;
    setGenerating(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, customText: content }),
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        if (!assessmentTitle) {
          setAssessmentTitle(`${topic} - Evaluation`);
        }
      } else {
        setError("Unable to synthesize questions. Please refine source documentation text.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  const handleQuestionChange = (index: number, newQuestionText: string) => {
    const updated = [...questions];
    updated[index].question = newQuestionText;
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleSaveToCourse = async () => {
    if (!selectedModuleId) {
      alert("Please select a valid curriculum module.");
      return;
    }
    if (questions.length === 0) {
      alert("Please generate at least one question.");
      return;
    }

    setSavingToDb(true);
    setError(null);

    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: selectedModuleId,
          title: assessmentTitle || `${topic} Assessment`,
          questions: questions.map((q) => ({
            question: q.question,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex ?? 0,
          })),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to save assessment to database.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save to database");
    } finally {
      setSavingToDb(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
      <Navbar role="TRAINER" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="border-b border-zinc-200 pb-6">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950 flex items-center">
              <BrainCircuit className="w-5 h-5 mr-2 text-zinc-700" />
              AI Assessment Studio
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
              Direct DB Save
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Synthesize multi-distractor assessment questions from raw technical documentation and commit directly into syllabus modules.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Source Panel */}
          <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <h2 className="text-sm font-semibold text-zinc-950">
              Source Material &amp; Technical Text
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Module Topic / Competency Area
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. S-Band Doppler Radar Dual-Polarization Calibration"
                  className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Technical Text or SOP Manual
                </label>
                <textarea
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste manual excerpts, sensor operational steps, or scientific calibration principles here..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900 font-mono text-[11px]"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 font-medium text-xs text-white disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {generating ? "Synthesizing Questions..." : "Generate 5 Draft Questions"}
              </button>
            </form>
          </div>

          {/* Generated Questions Panel */}
          <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-950">Review &amp; Attach to Curriculum</h2>
              <span className="text-xs text-zinc-600 font-mono">{questions.length} Questions</span>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                Assessment committed to module database successfully.
              </div>
            )}

            {questions.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 text-xs border border-dashed border-zinc-200 rounded-md">
                Paste technical documentation on the left and click generate to review editable AI drafts.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-md bg-[#FBFBFA] border border-zinc-200 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 shrink-0 mt-1">
                          Q{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => handleQuestionChange(idx, e.target.value)}
                          className="w-full bg-white px-2.5 py-1.5 rounded-md border border-zinc-200 text-xs text-zinc-900 font-medium"
                        />
                        <button
                          onClick={() => handleDeleteQuestion(idx)}
                          className="text-[11px] text-red-700 hover:underline shrink-0"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                        {q.options.map((opt: string, optIdx: number) => {
                          const isCorrect = optIdx === q.correctOptionIndex;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-md text-xs flex items-center border ${
                                isCorrect
                                  ? "bg-white border-zinc-900 ring-1 ring-zinc-900 font-medium text-zinc-950"
                                  : "bg-white border-zinc-200 text-zinc-600"
                              }`}
                            >
                              <span className="font-mono text-[10px] mr-2 font-bold opacity-60">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && (
                                <span className="ml-auto text-[10px] font-mono text-emerald-800 font-medium">
                                  [Correct]
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct Database Attachment Box */}
                <div className="p-4 rounded-md bg-[#FBFBFA] border border-zinc-200 space-y-3 pt-3">
                  <p className="text-xs font-semibold text-zinc-950 flex items-center">
                    <Save className="w-3.5 h-3.5 mr-1.5 text-zinc-700" />
                    Attach Assessment Directly to Course Module
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-600 mb-1">Target Course</label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-600 mb-1">Target Module</label>
                      <select
                        value={selectedModuleId}
                        onChange={(e) => setSelectedModuleId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none"
                      >
                        {selectedCourse?.modules?.length > 0 ? (
                          selectedCourse.modules.map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.title}
                            </option>
                          ))
                        ) : (
                          <option value="">No modules available</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveToCourse}
                    disabled={savingToDb || !selectedModuleId}
                    className="w-full py-2 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 font-medium text-xs text-white disabled:opacity-50 transition-colors flex items-center justify-center"
                  >
                    {savingToDb ? "Saving to Database..." : "Save Assessment into Selected Module"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
