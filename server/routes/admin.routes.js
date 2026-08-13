import bcrypt from "bcryptjs";
import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { assertAdminIdentityAvailable, assertValidAdminProfile, publicAdmin } from "../services/admin.service.js";
import { stop } from "../utils/httpError.js";

const router = Router();

router.use(requireLogin, requireRole("admin"));

router.post("/", async (request, response, next) => {
    try {
        const fullName = request.body.fullName?.trim();
        const email = request.body.email?.trim().toLowerCase();
        const username = request.body.username?.trim();
        const phoneNumber = request.body.phoneNumber?.trim() || null;
        const password = request.body.password;

        assertValidAdminProfile({ fullName, email, username });
        if (!password || password.length < 8) stop(400, "Password must contain at least 8 characters.");

        const database = getDatabase();
        await assertAdminIdentityAvailable(database, { email, username });

        const admin = await database.admin.create({
            data: {
                fullName,
                email,
                username,
                phoneNumber,
                passwordHash: await bcrypt.hash(password, 10),
            },
        });

        response.status(201).json({
            message: "Administrator added successfully.",
            admin: publicAdmin(admin),
        });
    } catch (error) {
        if (error.code === "P2002") {
            response.status(409).json({ message: "This email or username is already registered." });
            return;
        }
        next(error);
    }
});

export default router;
