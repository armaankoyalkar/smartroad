import { z } from "zod";

/**
 * Environment configuration.
 *
 * Every value the backend needs comes from process.env, validated once at
 * start-up. A missing or malformed variable stops the process with a readable
 * message instead of failing later in a request.
 */

const booleanish = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

/** jsonwebtoken accepts "24h", "7d", "900s" or a number of seconds. */
const JWT_DURATION = /^\d+(ms|s|m|h|d|w|y)?$/i;

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: positiveInt(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().regex(JWT_DURATION, 'JWT_EXPIRES_IN must look like "24h", "7d" or "3600"').default("24h"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  CORS_ORIGIN: csv.transform((list) => (list.length ? list : ["http://localhost:5173"])),
  FRONTEND_URL: z.url().optional(),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(25).default(5),
  ML_SERVICE_URL: z.url().default("http://127.0.0.1:8000"),
  ML_SERVICE_API_KEY: z.string().default(""),
  ML_TIMEOUT_MS: positiveInt(8000),
  ANALYTICS_TIMEZONE: z
    .string()
    .default("Asia/Kolkata")
    .refine(isValidTimeZone, "ANALYTICS_TIMEZONE must be an IANA time zone name such as Asia/Kolkata"),
  SEED_ADMIN_NAME: z.string().default("SmartRoad Admin"),
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_DEMO_PASSWORD: z.string().default("demo-citizen-password"),
  MAP_CENTER_LAT: z.coerce.number().min(-90).max(90).default(17.385),
  MAP_CENTER_LNG: z.coerce.number().min(-180).max(180).default(78.4867),
  MAP_ZOOM: z.coerce.number().int().min(1).max(19).default(12),
  TRUST_PROXY: booleanish,
  RATE_LIMIT_AUTH_MAX: positiveInt(10),
  RATE_LIMIT_AUTH_WINDOW_MIN: positiveInt(15),
  RATE_LIMIT_GLOBAL_MAX: positiveInt(300),
  RATE_LIMIT_GLOBAL_WINDOW_MIN: positiveInt(15),
  RATE_LIMIT_REPORTS_PER_HOUR: positiveInt(20),
  LOG_FORMAT: z.enum(["dev", "combined", "none"]).default("dev"),
});

export type Env = Readonly<
  z.output<typeof envSchema> & {
    isProduction: boolean;
    isTest: boolean;
    maxUploadBytes: number;
  }
>;

/**
 * Parse a raw environment object. Exported separately so tests can check the
 * rules without touching process.env.
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  const env = result.data;
  return Object.freeze({
    ...env,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    maxUploadBytes: Math.round(env.MAX_UPLOAD_MB * 1024 * 1024),
  });
}

export const env: Env = parseEnv(process.env);
