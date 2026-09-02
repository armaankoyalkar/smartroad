import mongoose, { type ConnectOptions } from "mongoose";

mongoose.set("strictQuery", true);

export type ServiceState = "up" | "down";

export interface DbCheck {
  status: ServiceState;
  latencyMs: number | null;
  error: string | null;
}

/**
 * Connect to MongoDB. Resolves once the connection is open; rejects with the
 * driver error if the server cannot be reached within the selection timeout.
 */
export async function connectDb(uri: string, options: ConnectOptions = {}): Promise<mongoose.Connection> {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: true,
    ...options,
  });
  return mongoose.connection;
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/** "up" when the connection is open, "down" otherwise. */
export function dbState(): ServiceState {
  return mongoose.connection.readyState === 1 ? "up" : "down";
}

/**
 * Round-trip check used by GET /api/health. Never throws: a failed ping is
 * reported as "down" with the error message.
 */
export async function pingDb(): Promise<DbCheck> {
  const started = Date.now();
  const db = mongoose.connection.db;
  if (dbState() !== "up" || !db) {
    return { status: "down", latencyMs: null, error: "not connected" };
  }
  try {
    await db.admin().command({ ping: 1 });
    return { status: "up", latencyMs: Date.now() - started, error: null };
  } catch (err) {
    return { status: "down", latencyMs: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
  }
}
