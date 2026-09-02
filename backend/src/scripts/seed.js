import { env } from "../config/env.js";
import { Incident } from "../models/Incident.js";
import { clearSeedIncidents, insertRandomIncidents, seedAdmin, seedDemoCitizens } from "./lib/seedData.js";
import { parseArgs, withDb } from "./lib/withDb.js";

/**
 * Seed script (docs/03-database-schema.md section 7).
 *
 *   npm run seed              admin + demo citizens; replaces seed incidents
 *   npm run seed -- --load 1000   additionally generate 1000 random incidents
 *   npm run seed:clear        remove every seed incident, keep accounts
 *
 * The curated Hyderabad demo incidents are added in Phase 4.
 */
const args = parseArgs(process.argv.slice(2));

await withDb(async () => {
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

  const citizens = await seedDemoCitizens(env.SEED_DEMO_PASSWORD);
  console.log(`Demo citizens ready: ${citizens.map((c) => c.email).join(", ")}`);

  const removed = await clearSeedIncidents();
  if (removed) console.log(`Removed ${removed} previous seed incidents.`);

  if (args.load) {
    const count = Number.parseInt(args.load, 10);
    if (!Number.isInteger(count) || count < 1 || count > 20000) {
      throw new Error("--load expects a number between 1 and 20000");
    }
    const inserted = await insertRandomIncidents(
      count,
      citizens.map((c) => c._id),
      { adminId: admin._id },
    );
    console.log(`Inserted ${inserted} generated incidents (source: seed).`);
  }

  const total = await Incident.countDocuments();
  const seeded = await Incident.countDocuments({ source: "seed" });
  console.log(`Incidents in database: ${total} (${seeded} seed, ${total - seeded} user-reported).`);
});
