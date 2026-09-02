#!/usr/bin/env node
/**
 * SmartRoad end-to-end smoke test.
 *
 * Exercises the complete demo workflow against RUNNING services (backend, and
 * optionally the ML service) using only the public HTTP contract in
 * docs/api.md:
 *
 *   health -> meta -> citizen registers -> reports an incident with a photo ->
 *   sees it in "my reports" -> admin logs in -> searches, reviews, verifies,
 *   prioritises -> privacy rules checked -> map, analytics -> ML (model info,
 *   risk estimate, incident risk, hotspots, risk distribution) -> cleanup.
 *
 * Usage:
 *   node tests/e2e/run.mjs                      (API at http://localhost:5000)
 *   API_URL=http://localhost:5000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/e2e/run.mjs
 *   E2E_REQUIRE_ML=1 node tests/e2e/run.mjs     (fail instead of skip when the ML service is down)
 *
 * Admin credentials default to SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD read from
 * backend/.env (the demo admin created by `npm run seed`).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const API = (process.env.API_URL || "http://localhost:5000").replace(/\/$/, "");

function readBackendEnv() {
  const file = path.join(root, "backend", ".env");
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}

const backendEnv = readBackendEnv();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || backendEnv.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || backendEnv.SEED_ADMIN_PASSWORD;
const REQUIRE_ML = process.env.E2E_REQUIRE_ML === "1";

// A valid 1x1 PNG (magic bytes are what the upload middleware checks).
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const results = [];
let failures = 0;

function pass(name, note = "") {
  results.push({ name, ok: true, note });
  console.log(`  PASS  ${name}${note ? `  (${note})` : ""}`);
}
function fail(name, note = "") {
  failures += 1;
  results.push({ name, ok: false, note });
  console.log(`  FAIL  ${name}${note ? `  (${note})` : ""}`);
}
function skip(name, note = "") {
  results.push({ name, ok: null, note });
  console.log(`  SKIP  ${name}${note ? `  (${note})` : ""}`);
}

async function call(method, url, { token, json, form, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(`${API}${url}`, { method, headers, body });
  if (raw) return res;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { parseError: true, text: text.slice(0, 200) };
  }
  return { status: res.status, body: data, headers: res.headers };
}

function expect(name, condition, note = "") {
  if (condition) pass(name, note);
  else fail(name, note);
  return Boolean(condition);
}

async function step(title, fn) {
  console.log(`\n${title}`);
  try {
    await fn();
  } catch (err) {
    fail(title, `threw: ${err.message}`);
  }
}

const state = { mlUp: false, citizen: null, admin: null, incidentId: null, imageUrl: null, citizenId: null };
const stamp = Date.now();
const citizenEmail = `e2e.citizen.${stamp}@smartroad.test`;
const citizenPassword = `E2e-password-${stamp}`;
const title = `E2E pothole check ${stamp}`;

console.log(`SmartRoad end-to-end smoke test against ${API}`);
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Admin credentials not found. Set ADMIN_EMAIL and ADMIN_PASSWORD or SEED_ADMIN_* in backend/.env.");
  process.exit(2);
}

await step("1. Health and metadata", async () => {
  const health = await call("GET", "/api/health");
  expect("GET /api/health answers", health.status === 200 || health.status === 503, `status ${health.status}`);
  expect("database is up", health.body?.data?.checks?.database?.status === "up");
  state.mlUp = health.body?.data?.checks?.mlService?.status === "up";
  if (state.mlUp) pass("ML service is up", `model ${health.body.data.checks.mlService.modelVersion ?? "unknown"}`);
  else if (REQUIRE_ML) fail("ML service is up", "E2E_REQUIRE_ML=1 and the ML service is down");
  else skip("ML service is up", "ML checks will be skipped");

  const enums = await call("GET", "/api/meta/enums");
  expect("GET /api/meta/enums has SUBMITTED first", enums.body?.data?.statuses?.[0] === "SUBMITTED");
  expect("enums expose transitions and map defaults", Boolean(enums.body?.data?.transitions?.SUBMITTED && enums.body?.data?.map?.center));
  const cats = await call("GET", "/api/meta/categories");
  expect("GET /api/meta/categories returns ten categories", cats.body?.data?.length === 10, `got ${cats.body?.data?.length}`);
});

await step("2. Citizen registers and reports an incident", async () => {
  const reg = await call("POST", "/api/auth/register", { json: { name: "E2E Citizen", email: citizenEmail, password: citizenPassword } });
  if (!expect("POST /api/auth/register returns 201 with a token", reg.status === 201 && reg.body?.data?.token, `status ${reg.status} ${JSON.stringify(reg.body?.error ?? "")}`)) return;
  state.citizen = reg.body.data.token;
  state.citizenId = reg.body.data.user.id;
  expect("registered role is citizen even if role were sent", reg.body.data.user.role === "citizen");

  const me = await call("GET", "/api/auth/me", { token: state.citizen });
  expect("GET /api/auth/me returns the profile", me.status === 200 && me.body?.data?.email === citizenEmail);

  const form = new FormData();
  form.append("title", title);
  form.append("category", "POTHOLE");
  form.append("description", "End-to-end test report: a pothole on the left lane. Safe to delete.");
  form.append("severity", "HIGH");
  form.append("latitude", "17.4483");
  form.append("longitude", "78.3814");
  form.append("address", "Hitec City Main Road (e2e)");
  form.append("image", new Blob([PNG_1X1], { type: "image/png" }), "e2e.png");
  const created = await call("POST", "/api/incidents", { token: state.citizen, form });
  if (!expect("POST /api/incidents (multipart with image) returns 201", created.status === 201, `status ${created.status} ${JSON.stringify(created.body?.error ?? "")}`)) return;
  state.incidentId = created.body.data.id;
  expect("new incident starts as SUBMITTED / PENDING", created.body.data.status === "SUBMITTED" && created.body.data.verification === "PENDING");
  expect("incident exposes latitude/longitude, not a coordinates array", created.body.data.latitude === 17.4483 && created.body.data.longitude === 78.3814 && !("location" in created.body.data));
  state.imageUrl = created.body.data.image?.url ?? null;
  expect("image was stored", Boolean(state.imageUrl));
  if (state.imageUrl) {
    const img = await call("GET", state.imageUrl, { raw: true });
    expect("GET /uploads/<file> serves the image", img.status === 200 && (img.headers.get("content-type") || "").startsWith("image/"));
  }

  const bad = await call("POST", "/api/incidents", { token: state.citizen, json: { title: "x", category: "SNOW", description: "short", severity: "HIGH", latitude: 95, longitude: 78 } });
  expect("malformed incident is rejected with VALIDATION_ERROR", bad.status === 400 && bad.body?.error?.code === "VALIDATION_ERROR" && Array.isArray(bad.body.error.details) && bad.body.error.details.length > 0);

  const mine = await call("GET", "/api/incidents/mine?limit=5", { token: state.citizen });
  expect("GET /api/incidents/mine lists the new report", mine.status === 200 && mine.body?.data?.some((i) => i.id === state.incidentId));
  const forbidden = await call("GET", "/api/incidents", { token: state.citizen });
  expect("citizen cannot list all incidents (403)", forbidden.status === 403 && forbidden.body?.error?.code === "FORBIDDEN");
  const edited = await call("PATCH", `/api/incidents/${state.incidentId}`, { token: state.citizen, json: { description: "End-to-end test report, edited while SUBMITTED. Safe to delete." } });
  expect("owner can edit while SUBMITTED", edited.status === 200);
});

await step("3. Admin reviews, verifies and prioritises", async () => {
  const login = await call("POST", "/api/auth/login", { json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  if (!expect("admin login succeeds", login.status === 200 && login.body?.data?.user?.role === "admin", `status ${login.status} ${JSON.stringify(login.body?.error ?? "")}`)) return;
  state.admin = login.body.data.token;
  const wrong = await call("POST", "/api/auth/login", { json: { email: ADMIN_EMAIL, password: "definitely-wrong-password" } });
  expect("wrong password gives INVALID_CREDENTIALS", wrong.status === 401 && wrong.body?.error?.code === "INVALID_CREDENTIALS");
  if (!state.incidentId) return;

  const list = await call("GET", `/api/incidents?q=${encodeURIComponent(title)}`, { token: state.admin });
  const row = list.body?.data?.find((i) => i.id === state.incidentId);
  expect("admin search finds the incident with reporter email", Boolean(row && row.reportedBy?.email === citizenEmail));
  expect("list meta carries pagination", typeof list.body?.meta?.total === "number");

  const invalid = await call("PATCH", `/api/incidents/${state.incidentId}/status`, { token: state.admin, json: { status: "VERIFIED" } });
  expect("SUBMITTED -> VERIFIED is rejected with INVALID_TRANSITION", invalid.status === 409 && invalid.body?.error?.code === "INVALID_TRANSITION");
  const review = await call("PATCH", `/api/incidents/${state.incidentId}/status`, { token: state.admin, json: { status: "UNDER_REVIEW" } });
  expect("SUBMITTED -> UNDER_REVIEW", review.status === 200 && review.body?.data?.status === "UNDER_REVIEW");
  const rejectNoNote = await call("PATCH", `/api/incidents/${state.incidentId}/status`, { token: state.admin, json: { status: "REJECTED" } });
  expect("rejecting without a note gives NOTE_REQUIRED", rejectNoNote.status === 400 && rejectNoNote.body?.error?.code === "NOTE_REQUIRED");
  const verified = await call("PATCH", `/api/incidents/${state.incidentId}/status`, { token: state.admin, json: { status: "VERIFIED", note: "Confirmed by e2e." } });
  expect("UNDER_REVIEW -> VERIFIED sets verifiedBy", verified.status === 200 && verified.body?.data?.verification === "VERIFIED" && Boolean(verified.body?.data?.verifiedBy?.id));
  const prio = await call("PATCH", `/api/incidents/${state.incidentId}/priority`, { token: state.admin, json: { priority: "HIGH" } });
  expect("priority set to HIGH with a history entry", prio.status === 200 && prio.body?.data?.priority === "HIGH" && prio.body.data.statusHistory.some((h) => h.field === "priority" && h.to === "HIGH"));

  const asCitizen = await call("GET", `/api/incidents/${state.incidentId}`, { token: state.citizen });
  expect("reporter sees notes but not admin identity", asCitizen.status === 200 && asCitizen.body?.data?.adminNote === "Confirmed by e2e." && asCitizen.body.data.verifiedBy === null);
  const editLater = await call("PATCH", `/api/incidents/${state.incidentId}`, { token: state.citizen, json: { title: "should not work" } });
  expect("owner cannot edit after verification (403)", editLater.status === 403);
});

await step("4. GIS map and analytics", async () => {
  const bbox = "78.37,17.44,78.39,17.46";
  const pub = await call("GET", `/api/map/incidents?bbox=${bbox}&limit=500`);
  const feature = pub.body?.data?.features?.find((f) => f.properties?.id === state.incidentId);
  expect("GET /api/map/incidents returns a GeoJSON FeatureCollection", pub.status === 200 && pub.body?.data?.type === "FeatureCollection");
  expect("the e2e incident is inside the bbox result", Boolean(feature));
  if (feature) {
    expect("GeoJSON coordinates are [lng, lat]", feature.geometry.coordinates[0] === 78.3814 && feature.geometry.coordinates[1] === 17.4483);
    expect("public callers do not see priority", feature.properties.priority === null);
  }
  const adminMap = await call("GET", `/api/map/incidents?bbox=${bbox}&limit=500`, { token: state.admin });
  const adminFeature = adminMap.body?.data?.features?.find((f) => f.properties?.id === state.incidentId);
  expect("admin sees priority on the map", adminFeature?.properties?.priority === "HIGH");

  const summary = await call("GET", "/api/analytics/summary", { token: state.admin });
  expect("GET /api/analytics/summary counts", summary.status === 200 && summary.body?.data?.total >= 1 && typeof summary.body.data.byStatus?.VERIFIED === "number");
  const mine = await call("GET", "/api/analytics/mine", { token: state.citizen });
  expect("GET /api/analytics/mine counts the citizen's report", mine.status === 200 && mine.body?.data?.total >= 1);
  const publicStats = await call("GET", "/api/analytics/public");
  expect("GET /api/analytics/public answers", publicStats.status === 200 && typeof publicStats.body?.data?.reportsFiled === "number");
  const breakdown = await call("GET", "/api/analytics/breakdown?by=category", { token: state.admin });
  expect("breakdown by category includes POTHOLE", breakdown.status === 200 && breakdown.body?.data?.some((b) => b.key === "POTHOLE" && b.count >= 1));
  const timeline = await call("GET", "/api/analytics/timeline?granularity=day", { token: state.admin });
  expect("timeline has 30 daily buckets", timeline.status === 200 && Array.isArray(timeline.body?.data) && timeline.body.data.length >= 30);
  const citizenAnalytics = await call("GET", "/api/analytics/summary", { token: state.citizen });
  expect("citizen cannot read admin analytics (403)", citizenAnalytics.status === 403);

  const users = await call("GET", `/api/users?q=${encodeURIComponent(citizenEmail)}`, { token: state.admin });
  expect("admin user list finds the e2e citizen", users.status === 200 && users.body?.data?.some((u) => u.email === citizenEmail));
  const meAdmin = await call("GET", "/api/auth/me", { token: state.admin });
  const selfPatch = await call("PATCH", `/api/users/${meAdmin.body?.data?.id}`, { token: state.admin, json: { isActive: false } });
  expect("admin cannot deactivate themselves (400)", selfPatch.status === 400);
});

await step("5. Machine learning: risk estimation and hotspots", async () => {
  if (!state.mlUp) {
    skip("ML checks", "ML service down");
    return;
  }
  const info = await call("GET", "/api/ml/model-info", { token: state.admin });
  expect("GET /api/ml/model-info returns model version and metrics", info.status === 200 && Boolean(info.body?.data?.modelVersion) && typeof info.body.data.metrics?.macroF1 === "number", `status ${info.status} ${JSON.stringify(info.body?.error ?? "")}`);
  expect("model-info states whether it is a demo model", typeof info.body?.data?.isDemoModel === "boolean");
  expect("feature schema has the ten shipped features", info.body?.data?.features?.length === 10, `got ${info.body?.data?.features?.length}`);

  const est = await call("POST", "/api/ml/estimate-risk", {
    token: state.admin,
    json: { features: { hour: 22, day_of_week: "SAT", month: 8, light_conditions: "DARK_UNLIT", weather: "RAIN", road_surface: "WET", road_type: "HIGHWAY", speed_limit: 100, area_type: "RURAL", category: "ACCIDENT" } },
  });
  expect("POST /api/ml/estimate-risk returns a level and probabilities", est.status === 200 && ["LOW", "MEDIUM", "HIGH"].includes(est.body?.data?.riskLevel) && Math.abs(Object.values(est.body.data.probabilities).reduce((a, b) => a + b, 0) - 1) < 0.01, `status ${est.status} ${JSON.stringify(est.body?.error ?? "")}`);
  expect("estimate carries a disclaimer and contributions", typeof est.body?.data?.disclaimer === "string" && Array.isArray(est.body?.data?.contributions));
  const badEst = await call("POST", "/api/ml/estimate-risk", { token: state.admin, json: { features: { hour: 30 } } });
  expect("invalid features are rejected with VALIDATION_ERROR", badEst.status === 400);

  if (state.incidentId) {
    const risk = await call("GET", `/api/ml/incidents/${state.incidentId}/risk`, { token: state.admin });
    expect("GET /api/ml/incidents/:id/risk derives features and lists assumptions", risk.status === 200 && ["LOW", "MEDIUM", "HIGH"].includes(risk.body?.data?.riskLevel) && Array.isArray(risk.body.data.assumedFeatures) && risk.body.data.features?.category === "POTHOLE", `status ${risk.status} ${JSON.stringify(risk.body?.error ?? "")}`);
    const stored = await call("GET", `/api/incidents/${state.incidentId}`, { token: state.admin });
    expect("the estimate is stored on the incident for admins", stored.body?.data?.riskEstimate?.level === risk.body?.data?.riskLevel);
  }
  const hotspots = await call("GET", "/api/map/hotspots?eps=200&minSamples=4", { token: state.admin });
  expect("GET /api/map/hotspots returns clusters and noise ids", hotspots.status === 200 && Array.isArray(hotspots.body?.data?.clusters) && Array.isArray(hotspots.body.data.noiseIds) && hotspots.body?.meta?.algorithm?.startsWith("DBSCAN"), `status ${hotspots.status} ${JSON.stringify(hotspots.body?.error ?? "")}`);
  if (hotspots.status === 200) console.log(`        clusters: ${hotspots.body.data.clusters.length}, noise: ${hotspots.body.data.noiseIds.length}, points: ${hotspots.body.data.totalPoints}`);
  const dist = await call("GET", "/api/ml/risk/distribution", { token: state.admin });
  expect("GET /api/ml/risk/distribution counts levels", dist.status === 200 && typeof dist.body?.data?.byLevel?.NONE === "number");
  const citizenMl = await call("GET", "/api/ml/model-info", { token: state.citizen });
  expect("citizen cannot access ML routes (403)", citizenMl.status === 403);
});

await step("6. Cleanup", async () => {
  if (state.admin && state.incidentId) {
    const del = await call("DELETE", `/api/incidents/${state.incidentId}`, { token: state.admin });
    expect("admin deletes the e2e incident", del.status === 200);
    if (state.imageUrl) {
      const gone = await call("GET", state.imageUrl, { raw: true });
      expect("deleted incident's image is removed", gone.status === 404);
    }
  }
  if (state.admin && state.citizenId) {
    const off = await call("PATCH", `/api/users/${state.citizenId}`, { token: state.admin, json: { isActive: false } });
    expect("admin deactivates the e2e citizen", off.status === 200 && off.body?.data?.isActive === false);
    const blocked = await call("GET", "/api/auth/me", { token: state.citizen });
    expect("deactivated account is rejected immediately (401)", blocked.status === 401);
  }
});

const passed = results.filter((r) => r.ok === true).length;
const skipped = results.filter((r) => r.ok === null).length;
console.log(`\n${passed} passed, ${failures} failed, ${skipped} skipped`);
process.exit(failures ? 1 : 0);
