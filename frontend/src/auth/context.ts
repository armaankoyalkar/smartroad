/**
 * The auth context object and its value type live here (a plain .ts module) so that
 * AuthContext.tsx exports only the provider component and keeps React Fast Refresh working.
 */
import { createContext } from "react";
import type { User } from "@/types/api";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Store the token and user after login or registration. */
  login: (token: string, user: User) => void;
  /** Discard the token and every cached server response. */
  logout: () => void;
  /** Replace the cached user (after a profile update). */
  updateUser: (user: User) => void;
  /** Re-fetch /auth/me; resolves to the user or null when the session is gone. */
  refresh: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
