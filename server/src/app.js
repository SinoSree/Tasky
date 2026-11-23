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
  // ones. Cheapest security win available: one line.
  app.use(helmet());

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

  // These two must stay last, and in this order.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
