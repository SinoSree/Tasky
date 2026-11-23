// ---------------------------------------------------------------------------
// rateLimits.js — caps how often one IP address may call sensitive routes.
//
// WHY THIS MATTERS MOST HERE
// Your password rule allows 8 digits: 100 million combinations. A script
// making thousands of guesses a second would get through that. A limit of
// 10 login attempts per 15 minutes turns it into a job lasting centuries.
//
// These limits are per IP address and held in memory, which is right for a
// single server. If you ever run more than one, move the counters to Redis
// or MongoDB so the limit is shared rather than multiplied.
// ---------------------------------------------------------------------------
import rateLimit from 'express-rate-limit';

// Each limit can be raised from .env. The automated tests set these high so
// a run of 17 scenarios is not throttled partway through; leave them unset
// in normal use and the safe defaults below apply.
const cap = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const shared = {
  standardHeaders: true,   // tells the client its limit via RateLimit-* headers
  legacyHeaders: false,
  // One consistent error shape, so the React code handles it like any other.
  handler: (req, res, next, options) =>
    res.status(options.statusCode).json({
      ok: false,
      error: options.message,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    }),
};

// Registration: enough for genuine retries after validation errors,
// restrictive enough to stop bulk account creation.
export const registerLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: cap('RATE_LIMIT_MAX', 10),
  message: 'Too many registration attempts. Please try again in an hour.',
});

// Login: the one that matters most.
export const loginLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: cap('RATE_LIMIT_MAX', 10),
  // Only failures count, so somebody logging in normally is never blocked.
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please try again in 15 minutes.',
});

// Submitting codes. The per-code attempt limit in otpService is the real
// protection; this stops someone cycling through many codes quickly.
export const otpVerifyLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: cap('RATE_LIMIT_MAX', 20),
  message: 'Too many verification attempts. Please try again in 15 minutes.',
});

// Asking for codes. Protects your mail provider's sending quota, on top of
// the per-user cooldown enforced in otpService.
export const otpResendLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: cap('RATE_LIMIT_MAX', 15),
  message: 'Too many code requests. Please try again in an hour.',
});
