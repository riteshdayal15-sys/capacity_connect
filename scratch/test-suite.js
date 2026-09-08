const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Parse .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();

async function runTests() {
  console.log('=== CAPACITY CONNECT FULL PLATFORM AUDIT & TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  try {
    // 1. Database Connection & Core Seeds
    const userCount = await prisma.user.count();
    assert('Database contains users', userCount >= 3, `Count: ${userCount}`);

    const admin = await prisma.user.findUnique({ where: { email: 'admin@moes.gov.in' } });
    assert('Admin account exists', !!admin && admin.role === 'ADMIN');

    const trainer = await prisma.user.findUnique({ where: { email: 'trainer.incois@moes.gov.in' } });
    assert('Trainer account exists', !!trainer && trainer.role === 'TRAINER');

    const trainee = await prisma.user.findUnique({ where: { email: 'rahul.v@imd.gov.in' } });
    assert('Trainee account exists', !!trainee && trainee.role === 'TRAINEE');

    // 2. Authentication Password Hashes
    if (admin && admin.passwordHash) {
      const validPw = await bcrypt.compare('password123', admin.passwordHash);
      assert('Admin password hash authenticates "password123"', validPw);
    }

    // 3. Competency Blocks & Pathways
    const blocks = await prisma.competencyBlock.findMany({ include: { courses: true } });
    assert('Competency Blocks exist', blocks.length > 0, `Blocks count: ${blocks.length}`);

    // 4. Courses & Modules
    const courses = await prisma.course.findMany({
      include: {
        trainer: true,
        modules: { include: { assessments: { include: { questions: true } } } },
        enrollments: true,
      },
    });
    assert('Courses exist in catalog', courses.length > 0, `Courses count: ${courses.length}`);

    let totalModules = 0;
    let totalQuestions = 0;
    for (const c of courses) {
      totalModules += c.modules.length;
      for (const m of c.modules) {
        for (const a of m.assessments) {
          totalQuestions += a.questions.length;
        }
      }
    }
    assert('Modules exist in curriculum', totalModules > 0, `Total modules: ${totalModules}`);
    assert('Assessment questions exist', totalQuestions > 0, `Total questions: ${totalQuestions}`);

    // 5. Test Groq AI connectivity with configured model
    const groqKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    console.log(`\nTesting Groq AI connectivity with model: "${model}"...`);

    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Say "pong"' }],
            max_tokens: 10,
          }),
        });

        const groqData = await groqRes.json();
        if (groqRes.ok) {
          assert('Groq AI API live response', true, groqData.choices?.[0]?.message?.content?.trim());
        } else {
          assert('Groq AI API live response', false, `Status ${groqRes.status}: ${JSON.stringify(groqData.error || groqData)}`);
        }
      } catch (aiErr) {
        assert('Groq AI API live response', false, aiErr.message);
      }
    } else {
      console.log('⚠️ GROQ_API_KEY not found in environment');
    }

    // 6. Test Certificate Verification Flow
    const enrollments = await prisma.enrollment.findMany({
      where: { status: 'COMPLETED' },
      include: { course: true, trainee: true },
    });
    console.log(`\nCompleted enrollments for certification: ${enrollments.length}`);
    if (enrollments.length > 0) {
      const sample = enrollments[0];
      assert('Completed enrollment has trainee relation', !!sample.trainee);
      assert('Completed enrollment has course relation', !!sample.course);
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  }
}

runTests();
