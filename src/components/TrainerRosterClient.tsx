"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Mail,
  Building,
  CheckCircle2,
  Clock,
  UserPlus,
  BookOpen,
  Layers,
  Search,
  Award,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { DeliverContentModal } from "@/components/DeliverContentModal";

interface TrainerRosterClientProps {
  initialEnrollments: any[];
  courses: any[];
  specialization?: string | null;
}

export function TrainerRosterClient({
  initialEnrollments,
  courses,
  specialization,
}: TrainerRosterClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const filteredEnrollments = initialEnrollments.filter((enr) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      enr.trainee.name.toLowerCase().includes(q) ||
      enr.trainee.email.toLowerCase().includes(q) ||
      enr.course.title.toLowerCase().includes(q) ||
      (enr.trainee.department && enr.trainee.department.toLowerCase().includes(q))
    );
  });

  const totalDeliveredModules = courses.reduce(
    (acc, c) => acc + (c.modules?.length || 0),
    0
  );

  const certifiedCount = initialEnrollments.filter((e) => e.status === "COMPLETED").length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Specialization Pathway Header Banner */}
      {specialization && (
        <div className="rounded-xl border border-zinc-900/10 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-white/20 text-white uppercase font-medium">
                Authorized Subject Pathway
              </span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight">{specialization}</h2>
            <p className="text-xs text-zinc-300 max-w-2xl">
              You are accredited to author curricula and deliver instructional materials strictly within this subject. All enrolled officers below are progressing through this specialization.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-semibold transition-all shadow-sm flex items-center space-x-2 shrink-0 self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4 text-zinc-950" />
            <span>Deliver Content / Enroll Trainee</span>
          </button>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Enrolled Officers</p>
          <p className="text-2xl font-semibold text-zinc-950 font-mono mt-1">{initialEnrollments.length}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Under active instruction</p>
        </div>

        <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Authored Curricula</p>
          <p className="text-2xl font-semibold text-zinc-950 font-mono mt-1">{courses.length}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">In assigned subject</p>
        </div>

        <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Curriculum Units Delivered</p>
          <p className="text-2xl font-semibold text-zinc-950 font-mono mt-1">{totalDeliveredModules}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Videos, texts, PDFs &amp; quizzes</p>
        </div>

        <div className="p-5 rounded-lg bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">Certifications Awarded</p>
          <p className="text-2xl font-semibold text-emerald-700 font-mono mt-1">{certifiedCount}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Completed assessments</p>
        </div>
      </div>

      {/* Cadre Table Header & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950 flex items-center">
                <Users className="w-5 h-5 mr-2 text-zinc-700" />
                Enrolled Trainee Cadre Roster
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                {filteredEnrollments.length} Active
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Monitor individual officer progress, curriculum content delivery, and qualification status.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter officers..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-1.5 rounded-md bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-medium transition-colors flex items-center space-x-1.5 shrink-0 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Deliver Content</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-zinc-200/90 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBFBFA] border-b border-zinc-200 text-zinc-600 uppercase tracking-wider font-mono text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Trainee Officer</th>
                  <th className="px-6 py-3.5">Curriculum Enrolled</th>
                  <th className="px-6 py-3.5">Delivered Content</th>
                  <th className="px-6 py-3.5">Institute</th>
                  <th className="px-6 py-3.5">Progress</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 space-y-2">
                      <p>No officers found enrolled in your subject curricula.</p>
                      <button
                        onClick={() => setShowModal(true)}
                        className="text-xs font-semibold text-zinc-900 hover:underline inline-flex items-center space-x-1"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        <span>Manually enroll an officer to deliver content now</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredEnrollments.map((enr) => {
                    const isCompleted = enr.status === "COMPLETED";
                    const moduleCount = enr.course.modules?.length || 0;

                    return (
                      <tr key={enr.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-zinc-950 text-xs">{enr.trainee.name}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center mt-0.5 font-mono">
                            <Mail className="w-3 h-3 mr-1 text-zinc-400" />
                            {enr.trainee.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-950">{enr.course.title}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {enr.course.competencyBlock?.title || "Specialized"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-800 border border-zinc-200">
                            <Layers className="w-3 h-3 mr-1 text-zinc-500" />
                            {moduleCount} Units Delivered
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center text-zinc-700">
                            <Building className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                            {enr.trainee.department || "MoES"}
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
      </div>

      {/* Deliver Content Modal */}
      <DeliverContentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          router.refresh();
        }}
        courses={courses}
      />
    </main>
  );
}
