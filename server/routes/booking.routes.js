import { randomUUID } from "node:crypto";
import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin } from "../middleware/auth.js";
import { refreshBookingStatuses } from "../services/booking.service.js";
import { lockBooking } from "../services/databaseLocks.js";
import { assertSlotWithinSchedule, assertValidBookingDuration, getPolicy } from "../services/policy.service.js";
import { notifyBookingsChanged, notifySessionEndedEarly } from "../services/socket.service.js";
import { stop } from "../utils/httpError.js";
import { getLabDateKey, getLabDayRange, getLabMinutes, getLabMonthRange } from "../utils/time.js";

const router = Router();
router.use(requireLogin);

function createReference(id) {
    return `BK-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

function canViewStudent(booking, viewer) {
    return viewer.role === "admin" || booking.studentId === viewer.id;
}

function publicBooking(booking, viewer) {
    const showStudent = canViewStudent(booking, viewer);
    const date = new Date(booking.startsAt);
    let studentId = null;
    let studentName = null;

    if (showStudent) {
        studentId = booking.studentId;
        studentName = `${booking.student.firstName} ${booking.student.lastName}`;
    }

    return {
        id: booking.id,
        reference: booking.reference,
        studentId,
        studentName,
        systemId: booking.systemId,
        startsAt: date.getTime(),
        endsAt: booking.endsAt.getTime(),
        dateKey: getLabDateKey(date),
        startMinutes: getLabMinutes(date),
        bookedMinutes: booking.bookedMinutes,
        usedMinutes: booking.usedMinutes,
        startedAt: booking.startedAt?.getTime() ?? null,
        endedAt: booking.endedAt?.getTime() ?? null,
        status: booking.status.charAt(0) + booking.status.slice(1).toLowerCase(),
    };
}

function getStudentId(request) {
    if (request.user.role === "student") return request.user.id;
    return request.body.studentId?.trim().toUpperCase();
}

function ownsBooking(booking, user) {
    return user.role === "admin" || booking.studentId === user.id;
}

function totalMinutes(bookings) {
    let minutes = 0;
    for (const booking of bookings) {
        minutes += booking.usedMinutes ?? booking.bookedMinutes;
    }
    return minutes;
}

// --- Booking creation rules -------------------------------------------
// Each function below checks one rule and throws (via `stop`) if it fails.
// Reading them in order tells the full story of what makes a booking valid.
// Duration and schedule rules live in policy.service.js since they're shared
// with system holds.

async function loadStudent(transaction, studentId) {
    const student = await transaction.student.findUnique({ where: { id: studentId } });
    if (!student) stop(404, "Student not found.");
    return student;
}

async function assertSystemIsActive(transaction, systemId) {
    const system = await transaction.system.findFirst({ where: { id: systemId, isActive: true } });
    if (!system) stop(409, "System is not available.");
}

async function assertNoOutage(transaction, systemId, startsAt, endsAt) {
    const outage = await transaction.systemOutage.findFirst({
        where: {
            systemId,
            startsAt: { lt: endsAt },
            OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }],
        },
    });
    if (outage) stop(409, "This system is unavailable during the selected time.");
}

// Students must hold the system (reserved by the availability screen) before
// they can confirm a booking on it. Admins skip this and book directly.
async function consumeBookingHold(transaction, { holdId, studentId, systemId, startsAt, endsAt }) {
    const bookingHold = await transaction.bookingHold.findUnique({ where: { id: holdId } });
    if (!bookingHold) stop(409, "Your system hold has expired. Please select the system again.");

    const matchesRequest =
        bookingHold.studentId === studentId &&
        bookingHold.systemId === systemId &&
        bookingHold.startsAt.getTime() === startsAt.getTime() &&
        bookingHold.endsAt.getTime() === endsAt.getTime();
    if (!matchesRequest) stop(409, "Your selected system does not match this booking.");

    if (bookingHold.expiresAt.getTime() <= Date.now()) {
        stop(409, "Your system hold has expired. Please select the system again.");
    }
    return bookingHold;
}

async function assertNoConflictingHold(transaction, { systemId, startsAt, endsAt, excludeHoldId }) {
    const where = {
        systemId,
        expiresAt: { gt: new Date() },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
    };
    if (excludeHoldId) where.id = { not: excludeHoldId };

    const anotherHold = await transaction.bookingHold.findFirst({ where });
    if (anotherHold) stop(409, "Another student is currently selecting this system.");
}

async function assertWithinDailyLimit(transaction, { studentId, startsAt, bookedMinutes, policy }) {
    const day = getLabDayRange(startsAt);
    const dayBookings = await transaction.booking.findMany({
        where: { studentId, status: { not: "CANCELLED" }, startsAt: { gte: day.start, lt: day.end } },
    });
    if (totalMinutes(dayBookings) + bookedMinutes > policy.dailyLimitMinutes) {
        stop(409, `This booking exceeds the student's ${policy.dailyLimitMinutes / 60}-hour daily limit.`);
    }
}

async function assertWithinMonthlyLimit(transaction, { studentId, startsAt, bookedMinutes, student }) {
    const month = getLabMonthRange(startsAt);
    const monthBookings = await transaction.booking.findMany({
        where: { studentId, status: { not: "CANCELLED" }, startsAt: { gte: month.start, lt: month.end } },
    });
    if (totalMinutes(monthBookings) + bookedMinutes > student.monthlyLimitMinutes) {
        stop(409, "This booking exceeds the student's monthly usage limit.");
    }
}

async function assertSystemNotOverlapping(transaction, systemId, startsAt, endsAt) {
    const overlap = await transaction.booking.findFirst({
        where: {
            systemId,
            status: { not: "CANCELLED" },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
        },
    });
    if (overlap) stop(409, "This system is already booked during the selected time.");
}

// List bookings for the current portal.
router.get("/", async (request, response, next) => {
    try {
        const database = getDatabase();
        await refreshBookingStatuses(database);

        const bookings = await database.booking.findMany({
            include: { student: true },
            orderBy: { startsAt: "desc" },
        });

        const publicBookings = [];
        for (const booking of bookings) {
            publicBookings.push(publicBooking(booking, request.user));
        }
        response.json({ bookings: publicBookings });
    } catch (error) {
        next(error);
    }
});

// Create a booking after checking the student, system and usage limits.
router.post("/", async (request, response, next) => {
    try {
        const studentId = getStudentId(request);
        const systemId = Number(request.body.systemId);
        const bookedMinutes = Number(request.body.bookedMinutes);
        const startsAt = new Date(request.body.startsAt);
        let holdId = "";
        if (typeof request.body.holdId === "string") holdId = request.body.holdId.trim();
        const database = getDatabase();

        if (!studentId || !Number.isInteger(systemId) || systemId < 1 || !Number.isInteger(bookedMinutes) || Number.isNaN(startsAt.getTime())) {
            response.status(400).json({ message: "Provide a valid student, system, start time, and duration." });
            return;
        }
        if (request.user.role === "student" && !holdId) {
            response.status(400).json({ message: "Select an available system before confirming the booking." });
            return;
        }

        const booking = await database.$transaction(
            async (transaction) => {
                await lockBooking(transaction, systemId, studentId);
                const policy = await getPolicy(transaction);

                assertValidBookingDuration(policy, bookedMinutes);

                const startMinutes = getLabMinutes(startsAt);
                const endMinutes = startMinutes + bookedMinutes;
                assertSlotWithinSchedule(policy, startsAt, startMinutes, endMinutes);

                const student = await loadStudent(transaction, studentId);
                await assertSystemIsActive(transaction, systemId);

                const endsAt = new Date(startsAt.getTime() + bookedMinutes * 60_000);
                await assertNoOutage(transaction, systemId, startsAt, endsAt);

                let bookingHold = null;
                if (request.user.role === "student") {
                    bookingHold = await consumeBookingHold(transaction, { holdId, studentId, systemId, startsAt, endsAt });
                }
                await assertNoConflictingHold(transaction, { systemId, startsAt, endsAt, excludeHoldId: bookingHold?.id });

                await assertWithinDailyLimit(transaction, { studentId, startsAt, bookedMinutes, policy });
                await assertWithinMonthlyLimit(transaction, { studentId, startsAt, bookedMinutes, student });

                await assertSystemNotOverlapping(transaction, systemId, startsAt, endsAt);

                if (bookingHold) {
                    await transaction.bookingHold.delete({ where: { id: bookingHold.id } });
                }

                const id = randomUUID();
                return transaction.booking.create({
                    data: {
                        id,
                        reference: createReference(id),
                        studentId,
                        systemId,
                        startsAt,
                        endsAt,
                        bookedMinutes,
                    },
                    include: { student: true },
                });
            },
            { isolationLevel: "Serializable" },
        );

        notifyBookingsChanged();
        response.status(201).json({ booking: publicBooking(booking, request.user) });
    } catch (error) {
        if (error.code === "P2034" || error.code === "P2002" || error.code === "P2010") {
            error.status = 409;
            error.message = "This slot was just taken. Please choose another available time.";
        }
        next(error);
    }
});

// Cancel an upcoming booking.
router.patch("/:bookingId/cancel", async (request, response, next) => {
    try {
        const database = getDatabase();
        await refreshBookingStatuses(database);
        const booking = await database.booking.findUnique({ where: { id: request.params.bookingId } });

        if (!booking) {
            response.status(404).json({ message: "Booking not found." });
            return;
        }
        if (!ownsBooking(booking, request.user)) {
            response.status(403).json({ message: "You can only cancel your own bookings." });
            return;
        }
        if (booking.status !== "UPCOMING") {
            response.status(409).json({ message: "Only upcoming bookings can be cancelled." });
            return;
        }

        const policy = await getPolicy(database);
        const cancellationDeadline = booking.startsAt.getTime() - policy.cancelBeforeMinutes * 60_000;
        if (Date.now() >= cancellationDeadline) {
            let message = "A booking cannot be cancelled after its start time.";
            if (policy.cancelBeforeMinutes > 0) {
                message = `Bookings must be cancelled at least ${policy.cancelBeforeMinutes} minutes before the start time.`;
            }
            response.status(409).json({ message });
            return;
        }

        const updatedBooking = await database.booking.update({
            where: { id: booking.id },
            data: { status: "CANCELLED", cancelledAt: new Date() },
            include: { student: true },
        });

        notifyBookingsChanged();
        response.json({ booking: publicBooking(updatedBooking, request.user) });
    } catch (error) {
        next(error);
    }
});

// Start a booked session when the student is ready.
router.patch("/:bookingId/start", async (request, response, next) => {
    try {
        const database = getDatabase();
        await refreshBookingStatuses(database);

        const booking = await database.booking.findUnique({
            where: { id: request.params.bookingId },
        });

        if (!booking) {
            response.status(404).json({ message: "Booking not found." });
            return;
        }
        if (request.user.role !== "student" || booking.studentId !== request.user.id) {
            response.status(403).json({ message: "Only the student who booked this session can start it." });
            return;
        }
        if (booking.status !== "UPCOMING") {
            response.status(409).json({ message: "This session cannot be started." });
            return;
        }

        const now = new Date();
        if (now < booking.startsAt) {
            response.status(409).json({ message: "The session can only be started at or after its booked start time." });
            return;
        }
        if (now >= booking.endsAt) {
            response.status(409).json({ message: "The booked session has already ended." });
            return;
        }

        const result = await database.booking.updateMany({
            where: {
                id: booking.id,
                status: "UPCOMING",
                startedAt: null,
            },
            data: {
                status: "ACTIVE",
                startedAt: now,
            },
        });

        if (result.count === 0) {
            response.status(409).json({ message: "This session was already started." });
            return;
        }

        const updatedBooking = await database.booking.findUnique({
            where: { id: booking.id },
            include: { student: true },
        });

        notifyBookingsChanged();
        response.json({ booking: publicBooking(updatedBooking, request.user) });
    } catch (error) {
        next(error);
    }
});

// End an active session and release any unused time.
router.patch("/:bookingId/end", async (request, response, next) => {
    try {
        const database = getDatabase();
        await refreshBookingStatuses(database);
        const booking = await database.booking.findUnique({
            where: { id: request.params.bookingId },
            include: { student: true },
        });

        if (!booking) {
            response.status(404).json({ message: "Booking not found." });
            return;
        }
        if (!ownsBooking(booking, request.user)) {
            response.status(403).json({ message: "You can only end your own session." });
            return;
        }
        if (booking.status !== "ACTIVE") {
            response.status(409).json({ message: "Only an active session can be ended early." });
            return;
        }

        const policy = await getPolicy(database);
        const elapsedMinutes = Math.ceil((Date.now() - booking.startsAt.getTime()) / 60_000);
        const roundedMinutes = Math.ceil(elapsedMinutes / policy.bookingIncrementMinutes) * policy.bookingIncrementMinutes;
        const usedMinutes = Math.min(booking.bookedMinutes, Math.max(policy.bookingIncrementMinutes, roundedMinutes));
        const releasedMinutes = booking.bookedMinutes - usedMinutes;
        const releasedAt = new Date(booking.startsAt.getTime() + usedMinutes * 60_000);

        const updatedBooking = await database.booking.update({
            where: { id: booking.id },
            data: {
                status: "COMPLETED",
                usedMinutes,
                endedAt: new Date(),
                endsAt: releasedAt,
            },
            include: { student: true },
        });

        const notice = {
            bookingId: booking.id,
            reference: booking.reference,
            studentId: booking.studentId,
            studentName: `${booking.student.firstName} ${booking.student.lastName}`,
            system: `System ${String(booking.systemId).padStart(2, "0")}`,
            bookedMinutes: booking.bookedMinutes,
            usedMinutes,
            releasedMinutes,
            createdAt: Date.now(),
        };

        notifyBookingsChanged();
        notifySessionEndedEarly(notice);
        response.json({ booking: publicBooking(updatedBooking, request.user), notice });
    } catch (error) {
        next(error);
    }
});

export default router;
