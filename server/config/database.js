import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

let database;

export function getDatabase() {
    if (!database) {
        const adapter = new PrismaPg({
            connectionString: env.DATABASE_URL,
            max: env.DATABASE_POOL_MAX,
            idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT_MS,
            ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
        });

        database = new PrismaClient({ adapter });
    }

    return database;
}
