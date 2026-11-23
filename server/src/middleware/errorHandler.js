// ---------------------------------------------------------------------------
// errorHandler.js — the last stop for anything that goes wrong.
//
// Express recognises error middleware by its FOUR arguments (err, req, res,
// next). Any error thrown in a route — or passed to next(err) — lands here.
//
// WHY ONE PLACE
// Without it, an unexpected error returns Express's default HTML page,
// complete with a stack trace naming your files and line numbers. That is a
// gift to an attacker. Here, the full detail goes to your terminal and the
// user gets a plain sentence.
// ---------------------------------------------------------------------------
import { env } from '../config/env.js';

/** Thrown deliberately by our own code when we know what to say. */
export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Nothing matched the URL. Runs after every route. */
export function notFound(req, res) {
  res.status(404).json({ ok: false, error: `No route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- Express needs all four.
export function errorHandler(err, req, res, _next) {
  // --- Errors we raised on purpose ---
  if (err instanceof ApiError) {
    return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
  }

  // --- MongoDB duplicate key (code 11000) ---
  // The database rejected a second account with the same email or mobile.
  // This is the backstop behind our own duplicate check: it holds even when
  // two registrations arrive at the same instant.
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const label = field === 'mobile' ? 'mobile number' : field;
    return res.status(409).json({
      ok: false,
      error: `That ${label} is already registered.`,
      fieldErrors: { [field]: `That ${label} is already registered.` },
    });
  }

  // --- Mongoose schema validation ---
  if (err?.name === 'ValidationError') {
    const fieldErrors = {};
    for (const [field, detail] of Object.entries(err.errors || {})) {
      fieldErrors[field] = detail.message;
    }
    return res.status(400).json({ ok: false, error: 'Some details are not valid.', fieldErrors });
  }

  // --- Anything unexpected ---
  // Logged in full for you; summarised for the user. The message is never
  // passed on, because it can contain connection strings or file paths.
  console.error('\n  Unhandled error on', req.method, req.originalUrl);
  console.error(err);

  res.status(500).json({
    ok: false,
    error: 'Something went wrong. Please try again.',
    // Stack traces in development only — never in production.
    ...(env.isProduction ? {} : { debug: err.message }),
  });
}

/**
 * Wraps an async route so a rejected promise reaches the handler above.
 *
 * Express 4 does not catch errors from async functions by itself: without
 * this the request would simply hang. Every async route is wrapped in it.
 */
export const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
