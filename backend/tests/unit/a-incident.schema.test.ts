import { describe, expect, it } from "vitest";
import { type z } from "zod";
import {
  changePriorityBody,
  changeStatusBody,
  createIncidentBody,
  listIncidentsQuery,
  mineIncidentsQuery,
  updateIncidentBody,
} from "../../src/validation/incident.schema.js";

function issues(result: z.ZodSafeParseResult<unknown>): Record<string, string> {
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.map(String).join("."), issue.message]));
}

const VALID = {
  title: "Deep pothole near Hitec City flyover",
  description: "About 40 cm wide pothole on the left lane just after the flyover exit.",
  category: "POTHOLE",
  severity: "HIGH",
  latitude: 17.4483,
  longitude: 78.3814,
};

describe("createIncidentBody", () => {
  it("accepts JSON numbers and multipart numeric strings for the coordinates", () => {
    expect(createIncidentBody.parse(VALID)).toEqual(VALID);
    const multipart = createIncidentBody.parse({ ...VALID, latitude: " 17.4483 ", longitude: "78.3814", address: " Madhapur " });
    expect(multipart).toEqual({ ...VALID, address: "Madhapur" });
    expect(createIncidentBody.parse({ ...VALID, address: "" }).address).toBe("");
  });

  it("rejects non-numeric and out-of-range coordinates with the documented messages", () => {
    expect(issues(createIncidentBody.safeParse({ ...VALID, latitude: "abc", longitude: "" }))).toEqual({
      latitude: "Must be a number",
      longitude: "Must be a number",
    });
    expect(issues(createIncidentBody.safeParse({ ...VALID, latitude: 95, longitude: -181 }))).toEqual({
      latitude: "Must be between -90 and 90",
      longitude: "Must be between -180 and 180",
    });
    expect(issues(createIncidentBody.safeParse({ ...VALID, latitude: true })).latitude).toBe("Must be a number");
  });

  it("checks lengths, enums and required fields, and strips everything else", () => {
    const result = createIncidentBody.safeParse({ title: "Tiny", description: "too short", category: "HAZARD", severity: "EXTREME" });
    expect(issues(result)).toEqual({
      title: "Must be between 5 and 120 characters",
      description: "Must be between 10 and 2000 characters",
      category: expect.stringContaining("Must be one of POTHOLE, ROAD_DAMAGE"),
      severity: "Must be one of LOW, MEDIUM, HIGH",
      latitude: "Must be a number",
      longitude: "Must be a number",
    });
    expect(issues(createIncidentBody.safeParse({})).title).toBe("Title is required");
    const stripped = createIncidentBody.parse({ ...VALID, status: "VERIFIED", source: "seed", reportedBy: "x", $where: "1" });
    expect(Object.keys(stripped).sort()).toEqual(["category", "description", "latitude", "longitude", "severity", "title"]);
  });
});

describe("updateIncidentBody", () => {
  it("makes every field optional and coerces multipart values", () => {
    expect(updateIncidentBody.parse({})).toEqual({});
    expect(updateIncidentBody.parse({ title: " Edited title ", latitude: "17.5", removeImage: "true", adminNote: "" })).toEqual({
      title: "Edited title",
      latitude: 17.5,
      removeImage: true,
      adminNote: null,
    });
    expect(updateIncidentBody.parse({ adminNote: " Checked. ", removeImage: false })).toEqual({ adminNote: "Checked.", removeImage: false });
  });

  it("points status and priority at their dedicated endpoints", () => {
    expect(issues(updateIncidentBody.safeParse({ status: "VERIFIED", priority: "HIGH" }))).toEqual({
      status: "Use PATCH /api/incidents/:id/status to change the status.",
      priority: "Use PATCH /api/incidents/:id/priority to change the priority.",
    });
    expect(issues(updateIncidentBody.safeParse({ priority: null })).priority).toMatch(/dedicated|\/priority/);
  });

  it("validates whatever is present", () => {
    expect(issues(updateIncidentBody.safeParse({ severity: "NONE", longitude: 181, removeImage: "sometimes" }))).toEqual({
      severity: "Must be one of LOW, MEDIUM, HIGH",
      longitude: "Must be between -180 and 180",
      removeImage: expect.any(String),
    });
    expect(issues(updateIncidentBody.safeParse({ adminNote: "n".repeat(1001) })).adminNote).toBe("Must be at most 1000 characters");
  });
});

describe("listIncidentsQuery", () => {
  it("applies defaults and parses comma-separated filters, dates, search and sort", () => {
    expect(listIncidentsQuery.parse({})).toEqual({ page: 1, limit: 20, sort: { field: "createdAt", direction: -1 } });
    const parsed = listIncidentsQuery.parse({
      status: "SUBMITTED,VERIFIED",
      category: ["POTHOLE", "ACCIDENT,POTHOLE"],
      severity: "HIGH",
      priority: "UNASSIGNED,HIGH",
      source: "seed",
      riskLevel: "NONE,HIGH",
      from: "2026-08-01",
      to: "2026-08-31T23:59:59Z",
      q: "  hitec ",
      sort: "-priority",
      page: "3",
      limit: "50",
    });
    expect(parsed).toEqual({
      status: ["SUBMITTED", "VERIFIED"],
      category: ["POTHOLE", "ACCIDENT"],
      severity: ["HIGH"],
      priority: ["UNASSIGNED", "HIGH"],
      source: ["seed"],
      riskLevel: ["NONE", "HIGH"],
      from: new Date("2026-08-01"),
      to: new Date("2026-08-31T23:59:59Z"),
      q: "hitec",
      sort: { field: "priority", direction: -1 },
      page: 3,
      limit: 50,
    });
  });

  it("rejects unknown values, an inverted range and a disallowed sort field", () => {
    const result = listIncidentsQuery.safeParse({ status: "SUBMITTED,BOGUS", riskLevel: "SEVERE", sort: "title" });
    const found = issues(result);
    expect(Object.keys(found).sort()).toEqual(["riskLevel.0", "sort", "status.1"]);
    expect(found.sort).toBe("Sort field must be one of createdAt, updatedAt, priority, status, severity");
    // The range check is an object-level refinement, which zod runs once the fields themselves are valid.
    expect(issues(listIncidentsQuery.safeParse({ from: "2026-09-02", to: "2026-09-01" }))).toEqual({ to: "Must not be before from" });
    expect(issues(listIncidentsQuery.safeParse({ from: "yesterday" })).from).toMatch(/ISO 8601/);
  });
});

describe("mineIncidentsQuery", () => {
  it("keeps the shared filters but ignores q, source and riskLevel", () => {
    const parsed = mineIncidentsQuery.parse({ status: "REJECTED", priority: "UNASSIGNED", q: "x", source: "seed", riskLevel: "NONE", sort: "severity" });
    expect(parsed).toEqual({ status: ["REJECTED"], priority: ["UNASSIGNED"], sort: { field: "severity", direction: 1 }, page: 1, limit: 20 });
  });
});

describe("changeStatusBody and changePriorityBody", () => {
  it("requires a known status and turns an empty note into null", () => {
    expect(changeStatusBody.parse({ status: "REJECTED", note: "" })).toEqual({ status: "REJECTED", note: null });
    expect(changeStatusBody.parse({ status: "VERIFIED", note: " Confirmed. " })).toEqual({ status: "VERIFIED", note: "Confirmed." });
    expect(changeStatusBody.parse({ status: "VERIFIED" })).toEqual({ status: "VERIFIED" });
    expect(issues(changeStatusBody.safeParse({ status: "DONE" })).status).toBe(
      "Must be one of SUBMITTED, UNDER_REVIEW, VERIFIED, IN_PROGRESS, RESOLVED, REJECTED",
    );
    expect(issues(changeStatusBody.safeParse({})).status).toBeDefined();
  });

  it("requires priority, allowing null to clear it", () => {
    expect(changePriorityBody.parse({ priority: null })).toEqual({ priority: null });
    expect(changePriorityBody.parse({ priority: "CRITICAL", note: "Blocked lane" })).toEqual({ priority: "CRITICAL", note: "Blocked lane" });
    expect(issues(changePriorityBody.safeParse({})).priority).toBe("Must be one of LOW, MEDIUM, HIGH, CRITICAL or null");
    expect(issues(changePriorityBody.safeParse({ priority: "URGENT" })).priority).toBe("Must be one of LOW, MEDIUM, HIGH, CRITICAL or null");
  });
});
