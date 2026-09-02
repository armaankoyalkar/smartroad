import mongoose from "mongoose";
import { inject } from "vitest";
import { connectDb, disconnectDb } from "../../src/config/db.js";

/**
 * Helpers for integration tests. Each test file gets its own database name
 * so files can run in parallel against the shared server.
 */
export function mongoUri() {
  return inject("mongoUri");
}

export async function connectTestDb(name) {
  const base = mongoUri();
  if (!base) throw new Error("No test database available");
  const dbName = `smartroad_test_${name}_${process.pid}`;
  await connectDb(base, { dbName });
  await mongoose.connection.db.dropDatabase();
  // Indexes (unique email, 2dsphere) are created explicitly so tests do not
  // depend on autoIndex timing.
  for (const model of Object.values(mongoose.models)) {
    await model.syncIndexes();
  }
}

export async function clearCollections() {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
}

export async function closeTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db.dropDatabase();
  }
  await disconnectDb();
}
