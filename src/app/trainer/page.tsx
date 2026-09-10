import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { TrainerDashboardClient } from "@/components/TrainerDashboardClient";

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
      <TrainerDashboardClient
        courses={courses}
        specialization={specialization}
        assignedBlock={assignedBlock}
      />
    </div>
  );
}
