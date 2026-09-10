import { PrismaClient } from "@prisma/client";
import { toEmbedUrl } from "../src/lib/video";

const prisma = new PrismaClient();

async function runTest() {
  console.log("=== TESTING ALL 5 CONTENT FORMATS: PDF, TEXT, YOUTUBE, PHOTOS, LINK ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Test YouTube Video Parser
  console.log("\n--- Testing YouTube Video URL Parsing ---");
  const ytStandard = toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert(!!ytStandard && ytStandard.kind === "youtube" && ytStandard.src.includes("dQw4w9WgXcQ"), "Standard YouTube URL parsed to embed");

  const ytShort = toEmbedUrl("https://youtu.be/dQw4w9WgXcQ");
  assert(!!ytShort && ytShort.kind === "youtube" && ytShort.src.includes("dQw4w9WgXcQ"), "youtu.be short URL parsed to embed");

  const ytShorts = toEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
  assert(!!ytShorts && ytShorts.kind === "youtube" && ytShorts.src.includes("dQw4w9WgXcQ"), "YouTube Shorts URL parsed to embed");

  const mp4Direct = toEmbedUrl("/uploads/training-video.mp4");
  assert(!!mp4Direct && mp4Direct.kind === "file" && mp4Direct.src === "/uploads/training-video.mp4", "Direct MP4 file detected");

  let testTrainer: any = null;
  let testCourse: any = null;

  try {
    // 2. Fetch or create a CompetencyBlock
    let block = await prisma.competencyBlock.findFirst();
    if (!block) {
      block = await prisma.competencyBlock.create({
        data: {
          title: "Scientific Instruments & Observational Systems",
          description: "MoES competency unit for oceanographic calibration and sensing.",
          category: "OCEANOGRAPHY",
        },
      });
    }

    // 3. Create Trainer
    testTrainer = await prisma.user.create({
      data: {
        email: `trainer_format_test_${Date.now()}@incois.gov.in`,
        name: "Dr. Format Validator",
        role: "TRAINER",
        department: "Ocean Observation Directorate",
        trainerStatus: "APPROVED",
        passwordHash: "testpasswordhash123",
      },
    });
    assert(!!testTrainer && !!testTrainer.id, "Test trainer created");

    // 4. Create Course
    testCourse = await prisma.course.create({
      data: {
        title: "Multi-Format MoES Calibration Course",
        description: "Course testing PDF, Manual Text, YouTube Video, Photos, and Other Link formats.",
        trainerId: testTrainer.id,
        competencyBlockId: block.id,
      },
    });
    assert(!!testCourse && !!testCourse.id, "Test course created");

    // 4. Create PDF Module (Upload PDF)
    const pdfModule = await prisma.module.create({
      data: {
        courseId: testCourse.id,
        title: "CTD Calibration Standard Operating Manual",
        type: "PDF",
        contentUrl: "/uploads/ctd_calibration_manual_2026.pdf",
        contentText: "Read chapters 1 to 4 before proceeding to laboratory checks.",
        order: 1,
      },
    });
    assert(pdfModule.type === "PDF" && (pdfModule.contentUrl?.endsWith(".pdf") ?? false), "Module 1 created: Upload PDF");

    // 5. Create Manual Text Module (Manual Text)
    const textModule = await prisma.module.create({
      data: {
        courseId: testCourse.id,
        title: "Sea Surface Temperature Sensor Deployment Checklist",
        type: "TEXT",
        contentText: "STEP 1: Verify dry-box power supply (12V DC).\nSTEP 2: Connect RS-485 serial bus.\nSTEP 3: Run echo verification at 9600 baud.\nSTEP 4: Document serial packet response in logbook.",
        order: 2,
      },
    });
    assert(textModule.type === "TEXT" && (textModule.contentText?.includes("STEP 1: Verify dry-box") ?? false), "Module 2 created: Manual Text (SOP)");

    // 6. Create YouTube Video Module (YouTube Video)
    const videoModule = await prisma.module.create({
      data: {
        courseId: testCourse.id,
        title: "Deep Sea Mooring & Winch Deployment Video Guide",
        type: "VIDEO",
        contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        contentText: "Watch the deck crew safety briefing and spooling procedure.",
        order: 3,
      },
    });
    assert(videoModule.type === "VIDEO" && (videoModule.contentUrl?.includes("youtube.com") ?? false), "Module 3 created: YouTube Video");

    // 7. Create Photos Module (Photos)
    const imageModule = await prisma.module.create({
      data: {
        courseId: testCourse.id,
        title: "Doppler Radar Transmitter & Antenna Schematics",
        type: "IMAGE",
        contentUrl: "/uploads/radar_doppler_feedhorn_schematic.png",
        contentText: "High-resolution diagram of the feedhorn waveguide and azimuth motor.",
        order: 4,
      },
    });
    assert(imageModule.type === "IMAGE" && (imageModule.contentUrl?.endsWith(".png") ?? false), "Module 4 created: Photos / Diagram");

    // 8. Create Other Link Module (Other Link)
    const linkModule = await prisma.module.create({
      data: {
        courseId: testCourse.id,
        title: "INCOIS Real-Time Ocean Observation Data Portal",
        type: "LINK",
        contentUrl: "https://incois.gov.in/portal/datainfo/argo.jsp",
        contentText: "Access real-time Argo float profiles and surface drifter trajectories.",
        order: 5,
      },
    });
    assert(linkModule.type === "LINK" && (linkModule.contentUrl?.startsWith("https://incois.gov.in") ?? false), "Module 5 created: Other Link");

    // 9. Query course as a trainee/trainer to verify all 5 modules are returned intact
    console.log("\n--- Verifying Course Curriculum Fetch ---");
    const fullCourse = await prisma.course.findUnique({
      where: { id: testCourse.id },
      include: {
        modules: {
          orderBy: { order: "asc" },
        },
      },
    });

    assert(fullCourse?.modules.length === 5, "All 5 modules retrieved successfully");
    assert(fullCourse?.modules[0].type === "PDF", "Module 1 is PDF");
    assert(fullCourse?.modules[1].type === "TEXT", "Module 2 is Manual Text");
    assert(fullCourse?.modules[2].type === "VIDEO", "Module 3 is YouTube Video");
    assert(fullCourse?.modules[3].type === "IMAGE", "Module 4 is Photos");
    assert(fullCourse?.modules[4].type === "LINK", "Module 5 is Other Link");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    // Cleanup
    if (testCourse) {
      await prisma.module.deleteMany({ where: { courseId: testCourse.id } }).catch(() => {});
      await prisma.course.delete({ where: { id: testCourse.id } }).catch(() => {});
    }
    if (testTrainer) {
      await prisma.user.delete({ where: { id: testTrainer.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTest();
