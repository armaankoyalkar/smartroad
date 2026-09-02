import { User } from "../models/User.js";
import { parseArgs, stringArg, withDb } from "./lib/withDb.js";

/**
 * Deactivate (or reactivate) an account without deleting it, so its incidents
 * keep a valid reporter:
 *   npm run deactivate-user -- --email someone@example.com
 *   npm run deactivate-user -- --email someone@example.com --reactivate
 */
const args = parseArgs(process.argv.slice(2));
const email = stringArg(args, "email");

if (!email) {
  console.error("Usage: npm run deactivate-user -- --email <email> [--reactivate]");
  process.exit(2);
}

await withDb(async () => {
  const isActive = Boolean(args.reactivate);
  const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { $set: { isActive } }, { returnDocument: "after" });
  if (!user) throw new Error(`No account with email ${email}`);
  console.log(`${user.email} is now ${isActive ? "active" : "deactivated"}.`);
});
