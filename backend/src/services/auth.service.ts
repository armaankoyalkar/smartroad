import bcrypt from "bcryptjs";
import { ROLES } from "../config/enums.js";
import { AppError } from "../lib/errors.js";
import { signToken } from "../middleware/auth.js";
import { User, type UserDocument, type UserProfile } from "../models/User.js";
import { type LoginInput, type RegisterInput } from "../validation/auth.schema.js";

/**
 * Registration and login (docs/api.md section 5). Both return the same
 * shape: a signed token plus the public profile.
 */

export interface AuthResult {
  token: string;
  user: UserProfile;
}

/** One message for an unknown email and a wrong password, so neither can be told apart. */
const invalidCredentials = () => new AppError("INVALID_CREDENTIALS", "Incorrect email or password.");

let fallbackHash: Promise<string> | null = null;

/** Compared against when the email is unknown, so both failures take about as long as a real comparison. */
function fallback(): Promise<string> {
  fallbackHash ??= User.hashPassword("smartroad-no-such-account");
  return fallbackHash;
}

export function authResult(user: UserDocument): AuthResult {
  return { token: signToken(user), user: user.toProfile() };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  if (await User.exists({ email: input.email })) {
    throw new AppError("EMAIL_TAKEN", "An account with this email already exists.");
  }
  const passwordHash = await User.hashPassword(input.password);
  // A concurrent registration with the same email still hits the unique
  // index; the error handler maps that duplicate key to EMAIL_TAKEN as well.
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    phone: input.phone ?? null,
    role: ROLES.CITIZEN, // never taken from the request
  });
  return authResult(user);
}

export async function login({ email, password }: LoginInput): Promise<AuthResult> {
  const user = await User.findByEmailWithPassword(email);
  if (!user) {
    await bcrypt.compare(password, await fallback());
    throw invalidCredentials();
  }
  if (!(await user.comparePassword(password))) throw invalidCredentials();
  // Checked after the password so a deactivated account cannot be probed without its password.
  if (!user.isActive) throw AppError.forbidden("This account has been deactivated.");
  return authResult(user);
}
