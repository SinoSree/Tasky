// ---------------------------------------------------------------------------
// auth.test.js — drives all 17 authentication scenarios through real HTTP.
//
// Run it with:  npm test
//
// HOW IT WORKS
// It starts the real Express app on a spare port and makes real requests to
// it with fetch, holding on to cookies the way a browser would. Nothing is
// stubbed: the same routes, validators, hashing and database code run here
// as in normal use.
//
// TWO THINGS ARE SUBSTITUTED, and only these:
//
//   1. The database. Without MONGODB_URI it starts a throwaway MongoDB in
//      memory, so tests never touch your real data. Set MONGODB_URI (for
//      example to an Atlas test database) and it uses that instead.
//
//   2. SMTP delivery. Messages are composed in full by nodemailer and kept
//      in memory, so the tests can read the code out of the real rendered
//      email. Actual delivery to an inbox is checked separately by
//      registering through the browser once your Gmail details are in .env.
//
// Codes are never read from a back door: each one is taken from the email
// body exactly as a user would read it.
// ---------------------------------------------------------------------------

// These must be set BEFORE anything imports config/env.js, which reads them
// once on load.
process.env.MAIL_TRANSPORT = 'capture';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret-that-is-definitely-long-enough-0123456789';
process.env.SMTP_USER ||= 'test@example.com';
process.env.SMTP_PASS ||= 'test-password';
process.env.OTP_RESEND_COOLDOWN_SECONDS ||= '0';   // no waiting in tests
process.env.RATE_LIMIT_MAX ||= '500';              // limits tested separately

let memoryServer = null;
if (!process.env.MONGODB_URI) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memoryServer.getUri('taskly_test');
}

const { createApp } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase } = await import('../src/db/connect.js');
const { capturedMails } = await import('../src/services/mailer.js');
const { User } = await import('../src/models/User.js');
const { OtpToken } = await import('../src/models/OtpToken.js');

// --- tiny test harness ------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m  ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${label}${detail ? `\n          ${detail}` : ''}`);
  }
}

function scenario(number, title) {
  console.log(`\n\x1b[1m${String(number).padStart(2)}. ${title}\x1b[0m`);
}

// --- a minimal browser: keeps cookies between requests ----------------------

let baseUrl = '';
let cookieJar = '';

async function call(path, { method = 'GET', body, useCookie = true } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(useCookie && cookieJar ? { Cookie: cookieJar } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Remember cookies the server sets, exactly as a browser would.
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const raw of setCookie) {
    const pair = raw.split(';')[0];
    const name = pair.split('=')[0];
    const value = pair.split('=').slice(1).join('=');
    const others = cookieJar.split('; ').filter((c) => c && !c.startsWith(`${name}=`));
    // An empty value means the server is clearing it (logout).
    cookieJar = value ? [...others, pair].join('; ') : others.join('; ');
  }

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}

/** Pull the 6-digit code out of the most recent email sent to an address. */
function codeFromEmail(email) {
  const mail = [...capturedMails].reverse().find((m) => m.to === email);
  if (!mail) return null;
  const match = mail.text.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

// --- the scenarios ----------------------------------------------------------

const VALID = {
  username: 'Sino',
  email: 'sino.test@example.com',
  mobile: '+919876543210',
  password: '12345678',
  confirmPassword: '12345678',
};

async function run() {
  console.log('\n\x1b[1mTaskly authentication tests\x1b[0m');
  console.log(memoryServer
    ? '  database: throwaway in-memory MongoDB'
    : '  database: MONGODB_URI from your environment');
  console.log('  email:    composed in full, captured in memory\n');

  // ---------------------------------------------------------------- 1
  scenario(1, 'Successful registration');
  let res = await call('/api/auth/register', { method: 'POST', body: VALID });
  check('returns 201 Created', res.status === 201, `got ${res.status}`);
  check('says a code was sent', /sent a 6-digit code/i.test(res.data?.message || ''));
  check('an email was composed', capturedMails.some((m) => m.to === VALID.email));
  check('the email contains a 6-digit code', Boolean(codeFromEmail(VALID.email)));
  check('the email is Taskly branded', /Taskly/.test(capturedMails.at(-1)?.html || ''));

  let stored = await User.findOne({ email: VALID.email }).select('+passwordHash');
  check('account exists but is NOT verified', stored && stored.isEmailVerified === false);
  check('password is stored as a hash, not plain text',
    stored && stored.passwordHash !== VALID.password && stored.passwordHash.startsWith('$2'));
  check('mobile was normalised to E.164', stored?.mobile === '+919876543210');

  const otpRow = await OtpToken.findOne({ userId: stored._id }).select('+codeHash');
  const plainCode = codeFromEmail(VALID.email);
  check('OTP is stored as a hash, not the digits',
    otpRow && otpRow.codeHash !== plainCode && otpRow.codeHash.startsWith('$2'));

  // ---------------------------------------------------------------- 2
  scenario(2, 'Invalid username');
  for (const [label, username] of [
    ['digits rejected', 'Sino123'],
    ['symbols rejected', 'Sino_V'],
    ['too short rejected', 'Si'],
    ['too long rejected', 'A'.repeat(21)],
  ]) {
    res = await call('/api/auth/register', {
      method: 'POST',
      body: { ...VALID, username, email: `u${Date.now()}@example.com`, mobile: '+919000000001' },
    });
    check(label, res.status === 400 && Boolean(res.data?.fieldErrors?.username),
      `got ${res.status} ${JSON.stringify(res.data?.fieldErrors)}`);
  }

  // ---------------------------------------------------------------- 3
  scenario(3, 'Invalid email');
  res = await call('/api/auth/register', {
    method: 'POST',
    body: { ...VALID, email: 'not-an-email', mobile: '+919000000002' },
  });
  check('returns 400 with an email message',
    res.status === 400 && Boolean(res.data?.fieldErrors?.email));

  // ---------------------------------------------------------------- 4
  scenario(4, 'Duplicate email');
  res = await call('/api/auth/register', {
    method: 'POST',
    body: { ...VALID, mobile: '+919000000003' },
  });
  check('returns 409 Conflict', res.status === 409, `got ${res.status}`);
  check('names the email field', Boolean(res.data?.fieldErrors?.email));

  // ---------------------------------------------------------------- 5
  scenario(5, 'Duplicate mobile number');
  res = await call('/api/auth/register', {
    method: 'POST',
    body: { ...VALID, email: 'different@example.com' },
  });
  check('returns 409 Conflict', res.status === 409, `got ${res.status}`);
  check('names the mobile field', Boolean(res.data?.fieldErrors?.mobile));

  // ---------------------------------------------------------------- 6
  scenario(6, 'Password containing letters or special characters');
  for (const [label, password] of [
    ['letters rejected', 'abcd1234'],
    ['symbols rejected', '1234!@#$'],
    ['too short rejected', '1234567'],
  ]) {
    res = await call('/api/auth/register', {
      method: 'POST',
      body: { ...VALID, email: `p${Date.now()}@example.com`, mobile: '+919000000004',
              password, confirmPassword: password },
    });
    check(label, res.status === 400 && Boolean(res.data?.fieldErrors?.password),
      `got ${res.status}`);
  }

  // ---------------------------------------------------------------- 7
  scenario(7, 'Password confirmation mismatch');
  res = await call('/api/auth/register', {
    method: 'POST',
    body: { ...VALID, email: 'mismatch@example.com', mobile: '+919000000005',
            confirmPassword: '87654321' },
  });
  check('returns 400 against the confirm field',
    res.status === 400 && Boolean(res.data?.fieldErrors?.confirmPassword));

  // ---------------------------------------------------------------- 15
  // Checked before verification, because that is the only moment the
  // account is in the unverified state.
  scenario(15, 'Login before email verification');
  res = await call('/api/auth/login', {
    method: 'POST',
    body: { identifier: VALID.email, password: VALID.password },
  });
  check('returns 403 Forbidden', res.status === 403, `got ${res.status}`);
  check('explains that verification is needed', res.data?.reason === 'email_not_verified');
  check('no session cookie was issued', !cookieJar.includes('taskly_session'));

  // ---------------------------------------------------------------- 9
  scenario(9, 'Incorrect OTP');
  const realCode = codeFromEmail(VALID.email);
  const wrongCode = realCode === '000000' ? '111111' : '000000';
  res = await call('/api/auth/verify-email', {
    method: 'POST', body: { email: VALID.email, code: wrongCode },
  });
  check('returns 400', res.status === 400, `got ${res.status}`);
  check('reports attempts remaining', typeof res.data?.attemptsRemaining === 'number');

  let after = await User.findOne({ email: VALID.email });
  check('account is still unverified', after?.isEmailVerified === false);

  // ---------------------------------------------------------------- 10
  scenario(10, 'Expired OTP');
  // Age the code by moving its expiry into the past — the clock is faked,
  // the expiry check is real.
  await OtpToken.updateMany(
    { userId: after._id, consumedAt: null },
    { $set: { expiresAt: new Date(Date.now() - 1000) } }
  );
  res = await call('/api/auth/verify-email', {
    method: 'POST', body: { email: VALID.email, code: realCode },
  });
  check('a correct but expired code is refused', res.status === 400, `got ${res.status}`);
  check('says the code expired', res.data?.reason === 'expired' || /expired/i.test(res.data?.error || ''));

  // ---------------------------------------------------------------- 11
  scenario(11, 'Resending OTP');
  const mailsBefore = capturedMails.length;
  res = await call('/api/auth/resend-otp', { method: 'POST', body: { email: VALID.email } });
  check('returns 200', res.status === 200, `got ${res.status}`);
  check('another email was sent', capturedMails.length === mailsBefore + 1);

  const newCode = codeFromEmail(VALID.email);
  check('the new code is different', newCode && newCode !== realCode);

  res = await call('/api/auth/verify-email', {
    method: 'POST', body: { email: VALID.email, code: realCode },
  });
  check('the OLD code no longer works', res.status === 400, `got ${res.status}`);

  res = await call('/api/auth/resend-otp', { method: 'POST', body: { email: 'nobody@example.com' } });
  check('an unknown address gets the same vague reply', res.status === 200);

  // ---------------------------------------------------------------- 8
  scenario(8, 'Successful OTP verification');
  const goodCode = codeFromEmail(VALID.email);
  res = await call('/api/auth/verify-email', {
    method: 'POST', body: { email: VALID.email, code: goodCode },
  });
  check('returns 200', res.status === 200, `got ${res.status} ${res.data?.error || ''}`);
  check('a session cookie was issued', cookieJar.includes('taskly_session'));
  check('the user is returned without a password hash',
    Boolean(res.data?.user) && !('passwordHash' in (res.data.user || {})));

  after = await User.findOne({ email: VALID.email });
  check('account is now verified', after?.isEmailVerified === true);

  res = await call('/api/auth/verify-email', {
    method: 'POST', body: { email: VALID.email, code: goodCode },
  });
  check('the same code cannot be used twice', res.status !== 200, `got ${res.status}`);

  // ---------------------------------------------------------------- 16
  scenario(16, 'Successful logout');
  res = await call('/api/auth/me');
  check('/me works while signed in', res.status === 200, `got ${res.status}`);

  res = await call('/api/auth/logout', { method: 'POST' });
  check('logout returns 200', res.status === 200);
  check('the cookie was cleared', !cookieJar.includes('taskly_session'));

  // ---------------------------------------------------------------- 17
  scenario(17, 'Accessing the dashboard without authentication');
  res = await call('/api/auth/me', { useCookie: false });
  check('returns 401 Unauthorized', res.status === 401, `got ${res.status}`);
  check('reveals nothing about any account', !res.data?.user);

  res = await call('/api/auth/me', { method: 'GET', useCookie: true });
  check('a cleared cookie also gives 401', res.status === 401, `got ${res.status}`);

  // ---------------------------------------------------------------- 12
  scenario(12, 'Login using email');
  res = await call('/api/auth/login', {
    method: 'POST', body: { identifier: VALID.email, password: VALID.password },
  });
  check('returns 200', res.status === 200, `got ${res.status} ${res.data?.error || ''}`);
  check('a session cookie was issued', cookieJar.includes('taskly_session'));

  res = await call('/api/auth/me');
  check('/me now returns the right account', res.data?.user?.email === VALID.email);

  await call('/api/auth/logout', { method: 'POST' });

  // ---------------------------------------------------------------- 13
  scenario(13, 'Login using mobile number');
  res = await call('/api/auth/login', {
    method: 'POST', body: { identifier: VALID.mobile, password: VALID.password },
  });
  check('returns 200', res.status === 200, `got ${res.status} ${res.data?.error || ''}`);

  res = await call('/api/auth/login', {
    method: 'POST', body: { identifier: '+91 98765 43210', password: VALID.password },
  });
  check('a spaced mobile number works too', res.status === 200, `got ${res.status}`);

  // ---------------------------------------------------------------- 14
  scenario(14, 'Incorrect password');
  res = await call('/api/auth/login', {
    method: 'POST', body: { identifier: VALID.email, password: '99999999' },
  });
  check('returns 401', res.status === 401, `got ${res.status}`);
  check('message is exactly "Invalid email or password."',
    res.data?.error === 'Invalid email or password.', `got "${res.data?.error}"`);

  res = await call('/api/auth/login', {
    method: 'POST', body: { identifier: 'ghost@example.com', password: '12345678' },
  });
  check('an unknown account gives the SAME message',
    res.data?.error === 'Invalid email or password.',
    'a different message here would reveal which emails are registered');

  // --- extras worth proving -------------------------------------------------
  scenario('+', 'Additional checks');
  res = await call('/api/auth/login', {
    method: 'POST', body: { identifier: VALID.email, password: VALID.password },
  });
  check('signing in again works', res.status === 200);

  res = await call('/api/auth/me');
  check('no password hash is ever exposed',
    !JSON.stringify(res.data || {}).includes('$2'));

  res = await call('/api/auth/nope');
  check('an unknown route returns a clean 404', res.status === 404);

  const health = await call('/api/health');
  check('the health check responds', health.status === 200);
}

// --- start, run, report -----------------------------------------------------

const app = createApp();
await connectDatabase();

// Start from an empty database every time.
//
// With the in-memory database this is free — it is new anyway. With a real
// one it matters: the previous run's accounts would still be there, and the
// "successful registration" scenario would collide with its own leftovers.
//
// The name guard is the important part. This drops an entire database, so
// it refuses to run against anything not clearly named as a test database —
// pointing MONGODB_URI at `taskly` by mistake must not wipe real accounts.
{
  const { default: mongoose } = await import('mongoose');
  const dbName = mongoose.connection.name || '';
  const isMemory = Boolean(memoryServer);

  if (!isMemory && !/(^|[_-])test$/.test(dbName)) {
    console.error(`\n  Refusing to run: database "${dbName}" is not named as a test database.`);
    console.error('  These tests erase everything in it first. Use a name ending in "_test",');
    console.error('  for example MONGODB_URI=mongodb://127.0.0.1:27017/taskly_test\n');
    process.exit(1);
  }

  await mongoose.connection.dropDatabase();
}

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
baseUrl = `http://127.0.0.1:${server.address().port}`;

try {
  await run();
} catch (err) {
  failed += 1;
  console.error('\n  The test run stopped early:\n', err);
} finally {
  server.close();
  await disconnectDatabase();
  if (memoryServer) await memoryServer.stop();
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\n  Failing checks:');
  for (const name of failures) console.log(`    - ${name}`);
}
console.log(`${'─'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
