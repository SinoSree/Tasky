// ---------------------------------------------------------------------------
// server.js — the starting point. `npm start` runs this file.
//
// Its only job is the order of events:
//   1. read and check .env        (config/env.js does this on import)
//   2. connect to MongoDB         — no point serving requests without it
//   3. check the mail credentials — warn now, not on a user's registration
//   4. start listening
// ---------------------------------------------------------------------------
import { env } from './config/env.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './db/connect.js';
import { verifyMailer } from './services/mailer.js';

// Importing the models registers them with Mongoose before connect() builds
// their indexes.
import './models/User.js';
import './models/OtpToken.js';

async function start() {
  console.log('\n  Taskly auth server starting…\n');

  await connectDatabase();

  // A warning, not a crash: the rest of the API is still worth having, and
  // the message says exactly what to fix.
  const mail = await verifyMailer();
  if (mail.ok) {
    console.log(`  Email ready — sending as ${env.smtp.fromAddress}`);
  } else {
    // The hint comes from mailer.js, which works out which setting is at
    // fault from the SMTP response — so it names the right provider instead
    // of guessing.
    console.warn('\n  WARNING: email is not working. Registration will fail.');
    console.warn(`  ${mail.cause || mail.message}`);
    if (mail.hint) console.warn(`  ${mail.hint}`);
    console.warn(`  Server reported: ${mail.message}`);
    console.warn('  Settings live in server/.env\n');
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`\n  Listening on http://localhost:${env.port}`);
    console.log(`  Allowing requests from: ${env.clientOrigins.join(', ')}\n`);
  });

  // Ctrl+C and hosting platforms send these. Closing cleanly means no
  // request is cut off mid-flight and MongoDB is let go of properly.
  const shutdown = async (signal) => {
    console.log(`\n  ${signal} received — shutting down.`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('\n  Server failed to start:\n');
  console.error(err);
  process.exit(1);
});
