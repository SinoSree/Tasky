// ---------------------------------------------------------------------------
// OtpToken.js — one pending verification code.
//
// WHY A SEPARATE COLLECTION, not two fields on the user?
//   - A TTL index lets MongoDB delete expired codes by itself
//   - Sent codes can be counted for rate limiting
//   - Nothing about codes clutters the user record
//
// The code itself is HASHED, exactly like a password. If someone obtained a
// copy of this collection they still could not verify anybody's account.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';

const otpTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // What this code is for. Only email verification today, but naming it
    // means a future "reset password" code needs no schema change.
    purpose: {
      type: String,
      required: true,
      enum: ['email_verification'],
      default: 'email_verification',
    },

    // bcrypt hash of the six digits — never the digits themselves.
    codeHash: { type: String, required: true, select: false },

    expiresAt: { type: Date, required: true },

    // Wrong guesses so far. At the limit the code is burned, so an attacker
    // cannot work through all million possibilities.
    attempts: { type: Number, default: 0 },

    // Set the moment a code is accepted, so it can never be reused.
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL index: MongoDB removes each document once `expiresAt` passes.
// `expireAfterSeconds: 0` means "at exactly that time, not later".
// Housekeeping we never have to write or remember to run.
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Finding the newest live code for a user is the most common query.
otpTokenSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

export const OtpToken = mongoose.model('OtpToken', otpTokenSchema);
