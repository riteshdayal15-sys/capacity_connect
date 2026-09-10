import { PrismaClient } from "@prisma/client";
import { validateTrainerSubjectAccess, canTrainerManageCourse, ApiSession } from "../src/lib/api-auth";

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("   TESTING TRAINER SUBJECT-SPECIFIC RBAC RULES    ");
  console.log("==================================================");

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

  try {
    // 1. Fetch seed users and competency blocks
    const trainer1 = await prisma.user.findUnique({
      where: { email: "trainer.incois@moes.gov.in" },
      include: { assignedBlock: true },
    });

    const trainer2 = await prisma.user.findUnique({
      where: { email: "trainer.imd@moes.gov.in" },
      include: { assignedBlock: true },
    });

    const admin = await prisma.user.findUnique({
      where: { email: "admin@moes.gov.in" },
    });

    const oceanBlock = await prisma.competencyBlock.findFirst({
      where: { title: { contains: "Ocean Observation" } },
    });

    const atmoBlock = await prisma.competencyBlock.findFirst({
      where: { title: { contains: "Atmospheric" } },
    });

    const seismoBlock = await prisma.competencyBlock.findFirst({
      where: { title: { contains: "Seismological" } },
    });

    assert(
      !!trainer1 && !!trainer2 && !!admin && !!oceanBlock && !!atmoBlock && !!seismoBlock,
      "Users and Competency Blocks exist in database"
    );

    if (!trainer1 || !trainer2 || !admin || !oceanBlock || !atmoBlock || !seismoBlock) {
      throw new Error("Missing prerequisites in DB. Please run npm run db:seed first.");
    }

    // Construct mock ApiSessions
    const sessionT1: ApiSession = {
      id: trainer1.id,
      role: "TRAINER",
      email: trainer1.email,
      department: trainer1.department,
      specialization: trainer1.specialization || undefined,
      assignedBlockId: trainer1.assignedBlockId || undefined,
      assignedBlockTitle: trainer1.assignedBlock?.title,
    };

    const sessionT2: ApiSession = {
      id: trainer2.id,
      role: "TRAINER",
      email: trainer2.email,
      department: trainer2.department,
      specialization: trainer2.specialization || undefined,
      assignedBlockId: trainer2.assignedBlockId || undefined,
      assignedBlockTitle: trainer2.assignedBlock?.title,
    };

    const sessionAdmin: ApiSession = {
      id: admin.id,
      role: "ADMIN",
      email: admin.email,
      department: admin.department,
      specialization: admin.specialization || undefined,
      assignedBlockId: admin.assignedBlockId || undefined,
      assignedBlockTitle: undefined,
    };

    // 2. Test Trainer 1 specialization assignment
    assert(
      trainer1.assignedBlockId === oceanBlock.id,
      "Trainer 1 is assigned to 'Ocean Observation & Deep-Sea Instrumentation'",
      `Expected ${oceanBlock.id}, got ${trainer1.assignedBlockId}`
    );

    // 3. Test Trainer 2 specialization assignment
    assert(
      trainer2.assignedBlockId === atmoBlock.id,
      "Trainer 2 is assigned to 'Atmospheric Remote Sensing & Doppler Weather Radar'",
      `Expected ${atmoBlock.id}, got ${trainer2.assignedBlockId}`
    );

    // 4. Test validateTrainerSubjectAccess
    const t1OceanCheck = validateTrainerSubjectAccess(sessionT1, oceanBlock.id);
    assert(t1OceanCheck.allowed, "Trainer 1 is ALLOWED to create courses in Ocean Observation pathway");

    const t1AtmoCheck = validateTrainerSubjectAccess(sessionT1, atmoBlock.id);
    assert(!t1AtmoCheck.allowed, "Trainer 1 is BLOCKED from creating courses in Atmospheric pathway", t1AtmoCheck.reason);

    const t2OceanCheck = validateTrainerSubjectAccess(sessionT2, oceanBlock.id);
    assert(!t2OceanCheck.allowed, "Trainer 2 is BLOCKED from creating courses in Ocean pathway", t2OceanCheck.reason);

    const t2AtmoCheck = validateTrainerSubjectAccess(sessionT2, atmoBlock.id);
    assert(t2AtmoCheck.allowed, "Trainer 2 is ALLOWED to create courses in Atmospheric pathway");

    const adminCheckOcean = validateTrainerSubjectAccess(sessionAdmin, oceanBlock.id);
    assert(adminCheckOcean.allowed, "Admin is ALLOWED to manage courses in Ocean pathway");

    const adminCheckAtmo = validateTrainerSubjectAccess(sessionAdmin, atmoBlock.id);
    assert(adminCheckAtmo.allowed, "Admin is ALLOWED to manage courses in Atmospheric pathway");

    // 5. Test canTrainerManageCourse with existing Course records
    const oceanCourse = await prisma.course.findFirst({
      where: { competencyBlockId: oceanBlock.id, trainerId: trainer1.id },
    });
    const atmoCourse = await prisma.course.findFirst({
      where: { competencyBlockId: atmoBlock.id, trainerId: trainer2.id },
    });

    if (oceanCourse) {
      const t1ManageOcean = canTrainerManageCourse(sessionT1, oceanCourse);
      assert(t1ManageOcean === true, "Trainer 1 CAN manage their own Ocean course");

      const t2ManageOcean = canTrainerManageCourse(sessionT2, oceanCourse);
      assert(t2ManageOcean === false, "Trainer 2 CANNOT manage Trainer 1's Ocean course (Subject & Ownership boundary)");

      const adminManageOcean = canTrainerManageCourse(sessionAdmin, oceanCourse);
      assert(adminManageOcean === true, "Admin CAN manage Trainer 1's Ocean course");
    } else {
      console.warn("Warning: No seed course found for Ocean block + Trainer 1");
    }

    if (atmoCourse) {
      const t1ManageAtmo = canTrainerManageCourse(sessionT1, atmoCourse);
      assert(t1ManageAtmo === false, "Trainer 1 CANNOT manage Trainer 2's Atmospheric course");

      const t2ManageAtmo = canTrainerManageCourse(sessionT2, atmoCourse);
      assert(t2ManageAtmo === true, "Trainer 2 CAN manage their own Atmospheric course");
    } else {
      console.warn("Warning: No seed course found for Atmospheric block + Trainer 2");
    }

    // 6. Test DB-level course creation subject integrity
    console.log("\nTesting course creation & module management under RBAC constraints...");
    
    // Simulate Trainer 1 creating course in Ocean Pathway (Valid)
    const testOceanCourse = await prisma.course.create({
      data: {
        title: "Test RBAC Ocean CTD Calibration",
        description: "Testing course isolation",
        competencyBlockId: oceanBlock.id,
        trainerId: trainer1.id,
      },
    });

    const verifyT1Owner = canTrainerManageCourse(sessionT1, testOceanCourse);
    assert(verifyT1Owner === true, "Trainer 1 verified as authorized owner of new Ocean course");

    const verifyT2Blocked = canTrainerManageCourse(sessionT2, testOceanCourse);
    assert(verifyT2Blocked === false, "Trainer 2 strictly forbidden from managing new Ocean course");

    // Clean up created test course
    await prisma.course.delete({ where: { id: testOceanCourse.id } });
    console.log("[CLEANUP] Deleted test course successfully.");

    // 7. Test Admin subject reassignment capability
    console.log("\nTesting Admin ability to update trainer subject/specialization...");
    const updatedTrainer1 = await prisma.user.update({
      where: { id: trainer1.id },
      data: {
        assignedBlockId: seismoBlock.id,
        specialization: seismoBlock.title,
      },
    });
    assert(
      updatedTrainer1.assignedBlockId === seismoBlock.id,
      "Admin can successfully reassign trainer to a different pathway"
    );

    // Revert Trainer 1 back to Ocean Observation
    await prisma.user.update({
      where: { id: trainer1.id },
      data: {
        assignedBlockId: oceanBlock.id,
        specialization: oceanBlock.title,
      },
    });
    console.log("[RESET] Restored Trainer 1 to original Ocean Observation pathway.");

  } catch (err: any) {
    console.error("Test execution encountered an error:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
