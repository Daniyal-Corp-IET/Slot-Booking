import bcrypt from "bcryptjs";
import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { getPolicy } from "../services/policy.service.js";
import { notifyStudentsChanged } from "../services/socket.service.js";
import { lockCourse } from "../services/databaseLocks.js";
import { getLabMonthRange } from "../utils/time.js";

const router = Router();

function getMonthRange() {
    return getLabMonthRange(new Date());
}

function parseProgramMonth(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")) return null;
    return new Date(`${value}-01T00:00:00.000Z`);
}

function programDuration(start, end) {
    return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1;
}

async function getNextStudentId(database, course) {
    const courseStudents = await database.student.findMany({
        where: { courseId: course.id },
        select: { id: true },
    });
    let highestNumber = 0;
    for (const student of courseStudents) {
        const number = Number(student.id.split("-").at(-1));
        if (!Number.isNaN(number)) highestNumber = Math.max(highestNumber, number);
    }

    return `${course.abbreviation}-${String(highestNumber + 1).padStart(4, "0")}`;
}

function publicStudent(student) {
    let monthlyUsedMinutes = 0;
    for (const booking of student.bookings || []) {
        monthlyUsedMinutes += booking.usedMinutes ?? booking.bookedMinutes;
    }

    return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        programStart: student.programStart,
        programEnd: student.programEnd,
        email: student.email,
        phoneNumber: student.phoneNumber,
        monthlyLimitMinutes: student.monthlyLimitMinutes,
        monthlyUsedMinutes,
        course: student.course,
        createdAt: student.createdAt,
    };
}

function studentQuery() {
    const { start, end } = getMonthRange();

    return {
        course: true,
        bookings: {
            where: {
                status: "COMPLETED",
                startsAt: { gte: start, lt: end },
            },
            select: { bookedMinutes: true, usedMinutes: true },
        },
    };
}

// Admin student list.
router.get("/", requireLogin, requireRole("admin"), async (request, response, next) => {
    try {
        const database = getDatabase();
        const students = await database.student.findMany({
            include: studentQuery(),
            orderBy: { createdAt: "desc" },
        });

        const publicStudents = [];
        for (const student of students) publicStudents.push(publicStudent(student));
        response.json({ students: publicStudents });
    } catch (error) {
        next(error);
    }
});

router.get("/next-id", requireLogin, requireRole("admin"), async (request, response, next) => {
    try {
        const courseId = Number(request.query.courseId);

        if (!courseId) {
            response.status(400).json({ message: "Select a course to generate the student ID." });
            return;
        }

        const database = getDatabase();
        const course = await database.course.findUnique({ where: { id: courseId } });

        if (!course) {
            response.status(404).json({ message: "The selected course does not exist." });
            return;
        }

        response.json({ studentId: await getNextStudentId(database, course) });
    } catch (error) {
        next(error);
    }
});

router.get("/:studentId", requireLogin, async (request, response, next) => {
    try {
        const studentId = request.params.studentId.toUpperCase();

        if (request.user.role !== "admin" && request.user.id.toUpperCase() !== studentId) {
            response.status(403).json({ message: "You can only view your own student profile." });
            return;
        }

        const database = getDatabase();
        const student = await database.student.findUnique({
            where: { id: studentId },
            include: studentQuery(),
        });

        if (!student) {
            response.status(404).json({ message: "Student not found." });
            return;
        }

        response.json({ student: publicStudent(student) });
    } catch (error) {
        next(error);
    }
});

// Create a student and use the generated student ID as the first password.
router.post("/", requireLogin, requireRole("admin"), async (request, response, next) => {
    try {
        const firstName = request.body.firstName?.trim();
        const lastName = request.body.lastName?.trim();
        const email = request.body.email?.trim().toLowerCase();
        const phoneNumber = request.body.phoneNumber?.trim() || null;
        const courseId = Number(request.body.courseId);
        const programStart = parseProgramMonth(request.body.programStart);
        const programEnd = parseProgramMonth(request.body.programEnd);

        if (!firstName || !lastName) {
            response.status(400).json({ message: "First name and last name are required." });
            return;
        }

        if (!courseId) {
            response.status(400).json({ message: "Course is required." });
            return;
        }

        if (!programStart || !programEnd) {
            response.status(400).json({ message: "Program start and end months are required." });
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            response.status(400).json({ message: "A valid email address is required." });
            return;
        }

        const durationInMonths = programDuration(programStart, programEnd);
        if (durationInMonths < 2 || durationInMonths > 9) {
            response.status(400).json({ message: "Program duration must be between 2 and 9 months." });
            return;
        }

        const database = getDatabase();
        const student = await database.$transaction(
            async (transaction) => {
                await lockCourse(transaction, courseId);
                const course = await transaction.course.findUnique({ where: { id: courseId } });

                if (!course) {
                    const error = new Error("The selected course does not exist.");
                    error.status = 404;
                    throw error;
                }

                const studentId = await getNextStudentId(transaction, course);
                const policy = await getPolicy(transaction);
                return transaction.student.create({
                    data: {
                        id: studentId,
                        firstName,
                        lastName,
                        email,
                        phoneNumber,
                        passwordHash: await bcrypt.hash(studentId, 10),
                        programStart,
                        programEnd,
                        monthlyLimitMinutes: policy.monthlyLimitMinutes,
                        courseId,
                    },
                    include: { course: true, bookings: true },
                });
            },
            { isolationLevel: "Serializable" },
        );

        notifyStudentsChanged();
        response.status(201).json({
            message: "Student added successfully.",
            initialPassword: student.id,
            student: publicStudent(student),
        });
    } catch (error) {
        if (error.code === "P2002") {
            response.status(409).json({ message: "This email address is already registered." });
            return;
        }
        next(error);
    }
});

export default router;
