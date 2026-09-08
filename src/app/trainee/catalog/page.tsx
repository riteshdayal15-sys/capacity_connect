"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Compass, ArrowRight, Award, CheckCircle2 } from "lucide-react";

export default function TraineeCatalogPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [blocks, setBlocks] = useState<any[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);

  const fetchCatalog = async () => {
    try {
      const res = await fetch("/api/competency-blocks");
      const data = await res.json();
      if (Array.isArray(data)) setBlocks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (userId) {
      fetch(`/api/enrollments?traineeId=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const map: Record<string, any> = {};
            data.forEach((e) => {
              map[e.courseId] = e;
            });
            setUserEnrollments(map);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const handleEnroll = async (courseId: string) => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    const userId = (session.user as any)?.id;
    if (!userId) return;

    // If already enrolled, navigate straight to the course reader
    if (userEnrollments[courseId]) {
      router.push(`/trainee/courses/${courseId}`);
      return;
    }

    setEnrollingCourseId(courseId);

    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          traineeId: userId,
        }),
      });

      if (res.ok) {
        router.push(`/trainee/courses/${courseId}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Failed to register for this course.");
      }
    } catch (err) {
      console.error("Enrollment error:", err);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const categories = [
    "ALL",
    "Ocean Sciences & Technology",
    "Meteorology & Climate",
    "Geohazards & Early Warning",
  ];

  const filteredBlocks = blocks.filter((b) => {
    const matchCategory = selectedCategory === "ALL" || b.category === selectedCategory;
    const matchSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
      <Navbar role="TRAINEE" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="border-b border-zinc-200 pb-6">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950 flex items-center">
              <Compass className="w-5 h-5 mr-2 text-zinc-700" />
              National Competency Catalog
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
              Approved MoES Pathways
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Explore specialized technical curriculums across Earth Science domains and register with one click.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search competencies, sensors, instrumentation..."
              className="w-full pl-9 pr-4 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors border ${
                  selectedCategory === cat
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Blocks & Courses */}
        {loading ? (
          <div className="text-center py-20 text-xs text-zinc-500">Loading catalog...</div>
        ) : (
          <div className="space-y-8">
            {filteredBlocks.map((block) => (
              <div
                key={block.id}
                className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {block.category}
                  </span>
                  <h2 className="text-base font-semibold text-zinc-950 mt-2">{block.title}</h2>
                  <p className="text-xs text-zinc-600 mt-1 max-w-3xl leading-relaxed">{block.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {block.courses?.map((course: any) => {
                    const enr = userEnrollments[course.id];
                    const isCompleted = enr?.status === "COMPLETED";
                    const isEnrolled = !!enr;

                    return (
                      <div
                        key={course.id}
                        className="p-5 rounded-md bg-[#FBFBFA] border border-zinc-200 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-xs font-semibold text-zinc-950 leading-snug">
                              {course.title}
                            </h3>
                            {isCompleted && (
                              <span className="flex items-center text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-600 line-clamp-3 mb-4 leading-relaxed font-normal">
                            {course.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {course.modules?.length || 0} Modules
                          </span>
                          <button
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollingCourseId === course.id}
                            className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center disabled:opacity-50 ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                : isEnrolled
                                ? "bg-zinc-100 text-zinc-900 border border-zinc-300 hover:bg-zinc-200"
                                : "bg-zinc-900 hover:bg-zinc-800 text-white"
                            }`}
                          >
                            {enrollingCourseId === course.id ? (
                              "Registering..."
                            ) : isCompleted ? (
                              <>
                                <Award className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                <span>Review Course</span>
                              </>
                            ) : isEnrolled ? (
                              <>
                                <span>Resume ({enr.progressPercent}%)</span>
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </>
                            ) : (
                              <>
                                <span>Register Cadre</span>
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
