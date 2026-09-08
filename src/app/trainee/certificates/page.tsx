"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { Award, Download, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";

function CertificatesContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const certIdParam = searchParams.get("certId");

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCertificates() {
      const userId = (session?.user as any)?.id;
      if (!userId) return;
      try {
        const res = await fetch(`/api/enrollments?traineeId=${userId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setEnrollments(data.filter((e) => e.status === "COMPLETED"));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCertificates();
  }, [session]);

  // Deep-link from the course page (?certId=<enrollmentId>): scroll to and
  // highlight the matching certificate card once the list has loaded.
  useEffect(() => {
    if (loading || !certIdParam) return;
    const el = document.getElementById(`cert-${certIdParam}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, certIdParam, enrollments]);

  const generatePDF = (enrollment: any) => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const traineeName = session?.user?.name || "MoES Officer";
    const dept = (session?.user as any)?.department || "Ministry of Earth Sciences";
    const courseTitle = enrollment.course.title;
    const dateStr = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Dark Border
    doc.setDrawColor(24, 24, 27);
    doc.setLineWidth(3);
    doc.rect(12, 12, 273, 186);

    // Inner Accent Line
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.8);
    doc.rect(15, 15, 267, 180);

    // Header Title
    doc.setTextColor(24, 24, 27);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("MINISTRY OF EARTH SCIENCES", 148.5, 42, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text("GOVERNMENT OF INDIA", 148.5, 50, { align: "center" });
    doc.text("DIGITAL CAPACITY BUILDING & COMPETENCY FRAMEWORK", 148.5, 57, { align: "center" });

    // Certificate Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(24, 24, 27);
    doc.text("CERTIFICATE OF COMPETENCY", 148.5, 82, { align: "center" });

    // Body
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(82, 82, 91);
    doc.text("This is officially awarded to certify that", 148.5, 98, { align: "center" });

    // Trainee Name
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(9, 9, 11);
    doc.text(traineeName.toUpperCase(), 148.5, 112, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text(`Autonomous Institute: ${dept}`, 148.5, 120, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(82, 82, 91);
    doc.text("has successfully mastered the scientific competencies and completed the curriculum:", 148.5, 134, {
      align: "center",
    });

    // Course Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text(`"${courseTitle}"`, 148.5, 144, { align: "center" });

    // Verification Note & Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text(`Issue Date: ${dateStr}`, 40, 175);
    doc.text(`Verification ID: MOES-CC-${enrollment.id.substring(0, 8).toUpperCase()}`, 40, 181);

    // Signatures
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("Dr. Rajesh Kumar", 240, 175, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Director HRD & Training, MoES", 240, 181, { align: "center" });

    doc.save(`MoES-Certificate-${enrollment.id.substring(0, 6)}.pdf`);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-zinc-200 pb-6">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 flex items-center">
            <Award className="w-5 h-5 mr-2 text-zinc-700" />
            Official Certifications of Competency
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
            Verifiable Credentials
          </span>
        </div>
        <p className="text-xs text-zinc-600 mt-1">
          Download verifiable, tamper-evident PDF completion credentials for completed MoES courses.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-xs text-zinc-500">Checking credentials...</div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-zinc-200 space-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <Award className="w-8 h-8 text-zinc-400 mx-auto mb-1" />
          <h3 className="text-sm font-semibold text-zinc-950">No Completed Certifications Yet</h3>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto">
            Complete all modules and achieve passing scores in the assessments to unlock your credentials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrollments.map((enr) => (
            <div
              key={enr.id}
              id={`cert-${enr.id}`}
              className={`p-6 rounded-lg bg-white border transition-all flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                certIdParam === enr.id
                  ? "border-emerald-400 ring-2 ring-emerald-100"
                  : "border-zinc-200/90 hover:border-zinc-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Verified Competency
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    ID: {enr.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-zinc-950 mb-1.5">{enr.course.title}</h3>
                <p className="text-xs text-zinc-600 font-normal">{enr.course.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center text-xs text-zinc-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                  <span>Modules &amp; Assessment Passed</span>
                </div>

                <button
                  onClick={() => generatePDF(enr)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-colors flex items-center shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function TraineeCertificatesPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
      <Navbar role="TRAINEE" />
      <Suspense fallback={<div className="text-center py-20 text-xs text-zinc-500">Loading certifications...</div>}>
        <CertificatesContent />
      </Suspense>
    </div>
  );
}
