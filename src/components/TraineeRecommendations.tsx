"use client";

import { useEffect, useState } from "react";
import { Compass, ArrowRight } from "lucide-react";
import Link from "next/link";

export function TraineeRecommendations({ traineeId }: { traineeId: string }) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getRecommendations() {
      try {
        const res = await fetch("/api/ai/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ traineeId }),
        });
        const data = await res.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        setLoading(false);
      }
    }
    if (traineeId) {
      getRecommendations();
    }
  }, [traineeId]);

  if (loading) {
    return (
      <div className="p-5 rounded-lg bg-white border border-zinc-200/90 text-xs text-zinc-600 animate-pulse">
        Synthesizing role-aligned competency pathways...
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">Recommended For Your Cadre</h2>
          <p className="text-xs text-zinc-600 mt-0.5">Automated curriculum recommendations based on current module registrations</p>
        </div>
        <span className="text-[10px] font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
          Advisory Telemetry
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="p-4 rounded-md bg-[#FBFBFA] border border-zinc-200 flex flex-col justify-between space-y-2 hover:border-zinc-300 transition-colors"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-wider flex items-center">
                <Compass className="w-3 h-3 mr-1 text-zinc-500" />
                Target Competency
              </span>
              <p className="text-xs text-zinc-800 leading-relaxed font-normal">{rec.reason}</p>
            </div>
            <Link
              href="/trainee/catalog"
              className="text-[11px] font-medium text-zinc-900 hover:text-zinc-700 flex items-center pt-2"
            >
              Explore In Catalog <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
