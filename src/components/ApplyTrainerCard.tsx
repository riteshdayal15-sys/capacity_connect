"use client";

import { useState } from "react";
import { GraduationCap, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";

interface ApplyTrainerProps {
  currentStatus: string; // NONE, PENDING, APPROVED, REJECTED
  currentNote?: string | null;
}

export function ApplyTrainerCard({ currentStatus, currentNote }: ApplyTrainerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit application");
      setStatus("PENDING");
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "APPROVED") {
    return null; // Already a trainer
  }

  if (status === "PENDING") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-amber-950">
              Trainer Accreditation Under Review
            </h4>
            <p className="text-[11px] text-amber-800/90">
              Your application for faculty instructor privileges is currently pending approval by the Ministry Administrator.
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-200 uppercase font-semibold">
          Pending
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-950">
              Are you a Scientific Officer or Faculty Member?
            </h4>
            <p className="text-[11px] text-zinc-600">
              Apply for Trainer Accreditation to author curriculum tracks, manage cohorts, and build assessments.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors flex items-center space-x-1.5 self-start sm:self-auto shrink-0"
        >
          <span>Apply for Trainer Privileges</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-zinc-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">
                Apply for Trainer / Instructor Accreditation
              </h3>
              <p className="text-xs text-zinc-600 mt-1">
                Your application will be submitted to the Ministry HRD Admin console for verification.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleApply} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-800 mb-1">
                  Field Specialization &amp; Experience
                </label>
                <textarea
                  required
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Scientist-E at NIOT Chennai. 10 years experience in deep-sea instrumentation and submersibles."
                  className="w-full px-3 py-2 rounded bg-white border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-zinc-700 hover:bg-zinc-100 border border-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
