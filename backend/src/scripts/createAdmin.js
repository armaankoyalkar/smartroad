import { seedAdmin } from "./lib/seedData.js";
import { parseArgs, withDb } from "./lib/withDb.js";

/**
 * Create an additional administrator (decision D-03):
 *   npm run create-admin -- --email someone@example.com --password "long password" --name "Name"
 * Running it again for the same email resets that account's password and role.
 */
const args = parseArgs(process.argv.slice(2));

if (!args.email || !args.password) {
  console.error('Usage: npm run create-admin -- --email <email> --password <password> [--name "<name>"]');
  process.exit(2);
}

await withDb(async () => {
  const admin = await seedAdmin({
    name: args.name || "Administrator",
    email: String(args.email),
    password: String(args.password),
  });
  console.log(`Administrator ready: ${admin.email} (${admin.name})`);
});
