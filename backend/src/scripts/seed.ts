import { env } from "../config/env.js";
import { Incident } from "../models/Incident.js";
import { clearSeedIncidents, insertRandomIncidents, seedAdmin, seedDemoCitizens } from "./lib/seedData.js";
import { insertCuratedIncidents } from "./lib/seedIncidents.js";
import { parseArgs, stringArg, withDb } from "./lib/withDb.js";

/**
 * Seed script.
 *
 *   npm run seed                  admin + demo citizens + the curated demo set (replaces seed incidents)
 *   npm run seed -- --load 1000   additionally generate 1000 random incidents for performance checks
 *   npm run seed:clear            remove every seed incident, keep accounts
 *
 * Everything inserted here is marked source: "seed" (demo data). The script
 * is idempotent: seed incidents are removed and re-inserted on every run;
 * user-reported incidents are never touched.
 */
const args = parseArgs(process.argv.slice(2));

await withDb(async () => {
  if (env.isProduction && !args.force) {
    throw new Error("Refusing to seed demo data with NODE_ENV=production. Pass --force if you really mean it.");
  }
  if (args.clear) {
    const removed = await clearSeedIncidents();
    console.log(`Removed ${removed} seed incidents.`);
    return;
  }

  const admin = await seedAdmin({
    name: env.SEED_ADMIN_NAME,
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
  });
  console.log(`Admin ready: ${admin.email}`);

  if (!env.SEED_DEMO_PASSWORD) {
    throw new Error("SEED_DEMO_PASSWORD must be set in .env (at least 8 characters) to create the demo citizens.");
  }
  const citizens = await seedDemoCitizens(env.SEED_DEMO_PASSWORD);
  console.log(`Demo citizens ready: ${citizens.map((c) => c.email).join(", ")}`);

  const removed = await clearSeedIncidents();
  if (removed) console.log(`Removed ${removed} previous seed incidents.`);

  const reporterIds = citizens.map((c) => c._id);
  const curated = await insertCuratedIncidents(reporterIds, { adminId: admin._id });
  console.log(`Inserted ${curated} curated demo incidents (source: seed).`);

  const load = stringArg(args, "load");
  if (load !== undefined || args.load === true) {
    const count = Number.parseInt(load ?? "", 10);
    if (!Number.isInteger(count) || count < 1 || count > 20000) {
      throw new Error("--load expects a number between 1 and 20000");
    }
    const inserted = await insertRandomIncidents(count, reporterIds, { adminId: admin._id });
    console.log(`Inserted ${inserted} generated incidents (source: seed).`);
  }

  const total = await Incident.countDocuments();
  const seeded = await Incident.countDocuments({ source: "seed" });
  console.log(`Incidents in database: ${total} (${seeded} seed, ${total - seeded} user-reported).`);
});
