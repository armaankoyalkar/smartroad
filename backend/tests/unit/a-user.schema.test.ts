import { describe, expect, it } from "vitest";
import { type z } from "zod";
import {
  adminUpdateUserBody,
  changePasswordBody,
  listUsersQuery,
  updateProfileBody,
} from "../../src/validation/user.schema.js";

function issues(result: z.ZodSafeParseResult<unknown>): Record<string, string> {
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.map(String).join("."), issue.message]));
}

describe("updateProfileBody", () => {
  it("accepts name and phone, including null to clear the phone", () => {
    expect(updateProfileBody.parse({ name: " New Name ", phone: null })).toEqual({ name: "New Name", phone: null });
    expect(updateProfileBody.parse({ phone: "9876543210" })).toEqual({ phone: "9876543210" });
    expect(updateProfileBody.parse({ name: "Only Name" })).toEqual({ name: "Only Name" });
  });

  it("rejects an empty update, even one made only of unknown fields", () => {
    expect(issues(updateProfileBody.safeParse({}))).toEqual({ "": "Provide at least one field to update." });
    expect(issues(updateProfileBody.safeParse({ email: "new@example.com", role: "admin" }))).toEqual({
      "": "Provide at least one field to update.",
    });
    expect(issues(updateProfileBody.safeParse({ name: "x" })).name).toBe("Must be between 2 and 80 characters");
  });
});

describe("changePasswordBody", () => {
  it("requires the current password and a valid new one", () => {
    expect(changePasswordBody.parse({ currentPassword: "old-password", newPassword: "new-password-1" })).toEqual({
      currentPassword: "old-password",
      newPassword: "new-password-1",
    });
    expect(issues(changePasswordBody.safeParse({ currentPassword: "", newPassword: "short" }))).toEqual({
      currentPassword: "Current password is required",
      newPassword: "Must be between 8 and 72 characters",
    });
    expect(Object.keys(issues(changePasswordBody.safeParse({}))).sort()).toEqual(["currentPassword", "newPassword"]);
  });
});

describe("listUsersQuery", () => {
  it("applies the documented defaults", () => {
    expect(listUsersQuery.parse({})).toEqual({ page: 1, limit: 20, sort: { field: "createdAt", direction: -1 } });
  });

  it("parses search, role, isActive, pagination and sort", () => {
    expect(listUsersQuery.parse({ q: " priya ", role: "admin", isActive: "false", page: "2", limit: "5", sort: "name" })).toEqual({
      q: "priya",
      role: "admin",
      isActive: false,
      page: 2,
      limit: 5,
      sort: { field: "name", direction: 1 },
    });
    expect(listUsersQuery.parse({ isActive: "1", sort: "-email" })).toMatchObject({ isActive: true, sort: { field: "email", direction: -1 } });
    expect(listUsersQuery.parse({ isActive: "" }).isActive).toBeUndefined();
  });

  it("rejects unknown roles, sort fields, bad booleans and out-of-range limits", () => {
    const result = listUsersQuery.safeParse({ role: "superuser", sort: "-phone", isActive: "maybe", limit: "500", page: "0" });
    expect(Object.keys(issues(result)).sort()).toEqual(["isActive", "limit", "page", "role", "sort"]);
    expect(issues(result).sort).toBe("Sort field must be one of createdAt, name, email");
  });
});

describe("adminUpdateUserBody", () => {
  it("accepts isActive and role, alone or together", () => {
    expect(adminUpdateUserBody.parse({ isActive: false })).toEqual({ isActive: false });
    expect(adminUpdateUserBody.parse({ role: "admin" })).toEqual({ role: "admin" });
    expect(adminUpdateUserBody.parse({ isActive: true, role: "citizen", name: "ignored" })).toEqual({ isActive: true, role: "citizen" });
  });

  it("insists on real booleans and known roles, and on at least one field", () => {
    expect(issues(adminUpdateUserBody.safeParse({ isActive: "true" })).isActive).toBe("Must be true or false");
    expect(issues(adminUpdateUserBody.safeParse({ role: "root" })).role).toBe("Must be one of citizen, admin");
    expect(issues(adminUpdateUserBody.safeParse({}))).toEqual({ "": "Provide at least one field to update." });
  });
});
