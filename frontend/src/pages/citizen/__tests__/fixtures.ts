import { TEST_USER } from "@/test/utils";
import type { Incident, PaginationMeta } from "@/types/api";

/** A SUBMITTED report by TEST_USER (reporter variant of docs/api.md 6.1). Override what a test needs. */
export function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "66d5a2b8c2b7a4e8f1a2b3d0",
    title: "Deep pothole near Hitec City flyover",
    description: "About 40 cm wide pothole on the left lane just after the flyover exit.",
    category: "POTHOLE",
    severity: "HIGH",
    priority: null,
    status: "SUBMITTED",
    verification: "PENDING",
    latitude: 17.4483,
    longitude: 78.3814,
    address: "Hitec City Main Road, Madhapur, Hyderabad",
    image: null,
    reportedBy: { id: TEST_USER.id, name: TEST_USER.name },
    verifiedBy: null,
    adminNote: null,
    statusHistory: [
      {
        field: "status",
        from: null,
        to: "SUBMITTED",
        note: null,
        changedBy: null,
        at: "2026-09-01T10:02:11.000Z",
      },
    ],
    source: "user",
    resolvedAt: null,
    createdAt: "2026-09-01T10:02:11.000Z",
    updatedAt: "2026-09-01T10:02:11.000Z",
    ...overrides,
  };
}

export function pageMeta(total: number, page = 1, limit = 10): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
