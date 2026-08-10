import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { notifyCoursesChanged } from "../services/socket.service.js";

const router = Router();

router.get("/", requireLogin, async (request, response, next) => {
    try {
        const database = getDatabase();
        const courses = await database.course.findMany({
            orderBy: { name: "asc" },
        });

        response.json({ courses });
    } catch (error) {
        next(error);
    }
});

router.post("/", requireLogin, requireRole("admin"), async (request, response, next) => {
    try {
        const name = request.body.name?.trim();
        const abbreviation = request.body.abbreviation?.trim().toUpperCase();

        if (!name) {
            response.status(400).json({ message: "Course name is required." });
            return;
        }

        if (!/^[A-Z0-9]{2,6}$/.test(abbreviation || "")) {
            response.status(400).json({
                message: "Use 2 to 6 letters or numbers for the abbreviation.",
            });
            return;
        }

        const database = getDatabase();
        const existingCourse = await database.course.findFirst({
            where: {
                OR: [{ name: { equals: name, mode: "insensitive" } }, { abbreviation }],
            },
        });

        if (existingCourse) {
            response.status(409).json({
                message: "This course name or abbreviation already exists.",
            });
            return;
        }

        const course = await database.course.create({
            data: { name, abbreviation },
        });

        notifyCoursesChanged();
        response.status(201).json({
            message: "Course added successfully.",
            course,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
