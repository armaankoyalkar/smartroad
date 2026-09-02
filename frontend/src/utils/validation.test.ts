import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  hotspotParamsSchema,
  incidentFormSchema,
  loginSchema,
  passwordChangeSchema,
  profileSchema,
  registerSchema,
  riskFeaturesSchema,
  statusChangeSchema,
} from "./validation";

/** `{ "path.to.field": "message" }` for the first issue per field, or an empty object when valid. */
function issuesOf(schema: z.ZodType, input: unknown): Record<string, string> {
  const result = schema.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

function file(name: string, type: string, sizeBytes: number): File {
  const f = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(f, "size", { value: sizeBytes });
  return f;
}

const validIncident = {
  title: "Deep pothole near the flyover",
  category: "POTHOLE",
  description: "About half a metre wide, right in the left lane.",
  severity: "HIGH",
  latitude: "17.4483",
  longitude: 78.3814,
  address: "Hitec City Main Road",
};

describe("incident form schema (docs/api.md 6.2)", () => {
  it("accepts a valid report and coerces coordinate strings to numbers", () => {
    const result = incidentFormSchema.safeParse(validIncident);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.latitude).toBe(17.4483);
      expect(result.data.longitude).toBe(78.3814);
      expect(result.data.title).toBe("Deep pothole near the flyover");
    }
  });

  it("enforces the length rules with the agreed messages", () => {
    expect(issuesOf(incidentFormSchema, { ...validIncident, title: "Hole" }).title).toBe(
      "Title must be 5 to 120 characters",
    );
    expect(issuesOf(incidentFormSchema, { ...validIncident, title: "x".repeat(121) }).title).toBe(
      "Title must be 5 to 120 characters",
    );
    expect(issuesOf(incidentFormSchema, { ...validIncident, description: "too short" }).description).toBe(
      "Description must be 10 to 2000 characters",
    );
    expect(
      issuesOf(incidentFormSchema, { ...validIncident, description: "x".repeat(2001) }).description,
    ).toBe("Description must be 10 to 2000 characters");
    expect(issuesOf(incidentFormSchema, { ...validIncident, address: "x".repeat(301) }).address).toBe(
      "Address must be at most 300 characters",
    );
  });

  it("requires a category and a severity from the vocabulary", () => {
    expect(issuesOf(incidentFormSchema, { ...validIncident, category: "" }).category).toBe(
      "Choose a category",
    );
    expect(issuesOf(incidentFormSchema, { ...validIncident, category: "SINKHOLE" }).category).toBe(
      "Choose a category",
    );
    expect(issuesOf(incidentFormSchema, { ...validIncident, severity: undefined }).severity).toBe(
      "Choose a severity",
    );
  });

  it("validates coordinates and explains how to pick a location", () => {
    expect(issuesOf(incidentFormSchema, { ...validIncident, latitude: "", longitude: "" })).toEqual({
      latitude: "Pick a location on the map or enter coordinates",
      longitude: "Pick a location on the map or enter coordinates",
    });
    expect(issuesOf(incidentFormSchema, { ...validIncident, latitude: 91 }).latitude).toBe(
      "Latitude must be between -90 and 90",
    );
    expect(issuesOf(incidentFormSchema, { ...validIncident, longitude: -181 }).longitude).toBe(
      "Longitude must be between -180 and 180",
    );
    expect(issuesOf(incidentFormSchema, { ...validIncident, latitude: "abc" }).latitude).toBe(
      "Latitude must be a number",
    );
  });

  it("checks the image type and size on the client", () => {
    expect(
      issuesOf(incidentFormSchema, { ...validIncident, image: file("a.gif", "image/gif", 100) }).image,
    ).toBe("Image must be JPEG, PNG or WebP");
    expect(
      issuesOf(incidentFormSchema, { ...validIncident, image: file("a.jpg", "image/jpeg", 6 * 1024 * 1024) })
        .image,
    ).toBe("Image must be at most 5 MB");
    expect(
      issuesOf(incidentFormSchema, { ...validIncident, image: file("a.webp", "image/webp", 1024) }),
    ).toEqual({});
    expect(issuesOf(incidentFormSchema, { ...validIncident, image: null })).toEqual({});
  });
});

describe("auth and profile schemas (docs/api.md section 5)", () => {
  it("login needs an email and a password", () => {
    expect(issuesOf(loginSchema, { email: "nope", password: "" })).toEqual({
      email: "Enter a valid email address",
      password: "Enter your password",
    });
    expect(issuesOf(loginSchema, { email: "a@b.co", password: "x" })).toEqual({});
  });

  it("register enforces name, password length, confirmation and phone format", () => {
    const base = {
      name: "Priya",
      email: "priya@example.com",
      password: "password1",
      confirmPassword: "password1",
    };
    expect(issuesOf(registerSchema, base)).toEqual({});
    expect(issuesOf(registerSchema, { ...base, name: "P" }).name).toBe("Name must be 2 to 80 characters");
    expect(
      issuesOf(registerSchema, { ...base, password: "short12", confirmPassword: "short12" }).password,
    ).toBe("Password must be at least 8 characters");
    const long = "x".repeat(73);
    expect(issuesOf(registerSchema, { ...base, password: long, confirmPassword: long }).password).toBe(
      "Password must be at most 72 characters",
    );
    expect(issuesOf(registerSchema, { ...base, confirmPassword: "different1" }).confirmPassword).toBe(
      "Passwords do not match",
    );
    expect(issuesOf(registerSchema, { ...base, phone: "12345" }).phone).toMatch(/10 to 15 digits/);
    expect(issuesOf(registerSchema, { ...base, phone: "+919876543210" })).toEqual({});
    expect(issuesOf(registerSchema, { ...base, phone: "" })).toEqual({});
  });

  it("profile and password change follow the same rules", () => {
    expect(issuesOf(profileSchema, { name: "Priya Sharma", phone: "" })).toEqual({});
    expect(issuesOf(profileSchema, { name: "", phone: "" }).name).toBe("Name must be 2 to 80 characters");
    expect(
      issuesOf(passwordChangeSchema, {
        currentPassword: "oldpass12",
        newPassword: "oldpass12",
        confirmPassword: "oldpass12",
      }).newPassword,
    ).toBe("The new password must differ from the current one");
    expect(
      issuesOf(passwordChangeSchema, {
        currentPassword: "oldpass12",
        newPassword: "newpass12",
        confirmPassword: "newpass13",
      }).confirmPassword,
    ).toBe("Passwords do not match");
  });
});

describe("admin schemas", () => {
  it("requires a note when rejecting", () => {
    expect(issuesOf(statusChangeSchema, { status: "REJECTED", note: "" }).note).toBe(
      "A reason is required when rejecting",
    );
    expect(issuesOf(statusChangeSchema, { status: "REJECTED", note: "Duplicate of another report" })).toEqual(
      {},
    );
    expect(issuesOf(statusChangeSchema, { status: "UNDER_REVIEW" })).toEqual({});
    expect(issuesOf(statusChangeSchema, { status: "DONE" }).status).toBe("Choose a status");
  });

  it("validates the ten risk features and the hotspot parameters", () => {
    const features = {
      hour: "18",
      day_of_week: "FRI",
      month: 11,
      light_conditions: "DARK_LIT",
      weather: "RAIN",
      road_surface: "WET",
      road_type: "ARTERIAL",
      speed_limit: 60,
      area_type: "URBAN",
      category: "ACCIDENT",
    };
    const parsed = riskFeaturesSchema.safeParse(features);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.hour).toBe(18);
    expect(issuesOf(riskFeaturesSchema, { ...features, hour: 24 }).hour).toBe(
      "Hour must be between 0 and 23",
    );
    expect(issuesOf(riskFeaturesSchema, { ...features, speed_limit: 10 }).speed_limit).toBe(
      "Speed limit must be between 20 and 120",
    );
    expect(issuesOf(riskFeaturesSchema, { ...features, weather: "SNOW" }).weather).toBe("Choose the weather");
    expect(issuesOf(hotspotParamsSchema, { eps: 49, minSamples: 4 }).eps).toMatch(/between 50 and 2000/);
    expect(issuesOf(hotspotParamsSchema, { eps: 200, minSamples: 21 }).minSamples).toMatch(
      /between 3 and 20/,
    );
    expect(issuesOf(hotspotParamsSchema, { eps: "200", minSamples: "4" })).toEqual({});
  });
});
