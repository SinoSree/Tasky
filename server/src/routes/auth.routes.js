// ---------------------------------------------------------------------------
// auth.routes.js — the map from URL to controller.
//
// Read each line left to right: method, path, then everything that runs,
// in order. Middleware listed before the controller acts as a filter — if
// it sends a response, the controller never runs.
// ---------------------------------------------------------------------------
import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import {
  registerLimiter, loginLimiter, otpVerifyLimiter, otpResendLimiter,
} from '../middleware/rateLimits.js';

export const authRouter = Router();

// Public — rate limited, since anyone may call them.
authRouter.post('/register',     registerLimiter,  asyncRoute(auth.register));
authRouter.post('/verify-email', otpVerifyLimiter, asyncRoute(auth.verifyEmail));
authRouter.post('/resend-otp',   otpResendLimiter, asyncRoute(auth.resendOtp));
authRouter.post('/login',        loginLimiter,     asyncRoute(auth.login));

// Logout needs no sign-in check: clearing a cookie that isn't there is
// harmless, and failing here would strand someone with a broken session.
authRouter.post('/logout', asyncRoute(auth.logout));

// Protected. requireAuth runs first and answers 401 if there is no valid
// cookie, so `me` only ever sees a real signed-in user.
authRouter.get('/me', requireAuth, asyncRoute(auth.me));

// Public settings — no secrets, just the OTP rules the UI displays.
authRouter.get('/config', asyncRoute(auth.config));
