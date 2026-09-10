import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Plus,
  BrainCircuit,
  Layers,
  ArrowUpRight,
  Sparkles,
  UploadCloud,
  FileUp,
  FileText,
  Video,
  Image as ImageIcon,
  Link2,
  Compass,
  ShieldCheck,
} from "lucide-react";

export default async function TrainerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  const userRole = (session.user as any)?.role;
  if (userRole === "TRAINEE") {
    redirect("/trainee?access_denied=trainer");
  } else if (userRole === "ADMIN") {
    redirect("/admin?access_denied=trainer");
  } else if (userRole !== "TRAINER") {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // Fetch trainer profile with assigned competency subject pathway
  const dbTrainer = await prisma.user.findUnique({
    where: { id: userId },
    include: { assignedBlock: true },
  });

  const assignedBlock = dbTrainer?.assignedBlock;
  const specialization = dbTrainer?.specialization || assignedBlock?.title;

  // Strict Subject-Specific Filter:
  // Trainer can only manage courses within their assigned subject pathway and that they author
  const courseWhere: any = userRole === "ADMIN" ? {} : { trainerId: userId };
  if (userRole !== "ADMIN" && dbTrainer?.assignedBlockId) {
    courseWhere.competencyBlockId = dbTrainer.assignedBlockId;
  }

  const courses = await prisma.course.findMany({
    where: courseWhere,
    include: {
      competencyBlock: true,
      trainer: { select: { name: true, email: true, department: true } },
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-zinc-700" />
              Scientific Curriculum &amp; Content Studio
            </h1>
            <p className="text-xs text-zinc-600 mt-1">
              Curate specialized training curricula, upload syllabus documents, publish procedural modules, and author calibrated evaluations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/trainer/create-course"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload SOP / Document</span>
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
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Course</span>
            </Link>
          </div>
        </div>

        {/* Trainer Specialization Pathway Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-100/90 text-emerald-900 border border-emerald-300/70">
                  Assigned Specialization Pathway
                </span>
                {assignedBlock?.category && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    ({assignedBlock.category})
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-zinc-950 mt-0.5">
                {specialization || "General Scientific Domain (Unassigned)"}
              </h2>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs font-mono font-medium text-zinc-600">
              {courses.length} {courses.length === 1 ? "Program" : "Programs"} in Subject
            </span>
          </div>
        </div>

        {/* Content & Syllabus Quick Upload Banner */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">Add &amp; Upload Curriculum Content</h2>
              <p className="text-xs text-zinc-600 mt-0.5">
                Upload official SOP PDFs, manual text, YouTube videos, photos, or reference links within your pathway.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Link
              href="/trainer/create-course"
              className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium inline-flex items-center shadow-2xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              <span>AI Document Ingestion</span>
            </Link>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-zinc-700" />
              My Authored Curriculum Tracks
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Authorized courses within {specialization || "your assigned specialization"}.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500">{courses.length} Programs</span>
        </div>

        {/* Courses Section */}
        {courses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
            <Layers className="w-8 h-8 text-zinc-400 mx-auto" />
            <h3 className="text-sm font-semibold text-zinc-950">
              No courses created in {specialization || "your pathway"} yet
            </h3>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
              Author your first course or upload an official SOP document in your specialization.
            </p>
            <div className="pt-2">
              <Link
                href="/trainer/create-course"
                className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white inline-flex items-center"
              >
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                <span>Create Course in {specialization || "Subject"}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-6 rounded-lg bg-white border border-zinc-200/90 hover:border-zinc-300 transition-all flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4"
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
                  <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2 font-normal">
                    {course.description || "Comprehensive procedural and operational SOP syllabus."}
                  </p>

                  {/* Direct Format Quick-Add Buttons */}
                  <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-medium">
                      <span>Add Course Content</span>
                      <span>5 Formats</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      <Link
                        href={`/trainer/courses/${course.id}?action=add_module&type=PDF`}
                        className="p-1.5 rounded-md bg-zinc-50 hover:bg-red-50 hover:border-red-200 border border-zinc-200 transition-colors flex flex-col items-center justify-center group"
                        title="Upload PDF Document"
                      >
                        <FileUp className="w-3.5 h-3.5 text-red-600 group-hover:scale-110 transition-transform mb-0.5" />
                        <span className="text-[10px] font-medium text-zinc-700 group-hover:text-red-900 leading-tight">PDF</span>
                      </Link>

                      <Link
                        href={`/trainer/courses/${course.id}?action=add_module&type=TEXT`}
                        className="p-1.5 rounded-md bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 border border-zinc-200 transition-colors flex flex-col items-center justify-center group"
                        title="Add Manual Text / SOP"
                      >
                        <FileText className="w-3.5 h-3.5 text-zinc-700 group-hover:scale-110 transition-transform mb-0.5" />
                        <span className="text-[10px] font-medium text-zinc-700 group-hover:text-zinc-950 leading-tight">Text</span>
                      </Link>

                      <Link
                        href={`/trainer/courses/${course.id}?action=add_module&type=VIDEO`}
                        className="p-1.5 rounded-md bg-zinc-50 hover:bg-purple-50 hover:border-purple-200 border border-zinc-200 transition-colors flex flex-col items-center justify-center group"
                        title="Add YouTube Video"
                      >
                        <Video className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform mb-0.5" />
                        <span className="text-[10px] font-medium text-zinc-700 group-hover:text-purple-900 leading-tight">YouTube</span>
                      </Link>

                      <Link
                        href={`/trainer/courses/${course.id}?action=add_module&type=IMAGE`}
                        className="p-1.5 rounded-md bg-zinc-50 hover:bg-amber-50 hover:border-amber-200 border border-zinc-200 transition-colors flex flex-col items-center justify-center group"
                        title="Upload Photos / Diagrams"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform mb-0.5" />
                        <span className="text-[10px] font-medium text-zinc-700 group-hover:text-amber-900 leading-tight">Photos</span>
                      </Link>

                      <Link
                        href={`/trainer/courses/${course.id}?action=add_module&type=LINK`}
                        className="p-1.5 rounded-md bg-zinc-50 hover:bg-blue-50 hover:border-blue-200 border border-zinc-200 transition-colors flex flex-col items-center justify-center group"
                        title="Add Other Link / Web Portal"
                      >
                        <Link2 className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform mb-0.5" />
                        <span className="text-[10px] font-medium text-zinc-700 group-hover:text-blue-900 leading-tight">Link</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Primary Action Bar */}
                <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-600 font-mono text-[11px]">
                    {course.modules.length} {course.modules.length === 1 ? "Module" : "Modules"}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <Link
                      href={`/trainer/courses/${course.id}?action=upload_syllabus`}
                      className="px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium inline-flex items-center shadow-2xs transition-colors"
                      title="Upload course syllabus or content document"
                    >
                      <FileUp className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      <span>Upload Content</span>
                    </Link>
                    <Link
                      href={`/trainer/courses/${course.id}?action=add_module`}
                      className="px-2.5 py-1.5 rounded bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-medium inline-flex items-center transition-colors"
                      title="Add a new learning module (PDF, Video, Image, Text)"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      <span>Add Module</span>
                    </Link>
                    <Link
                      href={`/trainer/courses/${course.id}`}
                      className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
                      title="View Full Curriculum & Roster"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
