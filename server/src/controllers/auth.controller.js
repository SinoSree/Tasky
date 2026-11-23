// ---------------------------------------------------------------------------
// auth.controller.js — what actually happens on each endpoint.
//
// A controller's job is to decide, not to know how. It validates the input,
// asks the models and services to do the work, and chooses a status code.
// The OTP rules live in otpService, the hashing lives in the User model.
//
// RESPONSE SHAPE — the same everywhere, so the React side never guesses:
//   success  { ok: true,  ...data }
//   failure  { ok: false, error: 'Readable sentence', fieldErrors?: {...} }
// ---------------------------------------------------------------------------
import { User } from '../models/User.js';
import { OtpToken } from '../models/OtpToken.js';
import { issueOtp, verifyOtp } from '../services/otpService.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/requireAuth.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  registerSchema, verifyEmailSchema, resendOtpSchema, loginSchema,
  validate, parseIdentifier,
} from '../validators/authSchemas.js';
import { env } from '../config/env.js';

// After this many wrong passwords the account pauses briefly. This is per
// ACCOUNT, where the rate limiter is per IP — together they cover both an
// attacker on one machine and one spread across many.
const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 15;

// Returned for every failed login, whatever the real reason. Saying "no such
// account" would let someone discover which emails are registered.
const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export async function register(req, res) {
  const { data, fieldErrors } = validate(registerSchema, req.body);
  if (fieldErrors) {
    return res.status(400).json({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors });
  }

  const { username, email, mobile, password } = data;

  // Checked here for a helpful message; the unique index in MongoDB is what
  // actually guarantees it, including for two requests arriving at once.
  const [emailOwner, mobileOwner] = await Promise.all([
    User.findOne({ email }),
    User.findOne({ mobile }),
  ]);

  // A registered address is taken, full stop — whether or not it was ever
  // verified. Quietly replacing an unverified account would mean someone
  // else could overwrite a half-finished registration and claim the address.
  //
  // Someone who abandoned registration is not stranded: `reason` tells the
  // app to offer the code screen, where "send a new code" picks up exactly
  // where they left off.
  if (emailOwner) {
    const unverified = !emailOwner.isEmailVerified;
    return res.status(409).json({
      ok: false,
      error: unverified
        ? 'That email is registered but not yet verified. Enter the code we sent, or request a new one.'
        : 'That email is already registered.',
      fieldErrors: {
        email: unverified
          ? 'Already registered, awaiting verification.'
          : 'That email is already registered.',
      },
      ...(unverified && { reason: 'unverified_exists', email: emailOwner.email }),
    });
  }

  if (mobileOwner) {
    return res.status(409).json({
      ok: false,
      error: 'That mobile number is already registered.',
      fieldErrors: { mobile: 'That mobile number is already registered.' },
    });
  }

  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    username,
    email,
    mobile,
    passwordHash,
    isEmailVerified: false,   // the account is inert until the code is entered
  });

  // If the email cannot be sent, the account is removed again. Leaving an
  // unverified account behind would block this person from retrying with
  // the same address.
  //
  // Nothing below this point reports success unless a message was genuinely
  // handed to the mail server. Telling someone "check your email" for a
  // message that was never sent leaves them waiting for nothing.
  let issued;
  try {
    issued = await issueOtp({ user, enforceCooldown: false });
  } catch (err) {
    await user.deleteOne();
    console.error('  Registration aborted — unexpected error issuing the code:', err.message);
    throw new ApiError(502, 'We could not send your verification email. Please try again.');
  }

  if (!issued.ok) {
    await user.deleteOne();
    // mailer.js has already logged the precise cause to the server console.
    throw new ApiError(502, 'We could not send your verification email, so your account was not created. Please try again in a moment.');
  }

  res.status(201).json({
    ok: true,
    message: `We sent a 6-digit code to ${user.email}.`,
    email: user.email,
    expiresAt: issued.expiresAt,
    nextStep: 'verify-email',
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-email
// ---------------------------------------------------------------------------
export async function verifyEmail(req, res) {
  const { data, fieldErrors } = validate(verifyEmailSchema, req.body);
  if (fieldErrors) {
    return res.status(400).json({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors });
  }

  const user = await User.findOne({ email: data.email });

  // Deliberately vague: this route is reachable without being signed in, so
  // a precise answer would reveal which addresses have accounts.
  if (!user) {
    return res.status(400).json({ ok: false, error: 'That code is not valid.' });
  }

  if (user.isEmailVerified) {
    return res.status(409).json({ ok: false, error: 'This email is already verified. Please sign in.' });
  }

  const result = await verifyOtp({ user, code: data.code });

  if (!result.ok) {
    const status = result.reason === 'too_many_attempts' ? 429 : 400;
    return res.status(status).json({
      ok: false,
      error: result.message,
      reason: result.reason,
      ...(result.attemptsRemaining !== undefined && { attemptsRemaining: result.attemptsRemaining }),
    });
  }

  user.isEmailVerified = true;
  await user.save();

  // Tidy up: no codes for this user are of any use now.
  await OtpToken.deleteMany({ userId: user._id });

  // Sign them in straight away rather than making them retype their
  // password seconds after proving they own the address.
  setAuthCookie(res, user);

  res.status(200).json({
    ok: true,
    message: 'Email verified. Welcome to Taskly.',
    user: user.toPublicJSON(),
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/resend-otp
// ---------------------------------------------------------------------------
export async function resendOtp(req, res) {
  const { data, fieldErrors } = validate(resendOtpSchema, req.body);
  if (fieldErrors) {
    return res.status(400).json({ ok: false, error: 'Enter a valid email address.', fieldErrors });
  }

  const user = await User.findOne({ email: data.email });

  // Same reply whether or not the account exists, so this endpoint cannot be
  // used to find out which emails are registered.
  const vagueSuccess = {
    ok: true,
    message: 'If that account needs verifying, a new code is on its way.',
  };

  if (!user || user.isEmailVerified) {
    return res.status(200).json(vagueSuccess);
  }

  const result = await issueOtp({ user, enforceCooldown: true });

  if (!result.ok) {
    // A delivery failure is the server's fault, not the user's, and is not
    // a rate limit — so it must not be dressed up as one, and must never
    // return the reassuring "a new code is on its way".
    if (result.reason === 'mail_failed') {
      return res.status(502).json({ ok: false, error: result.message, reason: result.reason });
    }
    return res.status(429).json({
      ok: false,
      error: result.message,
      reason: result.reason,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }

  res.status(200).json({ ...vagueSuccess, expiresAt: result.expiresAt });
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export async function login(req, res) {
  const { data, fieldErrors } = validate(loginSchema, req.body);
  if (fieldErrors) {
    return res.status(400).json({ ok: false, error: 'Enter your details.', fieldErrors });
  }

  // Works out whether they typed an email or a mobile number.
  const identifier = parseIdentifier(data.identifier);
  if (!identifier) {
    return res.status(401).json({ ok: false, error: GENERIC_LOGIN_ERROR });
  }

  // passwordHash and the lock fields are `select: false`, so they must be
  // asked for by name.
  const user = await User.findOne({ [identifier.field]: identifier.value })
    .select('+passwordHash +failedLoginCount +lockedUntil');

  if (!user) {
    return res.status(401).json({ ok: false, error: GENERIC_LOGIN_ERROR });
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return res.status(429).json({
      ok: false,
      error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    });
  }

  const passwordOk = await user.verifyPassword(data.password);

  if (!passwordOk) {
    user.failedLoginCount = (user.failedLoginCount || 0) + 1;
    if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginCount = 0;
    }
    await user.save();
    return res.status(401).json({ ok: false, error: GENERIC_LOGIN_ERROR });
  }

  // The verification check comes AFTER the password check on purpose. The
  // other way round, a wrong password on an unverified account would reveal
  // that the account exists.
  if (!user.isEmailVerified) {
    return res.status(403).json({
      ok: false,
      error: 'Please verify your email before signing in.',
      reason: 'email_not_verified',
      email: user.email,          // lets the app open the code screen
    });
  }

  user.failedLoginCount = 0;
  user.lockedUntil = null;
  await user.save();

  setAuthCookie(res, user);

  res.status(200).json({ ok: true, user: user.toPublicJSON() });
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
export async function logout(req, res) {
  clearAuthCookie(res);
  // Succeeds even if nobody was signed in — logging out twice is not an error.
  res.status(200).json({ ok: true, message: 'Signed out.' });
}

// ---------------------------------------------------------------------------
// GET /api/auth/me   (protected by requireAuth)
// ---------------------------------------------------------------------------
export async function me(req, res) {
  // requireAuth already loaded the user and rejected the request otherwise,
  // so reaching this line means the session is valid.
  res.status(200).json({ ok: true, user: req.user.toPublicJSON() });
}

// ---------------------------------------------------------------------------
// GET /api/auth/config — public, no secrets.
// Lets the React app discover the rules (code length, expiry) instead of
// hard-coding numbers that might drift out of step with the server.
// ---------------------------------------------------------------------------
export async function config(req, res) {
  res.status(200).json({
    ok: true,
    otp: {
      length: env.otp.length,
      ttlMinutes: env.otp.ttlMinutes,
      resendCooldownSeconds: env.otp.resendCooldownSeconds,
    },
  });
}
