import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { BookOpen, Users, Plus, BrainCircuit, Layers, ArrowUpRight, Sparkles } from "lucide-react";

export default async function TrainerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== "TRAINER" && (session.user as any).role !== "ADMIN")) {
    redirect("/login");
  }

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  const courses = await prisma.course.findMany({
    where: userRole === "ADMIN" ? {} : { trainerId: userId },
    include: {
      competencyBlock: true,
      modules: {
        include: {
          assessments: true,
        },
      },
      enrollments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 selection:bg-zinc-200 selection:text-zinc-950">
      <Navbar role="TRAINER" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-zinc-700" />
              Scientific Curriculum Workspace
            </h1>
            <p className="text-xs text-zinc-600 mt-1">
              Curate specialized training curricula, publish procedural modules, and author calibrated assessments.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href="/trainer/create-course"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>AI Document to Course</span>
            </Link>
            <Link
              href="/trainer/ai-studio"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800 transition-colors shadow-2xs"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-zinc-600" />
              <span>Assessment Studio</span>
            </Link>
            <Link
              href="/trainer/create-course"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Course</span>
            </Link>
          </div>
        </div>

        {/* Courses Section */}
        {courses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2">
            <Layers className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-xs text-zinc-600 font-medium">No courses published under your instructor profile yet.</p>
            <Link
              href="/trainer/create-course"
              className="inline-block text-xs font-semibold text-zinc-900 hover:underline pt-2"
            >
              Author your first curriculum program &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-6 rounded-lg bg-white border border-zinc-200/90 hover:border-zinc-300 transition-all flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 truncate max-w-[180px]">
                      {course.competencyBlock.title}
                    </span>
                    <span className="text-xs text-zinc-600 font-mono flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                      {course.enrollments.length} Cadres
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-950 mb-1.5 leading-snug">{course.title}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3 font-normal">
                    {course.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-zinc-600 font-mono text-[11px]">
                    {course.modules.length} {course.modules.length === 1 ? "Module" : "Modules"}
                  </span>
                  <Link
                    href={`/trainer/courses/${course.id}`}
                    className="font-medium text-zinc-900 hover:text-zinc-700 flex items-center"
                  >
                    Curriculum Detail <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
