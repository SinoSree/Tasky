// ---------------------------------------------------------------------------
// requireAuth.js — the gate on protected routes.
//
// "Middleware" is a function that runs BEFORE your route handler. It can
// either let the request through by calling next(), or stop it by sending a
// response. Put this in front of a route and that route becomes private:
//
//   router.get('/me', requireAuth, controller.me)
//                     ^^^^^^^^^^^ runs first
//
// HOW THE LOGIN COOKIE WORKS
// At login the server signs a JWT holding the user's id and puts it in an
// httpOnly cookie. httpOnly means JavaScript in the page CANNOT read it —
// so a malicious script cannot steal the login. The browser attaches it to
// every request by itself; the React code never handles a token at all.
// ---------------------------------------------------------------------------
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'taskly_session';

/** Sign a token and attach it as a cookie. */
export function setAuthCookie(res, user) {
  const token = jwt.sign(
    { sub: user._id.toString() },   // "sub" (subject) = who this is about
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,                 // JavaScript cannot read it
    secure: env.isProduction,       // HTTPS only once deployed
    // 'lax' blocks the cookie on cross-site POSTs, which stops CSRF — a
    // malicious page cannot make your browser act as you on this API.
    //
    // It is safe to use in production because the backend serves the page
    // as well, so the cookie is first-party. The alternative, 'none', would
    // make it a third-party cookie: weaker against CSRF, and increasingly
    // just blocked by browsers.
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  // The options must match those used when setting it, or the browser keeps
  // the original cookie and "logout" does nothing.
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
  });
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE];

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Not signed in.' });
  }

  let payload;
  try {
    // Throws if the token was tampered with or has expired.
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ ok: false, error: 'Session expired. Please sign in again.' });
  }

  // A valid token is not enough — the account may have been deleted, or
  // its verification revoked, since the token was issued.
  const user = await User.findById(payload.sub);
  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({ ok: false, error: 'Account no longer exists.' });
  }
  if (!user.isEmailVerified) {
    clearAuthCookie(res);
    return res.status(403).json({ ok: false, error: 'Email not verified.' });
  }

  // Hand the user to the route handler.
  req.user = user;
  next();
}
