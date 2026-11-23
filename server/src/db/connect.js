// ---------------------------------------------------------------------------
// connect.js — opens the MongoDB connection.
//
// Mongoose keeps ONE connection pool for the whole app. You connect once at
// startup; every model then uses that same connection automatically.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { env } from '../config/env.js';

export async function connectDatabase() {
  // Reject documents with fields the schema does not define, instead of
  // silently storing them. Catches typos like `emial` early.
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri, {
      // Fail fast rather than hanging for 30 seconds on a bad URI.
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    console.error('\n  Could not connect to MongoDB.');
    console.error(`  ${err.message}\n`);
    console.error('  Common causes:');
    console.error('    - Wrong password in MONGODB_URI');
    console.error('    - Your IP is not on the Atlas access list');
    console.error('      (Atlas → Network Access → Add IP Address)\n');
    process.exit(1);
  }

  // Build the unique indexes declared in the models. Without this the first
  // duplicate email would be accepted and only rejected later.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  const { host, name } = mongoose.connection;
  console.log(`  MongoDB connected — database "${name}" on ${host}`);
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
}
