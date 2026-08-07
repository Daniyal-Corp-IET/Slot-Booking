import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer } from "node:http";
import { getDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { disconnectSocketClients, initializeSocket } from "./config/socket.js";
import { handleError, notFound } from "./middleware/errorHandler.js";
import { requireSameOrigin } from "./middleware/sameOrigin.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import courseRoutes from "./routes/course.routes.js";
import healthRoutes from "./routes/health.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import studentRoutes from "./routes/student.routes.js";
import systemRoutes from "./routes/system.routes.js";
import { refreshBookingStatuses } from "./services/booking.service.js";
import { notifyBookingsChanged } from "./services/socket.service.js";

const app = express();
let database;
let server;
let bookingStatusTimer;
let isStopping = false;

app.disable("x-powered-by");
if (env.trustProxy) app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use(requireSameOrigin);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 26,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/health", healthRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/systems", systemRoutes);

app.use(notFound);
app.use(handleError);

async function updateBookingStatuses() {
    try {
        const changedCount = await refreshBookingStatuses(database);
        if (changedCount) notifyBookingsChanged();
    } catch (error) {
        console.error("Could not refresh booking statuses:", error.message);
    }
}

async function startServer() {
    database = getDatabase();
    await database.$connect();
    await database.$queryRaw`SELECT 1`;
    console.log("Connected to PostgreSQL successfully.");

    await updateBookingStatuses();
    bookingStatusTimer = setInterval(updateBookingStatuses, 30_000);

    server = createServer(app);
    initializeSocket(server);

    await new Promise((resolve, reject) => {
        server.listen(env.PORT, resolve);
        server.once("error", reject);
    });

    console.log(`Server running on port ${env.PORT}.`);
}

async function stopServer(signal) {
    if (isStopping) return;
    isStopping = true;
    console.log(`${signal} received. Closing the server...`);
    clearInterval(bookingStatusTimer);
    disconnectSocketClients();

    const forceExit = setTimeout(() => {
        console.error("The server took too long to close.");
        process.exit(1);
    }, 10_000);
    forceExit.unref();

    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    if (database) await database.$disconnect();
    clearTimeout(forceExit);
    process.exit(0);
}

process.on("SIGINT", () => stopServer("SIGINT"));
process.on("SIGTERM", () => stopServer("SIGTERM"));

startServer().catch(async (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${env.PORT} is already in use.`);
    } else {
        console.error("Server could not start:", error.message);
    }
    if (database) await database.$disconnect();
    process.exit(1);
});
