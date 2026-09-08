import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Ministry of Earth Sciences (MoES) Capacity Connect database...");

  // Clear existing data
  await prisma.certificate.deleteMany();
  await prisma.assessmentAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.competencyBlock.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash("password123", 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      name: "Dr. Rajesh Kumar (Director HRD)",
      email: "admin@moes.gov.in",
      passwordHash: defaultPassword,
      role: "ADMIN",
      department: "MoES HQ New Delhi",
    },
  });

  // 2. Create Trainers
  const trainer1 = await prisma.user.create({
    data: {
      name: "Dr. Ananya Roy (Chief Oceanographer)",
      email: "trainer.incois@moes.gov.in",
      passwordHash: defaultPassword,
      role: "TRAINER",
      department: "INCOIS Hyderabad",
    },
  });

  const trainer2 = await prisma.user.create({
    data: {
      name: "Dr. Vikram Seth (Radar Meteorologist)",
      email: "trainer.imd@moes.gov.in",
      passwordHash: defaultPassword,
      role: "TRAINER",
      department: "IMD Pune",
    },
  });

  // 3. Create 10 Trainees across diverse MoES institutes
  const traineesData = [
    { name: "Rahul Verma", email: "rahul.v@imd.gov.in", dept: "IMD Delhi" },
    { name: "Priya Sharma", email: "priya.s@incois.gov.in", dept: "INCOIS Hyderabad" },
    { name: "Amitabh Sen", email: "amitabh.s@iitm.res.in", dept: "IITM Pune" },
    { name: "Sneha Nair", email: "sneha.n@niot.res.in", dept: "NIOT Chennai" },
    { name: "Karthik Rajan", email: "karthik.r@ncmrwf.gov.in", dept: "NCMRWF Noida" },
    { name: "Divya Patel", email: "divya.p@imd.gov.in", dept: "IMD Mumbai" },
    { name: "Manoj Deshmukh", email: "manoj.d@iitm.res.in", dept: "IITM Pune" },
    { name: "Sunita Reddy", email: "sunita.r@incois.gov.in", dept: "INCOIS Hyderabad" },
    { name: "Arun Joshi", email: "arun.j@ncpor.res.in", dept: "NCPOR Goa" },
    { name: "Meera Menon", email: "meera.m@niot.res.in", dept: "NIOT Chennai" },
  ];

  const trainees = [];
  for (const t of traineesData) {
    const user = await prisma.user.create({
      data: {
        name: t.name,
        email: t.email,
        passwordHash: defaultPassword,
        role: "TRAINEE",
        department: t.dept,
      },
    });
    trainees.push(user);
  }

  // 4. Create Competency Blocks
  const block1 = await prisma.competencyBlock.create({
    data: {
      title: "Ocean Observation & Deep-Sea Instrumentation",
      description:
        "Comprehensive competency training on deploying, calibrating, and maintaining moored buoys, Argo floats, and deep-sea gliders.",
      category: "Ocean Sciences & Technology",
    },
  });

  const block2 = await prisma.competencyBlock.create({
    data: {
      title: "Atmospheric Remote Sensing & Doppler Weather Radar",
      description:
        "Field and laboratory skills for operating S-band and C-band dual-polarization Doppler weather radars for severe cyclone tracking.",
      category: "Meteorology & Climate",
    },
  });

  const block3 = await prisma.competencyBlock.create({
    data: {
      title: "Seismological Network Operations & Tsunami Warning",
      description:
        "Protocols for real-time seismic waveform analysis, epicenter determination, and Indian Ocean Tsunami Early Warning System dissemination.",
      category: "Geohazards & Early Warning",
    },
  });

  // 5. Create Courses
  const course1 = await prisma.course.create({
    data: {
      title: "Deep-Sea Mooring & CTD Sensor Calibration",
      description:
        "Master the mechanical rigging, acoustic release mechanisms, and conductivity-temperature-depth (CTD) sensor baseline validation.",
      competencyBlockId: block1.id,
      trainerId: trainer1.id,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      title: "Doppler Radar Echo Interpretation for Extreme Rain Events",
      description:
        "Analyze reflectivity (Z), differential reflectivity (ZDR), and velocity azimuth displays (VAD) to forecast convective storms and flash floods.",
      competencyBlockId: block2.id,
      trainerId: trainer2.id,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      title: "Tsunami Inundation Modeling & Crisis Protocols",
      description:
        "Operate TUNAMI-N2 simulation tools, validate bathymetry data, and execute standard operating procedures for coastal evacuation alerts.",
      competencyBlockId: block3.id,
      trainerId: trainer1.id,
    },
  });

  // 6. Create Modules for Course 1
  const mod1 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: "Overview of Ocean Observing System (OOS) Architecture",
      type: "TEXT",
      contentText: `### 1. Introduction to MoES Ocean Observing Systems
The Ministry of Earth Sciences maintains an extensive in-situ ocean observation network across the Arabian Sea, Bay of Bengal, and the equatorial Indian Ocean.

Key platforms include:
- **OMNI Buoys (Ocean Moored Buoy Network for Northern Indian Ocean)**: Equipped with surface meteorology sensors and subsurface inductive telemetry chains measuring temperature and salinity down to 500m.
- **Argo Profiling Floats**: Autonomous floats cycling from surface to 2000m depth every 10 days, providing real-time vertical hydrographic sections.
- **Wave Rider Buoys**: Deployed along Indian coastal zones to deliver high-resolution significant wave height and directional spectra.

Reliable sensor calibrations and preventative maintenance are critical for operational monsoonal forecasting and cyclone genesis prediction.`,
      summary:
        "- MoES maintains OMNI buoys, Argo floats, and wave rider buoys.\n- Subsurface inductive telemetry measures temperature & salinity to 500m.\n- Sensor calibration guarantees monsoonal and cyclonic prediction accuracy.",
      order: 1,
    },
  });

  const mod2 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: "CTD Sensor Pre-Deployment Calibration Protocols",
      type: "VIDEO",
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      contentText:
        "Video lecture detailing laboratory bath calibration procedures with standard seawater (IAPSO) and acoustic release battery voltage diagnostics.",
      summary:
        "- Standard seawater (IAPSO) validation before cruise deployment.\n- Acoustic release battery load testing and transponder ping check.\n- Anti-fouling coating application on optical and conductivity cells.",
      order: 2,
    },
  });

  // 7. Create Assessments & Questions
  const assessment1 = await prisma.assessment.create({
    data: {
      moduleId: mod1.id,
      title: "Ocean Observing Systems Competency Check",
    },
  });

  await prisma.question.createMany({
    data: [
      {
        assessmentId: assessment1.id,
        text: "What is the typical profiling depth cycle limit of standard Argo floats deployed by INCOIS?",
        options: JSON.stringify(["500 meters", "1,000 meters", "2,000 meters", "6,000 meters"]),
        correctOptionIndex: 2,
      },
      {
        assessmentId: assessment1.id,
        text: "Which parameter is NOT directly measured by standard surface OMNI meteorological payloads?",
        options: JSON.stringify(["Wind speed & direction", "Atmospheric pressure", "Deep seismic mantle shear", "Air temperature & humidity"]),
        correctOptionIndex: 2,
      },
      {
        assessmentId: assessment1.id,
        text: "Why must CTD conductivity cells be rinsed with distilled deionized water immediately after recovery?",
        options: JSON.stringify([
          "To prevent salt crystallization and bio-fouling drift",
          "To cool down the electronics",
          "To erase logged data",
          "To alter sensor serial calibration keys",
        ]),
        correctOptionIndex: 0,
      },
    ],
  });

  // 8. Create Sample Enrollments & Attempts
  // Trainee 0 (Rahul) completed Course 1
  const enrollment1 = await prisma.enrollment.create({
    data: {
      courseId: course1.id,
      traineeId: trainees[0].id,
      status: "COMPLETED",
      progressPercent: 100,
      completedModuleIds: JSON.stringify([mod1.id, mod2.id]),
    },
  });

  await prisma.assessmentAttempt.create({
    data: {
      assessmentId: assessment1.id,
      traineeId: trainees[0].id,
      score: 3,
      maxScore: 3,
    },
  });

  await prisma.certificate.create({
    data: {
      courseId: course1.id,
      traineeId: trainees[0].id,
      certificateUrl: `/api/certificates/${enrollment1.id}`,
      note: "Distinction in Deep-Sea Oceanographic Instrumentation Protocols",
    },
  });

  // Trainee 1 (Priya) in progress
  await prisma.enrollment.create({
    data: {
      courseId: course1.id,
      traineeId: trainees[1].id,
      status: "IN_PROGRESS",
      progressPercent: 50,
      completedModuleIds: JSON.stringify([mod1.id]),
    },
  });

  // Trainee 2 (Amitabh) enrolled in course 2
  await prisma.enrollment.create({
    data: {
      courseId: course2.id,
      traineeId: trainees[2].id,
      status: "IN_PROGRESS",
      progressPercent: 25,
      completedModuleIds: "[]",
    },
  });

  console.log("Database successfully seeded with realistic MoES data!");
  console.log(`Admin user: ${admin.email} (password: password123)`);
  console.log(`Trainer 1: ${trainer1.email} (password: password123)`);
  console.log(`Trainer 2: ${trainer2.email} (password: password123)`);
  console.log(`Trainee 1: ${trainees[0].email} (password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
