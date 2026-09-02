import { seedAdmin } from "./lib/seedData.js";
import { parseArgs, stringArg, withDb } from "./lib/withDb.js";

/**
 * Create an additional administrator:
 *   npm run create-admin -- --email someone@example.com --password "long password" --name "Name"
 * Running it again for the same email resets that account's password and role.
 */
const args = parseArgs(process.argv.slice(2));
const email = stringArg(args, "email");
const password = stringArg(args, "password");

if (!email || !password) {
  console.error('Usage: npm run create-admin -- --email <email> --password <password> [--name "<name>"]');
  process.exit(2);
}

await withDb(async () => {
  const admin = await seedAdmin({
    name: stringArg(args, "name") || "Administrator",
    email,
    password,
  });
  console.log(`Administrator ready: ${admin.email} (${admin.name})`);
});
