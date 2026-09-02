import { requestData } from "./client";
import type { Category, Enums, HealthResponse } from "@/types/api";

/** GET /api/meta/categories: keys, labels, colours and descriptions in display order. */
export function getCategories(): Promise<Category[]> {
  return requestData<Category[]>({ method: "GET", url: "/meta/categories" });
}

/** GET /api/meta/enums: vocabulary, transitions, labels, map defaults and upload limits. */
export function getEnums(): Promise<Enums> {
  return requestData<Enums>({ method: "GET", url: "/meta/enums" });
}

/** GET /api/health: database and ML connectivity (503 when the database is down). */
export function getHealth(): Promise<HealthResponse> {
  return requestData<HealthResponse>({ method: "GET", url: "/health" });
}
