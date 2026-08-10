import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";

const router = Router();

function publicAdmin(admin) {
    return {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        username: admin.username,
        phoneNumber: admin.phoneNumber,
        createdAt: admin.createdAt,
    };
}

// Admin updates their own profile details. Student profile-detail updates can be added here later.
router.patch("/admins/me", requireLogin, requireRole("admin"), async (request, response, next) => {
    try {
        const fullName = request.body.fullName?.trim();
        const email = request.body.email?.trim().toLowerCase();
        const username = request.body.username?.trim();
        const phoneNumber = request.body.phoneNumber?.trim() || null;

        if (!fullName) {
            response.status(400).json({ message: "Full name is required." });
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            response.status(400).json({ message: "A valid email address is required." });
            return;
        }

        if (!username || !/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
            response.status(400).json({ message: "Username must contain 3 to 30 letters, numbers, dots, dashes, or underscores." });
            return;
        }

        const database = getDatabase();
        const existingAdmin = await database.admin.findFirst({
            where: {
                id: { not: request.user.id },
                OR: [{ email: { equals: email, mode: "insensitive" } }, { username: { equals: username, mode: "insensitive" } }],
            },
        });
        const studentWithSameId = await database.student.findFirst({
            where: { id: { equals: username, mode: "insensitive" } },
            select: { id: true },
        });

        if (existingAdmin || studentWithSameId) {
            if (studentWithSameId) {
                response.status(409).json({ message: "This username is already used as a student ID." });
                return;
            }
            let field = "username";
            if (existingAdmin.email?.toLowerCase() === email) field = "email";
            response.status(409).json({ message: `This ${field} is already registered.` });
            return;
        }

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
