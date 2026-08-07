import bcrypt from "bcryptjs";
import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireLogin, requireRole("admin"));

function publicAdmin(admin) {
    return {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        createdAt: admin.createdAt,
    };
}

router.post("/", async (request, response, next) => {
    try {
        const email = request.body.email?.trim().toLowerCase();
        const username = request.body.username?.trim();
        const password = request.body.password;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            response.status(400).json({ message: "A valid email address is required." });
            return;
        }

        if (!username || !/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
            response.status(400).json({ message: "Username must contain 3 to 30 letters, numbers, dots, dashes, or underscores." });
            return;
        }

        if (!password || password.length < 8) {
            response.status(400).json({ message: "Password must contain at least 8 characters." });
            return;
        }

        const database = getDatabase();
        const existingAdmin = await database.admin.findFirst({
            where: {
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

        const admin = await database.admin.create({
            data: {
                email,
                username,
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
