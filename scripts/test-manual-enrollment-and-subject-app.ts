import { PrismaClient } from "@prisma/client";
import { canTrainerManageCourse, ApiSession } from "../src/lib/api-auth";

const prisma = new PrismaClient();

async function runTests() {
  console.log("================================================================");
  console.log("  TESTING TRAINER APPLICATION SUBJECT BINDING & MANUAL DELIVERY ");
  console.log("================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       -> ${detail}`);
      failed++;
    }
  }

  let testApplicantId: string | null = null;
  let testEnrollmentId: string | null = null;

  try {
    // 1. Fetch prerequisite blocks and trainers
    const oceanBlock = await prisma.competencyBlock.findFirst({
      where: { title: { contains: "Ocean Observation" } },
    });
    const atmoBlock = await prisma.competencyBlock.findFirst({
      where: { title: { contains: "Atmospheric" } },
    });
    const trainer1 = await prisma.user.findUnique({
      where: { email: "trainer.incois@moes.gov.in" },
      include: { assignedBlock: true },
    });
    const trainer2 = await prisma.user.findUnique({
      where: { email: "trainer.imd@moes.gov.in" },
      include: { assignedBlock: true },
    });
    const testTrainee = await prisma.user.findFirst({
      where: { role: "TRAINEE" },
    });

    assert(
      !!oceanBlock && !!atmoBlock && !!trainer1 && !!trainer2 && !!testTrainee,
      "Competency blocks, trainers, and test trainee exist in DB"
    );

    if (!oceanBlock || !atmoBlock || !trainer1 || !trainer2 || !testTrainee) {
      throw new Error("Prerequisites missing.");
    }

    // 2. Test Trainer Application with Subject Binding
    console.log("\n--- TEST: Trainer Registration with Subject Specialization ---");
    const testEmail = `applicant.test.${Date.now()}@moes.gov.in`;
    const applicant = await prisma.user.create({
      data: {
        name: "Dr. Applicant Test",
        email: testEmail,
        passwordHash: "dummyhash",
        department: "NIOT Chennai",
        role: "TRAINEE",
        trainerStatus: "PENDING",
        trainerRequestNote: "10 years in ocean robotics and deep-sea instrumentation.",
        assignedBlockId: oceanBlock.id,
        specialization: oceanBlock.title,
      },
    });
    testApplicantId = applicant.id;

    assert(
      applicant.trainerStatus === "PENDING" && applicant.assignedBlockId === oceanBlock.id,
      "New applicant created with PENDING status and requested Ocean Observation subject pathway"
    );

    // Simulate Admin Approval preserving the subject
    const approvedTrainer = await prisma.user.update({
      where: { id: applicant.id },
      data: {
        role: "TRAINER",
        trainerStatus: "APPROVED",
      },
      include: { assignedBlock: true },
    });

    assert(
      approvedTrainer.role === "TRAINER" &&
        approvedTrainer.trainerStatus === "APPROVED" &&
        approvedTrainer.assignedBlockId === oceanBlock.id &&
        approvedTrainer.specialization === oceanBlock.title,
      "Admin approval promotes user to TRAINER and locks in the requested Subject Pathway"
    );

    // 3. Test Trainer Manual Trainee Enrollment Authorization
    console.log("\n--- TEST: Trainer Manual Trainee Enrollment & Content Delivery ---");
    const oceanCourse = await prisma.course.findFirst({
      where: { competencyBlockId: oceanBlock.id, trainerId: trainer1.id },
      include: { modules: true },
    });
    const atmoCourse = await prisma.course.findFirst({
      where: { competencyBlockId: atmoBlock.id, trainerId: trainer2.id },
      include: { modules: true },
    });

    assert(!!oceanCourse && !!atmoCourse, "Ocean course and Atmospheric course found");

    if (oceanCourse && atmoCourse) {
      const sessionT1: ApiSession = {
        id: trainer1.id,
        role: "TRAINER",
        email: trainer1.email,
        department: trainer1.department,
        specialization: trainer1.specialization || undefined,
        assignedBlockId: trainer1.assignedBlockId || undefined,
      };

      const sessionT2: ApiSession = {
        id: trainer2.id,
        role: "TRAINER",
        email: trainer2.email,
        department: trainer2.department,
        specialization: trainer2.specialization || undefined,
        assignedBlockId: trainer2.assignedBlockId || undefined,
      };

      // Check trainer authorization to deliver/enroll
      const t1CanDeliverOcean = canTrainerManageCourse(sessionT1, oceanCourse);
      assert(t1CanDeliverOcean === true, "Trainer 1 is AUTHORIZED to manually enroll trainees into their Ocean course");

      const t1CanDeliverAtmo = canTrainerManageCourse(sessionT1, atmoCourse);
      assert(t1CanDeliverAtmo === false, "Trainer 1 is FORBIDDEN from enrolling trainees into Trainer 2's Atmospheric course");

      const t2CanDeliverOcean = canTrainerManageCourse(sessionT2, oceanCourse);
      assert(t2CanDeliverOcean === false, "Trainer 2 is FORBIDDEN from enrolling trainees into Trainer 1's Ocean course");

      const t2CanDeliverAtmo = canTrainerManageCourse(sessionT2, atmoCourse);
      assert(t2CanDeliverAtmo === true, "Trainer 2 is AUTHORIZED to manually enroll trainees into their Atmospheric course");

      // Perform actual DB enrollment (delivering course to trainee)
      // Upsert enrollment simulating manual delivery
      const enrollment = await prisma.enrollment.upsert({
        where: {
          courseId_traineeId: {
            courseId: oceanCourse.id,
            traineeId: testTrainee.id,
          },
        },
        update: {},
        create: {
          courseId: oceanCourse.id,
          traineeId: testTrainee.id,
          status: "IN_PROGRESS",
          progressPercent: 0,
          completedModuleIds: "[]",
        },
        include: {
          course: {
            include: { modules: true },
          },
          trainee: true,
        },
      });
      testEnrollmentId = enrollment.id;

      assert(
        enrollment.status === "IN_PROGRESS" && enrollment.courseId === oceanCourse.id,
        "Course successfully delivered and enrolled to trainee with active status"
      );

      assert(
        enrollment.course.modules.length === oceanCourse.modules.length,
        `All ${oceanCourse.modules.length} modules (text, PDF, video, quizzes) delivered and accessible to trainee`
      );
    }

  } catch (err: any) {
    console.error("Test error:", err);
    failed++;
  } finally {
    // Cleanup
    if (testEnrollmentId) {
      await prisma.enrollment.delete({ where: { id: testEnrollmentId } }).catch(() => {});
      console.log("[CLEANUP] Deleted test enrollment.");
    }
    if (testApplicantId) {
      await prisma.user.delete({ where: { id: testApplicantId } }).catch(() => {});
      console.log("[CLEANUP] Deleted test applicant user.");
    }
    await prisma.$disconnect();
  }

  console.log("\n================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
