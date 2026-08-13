import "dotenv/config";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from the .env file.");
}

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from the .env file.");
}

const nodeEnvironment = process.env.NODE_ENV || "development";

if (nodeEnvironment === "production" && process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production.");
}

const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const env = {
    NODE_ENV: nodeEnvironment,
    PORT: Number(process.env.PORT) || 5000,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    LAB_TIME_ZONE: process.env.LAB_TIME_ZONE || "Asia/Kolkata",
    trustProxy: process.env.TRUST_PROXY === "true",
    databaseSsl: process.env.DATABASE_SSL === "true",
    DATABASE_POOL_MAX: Number(process.env.DATABASE_POOL_MAX) || 10,
    DATABASE_IDLE_TIMEOUT_MS: Number(process.env.DATABASE_IDLE_TIMEOUT_MS) || 30000,
    corsAllowedOrigins,
};
