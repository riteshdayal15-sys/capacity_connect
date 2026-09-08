import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { BookOpen, Award, ArrowRight, GraduationCap } from "lucide-react";
import { TraineeRecommendations } from "@/components/TraineeRecommendations";
import { TraineeSkillGapMatrix } from "@/components/TraineeSkillGapMatrix";
import { ApplyTrainerCard } from "@/components/ApplyTrainerCard";

export default async function TraineeDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user as any).role;
  if (userRole === "TRAINER") {
    redirect("/trainer");
  }

  const userId = (session.user as any).id;

  const [userProfile, enrollments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { trainerStatus: true, trainerRequestNote: true },
    }),
    prisma.enrollment.findMany({
      where: { traineeId: userId },
      include: {
        course: {
          include: {
            competencyBlock: true,
            modules: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;
  const inProgressCount = enrollments.filter((e) => e.status === "IN_PROGRESS").length;
  const totalCourses = enrollments.length;
  const overallCompletion =
    totalCourses > 0
      ? Math.round(
          enrollments.reduce((acc, curr) => acc + curr.progressPercent, 0) / totalCourses
        )
      : 0;

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 selection:bg-zinc-200 selection:text-zinc-950">
      <Navbar role="TRAINEE" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-serif-heading text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950">
                Officer Training Workspace
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                {(session.user as any).department || "MoES"}
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Welcome back, {session.user?.name}. Review curriculum modules, complete evaluations, and track certifications.
            </p>
          </div>

          <Link
            href="/trainee/catalog"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors self-start sm:self-auto"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse Competency Catalog</span>
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">
              Enrolled Courses
            </span>
            <div className="text-2xl font-semibold text-zinc-950 font-mono tracking-tight mt-1">{totalCourses}</div>
            <p className="text-[11px] text-zinc-600 mt-1">{inProgressCount} active in progress</p>
          </div>

          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">
              Certifications Earned
            </span>
            <div className="text-2xl font-semibold text-emerald-800 font-mono tracking-tight mt-1">{completedCount}</div>
            <p className="text-[11px] text-zinc-600 mt-1">Official MoES verified certificates</p>
          </div>

          <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">
              Overall Cadre Progress
            </span>
            <div className="text-2xl font-semibold text-zinc-950 font-mono tracking-tight mt-1">{overallCompletion}%</div>
            <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-zinc-800 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${overallCompletion}%` }}
              />
            </div>
          </div>
        </div>

        {/* Trainer Accreditation Banner */}
        <ApplyTrainerCard
          currentStatus={userProfile?.trainerStatus || "NONE"}
          currentNote={userProfile?.trainerRequestNote}
        />

        {/* National Cadre Competency & Skill Gap Diagnostic Matrix */}
        <TraineeSkillGapMatrix traineeId={userId} />

        {/* Recommendations */}
        <TraineeRecommendations traineeId={userId} />

        {/* Active Courses */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-950 flex items-center">
            <GraduationCap className="w-4 h-4 mr-2 text-zinc-700" />
            My Active Courses
          </h2>

          {enrollments.length === 0 ? (
            <div className="p-10 text-center rounded-lg bg-white border border-zinc-200/90 text-zinc-600 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2">
              <p>You have not registered for any courses yet.</p>
              <Link href="/trainee/catalog" className="text-zinc-900 block font-semibold hover:underline">
                Explore available national competency blocks &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrollments.map((enr) => {
                const isCompleted = enr.status === "COMPLETED";

                return (
                  <div
                    key={enr.id}
                    className="p-6 rounded-lg bg-white border border-zinc-200/90 hover:border-zinc-300 transition-all flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 truncate max-w-[200px]">
                          {enr.course.competencyBlock.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                          }`}
                        >
                          {isCompleted ? "Completed" : `${enr.progressPercent}%`}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-zinc-950 mb-1.5 leading-snug">
                        {enr.course.title}
                      </h3>
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2 font-normal">
                        {enr.course.description}
                      </p>

                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-600 font-mono">
                          <span>Progress</span>
                          <span>{enr.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              isCompleted ? "bg-emerald-600" : "bg-zinc-800"
                            }`}
                            style={{ width: `${enr.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                      <Link
                        href={`/trainee/courses/${enr.courseId}`}
                        className="text-xs font-medium text-zinc-900 hover:text-zinc-700 flex items-center"
                      >
                        {isCompleted ? "Review Modules" : "Continue Learning"}
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>

                      {isCompleted && (
                        <Link
                          href={`/trainee/certificates?certId=${enr.id}`}
                          className="flex items-center space-x-1 text-xs font-medium text-emerald-800 hover:text-emerald-700"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Download Certificate</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
