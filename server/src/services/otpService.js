// ---------------------------------------------------------------------------
// otpService.js — everything about one-time codes.
//
// Keeping this apart from the controllers means the rules live in one place
// and can be tested on their own. The controllers just say "issue a code"
// or "check this code" without knowing how either works.
//
// The rules enforced here:
//   - the code is random, from a cryptographic source
//   - it is stored as a bcrypt hash, never as digits
//   - it expires after OTP_TTL_MINUTES
//   - wrong guesses are counted; at the limit the code is burned
//   - a used code can never be used again
//   - resending is limited, per minute and per hour
// ---------------------------------------------------------------------------
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OtpToken } from '../models/OtpToken.js';
import { env } from '../config/env.js';
import { sendMail } from './mailer.js';
import { buildOtpEmail } from '../emails/otpEmail.js';

// Fewer rounds than a password: a code lives five minutes and we verify it
// on every attempt. 10 is still far beyond what brute force can chew through
// inside the expiry window.
const OTP_BCRYPT_ROUNDS = 10;

/**
 * A random numeric code of the configured length.
 *
 * `crypto.randomInt` is used rather than `Math.random`, which is predictable:
 * knowing a few of its outputs lets you work out the rest. Fine for shuffling
 * a list, useless for anything protecting an account.
 */
function generateCode(length = env.otp.length) {
  let code = '';
  for (let i = 0; i < length; i += 1) code += crypto.randomInt(0, 10);
  return code;
}

/**
 * How many codes we have sent this user in the last hour, and when the most
 * recent one went out. Used for the two resend limits.
 */
async function getSendWindow(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await OtpToken.find({
    userId,
    purpose: 'email_verification',
    createdAt: { $gte: oneHourAgo },
  })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();

  return { countThisHour: recent.length, lastSentAt: recent[0]?.createdAt || null };
}

/**
 * Create a code, store its hash, and email the real digits.
 *
 * `enforceCooldown` is false for the code sent during registration (the user
 * has not asked for anything yet) and true for every explicit resend.
 */
export async function issueOtp({ user, enforceCooldown = true }) {
  if (enforceCooldown) {
    const { countThisHour, lastSentAt } = await getSendWindow(user._id);

    if (countThisHour >= env.otp.maxSendsPerHour) {
      return {
        ok: false,
        reason: 'hourly_limit',
        message: 'Too many codes requested. Please try again in an hour.',
        retryAfterSeconds: 3600,
      };
    }

    if (lastSentAt) {
      const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
      const remaining = Math.ceil(env.otp.resendCooldownSeconds - elapsed);
      if (remaining > 0) {
        return {
          ok: false,
          reason: 'cooldown',
          message: `Please wait ${remaining} seconds before requesting another code.`,
          retryAfterSeconds: remaining,
        };
      }
    }
  }

  // Any earlier code stops working the moment a new one is sent. Without
  // this, every resend would leave another valid code alive.
  await OtpToken.updateMany(
    { userId: user._id, purpose: 'email_verification', consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, OTP_BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60 * 1000);

  await OtpToken.create({
    userId: user._id,
    purpose: 'email_verification',
    codeHash,
    expiresAt,
  });

  const { subject, text, html } = buildOtpEmail({
    username: user.username,
    code,
    ttlMinutes: env.otp.ttlMinutes,
  });

  await sendMail({ to: user.email, subject, text, html });

  // The plain code is returned ONLY so automated tests can read it. It is
  // never put in an API response or written to a log.
  return { ok: true, expiresAt, devCode: code };
}

/**
 * Check a code a user typed.
 *
 * Returns { ok: true } or { ok: false, reason, message }. The caller decides
 * what to say; this function decides what is true.
 */
export async function verifyOtp({ user, code }) {
  const token = await OtpToken.findOne({
    userId: user._id,
    purpose: 'email_verification',
    consumedAt: null,
  })
    .sort({ createdAt: -1 })
    .select('+codeHash');

  if (!token) {
    return { ok: false, reason: 'no_code', message: 'No active code. Request a new one.' };
  }

  // Checked in code as well as by the TTL index, because MongoDB's cleanup
  // runs about once a minute — an expired code can briefly still exist.
  if (token.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'expired', message: 'That code has expired. Request a new one.' };
  }

  if (token.attempts >= env.otp.maxAttempts) {
    return {
      ok: false,
      reason: 'too_many_attempts',
      message: 'Too many incorrect attempts. Request a new code.',
    };
  }

  const matches = await bcrypt.compare(code, token.codeHash);

  if (!matches) {
    token.attempts += 1;
    // At the limit, burn the code. A fresh one must be requested, which the
    // resend limits then slow down.
    if (token.attempts >= env.otp.maxAttempts) token.consumedAt = new Date();
    await token.save();

    const left = Math.max(0, env.otp.maxAttempts - token.attempts);
    return {
      ok: false,
      reason: 'incorrect',
      message: left > 0
        ? `Incorrect code. ${left} ${left === 1 ? 'attempt' : 'attempts'} remaining.`
        : 'Too many incorrect attempts. Request a new code.',
      attemptsRemaining: left,
    };
  }

  // Correct. Mark it used so it cannot work a second time.
  token.consumedAt = new Date();
  await token.save();

  return { ok: true };
}
