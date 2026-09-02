/**
 * Starts one MongoDB for the integration tests and shares its URI with the
 * test files through provide()/inject().
 *
 * - MONGODB_TEST_URI set: use that server (for example a local MongoDB).
 * - otherwise: start mongodb-memory-server, which downloads a MongoDB binary
 *   on first use (about 100 MB, cached under ~/.cache/mongodb-binaries).
 * - if neither works: integration tests are skipped with a warning, unless
 *   SMARTROAD_REQUIRE_DB=1, in which case the run fails. Use that flag in CI.
 */
export default async function globalSetup({ provide }) {
  let mongo = null;
  let uri = process.env.MONGODB_TEST_URI || null;

  if (!uri) {
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      mongo = await MongoMemoryServer.create();
      uri = mongo.getUri();
    } catch (err) {
      const reason = err?.message?.split("\n")[0] ?? String(err);
      if (process.env.SMARTROAD_REQUIRE_DB === "1") {
        throw new Error(`Integration tests need a database but none is available: ${reason}`, { cause: err });
      }
      console.warn(`\n[tests] No MongoDB available, integration tests will be SKIPPED: ${reason}\n`);
    }
  }

  provide("mongoUri", uri);

  return async () => {
    if (mongo) await mongo.stop();
  };
}
