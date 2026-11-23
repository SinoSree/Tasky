// ---------------------------------------------------------------------------
// env.js — reads .env once, checks it, and shares the result.
//
// WHY THIS FILE EXISTS
// Secrets (database password, email password, cookie key) must never be
// written into source code, because source code gets committed to GitHub and
// shared. Instead they live in a .env file that stays on your machine only.
//
// This file also FAILS LOUDLY at startup if something is missing. A server
// that starts with no database password and only breaks on the first user's
// registration is far worse than one that refuses to start at all.
// ---------------------------------------------------------------------------
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env no matter which folder you ran `npm start` from.
dotenv.config({ path: path.join(here, '..', '..', '.env') });

// Settings with no safe default. If any is missing we stop immediately.
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET', 'SMTP_USER', 'SMTP_PASS'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('\n  Cannot start: missing settings in server/.env\n');
  for (const key of missing) console.error(`    - ${key}`);
  console.error('\n  Copy .env.example to .env and fill it in.\n');
  process.exit(1);
}

// A weak cookie secret is a real vulnerability, not a style issue.
if (process.env.JWT_SECRET.length < 32) {
  console.error('\n  JWT_SECRET is too short (needs 32+ characters).');
  console.error('  Generate one:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n');
  process.exit(1);
}

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Several origins allowed, so the Vite dev server and the static preview
  // can both talk to this API.
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGODB_URI,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.MAIL_FROM_NAME || 'Taskly',
    fromAddress: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER,
  },

  otp: {
    length: num(process.env.OTP_LENGTH, 6),
    ttlMinutes: num(process.env.OTP_TTL_MINUTES, 5),
    maxAttempts: num(process.env.OTP_MAX_ATTEMPTS, 5),
    resendCooldownSeconds: num(process.env.OTP_RESEND_COOLDOWN_SECONDS, 60),
    maxSendsPerHour: num(process.env.OTP_MAX_SENDS_PER_HOUR, 5),
  },
};
