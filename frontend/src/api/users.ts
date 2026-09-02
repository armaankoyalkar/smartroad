import { requestData, requestWithMeta } from "./client";
import { toSearchParams } from "./params";
import type {
  AdminUser,
  AdminUserDetail,
  ChangePasswordInput,
  Paginated,
  PaginationMeta,
  UpdateMeInput,
  UpdateUserInput,
  User,
  UserListParams,
} from "@/types/api";

/** PATCH /api/users/me: update name and/or phone (`phone: null` clears it). */
export function updateMe(input: UpdateMeInput): Promise<User> {
  return requestData<User>({ method: "PATCH", url: "/users/me", data: input });
}

/** PATCH /api/users/me/password. Wrong current password -> 401 INVALID_CREDENTIALS. */
export function changePassword(input: ChangePasswordInput): Promise<User> {
  return requestData<User>({ method: "PATCH", url: "/users/me/password", data: input });
}

/** GET /api/users (admin): search, role and active filters, pagination, sort. */
export function listUsers(params: UserListParams = {}): Promise<Paginated<AdminUser>> {
  return requestWithMeta<AdminUser[], PaginationMeta>({
    method: "GET",
    url: "/users",
    params: toSearchParams({ ...params }),
  });
}

/** GET /api/users/:id (admin): one user with incident counts by status. */
export function getUser(id: string): Promise<AdminUserDetail> {
  return requestData<AdminUserDetail>({ method: "GET", url: `/users/${encodeURIComponent(id)}` });
}

/** PATCH /api/users/:id (admin): activate/deactivate or change role. */
export function updateUser(id: string, input: UpdateUserInput): Promise<AdminUser> {
  return requestData<AdminUser>({ method: "PATCH", url: `/users/${encodeURIComponent(id)}`, data: input });
}
