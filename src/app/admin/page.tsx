import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { Users, GraduationCap, TrendingUp, Compass, ArrowUpRight } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";


export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  const userRole = (session.user as any)?.role;
  if (userRole === "TRAINER") {
    redirect("/trainer?access_denied=admin");
  } else if (userRole === "TRAINEE") {
    redirect("/trainee?access_denied=admin");
  } else if (userRole !== "ADMIN") {
    redirect("/login");
  }

  // Real aggregated stats
  const [traineeCount, trainerCount, blockCount, courseCount, enrollmentCount] = await Promise.all([
    prisma.user.count({ where: { role: "TRAINEE" } }),
    prisma.user.count({ where: { role: "TRAINER" } }),
    prisma.competencyBlock.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
  ]);

  const completedEnrollments = await prisma.enrollment.count({ where: { status: "COMPLETED" } });
  const completionRate = enrollmentCount > 0 ? Math.round((completedEnrollments / enrollmentCount) * 100) : 0;

  // Recent activity
  const recentEnrollments = await prisma.enrollment.findMany({
    take: 6,
    orderBy: { enrolledAt: "desc" },
    include: {
      trainee: { select: { name: true, department: true } },
      course: { select: { title: true } },
    },
  });

  // Real competency block completion rates
  const blocks = await prisma.competencyBlock.findMany({
    include: {
      courses: {
        include: { enrollments: true },
      },
    },
    take: 3,
  });

  const blockStats = blocks.map((block) => {
    let total = 0;
    let completed = 0;
    for (const course of block.courses) {
      total += course.enrollments.length;
      completed += course.enrollments.filter((e) => e.status === "COMPLETED").length;
    }
    return {
      title: block.title,
      category: block.category,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      total,
    };
  });

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 selection:bg-zinc-200 selection:text-zinc-950">
      <Navbar role="ADMIN" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-serif-heading text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950">
                Directorate Executive Overview
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                MoES HQ
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Nationwide capacity development, personnel onboarding, and scientific skill-gap analytics across 6 institutes.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/users"
              className="px-3.5 py-2 rounded-md bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 border border-zinc-200 transition-colors"
            >
              Personnel Directory
            </Link>
            <Link
              href="/admin/pathways"
              className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors"
            >
              + Add Competency Block
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Total Trainees</span>
              <Users className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl font-semibold text-zinc-950 font-mono tracking-tight">{traineeCount}</div>
            <p className="text-[11px] text-zinc-600 mt-1">{trainerCount} Active Certified Trainers</p>
          </div>

          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Competency Blocks</span>
              <Compass className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl font-semibold text-zinc-950 font-mono tracking-tight">{blockCount}</div>
            <p className="text-[11px] text-zinc-600 mt-1">{courseCount} Active Curriculum Programs</p>
          </div>

          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Registrations</span>
              <GraduationCap className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl font-semibold text-zinc-950 font-mono tracking-tight">{enrollmentCount}</div>
            <p className="text-[11px] text-zinc-600 mt-1">{completedEnrollments} Verified Certifications</p>
          </div>

          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Completion Rate</span>
              <TrendingUp className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-2xl font-semibold text-zinc-950 font-mono tracking-tight">{completionRate}%</div>
            <p className="text-[11px] text-emerald-800 mt-1 font-medium">Aggregated across all institutes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Competency Block Real Progress */}
          <div className="lg:col-span-2 p-6 rounded-lg bg-white border border-zinc-200/90 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">
                  National Competency Block Progress
                </h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Real-time completion telemetry from registered personnel across institutes.
                </p>
              </div>
              <Link
                href="/admin/analytics"
                className="text-xs text-zinc-900 hover:text-zinc-700 font-medium flex items-center"
              >
                Detailed Analytics <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {blockStats.length === 0 ? (
              <p className="text-xs text-zinc-600 py-6">No active competency blocks yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {blockStats.map((block) => (
                  <div key={block.title} className="p-4 rounded-md bg-[#FBFBFA] border border-zinc-200">
                    <span className="text-[11px] text-zinc-600 font-mono line-clamp-1">{block.title}</span>
                    <p className="text-xl font-semibold text-zinc-950 font-mono mt-1">{block.rate}%</p>
                    <div className="w-full bg-zinc-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-zinc-800 transition-all duration-300"
                        style={{ width: `${block.rate}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-2">{block.total} officers enrolled</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <h2 className="text-sm font-semibold text-zinc-950">Recent Officer Activity</h2>
            <div className="space-y-2.5">
              {recentEnrollments.length === 0 ? (
                <p className="text-xs text-zinc-600">No enrollment activities recorded yet.</p>
              ) : (
                recentEnrollments.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-md bg-[#FBFBFA] border border-zinc-200/80 text-xs"
                  >
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-zinc-900 truncate">{item.trainee.name}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{item.trainee.department}</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded shrink-0 ${
                        item.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      }`}
                    >
                      {item.status === "COMPLETED" ? "Certified" : `${item.progressPercent}%`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
