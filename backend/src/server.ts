import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { ensureUploadDir, UPLOAD_ROOT } from "./lib/storage.js";

async function main(): Promise<void> {
  try {
    await connectDb(env.MONGODB_URI);
    console.log(`MongoDB connected (${env.NODE_ENV})`);
  } catch (err) {
    console.error("MongoDB connection failed:", err instanceof Error ? err.message : err);
    console.error("Check MONGODB_URI in .env and that the server is running.");
    process.exit(1);
  }

  try {
    await ensureUploadDir();
  } catch (err) {
    console.error(`Cannot create the upload directory ${UPLOAD_ROOT}:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.API_PORT, () => {
    console.log(`SmartRoad API listening on http://localhost:${env.API_PORT}/api`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down`);
    server.close(() => {
      disconnectDb()
        .catch(() => undefined)
        .finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void main();
