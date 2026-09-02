import { connectDb, disconnectDb } from "../../config/db.js";
import { env } from "../../config/env.js";

/**
 * Run a script body with an open database connection and exit with a
 * meaningful code. Keeps the individual scripts down to their own logic.
 */
export async function withDb(body) {
  try {
    await connectDb(env.MONGODB_URI);
    await body();
    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error(`\nScript failed: ${err.message}`);
    if (!env.isProduction && err.stack) console.error(err.stack);
    await disconnectDb().catch(() => {});
    process.exit(1);
  }
}

/** Minimal "--flag value" / "--flag" parser for the scripts. */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}
