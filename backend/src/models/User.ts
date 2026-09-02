import bcrypt from "bcryptjs";
import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";
import { ROLE_VALUES, ROLES, type Role } from "../config/enums.js";
import { env } from "../config/env.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

export interface UserAttrs {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Public profile shape shared by /api/auth/me and the users endpoints (docs/api.md section 5). */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  createdAt: Date;
}

export interface UserMethods {
  comparePassword(plain: string): Promise<boolean>;
  toProfile(): UserProfile;
}

export type UserDocument = HydratedDocument<UserAttrs, UserMethods>;

export interface UserModel extends Model<UserAttrs, object, UserMethods> {
  /** bcrypt hash with the configured cost. Throws RangeError synchronously for bad lengths. */
  hashPassword(plain: string): Promise<string>;
  /** Login lookup: the only query that selects the hash. */
  findByEmailWithPassword(email: string): Promise<UserDocument | null>;
}

const userSchema = new Schema<UserAttrs, UserModel, UserMethods>(
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
    role: { type: String, enum: [...ROLE_VALUES], default: ROLES.CITIZEN },
    phone: { type: String, trim: true, match: [PHONE_PATTERN, "Invalid phone number"], default: null },
    // Deactivated accounts keep their incidents; the auth middleware rejects them.
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        const out = ret as Record<string, unknown>;
        out.id = String(ret._id);
        delete out._id;
        delete out.passwordHash;
        return out;
      },
    },
  },
);

userSchema.static("hashPassword", function hashPassword(plain: unknown): Promise<string> {
  if (typeof plain !== "string" || plain.length < 8 || plain.length > 72) {
    throw new RangeError("Password must be between 8 and 72 characters");
  }
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
});

userSchema.static("findByEmailWithPassword", async function findByEmailWithPassword(
  this: UserModel,
  email: unknown,
): Promise<UserDocument | null> {
  if (typeof email !== "string" || !email.trim()) return null;
  // "+passwordHash" as a projection includes the deselected field.
  return this.findOne({ email: email.trim().toLowerCase() }, "+passwordHash");
});

userSchema.method("comparePassword", function comparePassword(this: UserDocument, plain: unknown): Promise<boolean> {
  if (!this.passwordHash) {
    return Promise.reject(new Error("passwordHash was not selected on this document"));
  }
  return bcrypt.compare(String(plain ?? ""), this.passwordHash);
});

userSchema.method("toProfile", function toProfile(this: UserDocument): UserProfile {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone ?? null,
    createdAt: this.createdAt,
  };
});

// mongoose.models is typed loosely (Model<any>); the registered model was built from this schema.
export const User: UserModel =
  (mongoose.models.User as unknown as UserModel | undefined) ?? mongoose.model<UserAttrs, UserModel>("User", userSchema);
