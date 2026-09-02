import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ROLES, ROLE_VALUES } from "../config/enums.js";

const { Schema } = mongoose;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, "Invalid email address"],
    },
    // Never selected by default; use findByEmailWithPassword() for login.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.CITIZEN },
    phone: { type: String, trim: true, match: [PHONE_PATTERN, "Invalid phone number"], default: null },
    // Deactivated accounts keep their incidents; the auth middleware rejects them.
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

/** bcrypt hash with the configured cost. The schema never sees the plain password. */
userSchema.statics.hashPassword = function hashPassword(plain) {
  if (typeof plain !== "string" || plain.length < 8 || plain.length > 72) {
    throw new RangeError("Password must be between 8 and 72 characters");
  }
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
};

/** Login lookup: the only query that selects the hash. */
userSchema.statics.findByEmailWithPassword = function findByEmailWithPassword(email) {
  if (typeof email !== "string" || !email.trim()) return Promise.resolve(null);
  return this.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.passwordHash) {
    return Promise.reject(new Error("passwordHash was not selected on this document"));
  }
  return bcrypt.compare(String(plain ?? ""), this.passwordHash);
};

/** Public profile shape shared by /api/auth/me and the users endpoints. */
userSchema.methods.toProfile = function toProfile() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone ?? null,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
