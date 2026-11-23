// ---------------------------------------------------------------------------
// dev-server.js — the real API, on a throwaway stack.
//
//   node tests/dev-server.js
//
// Runs the actual Express app with emails printed to this terminal instead
// of sent, so you can register and verify without a mail provider.
//
// The database depends on MONGODB_URI in server/.env:
//   set   → that database is used, and accounts survive restarts
//   unset → a temporary in-memory one; nothing persists
//
// USE IT FOR trying the sign-up and verification screens before you have
// Atlas and Gmail set up, and for checking UI changes without filling an
// inbox with test messages.
//
// NOT a substitute for the real thing. Once server/.env is filled in, use
// `npm start` — that is the version with your real database and real email
// delivery. This file is a convenience, and it says so on every code it
// prints.
// ---------------------------------------------------------------------------
process.env.MAIL_TRANSPORT = 'capture';
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET ||= 'dev-only-secret-not-for-production-0123456789abcdef';
process.env.SMTP_USER ||= 'dev@example.com';
process.env.SMTP_PASS ||= 'dev-password';
process.env.OTP_RESEND_COOLDOWN_SECONDS ||= '10';
process.env.PORT ||= '4000';
// Both the Vite dev server and the static preview used for the bundled build.
process.env.CLIENT_ORIGIN ||= 'http://localhost:5173,http://localhost:8077';

// Read .env before deciding anything. config/env.js loads it too, but that
// happens later — and MONGODB_URI lives in .env, so without this the check
// below would always find it missing and start an in-memory database even
// when a real one is configured.
const { default: dotenv } = await import('dotenv');
const { default: path } = await import('node:path');
const { fileURLToPath } = await import('node:url');
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

// Use a real database when MONGODB_URI is set — a local MongoDB, say — so
// accounts survive a restart. Fall back to a throwaway in-memory one only
// when there is nothing to connect to.
let memoryServer = null;
if (!process.env.MONGODB_URI) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memoryServer.getUri('taskly_dev');
}

const { createApp } = await import('../src/app.js');
const { connectDatabase } = await import('../src/db/connect.js');
const { capturedMails } = await import('../src/services/mailer.js');
const { env } = await import('../src/config/env.js');

await connectDatabase();

// Print each code as it is "sent", so you can carry on in the browser.
let shown = 0;
setInterval(() => {
  while (shown < capturedMails.length) {
    const mail = capturedMails[shown];
    shown += 1;
    const code = (mail.text.match(/\b(\d{6})\b/) || [])[1];
    console.log(`\n  ──────────────────────────────────────────`);
    console.log(`   Email for : ${mail.to}`);
    console.log(`   Code      : ${code}`);
    console.log(`  ──────────────────────────────────────────\n`);
  }
}, 300).unref();

createApp().listen(env.port, () => {
  console.log(memoryServer
    ? `\n  DEV STACK — in-memory database, emails printed here, nothing saved.`
    : `\n  DEV STACK — your real database, emails printed here instead of sent.`);
  console.log(`  Listening on http://localhost:${env.port}`);
  console.log(`  Allowing: ${env.clientOrigins.join(', ')}\n`);
});
