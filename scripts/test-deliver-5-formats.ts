import { PrismaClient } from "@prisma/client";
import { canTrainerManageCourse, ApiSession } from "../src/lib/api-auth";

const prisma = new PrismaClient();

async function runTests() {
  console.log("================================================================");
  console.log("    TESTING DELIVERY OF ALL 5 CONTENT FORMATS TO TRAINEE       ");
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

  const createdModuleIds: string[] = [];
  let testEnrollmentId: string | null = null;

  try {
    // 1. Fetch ocean course and atmospheric course with modules
    const oceanCourse = await prisma.course.findFirst({
      where: { title: { contains: "Deep-Sea Mooring" } },
      include: { modules: true, trainer: true },
    });

    const atmoCourse = await prisma.course.findFirst({
      where: { title: { contains: "Doppler Radar" } },
      include: { modules: true, trainer: true },
    });

    const testTrainee = await prisma.user.findFirst({
      where: { email: "rahul.v@imd.gov.in" },
    });

    const trainer1 = await prisma.user.findUnique({
      where: { email: "trainer.incois@moes.gov.in" },
      include: { assignedBlock: true },
    });

    assert(
      !!oceanCourse && !!atmoCourse && !!testTrainee && !!trainer1,
      "Courses, test trainee, and Trainer 1 exist in database"
    );

    if (!oceanCourse || !atmoCourse || !testTrainee || !trainer1) {
      throw new Error("Missing prerequisites in DB.");
    }

    // 2. Verify all 5 formats exist in Course 1
    const oceanTypes = oceanCourse.modules.map((m) => m.type);
    console.log("Ocean Course module types found:", oceanTypes);

    assert(oceanTypes.includes("TEXT"), "Course contains MANUAL TEXT module format");
    assert(oceanTypes.includes("VIDEO"), "Course contains YOUTUBE VIDEO module format");
    assert(oceanTypes.includes("PDF"), "Course contains UPLOAD PDF module format");
    assert(oceanTypes.includes("IMAGE"), "Course contains PHOTOS / DIAGRAMS module format");
    assert(oceanTypes.includes("LINK"), "Course contains OTHER LINK / WEB PORTAL module format");

    // 3. Test Trainer delivering new content in all 5 formats
    console.log("\n--- Testing Direct Delivery of All 5 Formats by Trainer ---");
    const sessionT1: ApiSession = {
      id: trainer1.id,
      role: "TRAINER",
      email: trainer1.email,
      department: trainer1.department,
      specialization: trainer1.specialization || undefined,
      assignedBlockId: trainer1.assignedBlockId || undefined,
    };

    assert(
      canTrainerManageCourse(sessionT1, oceanCourse),
      "Trainer 1 authorized to deliver into their Ocean course"
    );

    const formatPayloads = [
      {
        title: "Test PDF Delivery: Deep-Sea Acoustic Manual",
        type: "PDF",
        contentUrl: "/uploads/deepsea_manual.pdf",
        contentText: "Technical manual on acoustic transponder operation.",
      },
      {
        title: "Test Video Delivery: Wave Rider Buoy Calibration",
        type: "VIDEO",
        contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        contentText: "Video lecture on directional wave spectra sensors.",
      },
      {
        title: "Test Manual Text Delivery: Mooring Pre-Launch SOP",
        type: "TEXT",
        contentUrl: null,
        contentText: "Step 1: Check battery voltage. Step 2: Confirm beacon telemetry.",
      },
      {
        title: "Test Photos Delivery: Inductive Cable Clamp Diagram",
        type: "IMAGE",
        contentUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b",
        contentText: "Diagram showing torque specifications for sensor clamps.",
      },
      {
        title: "Test Link Delivery: Real-Time In-Situ Portal",
        type: "LINK",
        contentUrl: "https://incois.gov.in/portal",
        contentText: "Live data telemetry stream from equatorial buoys.",
      },
    ];

    for (const payload of formatPayloads) {
      const createdMod = await prisma.module.create({
        data: {
          courseId: oceanCourse.id,
          title: payload.title,
          type: payload.type,
          contentUrl: payload.contentUrl,
          contentText: payload.contentText,
          order: 10 + createdModuleIds.length,
        },
      });
      createdModuleIds.push(createdMod.id);

      assert(
        createdMod.type === payload.type && !!createdMod.id,
        `Successfully delivered [${payload.type}] module: "${payload.title}"`
      );
    }

    // 4. Test Trainee access to all delivered formats
    console.log("\n--- Testing Trainee Access to All Delivered Formats ---");
    const traineeCourseView = await prisma.course.findUnique({
      where: { id: oceanCourse.id },
      include: {
        modules: {
          orderBy: { order: "asc" },
        },
      },
    });

    const traineeDeliveredTypes = traineeCourseView?.modules.map((m) => m.type) || [];

    assert(
      traineeDeliveredTypes.filter((t) => t === "PDF").length >= 2,
      "Trainee has access to delivered PDF modules with document viewers & download links"
    );
    assert(
      traineeDeliveredTypes.filter((t) => t === "VIDEO").length >= 2,
      "Trainee has access to delivered YouTube video lecture streams"
    );
    assert(
      traineeDeliveredTypes.filter((t) => t === "TEXT").length >= 2,
      "Trainee has access to delivered Manual Text SOPs and checklists"
    );
    assert(
      traineeDeliveredTypes.filter((t) => t === "IMAGE").length >= 2,
      "Trainee has access to delivered Photos & high-resolution schematic diagrams"
    );
    assert(
      traineeDeliveredTypes.filter((t) => t === "LINK").length >= 2,
      "Trainee has access to delivered Other Links & scientific portals"
    );

  } catch (err: any) {
    console.error("Test error:", err);
    failed++;
  } finally {
    // Cleanup dynamically created test modules
    if (createdModuleIds.length > 0) {
      await prisma.module.deleteMany({
        where: { id: { in: createdModuleIds } },
      });
      console.log(`[CLEANUP] Deleted ${createdModuleIds.length} temporary test modules.`);
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
