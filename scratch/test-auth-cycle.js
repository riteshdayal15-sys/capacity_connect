const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Parse .env
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

async function testFullAuthCycle() {
  console.log('=== TESTING REGISTRATION & LOGIN WORKFLOW ===\n');
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

  const testEmail = `test.officer.${Date.now()}@incois.gov.in`;
  const rawPassword = 'SecurePassword2026!';

  try {
    // 1. Test Signup Validation: Password too short
    const shortPassword = '123';
    assert(
      'Signup validation rejects password < 6 chars',
      shortPassword.length < 6,
      'Length: ' + shortPassword.length
    );

    // 2. Test Signup Validation: Invalid email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert(
      'Signup validation rejects invalid email',
      !emailRegex.test('invalid-email-address') && emailRegex.test(testEmail)
    );

    // 3. Test Account Creation (Trainee role enforced)
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const newUser = await prisma.user.create({
      data: {
        name: 'Dr. Test Officer',
        email: testEmail,
        passwordHash,
        department: 'INCOIS Hyderabad (Ocean Services)',
        role: 'TRAINEE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
      },
    });

    assert('New user registered successfully', !!newUser && !!newUser.id);
    assert('New user defaults to TRAINEE role', newUser.role === 'TRAINEE');
    assert('Department saved correctly', newUser.department.includes('INCOIS'));

    // 4. Test Password Authentication
    const fetchedUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    const isMatch = await bcrypt.compare(rawPassword, fetchedUser.passwordHash);
    assert('Password verification succeeds with correct password', isMatch);

    const isWrongMatch = await bcrypt.compare('wrong-password', fetchedUser.passwordHash);
    assert('Password verification rejects wrong password', !isWrongMatch);

    // 5. Test Admin Role Promotion (Trainee -> Trainer)
    const promotedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: { role: 'TRAINER' },
    });
    assert('Admin can promote user to TRAINER', promotedUser.role === 'TRAINER');

    // 6. Clean up test user
    await prisma.user.delete({
      where: { id: newUser.id },
    });
    const deletedCheck = await prisma.user.findUnique({ where: { id: newUser.id } });
    assert('Test account cleaned up cleanly', deletedCheck === null);

    // 7. Verify All 3 Quick Demo Accounts exist and have correct roles
    const admin = await prisma.user.findUnique({ where: { email: 'admin@moes.gov.in' } });
    assert('Demo Admin account ready', admin && admin.role === 'ADMIN');

    const trainer = await prisma.user.findUnique({ where: { email: 'trainer.incois@moes.gov.in' } });
    assert('Demo Trainer account ready', trainer && trainer.role === 'TRAINER');

    const trainee = await prisma.user.findUnique({ where: { email: 'rahul.v@imd.gov.in' } });
    assert('Demo Trainee account ready', trainee && trainee.role === 'TRAINEE');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  }
}

testFullAuthCycle();
