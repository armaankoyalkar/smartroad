import { requestData } from "./client";
import type { AuthResponse, LoginInput, RegisterInput, User } from "@/types/api";

/** POST /api/auth/register: create a citizen account. `role` in the body is ignored by the server. */
export function register(input: RegisterInput): Promise<AuthResponse> {
  return requestData<AuthResponse>({ method: "POST", url: "/auth/register", data: input });
}

/** POST /api/auth/login: obtain a JWT. 401 INVALID_CREDENTIALS, 403 FORBIDDEN (deactivated). */
export function login(input: LoginInput): Promise<AuthResponse> {
  return requestData<AuthResponse>({ method: "POST", url: "/auth/login", data: input });
}

/** GET /api/auth/me: current profile. 401 clears the stored token (see client.ts). */
export function getMe(): Promise<User> {
  return requestData<User>({ method: "GET", url: "/auth/me" });
}
