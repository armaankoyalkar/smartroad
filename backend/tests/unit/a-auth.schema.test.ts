import { describe, expect, it } from "vitest";
import { type z } from "zod";
import { loginBody, registerBody } from "../../src/validation/auth.schema.js";

function issues(result: z.ZodSafeParseResult<unknown>): Record<string, string> {
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.map(String).join("."), issue.message]));
}

describe("registerBody", () => {
  it("trims the name, normalises the email and strips role and operators", () => {
    const result = registerBody.safeParse({
      name: "  Priya Sharma ",
      email: " Priya@Example.COM ",
      password: "correct horse battery",
      role: "admin",
      $where: "1",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "Priya Sharma", email: "priya@example.com", password: "correct horse battery" });
  });

  it("accepts a phone with a leading +, clears an empty one and rejects letters", () => {
    const base = { name: "Priya", email: "priya@example.com", password: "correct horse battery" };
    expect(registerBody.parse({ ...base, phone: " +919876543210 " }).phone).toBe("+919876543210");
    expect(registerBody.parse({ ...base, phone: "" }).phone).toBeNull();
    expect(registerBody.parse({ ...base, phone: null }).phone).toBeNull();
    expect(registerBody.parse(base).phone).toBeUndefined();
    expect(issues(registerBody.safeParse({ ...base, phone: "98765-43210" })).phone).toMatch(/10 to 15 digits/);
    expect(issues(registerBody.safeParse({ ...base, phone: "123" })).phone).toMatch(/10 to 15 digits/);
    expect(issues(registerBody.safeParse({ ...base, phone: 9876543210 })).phone).toBeDefined();
  });

  it("rejects short names, malformed emails and passwords outside 8 to 72 characters", () => {
    const result = registerBody.safeParse({ name: "P", email: "not-an-email", password: "short" });
    expect(issues(result)).toEqual({
      name: "Must be between 2 and 80 characters",
      email: "Must be a valid email address",
      password: "Must be between 8 and 72 characters",
    });
    const long = registerBody.safeParse({ name: "x".repeat(81), email: "a@b.co", password: "p".repeat(73) });
    expect(Object.keys(issues(long)).sort()).toEqual(["name", "password"]);
  });

  it("names every missing field with a readable message", () => {
    expect(issues(registerBody.safeParse({}))).toEqual({
      name: "Name is required",
      email: "Email is required",
      password: "Password is required",
    });
    expect(issues(registerBody.safeParse({ name: 5, email: [], password: {} })).name).toBe("Name is required");
  });
});

describe("loginBody", () => {
  it("lower-cases the email and requires both fields", () => {
    expect(loginBody.parse({ email: " Admin@SmartRoad.demo ", password: "x" })).toEqual({
      email: "admin@smartroad.demo",
      password: "x",
    });
    expect(issues(loginBody.safeParse({ email: "", password: "" }))).toEqual({
      email: "Email is required",
      password: "Password is required",
    });
    expect(Object.keys(issues(loginBody.safeParse({}))).sort()).toEqual(["email", "password"]);
  });
});
