"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import {
  BookOpen,
  Plus,
  Video,
  FileText,
  Trash2,
  ChevronLeft,
  Award,
  AlertCircle,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Link2,
  UploadCloud,
  FileUp,
  Download,
} from "lucide-react";
import Link from "next/link";
import { toEmbedUrl } from "@/lib/video";

interface QuestionDraft {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export default function TrainerCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Module modal state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleType, setModuleType] = useState<"VIDEO" | "PDF" | "IMAGE" | "TEXT" | "LINK">("TEXT");
  const [contentUrl, setContentUrl] = useState("");
  const [contentText, setContentText] = useState("");
  const [summary, setSummary] = useState("");
  const [savingModule, setSavingModule] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Assessment modal state
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentQuestions, setAssessmentQuestions] = useState<QuestionDraft[]>([
    {
      question: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
    },
  ]);
  const [savingAssessment, setSavingAssessment] = useState(false);

  // Edit Syllabus / Overview modal state
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingSyllabus, setSavingSyllabus] = useState(false);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Course not found or access denied.");
      }
      const data = await res.json();
      setCourse(data);

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get("action");
        const typeParam = urlParams.get("type");
        if (action === "upload_syllabus") {
          setEditTitle(data.title || "");
          setEditDescription(data.description || "");
          setShowSyllabusModal(true);
        } else if (action === "add_module" || typeParam) {
          if (typeParam && ["VIDEO", "PDF", "IMAGE", "TEXT", "LINK"].includes(typeParam.toUpperCase())) {
            setModuleType(typeParam.toUpperCase() as any);
          }
          setShowModuleModal(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "File upload failed.");
      }

      setContentUrl(data.url);
      if (!moduleTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setModuleTitle(cleanName);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    setSavingModule(true);

    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: moduleTitle.trim(),
          type: moduleType,
          contentUrl: contentUrl.trim() || null,
          contentText: contentText.trim() || null,
          summary: summary.trim() || null,
          order: (course?.modules?.length || 0) + 1,
        }),
      });

      if (res.ok) {
        setShowModuleModal(false);
        setModuleTitle("");
        setContentUrl("");
        setContentText("");
        setSummary("");
        setUploadError(null);
        await fetchCourse();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to add module");
      }
    } catch (err: any) {
      alert("Error adding module: " + err.message);
    } finally {
      setSavingModule(false);
    }
  };

  const handleUpdateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setSavingSyllabus(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      });

      if (res.ok) {
        setShowSyllabusModal(false);
        await fetchCourse();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update course syllabus");
      }
    } catch (err: any) {
      alert("Error updating syllabus: " + err.message);
    } finally {
      setSavingSyllabus(false);
    }
  };

  const handleAddQuestion = () => {
    setAssessmentQuestions([
      ...assessmentQuestions,
      { question: "", options: ["", "", "", ""], correctOptionIndex: 0 },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (assessmentQuestions.length <= 1) return;
    setAssessmentQuestions(assessmentQuestions.filter((_, i) => i !== idx));
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId || !assessmentTitle.trim()) return;

    for (let i = 0; i < assessmentQuestions.length; i++) {
      const q = assessmentQuestions[i];
      if (!q.question.trim()) {
        alert(`Question #${i + 1} cannot have an empty question prompt.`);
        return;
      }
      if (q.options.some((opt) => !opt.trim())) {
        alert(`Please fill all 4 options for Question #${i + 1}.`);
        return;
      }
    }

    setSavingAssessment(true);

    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: selectedModuleId,
          title: assessmentTitle.trim(),
          questions: assessmentQuestions,
        }),
      });

      if (res.ok) {
        setShowAssessmentModal(false);
        setAssessmentTitle("");
        setSelectedModuleId(null);
        setAssessmentQuestions([
          { question: "", options: ["", "", "", ""], correctOptionIndex: 0 },
        ]);
        await fetchCourse();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save assessment");
      }
    } catch (err: any) {
      alert("Error saving assessment: " + err.message);
    } finally {
      setSavingAssessment(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirm("Are you sure you want to delete this course and all associated modules?")) return;
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/trainer");
      } else {
        alert("Failed to delete course");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
        <Navbar role="TRAINER" />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-xs text-zinc-500">Loading course curriculum...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    const isAccessDenied = error?.toLowerCase().includes("forbidden") || error?.toLowerCase().includes("access");
    return (
      <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
        <Navbar role="TRAINER" />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
          <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${
            isAccessDenied ? "bg-red-50 text-red-600 border border-red-200" : "bg-zinc-100 text-zinc-500"
          }`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-950">
            {isAccessDenied ? "Access Denied: Subject Isolation Policy" : "Course Not Found"}
          </h2>
          <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
            {error || "The requested curriculum record could not be loaded."}
          </p>
          <div className="pt-2">
            <Link
              href="/trainer"
              className="inline-flex items-center px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Return to My Specialized Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
      <Navbar role="TRAINER" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div className="space-y-1">
            <Link
              href="/trainer"
              className="text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center mb-1 transition-colors font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Trainer Workspace
            </Link>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-950">{course.title}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                {course.competencyBlock?.title || "Core Program"}
              </span>
            </div>
            <p className="text-xs text-zinc-600 max-w-2xl line-clamp-2">
              {course.description ? course.description.slice(0, 200) + (course.description.length > 200 ? "..." : "") : "No summary provided."}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDeleteCourse}
              className="px-3.5 py-2 rounded-md bg-white hover:bg-red-50 text-xs font-medium text-red-700 border border-zinc-200 hover:border-red-200 transition-colors inline-flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Course
            </button>
            <button
              onClick={() => setShowModuleModal(true)}
              className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors inline-flex items-center"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Module
            </button>
          </div>
        </div>

        {/* Metric Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Active Enrolled Cadres</p>
            <p className="text-2xl font-semibold text-zinc-950 font-mono mt-1">{course.enrollments?.length || 0}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">Across MoES autonomous bodies</p>
          </div>
          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Curriculum Modules</p>
            <p className="text-2xl font-semibold text-zinc-950 font-mono mt-1">{course.modules?.length || 0}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">Procedural units and readings</p>
          </div>
          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Competency Evaluations</p>
            <p className="text-2xl font-semibold text-zinc-950 font-mono mt-1">
              {course.modules?.reduce((acc: number, m: any) => acc + (m.assessments?.length || 0), 0) || 0}
            </p>
            <p className="text-[11px] text-emerald-800 mt-0.5 font-medium">Automatic evaluation enabled</p>
          </div>
        </div>

        {/* Dedicated Course Syllabus & Content Repository Space */}
        <div className="p-6 rounded-xl bg-white border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-800">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Official Course Syllabus & Scope of Instruction</h2>
                <p className="text-[11px] text-zinc-500">
                  Defines the comprehensive learning outcomes, weekly milestone roadmaps, and official curriculum reference documents for trainees.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditTitle(course?.title || "");
                setEditDescription(course?.description || "");
                setShowSyllabusModal(true);
              }}
              className="px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors inline-flex items-center shrink-0 self-start sm:self-auto shadow-xs"
            >
              <FileUp className="w-3.5 h-3.5 mr-1.5" /> Edit Syllabus / Upload Content
            </button>
          </div>

          <div className="bg-[#FBFBF9] rounded-lg border border-zinc-200/80 p-4">
            {course.description ? (
              <div className="space-y-3">
                <div className="text-xs text-zinc-800 whitespace-pre-wrap font-mono leading-relaxed max-h-56 overflow-y-auto pr-2">
                  {course.description}
                </div>
                {/* Extract any attached document markdown links for prominent one-click access */}
                {course.description.includes("http") && (
                  <div className="pt-3 border-t border-zinc-200/60 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-semibold text-zinc-500">
                      Attached Syllabus Documents:
                    </span>
                    {Array.from(course.description.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)).map((match: any, i: number) => (
                      <a
                        key={i}
                        href={match[2]}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white border border-zinc-200 text-[11px] font-medium text-zinc-800 hover:text-zinc-950 hover:border-zinc-300 shadow-2xs"
                      >
                        <Download className="w-3 h-3 text-zinc-500" />
                        <span>{match[1]}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-zinc-400 ml-1" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-zinc-500">No formal syllabus or instructional content uploaded yet.</p>
                <button
                  onClick={() => {
                    setEditTitle(course?.title || "");
                    setEditDescription("");
                    setShowSyllabusModal(true);
                  }}
                  className="px-3 py-1.5 rounded-md bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Provide Course Syllabus
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 flex items-center">
                <Layers className="w-4 h-4 mr-2 text-zinc-700" />
                Syllabus &amp; Learning Modules ({course.modules?.length || 0})
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Add content by choosing an option below:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setModuleType("PDF");
                  setModuleTitle("");
                  setContentUrl("");
                  setContentText("");
                  setShowModuleModal(true);
                }}
                className="px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-medium inline-flex items-center transition-colors"
                title="Upload PDF document"
              >
                <FileUp className="w-3.5 h-3.5 mr-1.5 text-red-600" />
                Upload PDF
              </button>

              <button
                type="button"
                onClick={() => {
                  setModuleType("TEXT");
                  setModuleTitle("");
                  setContentUrl("");
                  setContentText("");
                  setShowModuleModal(true);
                }}
                className="px-2.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 text-xs font-medium inline-flex items-center transition-colors"
                title="Add manual procedural text or SOP"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-zinc-700" />
                Manual Text
              </button>

              <button
                type="button"
                onClick={() => {
                  setModuleType("VIDEO");
                  setModuleTitle("");
                  setContentUrl("");
                  setContentText("");
                  setShowModuleModal(true);
                }}
                className="px-2.5 py-1.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-medium inline-flex items-center transition-colors"
                title="Add YouTube video or MP4 link"
              >
                <Video className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                YouTube Video
              </button>

              <button
                type="button"
                onClick={() => {
                  setModuleType("IMAGE");
                  setModuleTitle("");
                  setContentUrl("");
                  setContentText("");
                  setShowModuleModal(true);
                }}
                className="px-2.5 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium inline-flex items-center transition-colors"
                title="Upload photos or diagrams"
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                Photos
              </button>

              <button
                type="button"
                onClick={() => {
                  setModuleType("LINK");
                  setModuleTitle("");
                  setContentUrl("");
                  setContentText("");
                  setShowModuleModal(true);
                }}
                className="px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium inline-flex items-center transition-colors"
                title="Add external link or portal"
              >
                <Link2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Other Link
              </button>
            </div>
          </div>

          {course.modules?.length === 0 ? (
            <div className="p-10 text-center rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-4">
              <BookOpen className="w-9 h-9 text-zinc-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-950">No modules added yet</h3>
                <p className="text-xs text-zinc-600 max-w-md mx-auto">
                  Add content to your course by selecting an upload format below:
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModuleType("PDF");
                    setShowModuleModal(true);
                  }}
                  className="px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-medium inline-flex items-center transition-colors"
                >
                  <FileUp className="w-3.5 h-3.5 mr-1.5 text-red-600" /> Upload PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModuleType("TEXT");
                    setShowModuleModal(true);
                  }}
                  className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 text-xs font-medium inline-flex items-center transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-zinc-700" /> Manual Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModuleType("VIDEO");
                    setShowModuleModal(true);
                  }}
                  className="px-3 py-1.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-medium inline-flex items-center transition-colors"
                >
                  <Video className="w-3.5 h-3.5 mr-1.5 text-purple-600" /> YouTube Video
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModuleType("IMAGE");
                    setShowModuleModal(true);
                  }}
                  className="px-3 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium inline-flex items-center transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Photos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModuleType("LINK");
                    setShowModuleModal(true);
                  }}
                  className="px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium inline-flex items-center transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Other Link
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {course.modules?.map((mod: any, idx: number) => (
                <div
                  key={mod.id}
                  className="p-5 rounded-lg bg-white border border-zinc-200/90 hover:border-zinc-300 transition-all space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-7 h-7 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center font-mono font-semibold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-zinc-950">{mod.title}</h3>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${
                            mod.type === "VIDEO"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : mod.type === "PDF"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : mod.type === "IMAGE"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : mod.type === "LINK"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-zinc-100 text-zinc-700 border-zinc-200"
                          }`}>
                            {mod.type}
                          </span>
                        </div>
                        {mod.contentUrl && (
                          <a
                            href={mod.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-700 hover:text-zinc-900 inline-flex items-center mt-1 underline"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> View Attached File / Resource
                          </a>
                        )}
                        {mod.type === "VIDEO" && mod.contentUrl && !toEmbedUrl(mod.contentUrl) && (
                          <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-flex items-start">
                            <AlertCircle className="w-3 h-3 mr-1 mt-px shrink-0" />
                            This video URL may not play for trainees — use an uploaded video, youtube.com, or .mp4 link.
                          </p>
                        )}
                        {mod.contentText && (
                          <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{mod.contentText}</p>
                        )}
                        {mod.summary && (
                          <p className="text-[11px] text-zinc-500 italic mt-0.5">&bull; {mod.summary}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedModuleId(mod.id);
                          setAssessmentTitle(`${mod.title} Assessment`);
                          setShowAssessmentModal(true);
                        }}
                        className="px-3 py-1.5 rounded-md bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 border border-zinc-200 transition-colors inline-flex items-center"
                      >
                        <Award className="w-3.5 h-3.5 mr-1 text-zinc-600" /> Attach Quiz
                      </button>
                    </div>
                  </div>

                  {/* Attached Assessments */}
                  {mod.assessments?.length > 0 && (
                    <div className="pt-3 border-t border-zinc-100 space-y-2">
                      <p className="text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-500">
                        Evaluations in this module:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mod.assessments.map((a: any) => (
                          <div
                            key={a.id}
                            className="p-3 rounded-md bg-[#FBFBFA] border border-zinc-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-medium text-zinc-900">{a.title}</span>
                              <p className="text-[10px] font-mono text-zinc-600">{a.questions?.length || 0} Questions</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Module Modal - Multi-Format Media Studio */}
        {showModuleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-zinc-200 rounded-lg w-full max-w-xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">Add Curriculum Module</h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Publish multimodal scientific training: Videos, PDFs, High-Res Images, Direct Text, or External Portals.
                </p>
              </div>

              {uploadError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleAddModule} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Module Title</label>
                  <input
                    type="text"
                    required
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    placeholder="e.g. Deployment Protocol &amp; Acoustic Verification"
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Module Format Type
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 p-1 bg-zinc-100 rounded-lg border border-zinc-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setModuleType("PDF")}
                      className={`p-2 rounded-md font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
                        moduleType === "PDF"
                          ? "bg-white text-red-900 shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <FileUp className="w-4 h-4 text-red-600" />
                      <span className="text-[11px]">Upload PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModuleType("TEXT")}
                      className={`p-2 rounded-md font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
                        moduleType === "TEXT"
                          ? "bg-white text-zinc-950 shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <FileText className="w-4 h-4 text-zinc-700" />
                      <span className="text-[11px]">Manual Text</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModuleType("VIDEO")}
                      className={`p-2 rounded-md font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
                        moduleType === "VIDEO"
                          ? "bg-white text-purple-900 shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <Video className="w-4 h-4 text-purple-600" />
                      <span className="text-[11px]">YouTube Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModuleType("IMAGE")}
                      className={`p-2 rounded-md font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
                        moduleType === "IMAGE"
                          ? "bg-white text-amber-900 shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span className="text-[11px]">Photos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModuleType("LINK")}
                      className={`p-2 rounded-md font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
                        moduleType === "LINK"
                          ? "bg-white text-blue-900 shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <Link2 className="w-4 h-4 text-blue-600" />
                      <span className="text-[11px]">Other Link</span>
                    </button>
                  </div>
                </div>

                {/* --- YOUTUBE / VIDEO INPUT --- */}
                {moduleType === "VIDEO" && (
                  <div className="space-y-3 bg-[#FBFBFA] p-3.5 rounded-lg border border-zinc-200/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-medium text-zinc-800">
                          YouTube Video URL or Uploaded Video
                        </label>
                        <p className="text-[11px] text-zinc-500">Paste any YouTube URL or upload an MP4/WebM file</p>
                      </div>
                      <label className="cursor-pointer text-[11px] font-medium text-zinc-900 bg-white border border-zinc-200 px-2.5 py-1 rounded hover:bg-zinc-50 transition-colors inline-flex items-center shadow-2xs">
                        <UploadCloud className="w-3 h-3 mr-1 text-purple-600" />
                        {uploadingFile ? "Uploading..." : "Upload MP4/WebM"}
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/... or /uploads/video.mp4"
                      className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                    />

                    {contentUrl.trim() && (() => {
                      const media = toEmbedUrl(contentUrl);
                      if (!media) {
                        return (
                          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 flex items-start">
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5 mt-px shrink-0" />
                            URL format not recognized. Use a YouTube link (youtube.com or youtu.be), or uploaded video file (.mp4).
                          </p>
                        );
                      }
                      if (media.kind === "file") {
                        return (
                          <div className="space-y-1">
                            <video
                              src={media.src}
                              controls
                              className="aspect-video w-full rounded-md bg-black border border-zinc-200 max-h-48"
                            />
                            <p className="text-[11px] text-emerald-700">Direct video detected — trainees can stream it directly.</p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-1">
                          <div className="aspect-video w-full rounded-md overflow-hidden bg-black border border-zinc-200 max-h-48">
                            <iframe
                              src={media.src}
                              title="YouTube Video Preview"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <p className="text-[11px] text-emerald-700">YouTube video preview ready.</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* --- PDF INPUT --- */}
                {moduleType === "PDF" && (
                  <div className="space-y-3 bg-[#FBFBFA] p-3.5 rounded-lg border border-zinc-200/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-medium text-zinc-800">
                          Upload PDF Document or Technical SOP
                        </label>
                        <p className="text-[11px] text-zinc-500">Upload PDF directly or provide a hosted link</p>
                      </div>
                      <label className="cursor-pointer text-[11px] font-medium text-zinc-900 bg-white border border-zinc-200 px-2.5 py-1 rounded hover:bg-zinc-50 transition-colors inline-flex items-center shadow-2xs">
                        <UploadCloud className="w-3 h-3 mr-1 text-red-600" />
                        {uploadingFile ? "Uploading PDF..." : "Upload PDF File"}
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="e.g. /uploads/manual.pdf or external PDF link"
                      className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                    />

                    {contentUrl.trim() && (
                      <div className="p-3 bg-white rounded border border-zinc-200 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-red-600" />
                          <span className="font-medium text-zinc-800 truncate max-w-xs">{contentUrl}</span>
                        </div>
                        <a
                          href={contentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-700 hover:text-zinc-900 underline text-[11px] inline-flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> Open / Test PDF
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* --- PHOTOS / DIAGRAM INPUT --- */}
                {moduleType === "IMAGE" && (
                  <div className="space-y-3 bg-[#FBFBFA] p-3.5 rounded-lg border border-zinc-200/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-medium text-zinc-800">
                          Upload Photos, Diagrams, or Schematics
                        </label>
                        <p className="text-[11px] text-zinc-500">Equipment photos, radar charts, schematics (PNG, JPG, SVG, WebP)</p>
                      </div>
                      <label className="cursor-pointer text-[11px] font-medium text-zinc-900 bg-white border border-zinc-200 px-2.5 py-1 rounded hover:bg-zinc-50 transition-colors inline-flex items-center shadow-2xs">
                        <UploadCloud className="w-3 h-3 mr-1 text-amber-600" />
                        {uploadingFile ? "Uploading..." : "Upload Photo / Image"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="e.g. /uploads/radar_scan.png or external photo link"
                      className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                    />

                    {contentUrl.trim() && (
                      <div className="space-y-1">
                        <div className="max-h-48 overflow-hidden rounded-md border border-zinc-200 bg-zinc-900 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={contentUrl}
                            alt="Module Photo Preview"
                            className="max-h-48 object-contain"
                          />
                        </div>
                        <p className="text-[11px] text-emerald-700">Photo preview verified.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* --- OTHER LINK INPUT --- */}
                {moduleType === "LINK" && (
                  <div className="space-y-3 bg-[#FBFBFA] p-3.5 rounded-lg border border-zinc-200/80">
                    <div>
                      <label className="block text-xs font-medium text-zinc-800">
                        Other External Link / Scientific Web Portal
                      </label>
                      <p className="text-[11px] text-zinc-500">Reference link, official government portal, live observatory, or web tool</p>
                    </div>
                    <input
                      type="url"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="https://incois.gov.in/portal/ or https://mausam.imd.gov.in/ or any reference link"
                      className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                    />
                    {contentUrl.trim() && (
                      <a
                        href={contentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-700 hover:text-zinc-900 underline text-[11px] inline-flex items-center"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Test Link in New Tab
                      </a>
                    )}
                  </div>
                )}

                {/* --- MANUAL TEXT / SOP (Common or Primary for TEXT) --- */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    {moduleType === "TEXT"
                      ? "Manual Text, Checklist & Standard Operating Procedure (SOP)"
                      : "Instructor Notes & Trainee Briefing (Optional)"}
                  </label>
                  <textarea
                    rows={moduleType === "TEXT" ? 7 : 3}
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    placeholder={
                      moduleType === "TEXT"
                        ? "Write or paste full manual text, procedures, checklists, scientific formulas, or step-by-step instructions..."
                        : "Add context, briefing notes, or instructions for trainees viewing this material..."
                    }
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900 font-normal leading-relaxed"
                  />
                  {moduleType === "TEXT" && (
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Trainees will read this manual text directly in their course viewer.
                    </p>
                  )}
                </div>

                {/* Key Takeaways / Summary bullet */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Key Competency Takeaway / Summary Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="e.g. Always verify acoustic voltage arming before crane release."
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModuleModal(false);
                      setUploadError(null);
                    }}
                    className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingModule || uploadingFile}
                    className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <span>{savingModule ? "Publishing Module..." : "Publish Module"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assessment Modal */}
        {showAssessmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white border border-zinc-200 rounded-lg w-full max-w-2xl p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto space-y-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">Create Competency Evaluation</h2>
                <p className="text-xs text-zinc-600 mt-0.5">Define multiple-choice questions to evaluate cadre comprehension.</p>
              </div>

              <form onSubmit={handleCreateAssessment} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Assessment Title</label>
                  <input
                    type="text"
                    required
                    value={assessmentTitle}
                    onChange={(e) => setAssessmentTitle(e.target.value)}
                    placeholder="e.g. Radar Calibration Protocol Evaluation"
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <p className="text-xs font-semibold text-zinc-950 font-mono">
                      Questions ({assessmentQuestions.length})
                    </p>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="text-xs text-zinc-900 hover:underline font-medium inline-flex items-center"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                    </button>
                  </div>

                  {assessmentQuestions.map((qDraft, qIdx) => (
                    <div key={qIdx} className="p-4 rounded-md bg-[#FBFBFA] border border-zinc-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-950 font-mono">Question #{qIdx + 1}</span>
                        {assessmentQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-[11px] text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        required
                        value={qDraft.question}
                        onChange={(e) => {
                          const updated = [...assessmentQuestions];
                          updated[qIdx].question = e.target.value;
                          setAssessmentQuestions(updated);
                        }}
                        placeholder="Enter the evaluation question..."
                        className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                      />

                      <div className="space-y-2 pt-1">
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                          Options (Select radio for correct answer):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {qDraft.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={qDraft.correctOptionIndex === optIdx}
                                onChange={() => {
                                  const updated = [...assessmentQuestions];
                                  updated[qIdx].correctOptionIndex = optIdx;
                                  setAssessmentQuestions(updated);
                                }}
                                className="text-zinc-900 focus:ring-zinc-900 h-3.5 w-3.5"
                              />
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...assessmentQuestions];
                                  updated[qIdx].options[optIdx] = e.target.value;
                                  setAssessmentQuestions(updated);
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-zinc-900 focus:outline-none ${
                                  qDraft.correctOptionIndex === optIdx
                                    ? "bg-white border-zinc-900 ring-1 ring-zinc-900 font-medium"
                                    : "bg-white border-zinc-200"
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowAssessmentModal(false)}
                    className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAssessment}
                    className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {savingAssessment ? "Saving..." : "Attach Assessment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Syllabus & Scope Modal */}
        {showSyllabusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white border border-zinc-200 rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-zinc-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">Edit Course Syllabus & Overview</h3>
                    <p className="text-[11px] text-zinc-500">
                      Update the high-level curriculum outline, instructional scope, or import from an existing document.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSyllabusModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateSyllabus} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">Course Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Course title..."
                    className="w-full px-3 py-2 rounded-md border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-700">Course Syllabus & Description</label>
                    <label className="inline-flex items-center space-x-1.5 text-[11px] font-medium text-zinc-700 hover:text-zinc-950 cursor-pointer bg-zinc-50 hover:bg-zinc-100 px-2 py-1 rounded border border-zinc-200 transition-colors">
                      <FileUp className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Upload Syllabus File</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.md,.csv,.doc,.docx"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
                              const text = await file.text();
                              setEditDescription((prev) => (prev ? prev + "\n\n" + text : text));
                            } else {
                              // Upload via upload API
                              const fd = new FormData();
                              fd.append("file", file);
                              const res = await fetch("/api/upload", { method: "POST", body: fd });
                              const data = await res.json();
                              if (res.ok && data.url) {
                                const note = `\n\n[Attached Syllabus Document: ${file.name}](${data.url})`;
                                setEditDescription((prev) => prev + note);
                              } else {
                                alert(data.error || "Failed to upload document file");
                              }
                            }
                          } catch (err: any) {
                            alert("Failed to read document: " + err.message);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={8}
                    required
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Enter comprehensive syllabus, operational objectives, weekly breakdown, or required prerequisites..."
                    className="w-full px-3 py-2 rounded-md border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 bg-white font-mono leading-relaxed"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Supports Markdown formatting. Uploading a text/markdown file appends its content directly, or you can attach PDFs/docs as reference syllabus links.
                  </p>
                </div>

                <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowSyllabusModal(false)}
                    className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSyllabus}
                    className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {savingSyllabus ? "Saving Changes..." : "Save Syllabus"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
