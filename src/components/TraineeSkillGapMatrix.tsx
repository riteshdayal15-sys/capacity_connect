"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Target,
  Compass,
} from "lucide-react";
import Link from "next/link";

interface CompetencyItem {
  blockId: string;
  title: string;
  category: string;
  status: "MASTERED" | "COMPETENT" | "NEEDS_IMPROVEMENT" | "UNTESTED";
  gapLevel: "NONE" | "MODERATE" | "CRITICAL";
  masteryScore: number;
  attemptsCount: number;
  isEnrolled: boolean;
  isCompleted: boolean;
  courseId: string | null;
  suggestion: string;
}

interface SkillGapData {
  trainee: {
    id: string;
    name: string;
    department: string;
  };
  overallReadiness: number;
  competencies: CompetencyItem[];
  summary: {
    totalCompetencies: number;
    masteredCount: number;
    criticalGapsCount: number;
    moderateGapsCount: number;
  };
  criticalGaps: CompetencyItem[];
  moderateGaps: CompetencyItem[];
  masteredSkills: CompetencyItem[];
}

export function TraineeSkillGapMatrix({ traineeId }: { traineeId: string }) {
  const [data, setData] = useState<SkillGapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "GAPS" | "MASTERED">("ALL");

  useEffect(() => {
    async function loadSkillGap() {
      try {
        const res = await fetch(`/api/trainee/skill-gap?traineeId=${traineeId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load skill gap matrix:", err);
      } finally {
        setLoading(false);
      }
    }

    if (traineeId) {
      loadSkillGap();
    }
  }, [traineeId]);

  if (loading) {
    return (
      <div className="p-6 rounded-lg bg-white border border-zinc-200/90 text-xs text-zinc-500 animate-pulse space-y-2">
        <div className="h-4 bg-zinc-100 rounded w-1/4"></div>
        <div className="h-20 bg-zinc-50 rounded"></div>
      </div>
    );
  }

  if (!data || data.competencies.length === 0) {
    return null;
  }

  const displayedCompetencies = data.competencies.filter((c) => {
    if (activeFilter === "GAPS") return c.gapLevel === "CRITICAL" || c.gapLevel === "MODERATE";
    if (activeFilter === "MASTERED") return c.status === "MASTERED" || c.status === "COMPETENT";
    return true;
  });

  return (
    <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Header & Overall Readiness Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-zinc-800" />
            <h2 className="text-sm font-semibold text-zinc-950">
              National Cadre Competency &amp; Skill Gap Matrix
            </h2>
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">
            Diagnostic evaluation mapping your assessment accuracy and certifications against MoES cadre benchmarks.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto bg-[#FBFBF9] px-3.5 py-2 rounded-lg border border-zinc-200">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Cadre Readiness
            </span>
            <span className="text-lg font-bold font-mono text-zinc-950">
              {data.overallReadiness}%
            </span>
          </div>
          <div className="w-12 bg-zinc-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                data.overallReadiness >= 75
                  ? "bg-emerald-600"
                  : data.overallReadiness >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${data.overallReadiness}%` }}
            />
          </div>
        </div>
      </div>

      {/* High-Level Diagnostic Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-md bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-medium text-emerald-950">Mastered Competencies</span>
          </div>
          <span className="text-sm font-bold font-mono text-emerald-800">
            {data.summary.masteredCount}
          </span>
        </div>

        <div className="p-3.5 rounded-md bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-medium text-amber-950">Moderate Skill Gaps</span>
          </div>
          <span className="text-sm font-bold font-mono text-amber-800">
            {data.summary.moderateGapsCount}
          </span>
        </div>

        <div className="p-3.5 rounded-md bg-red-50/60 border border-red-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <span className="text-xs font-medium text-red-950">Actionable Skill Gaps</span>
          </div>
          <span className="text-sm font-bold font-mono text-red-800">
            {data.summary.criticalGapsCount}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-1 bg-zinc-100 p-0.5 rounded-md text-xs border border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1 rounded font-medium transition-all ${
              activeFilter === "ALL"
                ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            All Competencies ({data.competencies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("GAPS")}
            className={`px-3 py-1 rounded font-medium transition-all ${
              activeFilter === "GAPS"
                ? "bg-white text-red-900 shadow-2xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Skill Gaps ({data.summary.criticalGapsCount + data.summary.moderateGapsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("MASTERED")}
            className={`px-3 py-1 rounded font-medium transition-all ${
              activeFilter === "MASTERED"
                ? "bg-white text-emerald-900 shadow-2xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Verified Strengths ({data.summary.masteredCount})
          </button>
        </div>

        <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
          {data.trainee.department || "Ministry of Earth Sciences"} Cadre
        </span>
      </div>

      {/* Competencies Detailed Breakdown */}
      <div className="grid grid-cols-1 gap-3">
        {displayedCompetencies.map((comp) => {
          const isCritical = comp.gapLevel === "CRITICAL" || comp.status === "NEEDS_IMPROVEMENT";
          const isMastered = comp.status === "MASTERED";
          const isModerate = comp.gapLevel === "MODERATE";

          return (
            <div
              key={comp.blockId}
              className={`p-4 rounded-lg border transition-all text-xs space-y-3 ${
                isCritical
                  ? "bg-red-50/30 border-red-200 hover:border-red-300"
                  : isMastered
                  ? "bg-emerald-50/30 border-emerald-200 hover:border-emerald-300"
                  : "bg-[#FBFBFA] border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-zinc-950 text-sm">{comp.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-zinc-600 border border-zinc-200">
                      {comp.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    {comp.attemptsCount > 0
                      ? `${comp.attemptsCount} Evaluation Attempt(s) recorded`
                      : comp.isEnrolled
                      ? "Enrolled & In Progress"
                      : "Not enrolled in this competency track"}
                  </p>
                </div>

                {/* Score & Status Badge */}
                <div className="flex items-center space-x-3 self-start sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                      Mastery Index
                    </span>
                    <span className="font-mono font-bold text-zinc-900 text-sm">
                      {comp.masteryScore > 0 ? `${comp.masteryScore}%` : "0%"}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                      isCritical
                        ? "bg-red-100 text-red-800 border-red-300"
                        : isMastered
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {comp.status === "NEEDS_IMPROVEMENT"
                      ? "Skill Gap"
                      : comp.status === "UNTESTED"
                      ? "Pending Gap"
                      : comp.status}
                  </span>
                </div>
              </div>

              {/* Actionable Suggestion Callout */}
              <div className="p-3 bg-white rounded-md border border-zinc-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start space-x-2 text-zinc-700 leading-relaxed">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-zinc-950 font-medium">Actionable Recommendation: </strong>
                    {comp.suggestion}
                  </span>
                </div>

                {comp.courseId ? (
                  <Link
                    href={
                      comp.isEnrolled
                        ? `/trainee/courses/${comp.courseId}`
                        : `/trainee/catalog`
                    }
                    className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-medium inline-flex items-center shrink-0 self-start sm:self-auto transition-colors"
                  >
                    <span>{comp.isEnrolled ? "Resume Track" : "Bridge This Gap"}</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                ) : (
                  <Link
                    href="/trainee/catalog"
                    className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-medium inline-flex items-center shrink-0 self-start sm:self-auto transition-colors"
                  >
                    <span>Browse Catalog</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
