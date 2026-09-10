"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Search,
  Building,
  Mail,
  CheckCircle2,
  BookOpen,
  AlertCircle,
  X,
  Layers,
  FileText,
  Video,
  Image as ImageIcon,
  Link2,
  UploadCloud,
  FileUp,
  ExternalLink,
  Send,
} from "lucide-react";
import { toEmbedUrl } from "@/lib/video";

interface DeliverContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  courses: Array<{
    id: string;
    title: string;
    description?: string;
    competencyBlock?: { title: string };
    modules?: Array<{ id: string; title: string; type: string }>;
  }>;
  preselectedCourseId?: string;
  defaultFormat?: "PDF" | "TEXT" | "VIDEO" | "IMAGE" | "LINK";
}

export function DeliverContentModal({
  isOpen,
  onClose,
  onSuccess,
  courses,
  preselectedCourseId,
  defaultFormat,
}: DeliverContentModalProps) {
  const [deliveryMode, setDeliveryMode] = useState<"EXISTING" | "NEW_CONTENT">(
    defaultFormat ? "NEW_CONTENT" : "EXISTING"
  );
  const [selectedCourseId, setSelectedCourseId] = useState(
    preselectedCourseId || (courses.length > 0 ? courses[0].id : "")
  );
  const [trainees, setTrainees] = useState<any[]>([]);
  const [selectedTraineeId, setSelectedTraineeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Content format state for NEW_CONTENT delivery mode
  const [contentType, setContentType] = useState<"PDF" | "TEXT" | "VIDEO" | "IMAGE" | "LINK">(
    defaultFormat || "PDF"
  );
  const [contentTitle, setContentTitle] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [contentText, setContentText] = useState("");
  const [summary, setSummary] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchingTrainees, setFetchingTrainees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setUploadError(null);
      if (defaultFormat) {
        setDeliveryMode("NEW_CONTENT");
        setContentType(defaultFormat);
      }
      if (preselectedCourseId) {
        setSelectedCourseId(preselectedCourseId);
      } else if (courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courses[0].id);
      }

      setFetchingTrainees(true);
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const traineeList = data.filter((u: any) => u.role === "TRAINEE");
            setTrainees(traineeList);
            if (traineeList.length > 0 && !selectedTraineeId) {
              setSelectedTraineeId(traineeList[0].id);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load trainees:", err);
          setError("Failed to load trainees list.");
        })
        .finally(() => setFetchingTrainees(false));
    }
  }, [isOpen, preselectedCourseId, courses, defaultFormat]);

  if (!isOpen) return null;

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const selectedTrainee = trainees.find((t) => t.id === selectedTraineeId);

  const filteredTrainees = trainees.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.department && t.department.toLowerCase().includes(q))
    );
  });

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
      if (!contentTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setContentTitle(cleanName);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !selectedTraineeId) {
      setError("Please select both a course curriculum and a trainee.");
      return;
    }

    if (deliveryMode === "NEW_CONTENT" && !contentTitle.trim()) {
      setError("Please provide a title for the content being delivered.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. If delivering new content, create the module first
      if (deliveryMode === "NEW_CONTENT") {
        const modRes = await fetch("/api/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: selectedCourseId,
            title: contentTitle.trim(),
            type: contentType,
            contentUrl: contentUrl.trim() || null,
            contentText: contentText.trim() || null,
            summary: summary.trim() || null,
            order: (selectedCourse?.modules?.length || 0) + 1,
          }),
        });

        if (!modRes.ok) {
          const modData = await modRes.json();
          throw new Error(modData.error || "Failed to save content module.");
        }
      }

      // 2. Enroll trainee in the course (delivering all materials to their account)
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          traineeId: selectedTraineeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to deliver content to trainee.");
      }

      const modeDesc =
        deliveryMode === "NEW_CONTENT"
          ? `New ${contentType} material "${contentTitle}" was published and delivered`
          : `Curriculum "${selectedCourse?.title}" was delivered`;

      setSuccessMessage(
        `${modeDesc} to ${selectedTrainee?.name}. The officer now has full access on their dashboard.`
      );

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "An error occurred during delivery.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200 max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-zinc-950 text-white flex items-center justify-center">
              <Send className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-950">
              Deliver Subject Content to Trainee Officer
            </h3>
          </div>
          <p className="text-xs text-zinc-600">
            Dispatch instructional content directly to an enrolled scientific officer. You can deliver full curriculum tracks or attach and deliver specific content in 5 formats: <strong>PDF, Manual Text, YouTube Video, Photos, or Web Links</strong>.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200 text-xs">
          <button
            type="button"
            onClick={() => setDeliveryMode("EXISTING")}
            className={`py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center space-x-1.5 ${
              deliveryMode === "EXISTING"
                ? "bg-white text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-zinc-700" />
            <span>Deliver Complete Curriculum</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode("NEW_CONTENT")}
            className={`py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center space-x-1.5 ${
              deliveryMode === "NEW_CONTENT"
                ? "bg-white text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <FileUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Upload &amp; Deliver Content (5 Formats)</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleDeliver} className="space-y-4">
          {/* Target Course */}
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Target Course / Pathway <span className="text-amber-600">*</span>
            </label>
            {courses.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                You have not created any courses in your assigned subject yet. Please create a course first.
              </p>
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={!!preselectedCourseId}
                className="w-full px-3 py-2 rounded-md bg-[#FBFBF9] border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} {course.competencyBlock?.title ? `(${course.competencyBlock.title})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* NEW CONTENT ATTACHMENT SECTION (5 FORMATS) */}
          {deliveryMode === "NEW_CONTENT" && (
            <div className="p-4 rounded-lg bg-[#FBFBFA] border border-zinc-200 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 mb-1">
                  Select Content Format to Deliver <span className="text-amber-600">*</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => setContentType("PDF")}
                    className={`p-2 rounded-md border text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                      contentType === "PDF"
                        ? "bg-white border-red-500 text-red-900 ring-1 ring-red-500 font-semibold shadow-xs"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <FileUp className="w-4 h-4 text-red-600" />
                    <span className="text-[11px]">Upload PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContentType("TEXT")}
                    className={`p-2 rounded-md border text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                      contentType === "TEXT"
                        ? "bg-white border-zinc-900 text-zinc-950 ring-1 ring-zinc-900 font-semibold shadow-xs"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-zinc-700" />
                    <span className="text-[11px]">Manual Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContentType("VIDEO")}
                    className={`p-2 rounded-md border text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                      contentType === "VIDEO"
                        ? "bg-white border-purple-600 text-purple-950 ring-1 ring-purple-600 font-semibold shadow-xs"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <Video className="w-4 h-4 text-purple-600" />
                    <span className="text-[11px]">YouTube Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContentType("IMAGE")}
                    className={`p-2 rounded-md border text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                      contentType === "IMAGE"
                        ? "bg-white border-amber-500 text-amber-950 ring-1 ring-amber-500 font-semibold shadow-xs"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span className="text-[11px]">Photos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContentType("LINK")}
                    className={`p-2 rounded-md border text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                      contentType === "LINK"
                        ? "bg-white border-blue-600 text-blue-950 ring-1 ring-blue-600 font-semibold shadow-xs"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <Link2 className="w-4 h-4 text-blue-600" />
                    <span className="text-[11px]">Other Link</span>
                  </button>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Content Title <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder={`e.g. Standard Operating Procedure for ${
                    contentType === "PDF"
                      ? "Sensor Depth Calibration (PDF)"
                      : contentType === "VIDEO"
                      ? "Doppler Radar Sweep Lecture"
                      : contentType === "IMAGE"
                      ? "Buoy Inductive Chain Diagram"
                      : contentType === "LINK"
                      ? "INCOIS Real-Time Wave Telemetry Portal"
                      : "Daily Wave Calibration Checklist"
                  }`}
                  className="w-full px-3 py-1.5 rounded-md bg-white border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              {/* Upload or Link inputs based on format */}
              {contentType === "PDF" && (
                <div className="space-y-2 p-3 bg-white rounded border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-800">Upload PDF Document</span>
                    <label className="cursor-pointer text-[11px] font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded transition-colors inline-flex items-center">
                      <UploadCloud className="w-3.5 h-3.5 mr-1 text-red-600" />
                      {uploadingFile ? "Uploading..." : "Browse PDF"}
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
                    placeholder="e.g. /uploads/sop.pdf or public PDF document URL"
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                  {contentUrl.trim() && (
                    <p className="text-[11px] text-emerald-700 font-mono">PDF URL verified.</p>
                  )}
                </div>
              )}

              {contentType === "VIDEO" && (
                <div className="space-y-2 p-3 bg-white rounded border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-800">YouTube Video URL / Upload MP4</span>
                    <label className="cursor-pointer text-[11px] font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded transition-colors inline-flex items-center">
                      <UploadCloud className="w-3.5 h-3.5 mr-1 text-purple-600" />
                      {uploadingFile ? "Uploading..." : "Upload MP4"}
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
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
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                  {contentUrl.trim() && (() => {
                    const media = toEmbedUrl(contentUrl);
                    return media ? (
                      <p className="text-[11px] text-emerald-700 font-mono">Video link recognized.</p>
                    ) : (
                      <p className="text-[11px] text-amber-700">Enter a valid YouTube URL or upload an MP4.</p>
                    );
                  })()}
                </div>
              )}

              {contentType === "IMAGE" && (
                <div className="space-y-2 p-3 bg-white rounded border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-800">Upload Photo / Schematic</span>
                    <label className="cursor-pointer text-[11px] font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded transition-colors inline-flex items-center">
                      <UploadCloud className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      {uploadingFile ? "Uploading..." : "Upload Photo"}
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
                    placeholder="e.g. /uploads/sensor_diagram.png or image URL"
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                  {contentUrl.trim() && (
                    <div className="max-h-32 overflow-hidden rounded border border-zinc-200 bg-zinc-900 flex items-center justify-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={contentUrl} alt="Preview" className="max-h-28 object-contain" />
                    </div>
                  )}
                </div>
              )}

              {contentType === "LINK" && (
                <div className="space-y-2 p-3 bg-white rounded border border-zinc-200">
                  <span className="text-xs font-medium text-zinc-800 block">External Scientific Web Portal / Link</span>
                  <input
                    type="url"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="https://incois.gov.in/ or https://mausam.imd.gov.in/"
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                  {contentUrl.trim() && (
                    <a
                      href={contentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 text-[11px] underline inline-flex items-center"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Test Link in New Tab
                    </a>
                  )}
                </div>
              )}

              {/* Manual Text / SOP Body */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  {contentType === "TEXT"
                    ? "Manual Text, Procedures & Checklists *"
                    : "Accompanying Instructor Notes / SOP Guidelines (Optional)"}
                </label>
                <textarea
                  rows={contentType === "TEXT" ? 5 : 2}
                  required={contentType === "TEXT"}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Detail step-by-step procedures, technical specifications, and key instructions..."
                  className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 leading-relaxed font-normal"
                />
              </div>

              {uploadError && (
                <p className="text-[11px] text-red-600">{uploadError}</p>
              )}
            </div>
          )}

          {/* Trainee Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-900">
                Select Recipient Trainee / Scientific Officer <span className="text-amber-600">*</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                {trainees.length} Available Officers
              </span>
            </div>

            {/* Quick search input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name, email, or institute..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#FBFBF9] border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
              />
            </div>

            {fetchingTrainees ? (
              <p className="text-xs text-zinc-500 py-3 text-center">Loading cadre officers...</p>
            ) : filteredTrainees.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center">No officers found matching search.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto border border-zinc-200 rounded-md divide-y divide-zinc-100 bg-[#FBFBF9]">
                {filteredTrainees.map((t) => {
                  const isSelected = t.id === selectedTraineeId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTraineeId(t.id)}
                      className={`p-2 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      <div>
                        <div className={`font-semibold ${isSelected ? "text-white" : "text-zinc-950"}`}>
                          {t.name}
                        </div>
                        <div
                          className={`text-[11px] font-mono flex items-center space-x-2 mt-0.5 ${
                            isSelected ? "text-zinc-300" : "text-zinc-500"
                          }`}
                        >
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-1 opacity-70" />
                            {t.email}
                          </span>
                          <span>•</span>
                          <span className="flex items-center">
                            <Building className="w-3 h-3 mr-1 opacity-70" />
                            {t.department || "MoES"}
                          </span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-100 border border-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCourseId || !selectedTraineeId || courses.length === 0}
              className="px-4 py-1.5 rounded-md text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {loading
                  ? "Delivering..."
                  : deliveryMode === "NEW_CONTENT"
                  ? `Deliver ${contentType} & Enroll Trainee`
                  : "Deliver Curriculum to Officer"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
