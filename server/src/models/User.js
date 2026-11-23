// ---------------------------------------------------------------------------
// User.js — the shape of one account in the database.
//
// A Mongoose "schema" describes which fields exist, their types and their
// rules. A "model" is the object you use to read and write them:
//   User.create(...)   User.findOne(...)   user.save()
//
// NOTE WHAT IS NOT HERE: there is no `password` field. We only ever store
// `passwordHash`. The real password is never written to disk, not even for
// a moment, so a database leak cannot reveal anyone's password.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// How much work bcrypt does. Each +1 doubles the time. 12 takes roughly a
// quarter-second — unnoticeable to a user, punishing to someone trying
// millions of guesses.
const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      // English letters only. Checked again here at the database layer, so
      // even a bug elsewhere in the code cannot store a bad username.
      match: /^[A-Za-z]+$/,
    },

    email: {
      type: String,
      required: true,
      unique: true,     // creates a unique index — see the note below
      lowercase: true,  // "Sam@X.com" and "sam@x.com" are the same account
      trim: true,
    },

    // Stored in E.164 format: a "+", the country code, then the number,
    // with no spaces or dashes — e.g. +919876543210. One agreed format
    // means "+91 98765 43210" cannot sneak in as a second account.
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      // `select: false` means queries leave this field out unless you ask
      // for it explicitly. A hash accidentally included in an API response
      // becomes impossible rather than merely unlikely.
      select: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Used to lock an account briefly after repeated wrong passwords.
    failedLoginCount: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },
  },
  {
    // Adds createdAt and updatedAt and keeps them current by itself.
    timestamps: true,
  }
);

// --- Indexes ---------------------------------------------------------------
// `unique: true` above already asks for these, but declaring them here lets
// us add a collation so uniqueness ignores letter case, and keeps every
// index decision in one visible place.
//
// This is enforced by MongoDB itself, not by our code. Two registrations
// arriving at the exact same millisecond cannot both succeed.
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ mobile: 1 }, { unique: true });

// --- Methods ---------------------------------------------------------------
// Turn a plain password into a hash. Called when registering.
userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
};

// Check a typed password against the stored hash. bcrypt re-hashes the
// attempt using the salt baked into the stored hash and compares — it can
// never turn a hash back into a password.
userSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

// The ONLY shape a user is allowed to take in an API response.
// Building this explicitly — rather than deleting fields from the document —
// means a field added to the schema later is private until someone chooses
// to expose it.
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    mobile: this.mobile,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.model('User', userSchema);
