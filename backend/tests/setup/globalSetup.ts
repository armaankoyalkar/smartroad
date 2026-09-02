import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import type { TestProject } from "vitest/node";

/**
 * Finds one MongoDB for the integration tests and shares its URI with the
 * test files through provide()/inject(). Order:
 *
 * 1. MONGODB_TEST_URI when set (a local MongoDB, for example).
 * 2. mongodb://127.0.0.1:27017 when something answers there within 2 s.
 * 3. mongodb-memory-server, which downloads a MongoDB binary on first use
 *    (about 100 MB, cached under ~/.cache/mongodb-binaries).
 * 4. Otherwise the integration tests are skipped with a warning, unless
 *    SMARTROAD_REQUIRE_DB=1, in which case the run fails. Use that flag in CI.
 */

const LOCAL_URI = "mongodb://127.0.0.1:27017";

async function answers(uri: string): Promise<boolean> {
  const conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 2000, connectTimeoutMS: 2000 });
  try {
    await conn.asPromise();
    return true;
  } catch {
    return false;
  } finally {
    await conn.close().catch(() => undefined);
  }
}

export default async function globalSetup(project: TestProject): Promise<() => Promise<void>> {
  let memoryServer: { stop(): Promise<boolean> } | null = null;
  let uri = process.env.MONGODB_TEST_URI || null;
  let reason = "";

  if (!uri && (await answers(LOCAL_URI))) {
    uri = LOCAL_URI;
  }

  if (!uri) {
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const started = await MongoMemoryServer.create();
      uri = started.getUri();
      memoryServer = started;
    } catch (err) {
      reason = err instanceof Error ? (err.message.split("\n")[0] ?? "") : String(err);
    }
  }

  if (!uri) {
    if (process.env.SMARTROAD_REQUIRE_DB === "1") {
      throw new Error(`Integration tests need a database but none is available: ${reason}`);
    }
    console.warn(`\n[tests] No MongoDB available, integration tests will be SKIPPED: ${reason}\n`);
  }

  project.provide("mongoUri", uri);

  return async () => {
    if (memoryServer) await memoryServer.stop();
    // Same path as tests/setup/env.ts (that file runs in the workers, this one in the main process).
    await rm(path.join(os.tmpdir(), "smartroad-backend-test-uploads"), { recursive: true, force: true });
  };
}
