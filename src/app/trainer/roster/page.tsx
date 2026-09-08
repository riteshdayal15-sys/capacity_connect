import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { Users, Mail, Building, CheckCircle2, Clock } from "lucide-react";

export default async function TrainerRosterPage() {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== "TRAINER" && (session.user as any).role !== "ADMIN")) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  const trainerId = (session.user as any).id;

  const whereClause = role === "ADMIN" ? {} : { course: { trainerId } };

  const enrollments = await prisma.enrollment.findMany({
    where: whereClause,
    include: {
      // Never select the full trainee record: it contains passwordHash,
      // which would leak into the rendered payload.
      trainee: { select: { id: true, name: true, email: true, department: true } },
      course: true,
    },
    orderBy: { enrolledAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
      <Navbar role="TRAINER" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="border-b border-zinc-200 pb-6">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950 flex items-center">
              <Users className="w-5 h-5 mr-2 text-zinc-700" />
              Enrolled Trainee Cadre Roster
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
              {enrollments.length} Enrolled
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Track per-officer progression, certification status, and institute affiliation across your curricula.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200/90 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBFBFA] border-b border-zinc-200 text-zinc-600 uppercase tracking-wider font-mono text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Trainee Name</th>
                  <th className="px-6 py-3.5">Curriculum Enrolled</th>
                  <th className="px-6 py-3.5">Institute</th>
                  <th className="px-6 py-3.5">Completion</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      No officers currently enrolled in your curricula.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enr) => {
                    const isCompleted = enr.status === "COMPLETED";

                    return (
                      <tr key={enr.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-zinc-950 text-xs">{enr.trainee.name}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center mt-0.5 font-mono">
                            <Mail className="w-3 h-3 mr-1 text-zinc-400" />
                            {enr.trainee.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-900 font-medium">
                          {enr.course.title}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center text-zinc-700">
                            <Building className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                            {enr.trainee.department}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32 space-y-1">
                            <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
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
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Certified
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 mr-1 text-zinc-500" />
                                In Progress
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
