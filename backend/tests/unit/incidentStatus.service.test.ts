import { describe, expect, it } from "vitest";
import { STATUSES } from "../../src/config/enums.js";
import { AppError } from "../../src/lib/errors.js";
import {
  allowedTransitions,
  applyPriorityChange,
  applyStatusChange,
  canTransition,
  type LifecycleIncident,
} from "../../src/services/incidentStatus.service.js";

const ADMIN = "66d59f10c2b7a4e8f1a2b3a1";

function incident(overrides: Partial<LifecycleIncident> = {}): LifecycleIncident {
  return {
    status: "SUBMITTED",
    priority: null,
    verifiedBy: null,
    resolvedAt: null,
    adminNote: null,
    statusHistory: [{ field: "status", from: null, to: "SUBMITTED", note: null, changedBy: null, at: new Date() }],
    ...overrides,
  };
}

describe("canTransition", () => {
  it.each([
    ["SUBMITTED", "UNDER_REVIEW", true],
    ["SUBMITTED", "REJECTED", true],
    ["SUBMITTED", "VERIFIED", false],
    ["UNDER_REVIEW", "VERIFIED", true],
    ["VERIFIED", "IN_PROGRESS", true],
    ["VERIFIED", "RESOLVED", true],
    ["VERIFIED", "REJECTED", true],
    ["IN_PROGRESS", "RESOLVED", true],
    ["IN_PROGRESS", "REJECTED", false],
    ["RESOLVED", "IN_PROGRESS", true],
    ["RESOLVED", "VERIFIED", false],
    ["REJECTED", "UNDER_REVIEW", true],
    ["REJECTED", "VERIFIED", false],
    ["RESOLVED", "RESOLVED", false],
  ])("%s -> %s is %s", (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  it("returns false for unknown statuses", () => {
    expect(canTransition("NOPE", "VERIFIED")).toBe(false);
    expect(canTransition("REPORTED", "UNDER_REVIEW")).toBe(false);
    expect(allowedTransitions("NOPE")).toEqual([]);
  });
});

describe("applyStatusChange", () => {
  it("appends a history entry and updates the status", () => {
    const doc = incident();
    applyStatusChange(doc, { status: "UNDER_REVIEW", adminId: ADMIN });
    expect(doc.status).toBe("UNDER_REVIEW");
    expect(doc.statusHistory).toHaveLength(2);
    expect(doc.statusHistory[1]).toMatchObject({
      field: "status",
      from: "SUBMITTED",
      to: "UNDER_REVIEW",
      changedBy: ADMIN,
      note: null,
    });
  });

  it("rejects an invalid transition with INVALID_TRANSITION and the allowed list", () => {
    const doc = incident({ status: "RESOLVED" });
    let caught: unknown;
    try {
      applyStatusChange(doc, { status: "VERIFIED", adminId: ADMIN });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AppError);
    const error = caught as AppError;
    expect(error.code).toBe("INVALID_TRANSITION");
    expect(error.status).toBe(409);
    expect(error.details[0]).toEqual({ from: "RESOLVED", to: "VERIFIED", allowed: ["IN_PROGRESS"] });
    expect(doc.status).toBe("RESOLVED");
    expect(doc.statusHistory).toHaveLength(1);
  });

  it("rejects an unknown status with VALIDATION_ERROR", () => {
    expect(() => applyStatusChange(incident(), { status: "DONE", adminId: ADMIN })).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
  });

  it("requires a note when rejecting", () => {
    expect(() => applyStatusChange(incident(), { status: "REJECTED", note: "   ", adminId: ADMIN })).toThrowError(
      expect.objectContaining({ code: "NOTE_REQUIRED", status: 400 }),
    );
    const doc = incident();
    applyStatusChange(doc, { status: "REJECTED", note: "Duplicate of #12", adminId: ADMIN });
    expect(doc.adminNote).toBe("Duplicate of #12");
    expect(doc.statusHistory.at(-1)?.note).toBe("Duplicate of #12");
  });

  it("sets verifiedBy on the first VERIFIED only", () => {
    const doc = incident({ status: "UNDER_REVIEW" });
    applyStatusChange(doc, { status: "VERIFIED", adminId: ADMIN });
    expect(doc.verifiedBy).toBe(ADMIN);
    applyStatusChange(doc, { status: "RESOLVED", adminId: "another" });
    applyStatusChange(doc, { status: "IN_PROGRESS", adminId: "another" });
    expect(doc.verifiedBy).toBe(ADMIN);
  });

  it("sets resolvedAt on RESOLVED and clears it on reopen", () => {
    const doc = incident({ status: "IN_PROGRESS" });
    applyStatusChange(doc, { status: "RESOLVED", adminId: ADMIN });
    expect(doc.resolvedAt).toBeInstanceOf(Date);
    applyStatusChange(doc, { status: "IN_PROGRESS", adminId: ADMIN });
    expect(doc.resolvedAt).toBeNull();
  });

  it("clears adminNote when a rejected incident is reconsidered but keeps the history", () => {
    const doc = incident();
    applyStatusChange(doc, { status: "REJECTED", note: "Not a road issue", adminId: ADMIN });
    applyStatusChange(doc, { status: "UNDER_REVIEW", adminId: ADMIN });
    expect(doc.adminNote).toBeNull();
    expect(doc.statusHistory.map((h) => h.to)).toEqual(["SUBMITTED", "REJECTED", "UNDER_REVIEW"]);
    expect(doc.statusHistory[1]?.note).toBe("Not a road issue");
  });

  it("accepts admin ids given as objects with _id", () => {
    const doc = incident();
    applyStatusChange(doc, { status: "UNDER_REVIEW", adminId: { _id: ADMIN } });
    expect(doc.statusHistory.at(-1)?.changedBy).toBe(ADMIN);
  });

  it("can walk every status from SUBMITTED through the documented paths", () => {
    const doc = incident();
    for (const status of ["UNDER_REVIEW", "VERIFIED", "IN_PROGRESS", "RESOLVED"]) {
      applyStatusChange(doc, { status, adminId: ADMIN });
    }
    expect(doc.status).toBe("RESOLVED");
    expect(STATUSES).toContain(doc.status);
  });
});

describe("applyPriorityChange", () => {
  it("sets a priority and records it", () => {
    const doc = incident();
    applyPriorityChange(doc, { priority: "HIGH", note: "Near a school", adminId: ADMIN });
    expect(doc.priority).toBe("HIGH");
    expect(doc.adminNote).toBe("Near a school");
    expect(doc.statusHistory.at(-1)).toMatchObject({ field: "priority", from: null, to: "HIGH" });
  });

  it("can unassign and rejects unknown values", () => {
    const doc = incident({ priority: "LOW" });
    applyPriorityChange(doc, { priority: null, adminId: ADMIN });
    expect(doc.priority).toBeNull();
    expect(doc.statusHistory.at(-1)).toMatchObject({ field: "priority", from: "LOW", to: "UNASSIGNED" });
    expect(() => applyPriorityChange(doc, { priority: "URGENT", adminId: ADMIN })).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
  });
});
