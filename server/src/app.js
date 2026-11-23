// ---------------------------------------------------------------------------
// app.js — assembles the Express application.
//
// Express is a pipeline. A request enters at the top and passes through each
// `app.use(...)` in the order written, until something sends a response.
// Order genuinely matters: cookies must be parsed before anything reads
// them, and the error handler must come last to catch what the rest throws.
//
// This file does NOT start the server — server.js does. Keeping them apart
// means tests can import the app and drive it without opening a real port.
// ---------------------------------------------------------------------------
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Behind a hosting proxy (Render, Railway), this lets Express see the
  // visitor's real IP — without it every request looks like one address and
  // the rate limiter would throttle all your users together.
  app.set('trust proxy', 1);

  // Removes the "X-Powered-By: Express" header and sets a dozen protective
  // ones. Cheapest security win available.
  //
  // The Content-Security-Policy needs spelling out because this server now
  // serves the page too. Helmet's default allows scripts only from this
  // server, which blocks the React, Babel and Supabase files the bundle
  // pulls from CDNs, and the page renders blank.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        // 'unsafe-inline' and 'unsafe-eval' are needed because index.html
        // compiles its JSX in the browser with Babel, which evaluates code
        // it builds at runtime.
        //
        // This is the real cost of the no-build-step approach, and it is
        // worth being honest about: these two weaken CSP's protection
        // against script injection. Precompiling the JSX would let both be
        // dropped, and is the right fix if this ever holds other people's
        // data.
        scriptSrc: [
          "'self'", "'unsafe-inline'", "'unsafe-eval'",
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],

        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:'],

        // The page only ever calls its own API. Narrow on purpose: script
        // injected into the page still could not send data elsewhere.
        connectSrc: ["'self'"],

        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }));

  // CORS: browsers refuse cross-origin requests unless the server says the
  // origin is allowed. `credentials: true` is what permits the login cookie
  // to travel — and it REQUIRES naming exact origins, never "*".
  app.use(cors({
    origin(origin, callback) {
      // No origin: curl, Postman, server-to-server. Not a browser, so the
      // cross-origin rules do not apply.
      if (!origin) return callback(null, true);
      if (env.clientOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  }));

  // Turns a JSON request body into req.body. The size cap stops someone
  // exhausting memory with a huge payload.
  app.use(express.json({ limit: '10kb' }));

  // Turns the Cookie header into req.cookies, which requireAuth reads.
  app.use(cookieParser());

  // A quick way to check the server is alive without touching the database.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'taskly-auth', env: env.nodeEnv });
  });

  app.use('/api/auth', authRouter);

  // --- Serve the React app from this same server ---------------------------
  //
  // WHY, rather than leaving it on GitHub Pages:
  //
  // The login is kept in a cookie. A cookie sent between two different sites
  // — github.io asking onrender.com — is a THIRD-PARTY cookie, and browsers
  // are shutting those down. Safari blocks them outright, Firefox isolates
  // them, Chrome is phasing them out. Logins would work for some people and
  // silently fail for others, which is the worst kind of bug.
  //
  // Serving the page and the API from one origin makes the cookie
  // first-party. It then works everywhere, and `sameSite: lax` can protect
  // against CSRF instead of the far weaker `none`.
  //
  // GitHub Pages keeps working as the demo-mode version; this becomes the
  // real one.
  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

  app.use(express.static(repoRoot, {
    // index.html is regenerated on every build, so it must never be cached
    // by the browser — that is exactly the stale-page problem from before.
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));

  // Anything not an API route and not a file falls back to the app.
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    res.sendFile(path.join(repoRoot, 'index.html'), (err) => err && next());
  });

  // These two must stay last, and in this order.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
