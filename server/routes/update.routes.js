import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { assertAdminIdentityAvailable, assertValidAdminProfile, publicAdmin } from "../services/admin.service.js";

const router = Router();

// Admin updates their own profile details. Student profile-detail updates can be added here later.
router.patch("/admins/me", requireLogin, requireRole("admin"), async (request, response, next) => {
    try {
        const fullName = request.body.fullName?.trim();
        const email = request.body.email?.trim().toLowerCase();
        const username = request.body.username?.trim();
        const phoneNumber = request.body.phoneNumber?.trim() || null;

        assertValidAdminProfile({ fullName, email, username });

        const database = getDatabase();
        await assertAdminIdentityAvailable(database, { email, username, excludeAdminId: request.user.id });

        const admin = await database.admin.update({
            where: { id: request.user.id },
            data: { fullName, email, username, phoneNumber },
        });

        response.json({
            message: "Profile updated successfully.",
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
