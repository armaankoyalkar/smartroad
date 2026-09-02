import { describe, expect, it } from "vitest";
import { type IncidentSource, serializeIncident, serializeIncidents, viewerVariant } from "../../src/lib/serializers.js";

const REPORTER_ID = "66d5a1f0c2b7a4e8f1a2b3c4";
const ADMIN_ID = "66d59f10c2b7a4e8f1a2b3a1";
const OTHER_ID = "66d5a1f0c2b7a4e8f1a2b3ff";

function incidentDoc(): IncidentSource {
  return {
    _id: "66d5a2b8c2b7a4e8f1a2b3d0",
    title: "Deep pothole near Hitec City flyover",
    description: "About 40 cm wide pothole on the left lane just after the flyover exit.",
    category: "POTHOLE",
    severity: "HIGH",
    priority: "HIGH",
    status: "VERIFIED",
    location: { type: "Point", coordinates: [78.3814, 17.4483] },
    address: "Hitec City Main Road, Madhapur, Hyderabad",
    image: { url: "/uploads/abc.jpg", mimeType: "image/jpeg", size: 734221 },
    reportedBy: { _id: REPORTER_ID, name: "Priya Sharma", email: "priya@example.com" },
    verifiedBy: { _id: ADMIN_ID, name: "Admin One", email: "admin@example.com" },
    adminNote: "Confirmed by site photo.",
    statusHistory: [
      { field: "status", from: null, to: "SUBMITTED", note: null, changedBy: null, at: new Date("2026-09-14T10:02:11Z") },
      { field: "status", from: "SUBMITTED", to: "UNDER_REVIEW", note: null, changedBy: { _id: ADMIN_ID, name: "Admin One" }, at: new Date() },
      { field: "status", from: "UNDER_REVIEW", to: "VERIFIED", note: "Confirmed by site photo.", changedBy: { _id: ADMIN_ID, name: "Admin One" }, at: new Date() },
    ],
    riskEstimate: {
      level: "MEDIUM",
      probabilities: { LOW: 0.31, MEDIUM: 0.52, HIGH: 0.17 },
      modelVersion: "demo-rf-1.0.0",
      estimatedAt: new Date("2026-09-16T08:00:00Z"),
    },
    source: "user",
    resolvedAt: null,
    createdAt: new Date("2026-09-14T10:02:11Z"),
    updatedAt: new Date("2026-09-15T08:05:30Z"),
  };
}

const admin = { id: ADMIN_ID, role: "admin" };
const reporter = { id: REPORTER_ID, role: "citizen" };
const other = { id: OTHER_ID, role: "citizen" };

describe("viewerVariant", () => {
  it("classifies admin, reporter and everyone else", () => {
    const doc = incidentDoc();
    expect(viewerVariant(doc, admin)).toBe("admin");
    expect(viewerVariant(doc, { _id: REPORTER_ID, role: "citizen" })).toBe("reporter");
    expect(viewerVariant(doc, other)).toBe("public");
    expect(viewerVariant(doc, null)).toBe("public");
  });
});

describe("serializeIncident", () => {
  it("exposes latitude and longitude, never the raw coordinate array", () => {
    const out = serializeIncident(incidentDoc(), null);
    expect(out.latitude).toBe(17.4483);
    expect(out.longitude).toBe(78.3814);
    expect(out).not.toHaveProperty("location");
    expect(out.id).toBe("66d5a2b8c2b7a4e8f1a2b3d0");
    expect(out.image).toEqual({ url: "/uploads/abc.jpg", mimeType: "image/jpeg", size: 734221 });
  });

  it("derives verification from the status for every viewer", () => {
    expect(serializeIncident(incidentDoc(), null).verification).toBe("VERIFIED");
    expect(serializeIncident({ ...incidentDoc(), status: "SUBMITTED" }, reporter).verification).toBe("PENDING");
    expect(serializeIncident({ ...incidentDoc(), status: "UNDER_REVIEW" }, admin).verification).toBe("PENDING");
    expect(serializeIncident({ ...incidentDoc(), status: "REJECTED" }, admin).verification).toBe("REJECTED");
    expect(serializeIncident({ ...incidentDoc(), status: "RESOLVED" }, other).verification).toBe("VERIFIED");
  });

  it("gives admins everything, including the risk estimate", () => {
    const out = serializeIncident(incidentDoc(), admin);
    expect(out.reportedBy).toEqual({ id: REPORTER_ID, name: "Priya Sharma", email: "priya@example.com" });
    expect(out.verifiedBy).toEqual({ id: ADMIN_ID, name: "Admin One" });
    expect(out.adminNote).toBe("Confirmed by site photo.");
    expect(out.statusHistory[2]?.changedBy).toEqual({ id: ADMIN_ID, name: "Admin One" });
    expect(out.statusHistory[2]?.note).toBe("Confirmed by site photo.");
    expect(out.riskEstimate).toEqual({
      level: "MEDIUM",
      probabilities: { LOW: 0.31, MEDIUM: 0.52, HIGH: 0.17 },
      modelVersion: "demo-rf-1.0.0",
      estimatedAt: new Date("2026-09-16T08:00:00Z"),
    });
  });

  it("gives admins riskEstimate: null when there is no estimate yet", () => {
    const out = serializeIncident({ ...incidentDoc(), riskEstimate: null }, admin);
    expect(out).toHaveProperty("riskEstimate", null);
    const missing = serializeIncident({ ...incidentDoc(), riskEstimate: undefined }, admin);
    expect(missing).toHaveProperty("riskEstimate", null);
  });

  it("hides admin identity and the risk estimate from the reporter but keeps the notes", () => {
    const out = serializeIncident(incidentDoc(), reporter);
    expect(out.reportedBy).toEqual({ id: REPORTER_ID, name: "Priya Sharma" });
    expect(out.reportedBy).not.toHaveProperty("email");
    expect(out.verifiedBy).toBeNull();
    expect(out.adminNote).toBe("Confirmed by site photo.");
    expect(out.statusHistory.every((h) => h.changedBy === null)).toBe(true);
    expect(out.statusHistory[2]?.note).toBe("Confirmed by site photo.");
    expect(out).not.toHaveProperty("riskEstimate");
  });

  it("strips reporter, admin identities, notes and the risk estimate for other users", () => {
    const out = serializeIncident(incidentDoc(), other);
    expect(out.reportedBy).toBeNull();
    expect(out.verifiedBy).toBeNull();
    expect(out).not.toHaveProperty("adminNote");
    expect(out).not.toHaveProperty("riskEstimate");
    expect(out.statusHistory.every((h) => h.changedBy === null && !("note" in h))).toBe(true);
    expect(out.statusHistory).toHaveLength(3);
    expect(out.title).toBe("Deep pothole near Hitec City flyover");
  });

  it("handles unpopulated ObjectId references", () => {
    const doc = incidentDoc();
    doc.reportedBy = REPORTER_ID;
    doc.verifiedBy = ADMIN_ID;
    const asAdmin = serializeIncident(doc, admin);
    expect(asAdmin.reportedBy).toEqual({ id: REPORTER_ID });
    expect(asAdmin.verifiedBy).toEqual({ id: ADMIN_ID });
    const asReporter = serializeIncident(doc, reporter);
    expect(asReporter.reportedBy).toEqual({ id: REPORTER_ID });
  });

  it("handles missing optional fields", () => {
    const doc = incidentDoc();
    doc.image = null;
    doc.adminNote = null;
    doc.address = undefined;
    const out = serializeIncident(doc, admin);
    expect(out.image).toBeNull();
    expect(out.adminNote).toBeNull();
    expect(out.address).toBe("");
  });

  it("serialises lists with the same viewer", () => {
    const list = serializeIncidents([incidentDoc(), incidentDoc()], other);
    expect(list).toHaveLength(2);
    expect(list.every((i) => i.reportedBy === null && i.verification === "VERIFIED")).toBe(true);
  });
});
