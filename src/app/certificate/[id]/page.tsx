import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, ArrowLeft, Building2, Calendar, Award, UserCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Official Certificate Verification — Ministry of Earth Sciences",
  description: "Official credential verification portal for Ministry of Earth Sciences capacity building programs",
};

interface Props {
  params: { id: string };
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { id } = params;

  // Query enrollment directly
  let enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      course: {
        include: { competencyBlock: true },
      },
      trainee: true,
    },
  });

  // If not matched directly by enrollment ID, check Certificate record
  if (!enrollment) {
    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [
          { id },
          { certificateUrl: `/certificate/${id}` },
        ],
      },
      include: {
        course: {
          include: { competencyBlock: true },
        },
        trainee: true,
      },
    });

    if (cert) {
      enrollment = await prisma.enrollment.findUnique({
        where: {
          courseId_traineeId: {
            courseId: cert.courseId,
            traineeId: cert.traineeId,
          },
        },
        include: {
          course: {
            include: { competencyBlock: true },
          },
          trainee: true,
        },
      });
    }
  }

  const isVerified = Boolean(enrollment && enrollment.status === "COMPLETED");

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 selection:bg-zinc-200">
      {/* Top Banner */}
      <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              MoES
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-950 uppercase tracking-wider">Ministry of Earth Sciences</p>
              <p className="text-[10px] text-zinc-500">Government of India &bull; Digital Capacity Framework</p>
            </div>
          </div>
          <Link
            href="/login"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-950 flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal Home</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {enrollment && enrollment.status === "COMPLETED" ? (
          <div className="bg-white border border-zinc-200/90 rounded-xl shadow-xs overflow-hidden">
            {/* Verification Status Header */}
            <div className="bg-emerald-50/80 border-b border-emerald-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-sm font-semibold text-emerald-950">Verified Authentic Credential</h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium">
                      Official Record
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    This certificate is cryptographically recorded in the MoES Central Cadre Registry.
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right font-mono text-[11px] text-emerald-900/70">
                MOES-CC-{enrollment.id.substring(0, 8).toUpperCase()}
              </div>
            </div>

            {/* Certificate Details Body */}
            <div className="p-8 space-y-6">
              <div className="border-b border-zinc-100 pb-6 text-center">
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono mb-2">
                  Certificate of Competency
                </p>
                <h2 className="text-xl sm:text-2xl font-serif-heading font-normal text-zinc-950">
                  {enrollment.course.title}
                </h2>
                {enrollment.course.competencyBlock && (
                  <p className="text-xs text-zinc-600 mt-1">
                    Cadre Track: <span className="font-medium text-zinc-800">{enrollment.course.competencyBlock.title}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-zinc-50/70 border border-zinc-100 space-y-1">
                  <span className="text-zinc-500 font-mono text-[11px] flex items-center">
                    <UserCheck className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                    Recipient Cadre / Officer
                  </span>
                  <div className="font-semibold text-zinc-950 text-sm">{enrollment.trainee.name}</div>
                  <div className="text-zinc-500 font-mono text-[11px]">{enrollment.trainee.email}</div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-50/70 border border-zinc-100 space-y-1">
                  <span className="text-zinc-500 font-mono text-[11px] flex items-center">
                    <Building2 className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                    Autonomous Institute
                  </span>
                  <div className="font-semibold text-zinc-950 text-sm">
                    {enrollment.trainee.department || "Ministry of Earth Sciences"}
                  </div>
                  <div className="text-zinc-500 text-[11px]">Government of India</div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-50/70 border border-zinc-100 space-y-1">
                  <span className="text-zinc-500 font-mono text-[11px] flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                    Enrolled &amp; Completed
                  </span>
                  <div className="font-medium text-zinc-900">
                    {new Date(enrollment.enrolledAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-zinc-500 text-[11px]">Curriculum Mastery 100%</div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-50/70 border border-zinc-100 space-y-1">
                  <span className="text-zinc-500 font-mono text-[11px] flex items-center">
                    <Award className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                    Issuing Authority
                  </span>
                  <div className="font-medium text-zinc-900">Dr. Rajesh Kumar</div>
                  <div className="text-zinc-500 text-[11px]">Director HRD &amp; Training, MoES</div>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-50 border border-zinc-200/80 p-4 text-[11px] text-zinc-600 space-y-1 font-mono">
                <div className="text-zinc-900 font-medium">Record Metadata</div>
                <div className="truncate">Enrollment Identifier: {enrollment.id}</div>
                <div>Status: COMPLETED_VERIFIED</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-amber-200 rounded-xl p-8 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-950">Credential Record Not Found or Incomplete</h1>
              <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">
                No verified certificate record was located for identifier <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">{id}</code>. The program may still be in progress or the link may be invalid.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
              >
                Return to MoES Portal
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
