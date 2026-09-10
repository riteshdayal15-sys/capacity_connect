import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { TrainerRosterClient } from "@/components/TrainerRosterClient";

export default async function TrainerRosterPage() {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== "TRAINER" && (session.user as any).role !== "ADMIN")) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  const trainerId = (session.user as any).id;
  const specialization = (session.user as any).specialization || (session.user as any).assignedBlockTitle;

  const whereClause = role === "ADMIN" ? {} : { course: { trainerId } };

  const [enrollments, courses] = await Promise.all([
    prisma.enrollment.findMany({
      where: whereClause,
      include: {
        trainee: { select: { id: true, name: true, email: true, department: true } },
        course: {
          include: {
            competencyBlock: true,
            modules: { select: { id: true, title: true, type: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.course.findMany({
      where: role === "ADMIN" ? {} : { trainerId },
      include: {
        competencyBlock: true,
        modules: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900">
      <Navbar role="TRAINER" />
      <TrainerRosterClient
        initialEnrollments={enrollments}
        courses={courses}
        specialization={specialization}
      />
    </div>
  );
}
