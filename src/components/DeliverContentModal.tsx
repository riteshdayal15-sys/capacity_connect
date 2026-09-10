"use client";

import { useState, useEffect } from "react";
import { UserPlus, Search, Building, Mail, CheckCircle2, BookOpen, AlertCircle, X, Layers } from "lucide-react";

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
}

export function DeliverContentModal({
  isOpen,
  onClose,
  onSuccess,
  courses,
  preselectedCourseId,
}: DeliverContentModalProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(
    preselectedCourseId || (courses.length > 0 ? courses[0].id : "")
  );
  const [trainees, setTrainees] = useState<any[]>([]);
  const [selectedTraineeId, setSelectedTraineeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingTrainees, setFetchingTrainees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
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
            // Filter to trainees
            const traineeList = data.filter((u: any) => u.role === "TRAINEE");
            setTrainees(traineeList);
            if (traineeList.length > 0) {
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
  }, [isOpen, preselectedCourseId, courses]);

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

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !selectedTraineeId) {
      setError("Please select both a course curriculum and a trainee.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
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

      setSuccessMessage(
        `Curriculum "${selectedCourse?.title}" successfully delivered to ${selectedTrainee?.name}. All modules and materials are now accessible on their trainee portal.`
      );

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "An error occurred during enrollment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-zinc-950 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-950">
              Deliver Subject Content &amp; Manually Enroll Trainee
            </h3>
          </div>
          <p className="text-xs text-zinc-600">
            Select an officer from the MoES trainee cadre to enroll them into your subject pathway curriculum. All modules (videos, PDFs, notes, and assessments) will be immediately dispatched to their dashboard.
          </p>
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
          {/* Course Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-900 mb-1">
              Select Curriculum to Deliver <span className="text-amber-600">*</span>
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

            {selectedCourse && (
              <div className="mt-2 p-2.5 rounded-md bg-zinc-50 border border-zinc-150 text-[11px] text-zinc-600 flex items-center space-x-3">
                <span className="flex items-center">
                  <Layers className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                  {selectedCourse.modules?.length || 0} Modules Ready
                </span>
                <span className="text-zinc-300">|</span>
                <span className="font-mono text-zinc-500">
                  Pathway: {selectedCourse.competencyBlock?.title || "Specialized"}
                </span>
              </div>
            )}
          </div>

          {/* Trainee Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-900">
                Select Trainee / Scientific Officer <span className="text-amber-600">*</span>
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
              <div className="max-h-44 overflow-y-auto border border-zinc-200 rounded-md divide-y divide-zinc-100 bg-[#FBFBF9]">
                {filteredTrainees.map((t) => {
                  const isSelected = t.id === selectedTraineeId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTraineeId(t.id)}
                      className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between ${
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
              <UserPlus className="w-3.5 h-3.5" />
              <span>{loading ? "Delivering..." : "Deliver Content & Enroll"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
