"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Award,
  ArrowLeft,
  HelpCircle,
  BookOpen,
  Video,
  FileText,
  Image as ImageIcon,
  Link2,
  Download,
  FileUp,
  Sparkles,
  Check,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { toEmbedUrl } from "@/lib/video";

export default function TraineeCourseViewerPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { data: session } = useSession();

  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Chat Q&A widget state
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Sub-tab view state: "CONTENT" | "SYLLABUS" | "NOTES" | "ASSESSMENT" | "AI_TUTOR"
  const [activeSubTab, setActiveSubTab] = useState<"CONTENT" | "SYLLABUS" | "NOTES" | "ASSESSMENT" | "AI_TUTOR">("CONTENT");

  // Summarize state
  const [summaryBullets, setSummaryBullets] = useState<string[] | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const courseData = await res.json();
        setCourse(courseData);
      }
    } catch (err) {
      console.error("Course fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const fetchEnrollment = useCallback(async (userId: string) => {
    if (!userId || !courseId) return;
    try {
      const res = await fetch(`/api/enrollments?traineeId=${userId}`);
      if (res.ok) {
        const enrollmentsData = await res.json();
        if (Array.isArray(enrollmentsData)) {
          const matchEnrollment = enrollmentsData.find((e) => e.courseId === courseId);
          if (matchEnrollment) setEnrollment(matchEnrollment);
        }
      }
    } catch (err) {
      console.error("Enrollment fetch error:", err);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, fetchCourse]);

  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (userId && courseId) {
      fetchEnrollment(userId);
    }
  }, [courseId, session, fetchEnrollment]);

  const currentModule = course?.modules?.[selectedModuleIndex];

  let completedIds: string[] = [];
  try {
    completedIds = JSON.parse(enrollment?.completedModuleIds || "[]");
  } catch (e) {
    completedIds = [];
  }

  const isCurrentCompleted = currentModule && completedIds.includes(currentModule.id);

  const handleMarkComplete = async () => {
    if (!enrollment || !currentModule) return;
    try {
      const res = await fetch("/api/enrollments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          moduleId: currentModule.id,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEnrollment((prev: any) => ({
          ...prev,
          completedModuleIds: updated.completedModuleIds,
          progressPercent: updated.progressPercent,
          status: updated.status,
        }));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to mark module completed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSummarizeModule = async () => {
    if (!currentModule) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: currentModule.id,
          text: currentModule.contentText,
        }),
      });
      const data = await res.json();
      if (data.bullets) {
        setSummaryBullets(data.bullets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          moduleId: currentModule?.id,
          moduleTitle: currentModule?.title,
          question: chatQuestion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatAnswer(data.error || "Unable to answer question at this time.");
      } else {
        setChatAnswer(data.answer);
      }
    } catch (err) {
      console.error(err);
      setChatAnswer("AI assistant is currently unreachable.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeAssessment || !session?.user) return;
    setSubmittingQuiz(true);
    setQuizError(null);
    try {
      const res = await fetch("/api/assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: activeAssessment.id,
          traineeId: (session.user as any).id,
          userAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuizError(data.error || "Failed to submit assessment.");
        return;
      }
      setQuizResult(data);

      if (data.passed && currentModule && enrollment) {
        await fetch("/api/enrollments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enrollmentId: enrollment.id,
            moduleId: currentModule.id,
          }),
        });
      }

      const userId = (session?.user as any)?.id;
      if (userId) {
        await fetchEnrollment(userId);
      }
    } catch (err: any) {
      console.error(err);
      setQuizError(err.message || "Network error while submitting quiz.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
        <Navbar role="TRAINEE" />
        <div className="text-center py-24 text-xs text-zinc-500">Loading curriculum reader...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
        <Navbar role="TRAINEE" />
        <div className="text-center py-24 text-xs text-zinc-500">Course not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
      <Navbar role="TRAINEE" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/trainee"
            className="inline-flex items-center text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Dashboard
          </Link>

          {enrollment?.status === "COMPLETED" && (
            <Link
              href={`/trainee/certificates?certId=${enrollment.id}`}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Official Verification Certificate</span>
            </Link>
          )}
        </div>

        {/* Course Header & Cadre Progress Hub */}
        <div className="p-6 rounded-xl bg-white border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase tracking-wider">
                  {course.competencyBlock?.title || "National Cadre Track"}
                </span>
                {course.trainer?.name && (
                  <span className="text-[11px] text-zinc-500 flex items-center">
                    &bull; Instructor: {course.trainer.name} ({course.trainer.department || "MoES"})
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">{course.title}</h1>
              <p className="text-xs text-zinc-600 max-w-3xl leading-relaxed">{course.description}</p>
            </div>

            {/* Overall Cadre Progress Indicator */}
            <div className="flex items-center space-x-4 bg-[#FBFBF9] px-4 py-3 rounded-lg border border-zinc-200 shrink-0 self-start md:self-auto">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                  Curriculum Progress
                </span>
                <span className="text-lg font-bold font-mono text-zinc-950">
                  {enrollment ? Math.round(enrollment.progressPercent) : 0}%
                </span>
              </div>
              <div className="w-20 bg-zinc-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zinc-900 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${enrollment ? enrollment.progressPercent : 0}%` }}
                />
              </div>
              {enrollment?.status === "COMPLETED" && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-semibold">
                  Certified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Module Index Sidebar with Clear Visual Hierarchy */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 space-y-3 h-fit shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <h2 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-600">
                Curriculum Syllabus
              </h2>
              <span className="text-[10px] font-mono text-zinc-400">
                {completedIds.length}/{course.modules.length} Completed
              </span>
            </div>

            {/* Quick Access to Syllabus Overview */}
            <button
              type="button"
              onClick={() => setActiveSubTab("SYLLABUS")}
              className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-all border ${
                activeSubTab === "SYLLABUS"
                  ? "bg-blue-900 text-white font-medium border-blue-900 shadow-xs"
                  : "bg-blue-50/50 text-blue-900 border-blue-200/70 hover:bg-blue-100/60"
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <FileText className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === "SYLLABUS" ? "text-blue-200" : "text-blue-600"}`} />
                <span className="font-semibold truncate">View Full Syllabus &amp; Scope</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${activeSubTab === "SYLLABUS" ? "text-blue-200" : "text-blue-400"}`} />
            </button>

            <div className="space-y-1.5">
              {course.modules.map((m: any, idx: number) => {
                const isSelected = idx === selectedModuleIndex;
                const isDone = completedIds.includes(m.id);

                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModuleIndex(idx);
                      setActiveSubTab("CONTENT");
                      setShowQuiz(false);
                      setQuizResult(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg text-xs flex items-center justify-between transition-all border ${
                      isSelected
                        ? "bg-zinc-950 text-white font-medium border-zinc-950 shadow-xs"
                        : isDone
                        ? "bg-emerald-50/40 text-zinc-800 border-emerald-200/60 hover:bg-emerald-50"
                        : "bg-[#FBFBF9] text-zinc-700 border-zinc-200/80 hover:bg-zinc-100/80"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate mr-2">
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        isSelected ? "bg-zinc-800 text-zinc-200" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        #{idx + 1}
                      </span>
                      {m.type === "VIDEO" && <Video className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-purple-300" : "text-purple-600"}`} />}
                      {m.type === "PDF" && <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-red-300" : "text-red-600"}`} />}
                      {m.type === "IMAGE" && <ImageIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-amber-300" : "text-amber-600"}`} />}
                      {m.type === "LINK" && <Link2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-blue-300" : "text-blue-600"}`} />}
                      {(!m.type || m.type === "TEXT") && <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-zinc-400" : "text-zinc-500"}`} />}
                      <span className="truncate">{m.title}</span>
                    </div>

                    {isDone ? (
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${isSelected ? "text-emerald-400" : "text-emerald-600"}`}
                      />
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-zinc-400" : "text-zinc-300"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dedicated Module Workspace with Segmented Control Tabs */}
          <div className="lg:col-span-3 space-y-6">
            {currentModule ? (
              <div className="p-6 rounded-xl bg-white border border-zinc-200/90 space-y-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                {/* Module Bar & Top Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {currentModule.type} MODULE
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        Module {selectedModuleIndex + 1} of {course.modules.length}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-zinc-950 mt-1">{currentModule.title}</h2>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleMarkComplete}
                      disabled={isCurrentCompleted}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all shadow-xs ${
                        isCurrentCompleted
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default"
                          : "bg-zinc-900 hover:bg-zinc-800 text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      {isCurrentCompleted ? "Module Completed" : "Mark as Completed"}
                    </button>
                  </div>
                </div>

                {/* Segmented Feature Tabs for Clean, Attractive Experience */}
                <div className="flex items-center space-x-1.5 p-1 bg-zinc-100 rounded-lg border border-zinc-200 text-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("CONTENT")}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
                      activeSubTab === "CONTENT"
                        ? "bg-white text-zinc-950 shadow-xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Lesson &amp; Media</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab("SYLLABUS")}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
                      activeSubTab === "SYLLABUS"
                        ? "bg-white text-blue-950 shadow-xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Course Syllabus &amp; Scope</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab("NOTES")}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
                      activeSubTab === "NOTES"
                        ? "bg-white text-amber-900 shadow-xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Instructor Notes &amp; SOP</span>
                    {currentModule.summary && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    )}
                  </button>

                  {currentModule.assessments?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubTab("ASSESSMENT");
                        setActiveAssessment(currentModule.assessments[0]);
                        setShowQuiz(true);
                      }}
                      className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
                        activeSubTab === "ASSESSMENT"
                          ? "bg-white text-emerald-950 shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Competency Evaluation ({currentModule.assessments[0].questions?.length || 0})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveSubTab("AI_TUTOR")}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
                      activeSubTab === "AI_TUTOR"
                        ? "bg-white text-purple-950 shadow-xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Ask AI Scientific Tutor</span>
                  </button>
                </div>

                {/* --- TAB 1: LESSON CONTENT & MULTIMODAL MEDIA --- */}
                {activeSubTab === "CONTENT" && (
                  <div className="space-y-6">
                    {/* VIDEO */}
                    {currentModule.type === "VIDEO" && currentModule.contentUrl && (() => {
                      const media = toEmbedUrl(currentModule.contentUrl);
                      if (!media) {
                        return (
                          <div className="p-4 rounded-lg bg-[#FBFBFA] border border-zinc-200 flex items-center justify-between text-xs">
                            <span className="text-zinc-700">External Video Stream</span>
                            <a
                              href={currentModule.contentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-900 font-semibold hover:underline flex items-center"
                            >
                              Open Video Stream <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        );
                      }
                      if (media.kind === "file") {
                        return (
                          <video
                            src={media.src}
                            controls
                            className="aspect-video w-full rounded-lg bg-black border border-zinc-200 shadow-sm"
                          />
                        );
                      }
                      return (
                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-zinc-200 shadow-sm">
                          <iframe
                            src={media.src}
                            title={currentModule.title || "Training video"}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      );
                    })()}

                    {/* PDF DOCUMENT */}
                    {currentModule.type === "PDF" && currentModule.contentUrl && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3.5 bg-red-50/70 border border-red-200 rounded-lg text-xs">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-red-600" />
                            <span className="font-semibold text-red-950">
                              Accredited MoES Scientific Manual &amp; Documentation
                            </span>
                          </div>
                          <a
                            href={currentModule.contentUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-md text-xs font-semibold text-zinc-800 inline-flex items-center shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5 mr-1 text-zinc-600" />
                            Download PDF Manual
                          </a>
                        </div>
                        <div className="w-full h-[540px] rounded-lg border border-zinc-300 overflow-hidden bg-zinc-100 shadow-inner">
                          <iframe
                            src={`${currentModule.contentUrl}#toolbar=1`}
                            title={currentModule.title}
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* IMAGE / DIAGRAM */}
                    {currentModule.type === "IMAGE" && currentModule.contentUrl && (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-950 flex items-center justify-center p-3 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentModule.contentUrl}
                            alt={currentModule.title || "Scientific Diagram"}
                            className="max-h-[500px] w-auto object-contain rounded-lg"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                          <span className="flex items-center">
                            <ImageIcon className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                            Observation Diagram &bull; Radar/Sensor Cross-Section
                          </span>
                          <a
                            href={currentModule.contentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-700 hover:text-zinc-900 underline inline-flex items-center"
                          >
                            Open Full Resolution <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* EXTERNAL PORTAL LINK */}
                    {currentModule.type === "LINK" && currentModule.contentUrl && (
                      <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                            <Link2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-blue-950 text-sm block">
                              Live Scientific Observatory / Government Portal
                            </span>
                            <p className="text-[11px] text-blue-800 truncate max-w-lg mt-0.5">
                              {currentModule.contentUrl}
                            </p>
                          </div>
                        </div>
                        <a
                          href={currentModule.contentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs flex items-center shadow-xs"
                        >
                          Launch Portal <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </a>
                      </div>
                    )}

                    {/* TEXT BODY */}
                    {currentModule.contentText && (
                      <div className="p-5 rounded-xl bg-[#FBFBF9] border border-zinc-200/90 text-xs leading-relaxed text-zinc-800 whitespace-pre-wrap font-normal">
                        {currentModule.contentText}
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB: COURSE SYLLABUS & CONTENT PROVIDING SPACE --- */}
                {activeSubTab === "SYLLABUS" && (
                  <div className="space-y-5 animate-in fade-in-50 duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-900 flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                          Official Course Syllabus &amp; Instructional Content
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Standard operating syllabus, milestones, and curriculum materials approved for this program.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded border border-zinc-200 shrink-0 self-start sm:self-auto">
                        {course.modules?.length || 0} Total Modules
                      </span>
                    </div>

                    {/* Syllabus Document Viewer / Text Container */}
                    <div className="p-5 rounded-xl bg-[#FBFBF9] border border-zinc-200/90 space-y-4">
                      {course.description ? (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 border-b border-zinc-200/60 pb-2">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800">
                              Curriculum Overview &amp; Weekly Progression:
                            </span>
                          </div>
                          <div className="text-xs font-mono leading-relaxed text-zinc-800 whitespace-pre-wrap bg-white p-4 rounded-lg border border-zinc-200/80">
                            {course.description}
                          </div>

                          {/* Render Attached Syllabus Files / Downloads if links exist */}
                          {course.description.includes("http") && (
                            <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200/70 space-y-2">
                              <span className="text-[10px] font-mono uppercase font-bold text-blue-900 block">
                                Attached Course Syllabus Documents &amp; Manuals:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(course.description.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)).map((match: any, i: number) => (
                                  <a
                                    key={i}
                                    href={match[2]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-blue-200 text-xs font-medium text-blue-900 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-2xs"
                                  >
                                    <Download className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{match[1]}</span>
                                    <ExternalLink className="w-3 h-3 text-blue-400 ml-1" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">No syllabus text has been added for this program yet.</p>
                      )}
                    </div>

                    {/* Curriculum Module Roadmap Index */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-mono uppercase font-bold text-zinc-600 block">
                        Full Course Content Roadmap:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {course.modules?.map((mod: any, mIdx: number) => (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => {
                              setSelectedModuleIndex(mIdx);
                              setActiveSubTab("CONTENT");
                            }}
                            className="p-3 text-left rounded-lg bg-white border border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50/80 transition-all flex items-center justify-between group shadow-2xs"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                                Module {mIdx + 1}
                              </span>
                              <span className="text-xs font-medium text-zinc-900 truncate group-hover:text-zinc-950">
                                {mod.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0">
                              {mod.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB 3: INSTRUCTOR FIELD NOTES & SOP --- */}
                {activeSubTab === "NOTES" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-900 flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                        Instructor Field Directives &amp; Takeaways
                      </h3>
                      <button
                        onClick={handleSummarizeModule}
                        disabled={summarizing}
                        className="px-3 py-1 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800 transition-colors shadow-2xs"
                      >
                        {summarizing ? "Extracting..." : "Re-summarize with AI"}
                      </button>
                    </div>

                    {(summaryBullets || currentModule.summary) ? (
                      <div className="p-5 rounded-xl bg-amber-50/40 border border-amber-200/80 text-xs space-y-3">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-900">
                          Critical Operational Directives:
                        </span>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-800 leading-relaxed pl-1">
                          {(summaryBullets || currentModule.summary.split("\n")).map(
                            (b: string, i: number) => (
                              <li key={i}>{b.replace(/^[-\s*]+/, "")}</li>
                            )
                          )}
                        </ul>
                      </div>
                    ) : (
                      <div className="p-6 text-center rounded-xl bg-[#FBFBF9] border border-zinc-200 text-xs text-zinc-500 space-y-2">
                        <p>No specific summary notes written yet for this module.</p>
                        <button
                          onClick={handleSummarizeModule}
                          disabled={summarizing}
                          className="px-3.5 py-1.5 rounded bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                        >
                          {summarizing ? "Synthesizing..." : "Generate AI Field Summary"}
                        </button>
                      </div>
                    )}

                    {currentModule.contentText && (
                      <div className="space-y-1.5 pt-3 border-t border-zinc-100">
                        <span className="text-[11px] font-mono text-zinc-500 font-semibold uppercase">
                          Full Protocol Text Reference:
                        </span>
                        <div className="p-4 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                          {currentModule.contentText}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB 3: COMPETENCY EVALUATION & QUIZ --- */}
                {activeSubTab === "ASSESSMENT" && currentModule.assessments?.length > 0 && (
                  <div className="space-y-4">
                    {quizResult ? (
                      <div className="p-6 rounded-xl bg-white border border-zinc-200 text-center space-y-3 shadow-xs">
                        <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                          quizResult.passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          <Award className="w-6 h-6" />
                        </div>
                        <span className="text-3xl font-bold text-zinc-950 font-mono block">
                          {quizResult.score} / {quizResult.maxScore}
                        </span>
                        <p
                          className={`text-xs font-semibold ${
                            quizResult.passed ? "text-emerald-800" : "text-amber-800"
                          }`}
                        >
                          {quizResult.passed
                            ? "Competency Verified — Assessment Passed (Score >= 60%)."
                            : "Score below threshold. Please review the material and re-attempt."}
                        </p>
                        <button
                          onClick={() => {
                            setQuizResult(null);
                            setUserAnswers({});
                          }}
                          className="px-4 py-2 rounded-lg bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 mt-2 transition-colors"
                        >
                          Re-take Assessment
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-950">
                              {currentModule.assessments[0].title}
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              Pass threshold: 60% accuracy required for module sign-off.
                            </p>
                          </div>
                          <span className="text-[11px] font-mono bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded border border-zinc-200">
                            {currentModule.assessments[0].questions?.length} Questions
                          </span>
                        </div>

                        {quizError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
                            <span className="font-semibold">&bull;</span>
                            <span>{quizError}</span>
                          </div>
                        )}

                        <div className="space-y-4">
                          {currentModule.assessments[0].questions?.map((q: any, qIdx: number) => {
                            let opts: string[] = [];
                            try {
                              opts = JSON.parse(q.options);
                            } catch {
                              opts = [];
                            }

                            return (
                              <div key={q.id} className="p-4 rounded-lg bg-[#FBFBF9] border border-zinc-200/90 space-y-2.5">
                                <p className="text-xs font-semibold text-zinc-950">
                                  {qIdx + 1}. {q.text}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                                  {opts.map((optText: string, oIdx: number) => {
                                    const isSelected = userAnswers[q.id] === oIdx;
                                    return (
                                      <button
                                        key={oIdx}
                                        type="button"
                                        onClick={() =>
                                          setUserAnswers((prev) => ({
                                            ...prev,
                                            [q.id]: oIdx,
                                          }))
                                        }
                                        className={`text-left p-3 rounded-lg text-xs border transition-all ${
                                          isSelected
                                            ? "bg-zinc-950 border-zinc-950 text-white font-medium shadow-xs"
                                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                        }`}
                                      >
                                        <span className="font-mono text-[10px] mr-1.5 opacity-60">
                                          {String.fromCharCode(65 + oIdx)}.
                                        </span>
                                        {optText}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-zinc-100">
                          <button
                            onClick={handleSubmitQuiz}
                            disabled={submittingQuiz}
                            className="px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors shadow-xs"
                          >
                            {submittingQuiz ? "Evaluating Answers..." : "Submit Final Answers"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB 4: GROUNDED AI SCIENTIFIC TUTOR --- */}
                {activeSubTab === "AI_TUTOR" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950 flex items-center">
                          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                          AI Cadre Technical Assistant
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Questions are grounded directly in this curriculum and official Ministry of Earth Sciences documentation.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                        Live Groq Inference
                      </span>
                    </div>

                    {/* Suggested Question Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-zinc-400 font-mono py-1">Quick prompts:</span>
                      {[
                        `Explain ${currentModule.title} in simple steps`,
                        "What are the critical safety warnings or threshold values?",
                        "What is the operational objective of this protocol?",
                      ].map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setChatQuestion(sample)}
                          className="text-[11px] bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-md px-2.5 py-1 transition-colors text-left"
                        >
                          &ldquo;{sample}&rdquo;
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleAskQuestion} className="flex gap-2">
                      <input
                        type="text"
                        value={chatQuestion}
                        onChange={(e) => setChatQuestion(e.target.value)}
                        placeholder={`Ask a question about ${currentModule.title}...`}
                        className="flex-1 px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 text-xs placeholder-zinc-400 focus:outline-none focus:border-zinc-900 shadow-2xs"
                      />
                      <button
                        type="submit"
                        disabled={chatLoading}
                        className="px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white transition-colors disabled:opacity-50 shadow-xs"
                      >
                        {chatLoading ? "Analyzing..." : "Ask Tutor"}
                      </button>
                    </form>

                    {chatAnswer && (
                      <div className="p-5 rounded-xl bg-purple-50/40 border border-purple-200/80 text-xs text-zinc-800 leading-relaxed space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                          <span className="font-semibold text-purple-950 font-mono text-[11px] flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mr-2 animate-pulse" />
                            Grounded Scientific Guidance:
                          </span>
                          <button
                            type="button"
                            onClick={() => setChatAnswer(null)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-700 font-mono"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed text-zinc-800 font-sans text-xs pt-1">
                          {chatAnswer}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Navigation Buttons: Previous / Next Module */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={selectedModuleIndex === 0}
                    onClick={() => {
                      setSelectedModuleIndex(selectedModuleIndex - 1);
                      setActiveSubTab("CONTENT");
                      setShowQuiz(false);
                      setQuizResult(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    &larr; Previous Module
                  </button>

                  <button
                    type="button"
                    disabled={selectedModuleIndex === course.modules.length - 1}
                    onClick={() => {
                      setSelectedModuleIndex(selectedModuleIndex + 1);
                      setActiveSubTab("CONTENT");
                      setShowQuiz(false);
                      setQuizResult(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Next Module &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center rounded-xl bg-white border border-zinc-200/90 text-zinc-600 text-xs space-y-2">
                <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-1" />
                <p className="font-semibold text-zinc-900 text-sm">Curriculum In Preparation</p>
                <p className="text-zinc-500 max-w-sm mx-auto">
                  The instructor has initiated this program, but training modules have not been published yet.
                </p>
                <Link
                  href="/trainee/catalog"
                  className="inline-block mt-3 px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
                >
                  Return to Competency Catalog
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
