import { getErrorMessage, isApiError } from "@/api/client";

/** Form-level message for a failed sign-in, registration or password change. */
export function authErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return error.message || "The email or password is incorrect.";
      case "RATE_LIMITED":
        return "Too many attempts from this connection. Please wait about fifteen minutes and try again.";
      case "FORBIDDEN":
        return error.message || "This account has been deactivated. Contact an administrator.";
      case "NETWORK_ERROR":
        return error.message;
      default:
        return error.message || getErrorMessage(error);
    }
  }
  return getErrorMessage(error);
}

/** Password rules are length-based only (docs/api.md section 5): 8 to 72 characters. */
export interface PasswordStrength {
  /** 0 = unusable, 1 = minimum, 2 = good, 3 = strong. */
  score: 0 | 1 | 2 | 3;
  label: string;
  hint: string;
}

export function passwordStrength(password: string): PasswordStrength {
  const length = password.length;
  if (length === 0) return { score: 0, label: "", hint: "Use at least 8 characters; longer is stronger." };
  if (length > 72) return { score: 0, label: "Too long", hint: "Passwords are limited to 72 characters." };
  if (length < 8)
    return {
      score: 0,
      label: "Too short",
      hint: `${8 - length} more character${8 - length === 1 ? "" : "s"} needed.`,
    };
  if (length < 12)
    return { score: 1, label: "Acceptable", hint: "Meets the minimum; 12 or more characters is better." };
  if (length < 16)
    return {
      score: 2,
      label: "Good",
      hint: "A phrase of several words is easy to remember and hard to guess.",
    };
  return { score: 3, label: "Strong", hint: "Long passwords resist guessing well." };
}
