"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { BarChart3, Loader2 } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const CHART_COLORS = [
  "#18181b",
  "#3f3f46",
  "#71717a",
  "#2563eb",
  "#059669",
  "#d97706",
  "#4f46e5",
  "#0891b2",
];

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [insight, setInsight] = useState<string>("");
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const analyticsRes = await fetch("/api/analytics");
        const analyticsData = await analyticsRes.json();
        if (!analyticsRes.ok) throw new Error(analyticsData.error || "Analytics unavailable.");
        setAnalytics(analyticsData);
      } catch (err: any) {
        console.error("Analytics load error:", err);
        setAnalytics({ error: err.message || "Analytics unavailable." });
      } finally {
        setLoadingAnalytics(false);
      }
    }

    async function loadInsight() {
      try {
        const insightRes = await fetch("/api/ai/admin-insight");
        const insightData = await insightRes.json();
        if (!insightRes.ok) throw new Error(insightData.error || "Insight unavailable.");
        // The LLM sometimes returns markdown bold markers — strip them for clean display.
        setInsight((insightData.insight || "").replace(/\*\*/g, ""));
      } catch (err) {
        console.error("Insight load error:", err);
        setInsight("Intelligence telemetry unavailable.");
      } finally {
        setLoadingInsight(false);
      }
    }

    loadData();
    loadInsight();
  }, []);

  const barData = analytics?.completionByDept
    ? {
        labels: analytics.completionByDept.map((d: any) => d.department),
        datasets: [
          {
            label: "Completion %",
            data: analytics.completionByDept.map((d: any) => d.rate),
            backgroundColor: analytics.completionByDept.map((_: any, i: number) => CHART_COLORS[i % CHART_COLORS.length]),
            borderRadius: 4,
          },
        ],
      }
    : null;

  const lineData = analytics?.monthlyEnrollment
    ? {
        labels: analytics.monthlyEnrollment.labels,
        datasets: [
          {
            label: "Cadre Enrollments",
            data: analytics.monthlyEnrollment.counts,
            borderColor: "#18181b",
            backgroundColor: "rgba(24, 24, 27, 0.04)",
            fill: true,
            tension: 0.25,
            pointBackgroundColor: "#18181b",
            pointRadius: 3,
          },
        ],
      }
    : null;

  const chartOptions = (max?: number) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ...(max ? { max } : {}),
        grid: { color: "#f4f4f5" },
        ticks: { color: "#71717a", font: { size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#71717a", font: { size: 11 } },
      },
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-800 bg-emerald-50 border border-emerald-200";
    if (score >= 60) return "text-blue-800 bg-blue-50 border border-blue-200";
    return "text-amber-800 bg-amber-50 border border-amber-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Expert";
    if (score >= 60) return "Proficient";
    return "Developing";
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 selection:bg-zinc-200 selection:text-zinc-950">
      <Navbar role="ADMIN" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="border-b border-zinc-200 pb-6">
          <div className="flex items-center space-x-2">
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-zinc-700" />
              Competency Tracking &amp; Analytics Directorate
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
              Live DB Telemetry
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Aggregated metrics from active registrations, evaluations, and skill matrices across all MoES bodies.
          </p>
        </div>

        {/* Operational Insight Note */}
        <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">
              Curriculum Telemetry Analysis
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 font-mono">
              Groq Engine
            </span>
          </div>
          {loadingInsight ? (
            <div className="flex items-center space-x-2 text-xs text-zinc-600 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Synthesizing department completion patterns...</span>
            </div>
          ) : (
            <p className="text-xs text-zinc-800 leading-relaxed font-normal">{insight}</p>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Completion Bar Chart */}
          <div className="p-6 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-950">Completion Rates by Department</h3>
              <p className="text-xs text-zinc-600">Calculated from registered personnel and certified completions</p>
            </div>
            <div className="h-64">
              {loadingAnalytics ? (
                <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading data...
                </div>
              ) : barData && barData.labels.length > 0 ? (
                <Bar data={barData} options={chartOptions(100) as any} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                  No enrollment telemetry available.
                </div>
              )}
            </div>
          </div>

          {/* Monthly Trajectory */}
          <div className="p-6 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-950">Enrollment Growth Trajectory</h3>
              <p className="text-xs text-zinc-600">Cumulative cadre registrations over the past 6 months</p>
            </div>
            <div className="h-64">
              {loadingAnalytics ? (
                <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading data...
                </div>
              ) : lineData ? (
                <Line data={lineData} options={chartOptions() as any} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                  No registration data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skill-Gap Heatmap Matrix */}
        <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Skill-Gap Matrix Across MoES Institutes</h3>
            <p className="text-xs text-zinc-600">Cross-departmental proficiency mapping derived from verified assessment attempts</p>
          </div>

          {loadingAnalytics ? (
            <div className="text-xs text-zinc-600 flex items-center py-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Loading...
            </div>
          ) : analytics?.skillGapMatrix && analytics.skillGapMatrix.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-600 font-medium font-mono text-[11px]">
                    <th className="py-2.5 px-3">Institute / Department</th>
                    {Array.from(
                      new Set(analytics.skillGapMatrix.flatMap((r: any) => Object.keys(r.scores)))
                    ).map((block: any) => (
                      <th key={block} className="py-2.5 px-3">
                        {block}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {analytics.skillGapMatrix.map((row: any) => {
                    const blocks = Array.from(
                      new Set(analytics.skillGapMatrix.flatMap((r: any) => Object.keys(r.scores)))
                    );
                    return (
                      <tr key={row.department} className="hover:bg-zinc-50/50">
                        <td className="py-2.5 px-3 font-medium text-zinc-900">{row.department}</td>
                        {blocks.map((block: any) => {
                          const score = row.scores[block];
                          return score !== undefined ? (
                            <td key={block} className="py-2.5 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono ${getScoreColor(score)}`}>
                                {score}% ({getScoreLabel(score)})
                              </span>
                            </td>
                          ) : (
                            <td key={block} className="py-2.5 px-3 text-zinc-600 font-mono text-[11px]">
                              N/A
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-zinc-600 py-6">
              No evaluation attempts recorded yet. Completed trainee evaluations will populate this matrix.
            </div>
          )}
        </div>

        {/* Drop-off points */}
        {!loadingAnalytics && analytics?.moduleDropOff && analytics.moduleDropOff.length > 0 && (
          <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Module Completion Attrition</h3>
              <p className="text-xs text-zinc-600">Curriculum units where enrolled personnel exhibit completion bottlenecks</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analytics.moduleDropOff.map((m: any) => (
                <div key={m.module} className="flex items-center justify-between p-3 rounded-md bg-[#FBFBFA] border border-zinc-200 text-xs">
                  <span className="font-medium text-zinc-800 truncate mr-3">{m.module}</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
                    {m.dropOffRate} attrition
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
