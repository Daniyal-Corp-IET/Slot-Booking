import { Router } from "express";
import { getDatabase } from "../config/database.js";

const router = Router();

router.get("/live", (request, response) => {
    response.json({ status: "ok" });
});

router.get("/ready", async (request, response, next) => {
    try {
        await getDatabase().$queryRaw`SELECT 1`;
        response.json({ status: "ready", database: "connected" });
    } catch (error) {
        next(error);
    }
});

router.get("/", async (request, response, next) => {
    try {
        await getDatabase().$queryRaw`SELECT 1`;
        response.json({ message: "Server and database are running." });
    } catch (error) {
        next(error);
    }
});

export default router;
