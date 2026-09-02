import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { env } from "./config/env.js";

async function main() {
  try {
    await connectDb(env.MONGODB_URI);
    console.log(`MongoDB connected (${env.NODE_ENV})`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Check MONGODB_URI in .env and that the server is running.");
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`SmartRoad API listening on http://localhost:${env.PORT}/api`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
