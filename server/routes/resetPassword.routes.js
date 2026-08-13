import bcrypt from "bcryptjs";
import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { clearAuthCookie } from "../utils/authCookie.js";

const router = Router();

// Admin resets a student's password back to their student ID.
router.post("/students/:studentId/reset-password", requireLogin, requireRole("admin"), async (request, response, next) => {
    try {
        const studentId = request.params.studentId.toUpperCase();
        const database = getDatabase();
        const student = await database.student.findUnique({
            where: { id: studentId },
            select: { id: true },
        });

        if (!student) {
            response.status(404).json({ message: "Student not found." });
            return;
        }

        await database.student.update({
            where: { id: student.id },
            data: {
                passwordHash: await bcrypt.hash(studentId, 10),
                sessionVersion: { increment: 1 },
            },
        });

        response.json({ message: "Password reset successfully." });
    } catch (error) {
        next(error);
    }
});

// Student changes their own password.
router.post("/students/:studentId/change-password", requireLogin, async (request, response, next) => {
    try {
        const studentId = request.params.studentId.toUpperCase();
        const currentPassword = request.body.currentPassword;
        const newPassword = request.body.newPassword;

        if (request.user.role !== "student" || request.user.username.toUpperCase() !== studentId) {
            response.status(403).json({ message: "You can only change your own password." });
            return;
        }

        if (!currentPassword || !newPassword || newPassword.length < 6) {
            response.status(400).json({ message: "The new password must contain at least 6 characters." });
            return;
        }

        const database = getDatabase();
        const student = await database.student.findUnique({
            where: { id: studentId },
        });

        if (!student || !(await bcrypt.compare(currentPassword, student.passwordHash))) {
            response.status(400).json({ message: "The current password is incorrect." });
            return;
        }

        if (currentPassword === newPassword) {
            response.status(400).json({ message: "Choose a password different from your current password." });
            return;
        }

        await database.student.update({
            where: { id: student.id },
            data: {
                passwordHash: await bcrypt.hash(newPassword, 10),
                sessionVersion: { increment: 1 },
            },
        });

        clearAuthCookie(response);
        response.json({ message: "Password updated. Please log in again." });
    } catch (error) {
        next(error);
    }
});

// Admin changes their own password.
router.patch("/admins/me/password", requireLogin, requireRole("admin"), async (request, response, next) => {
    try {
        const currentPassword = request.body.currentPassword;
        const newPassword = request.body.newPassword;

        if (!currentPassword || !newPassword) {
            response.status(400).json({ message: "Current and new password are required." });
            return;
        }

        if (newPassword.length < 8) {
            response.status(400).json({ message: "New password must contain at least 8 characters." });
            return;
        }

        const database = getDatabase();
        const admin = await database.admin.findUnique({ where: { id: request.user.id } });

        if (!admin) {
            response.status(404).json({ message: "Administrator account not found." });
            return;
        }

        const currentPasswordIsCorrect = await bcrypt.compare(currentPassword, admin.passwordHash);

        if (!currentPasswordIsCorrect) {
            response.status(401).json({ message: "Current password is incorrect." });
            return;
        }

        await database.admin.update({
            where: { id: admin.id },
            data: { passwordHash: await bcrypt.hash(newPassword, 10) },
        });

        response.json({ message: "Password updated successfully." });
    } catch (error) {
        next(error);
    }
});

export default router;
