/**
 * Test environment. Runs before every test file, before any application
 * module is imported, so src/config/env.js sees a complete configuration.
 */
process.env.NODE_ENV = "test";
process.env.PORT = process.env.PORT || "5001";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartroad-test-placeholder";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-test-secret-test-secret-1234567890";
process.env.JWT_EXPIRES_IN = "1h";
process.env.BCRYPT_ROUNDS = "4";
process.env.CORS_ORIGIN = "http://localhost:5173,http://example.test";
process.env.ML_SERVICE_URL = "http://127.0.0.1:65530";
process.env.ML_TIMEOUT_MS = "300";
process.env.LOG_FORMAT = "none";
process.env.RATE_LIMIT_GLOBAL_MAX = "100000";
process.env.RATE_LIMIT_AUTH_MAX = "100000";
process.env.RATE_LIMIT_REPORTS_PER_HOUR = "100000";
process.env.SEED_ADMIN_EMAIL = "admin@test.local";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
