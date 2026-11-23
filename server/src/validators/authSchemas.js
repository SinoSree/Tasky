// ---------------------------------------------------------------------------
// authSchemas.js — every input rule, in one place.
//
// Zod lets you describe what valid data looks like, then checks real data
// against it and hands back readable messages. One source of truth beats
// `if` statements scattered through the controllers.
//
// WHY VALIDATE HERE WHEN REACT ALREADY DOES?
// Because the browser cannot be trusted. Anyone can open DevTools, delete
// your checks, or skip the page entirely and post straight to the API with
// curl. Browser validation is a courtesy; THIS is the rule.
// ---------------------------------------------------------------------------
import { z } from 'zod';
import parsePhoneNumberFromString from 'libphonenumber-js';

// --- Individual field rules -------------------------------------------------

// English letters only, 3–20 characters. No digits, spaces or symbols.
const username = z
  .string({ error: 'Username is required.' })
  .trim()
  .min(3, 'Username must be at least 3 characters.')
  .max(20, 'Username cannot be longer than 20 characters.')
  .regex(/^[A-Za-z]+$/, 'Username can only contain English letters (A–Z).');

const email = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .email('Enter a valid email address.')
  .max(254, 'That email address is too long.');

// Phone numbers are deceptively hard: lengths, prefixes and formats differ
// per country and change over time. libphonenumber-js carries Google's
// maintained rules, so we check against reality rather than a guessed regex.
//
// We store E.164 — "+" then country code then number, no spaces. One agreed
// format is what makes the unique index meaningful.
const mobile = z
  .string({ error: 'Mobile number is required.' })
  .trim()
  .min(1, 'Mobile number is required.')
  .superRefine((value, ctx) => {
    if (!value.startsWith('+')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Include the country code, starting with + (e.g. +919876543210).',
      });
      return;
    }
    const parsed = parsePhoneNumberFromString(value);
    if (!parsed || !parsed.isValid()) {
      ctx.addIssue({
        code: 'custom',
        message: 'That mobile number is not valid for the country code given.',
      });
    }
  })
  // Normalise to E.164 so "+91 98765 43210" and "+919876543210" become one
  // identical string, and cannot become two accounts.
  .transform((value) => {
    const parsed = parsePhoneNumberFromString(value);
    return parsed ? parsed.number : value;
  });

// Digits only, at least 8 — the rule as specified.
//
// A note worth knowing: 8 digits is 100 million possibilities, which an
// attacker with a stolen database could work through offline. bcrypt and
// the login rate limit are what keep this safe in practice. Raising the
// minimum to 10, or allowing letters, would help a lot if you ever want it.
const password = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must be at least 8 digits.')
  .max(64, 'Password cannot be longer than 64 digits.')
  .regex(/^\d+$/, 'Password must contain numbers only.');

const otpCode = z
  .string({ error: 'Enter the code from your email.' })
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your email.');

// --- Whole-request rules ----------------------------------------------------

export const registerSchema = z
  .object({
    username,
    email,
    mobile,
    password,
    confirmPassword: z.string({ error: 'Confirm your password.' }),
  })
  // `.refine` runs after the individual fields pass, so it can compare two
  // of them. `path` attaches the message to the confirm field, which is
  // where the user expects to see it.
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z.object({
  email,
  code: otpCode,
});

export const resendOtpSchema = z.object({
  email,
});

// Login accepts an email OR a mobile number in one field, so we cannot use
// either rule directly. We work out which it is, then normalise.
export const loginSchema = z.object({
  identifier: z
    .string({ error: 'Enter your email or mobile number.' })
    .trim()
    .min(1, 'Enter your email or mobile number.'),
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.'),
});

/**
 * Decide whether a login identifier is an email or a mobile number, and
 * normalise it to match how it is stored.
 *
 * Returns { field: 'email' | 'mobile', value } or null when it is neither.
 */
export function parseIdentifier(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;

  if (value.includes('@')) {
    const result = email.safeParse(value);
    return result.success ? { field: 'email', value: result.data } : null;
  }

  const parsed = parsePhoneNumberFromString(value.startsWith('+') ? value : `+${value}`);
  if (parsed && parsed.isValid()) return { field: 'mobile', value: parsed.number };

  return null;
}

/**
 * Run a schema and turn any failure into { field: message } — the shape the
 * React forms display next to each input.
 */
export function validate(schema, payload) {
  const result = schema.safeParse(payload);
  if (result.success) return { data: result.data, fieldErrors: null };

  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] || 'form';
    // Keep the first message per field — showing three at once is noise.
    if (!fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { data: null, fieldErrors };
}
