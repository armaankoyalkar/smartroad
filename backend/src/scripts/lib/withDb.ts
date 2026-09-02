import { connectDb, disconnectDb } from "../../config/db.js";
import { env } from "../../config/env.js";

/**
 * Run a script body with an open database connection and exit with a
 * meaningful code. Keeps the individual scripts down to their own logic.
 */
export async function withDb(body: () => Promise<void>): Promise<never> {
  try {
    await connectDb(env.MONGODB_URI);
    await body();
    await disconnectDb();
    process.exit(0);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`\nScript failed: ${error.message}`);
    if (!env.isProduction && error.stack) console.error(error.stack);
    await disconnectDb().catch(() => undefined);
    process.exit(1);
  }
}

export interface ParsedArgs {
  _: string[];
  [flag: string]: string | boolean | string[] | undefined;
}

/** Minimal "--flag value" / "--flag" parser for the scripts. */
export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
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

/** Read a flag as a string (true-only flags and missing flags give undefined). */
export function stringArg(args: ParsedArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}
