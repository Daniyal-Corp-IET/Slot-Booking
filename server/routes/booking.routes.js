import { randomUUID } from "node:crypto";
import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { refreshBookingStatuses } from "../services/booking.service.js";
import { lockBooking } from "../services/databaseLocks.js";
import { getPolicy } from "../services/policy.service.js";
import { notifyBookingsChanged, notifySessionEndedEarly } from "../services/socket.service.js";
import { getLabDateKey, getLabDayRange, getLabMinutes, getLabMonthRange, isLabSunday } from "../utils/time.js";

const router = Router();
const HOLD_MINUTES = 5;
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

function publicHold(hold, viewer) {
    const startsAt = new Date(hold.startsAt);
    const bookedMinutes = Math.round((hold.endsAt.getTime() - startsAt.getTime()) / 60_000);

    return {
        id: hold.id,
        systemId: hold.systemId,
        startsAt: startsAt.getTime(),
        endsAt: hold.endsAt.getTime(),
        expiresAt: hold.expiresAt.getTime(),
        dateKey: getLabDateKey(startsAt),
        startMinutes: getLabMinutes(startsAt),
        bookedMinutes,
        isMine: viewer.role === "student" && hold.studentId === viewer.id,
    };
}

function getStudentId(request) {
    if (request.user.role === "student") return request.user.id;
    return request.body.studentId?.trim().toUpperCase();
}

function ownsBooking(booking, user) {
    return user.role === "admin" || booking.studentId === user.id;
}

function stop(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

function totalMinutes(bookings) {
    let minutes = 0;
    for (const booking of bookings) {
        minutes += booking.usedMinutes ?? booking.bookedMinutes;
    }
    return minutes;
}

// Return every hold that has not expired.
router.get("/holds", async (request, response, next) => {
    try {
        const database = getDatabase();
        const now = new Date();

        await database.bookingHold.deleteMany({
            where: { expiresAt: { lte: now } },
        });

        const holds = await database.bookingHold.findMany({
            where: { expiresAt: { gt: now } },
            orderBy: { expiresAt: "asc" },
        });

        response.json({
            holds: holds.map((hold) => publicHold(hold, request.user)),
        });
    } catch (error) {
        next(error);
    }
});

// Hold one system for five minutes while the student confirms the booking.
router.post("/holds", requireRole("student"), async (request, response, next) => {
    try {
        const studentId = request.user.id;
        const systemId = Number(request.body.systemId);
        const bookedMinutes = Number(request.body.bookedMinutes);
        const startsAt = new Date(request.body.startsAt);
        const database = getDatabase();

        const validSystem = Number.isInteger(systemId) && systemId > 0;
        const validDuration = Number.isInteger(bookedMinutes);
        const validStartTime = !Number.isNaN(startsAt.getTime());

        if (!validSystem || !validDuration || !validStartTime) {
            response.status(400).json({ message: "Provide a valid system, start time, and duration." });
            return;
        }

        const hold = await database.$transaction(
            async (transaction) => {
                await lockBooking(transaction, systemId, studentId);

                const policy = await getPolicy(transaction);
                const startMinutes = getLabMinutes(startsAt);
                const endMinutes = startMinutes + bookedMinutes;
                const validDuration =
                    bookedMinutes >= policy.minDurationMinutes &&
                    bookedMinutes <= policy.maxDurationMinutes &&
                    bookedMinutes % policy.bookingIncrementMinutes === 0;

                if (!validDuration) stop(400, "Provide a valid booking duration.");
                if (startMinutes % policy.bookingIncrementMinutes !== 0) {
                    stop(400, `Start times must use ${policy.bookingIncrementMinutes}-minute intervals.`);
                }
                if (startsAt.getTime() <= Date.now()) stop(409, "Past time slots cannot be selected.");
                const sundayIsClosed = policy.sundayHoliday && isLabSunday(startsAt);
                const beforeOpening = startMinutes < policy.openMinutes;
                const afterClosing = endMinutes > policy.closeMinutes;

                if (sundayIsClosed || beforeOpening || afterClosing) {
                    stop(409, "This slot is outside the current lab schedule.");
                }

                const system = await transaction.system.findFirst({
                    where: { id: systemId, isActive: true },
                });
                if (!system) stop(409, "System is not available.");

                const endsAt = new Date(startsAt.getTime() + bookedMinutes * 60_000);
                const outage = await transaction.systemOutage.findFirst({
                    where: {
                        systemId,
                        startsAt: { lt: endsAt },
                        OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }],
                    },
                });
                if (outage) stop(409, "This system is unavailable during the selected time.");

                const booking = await transaction.booking.findFirst({
                    where: {
                        systemId,
                        status: { not: "CANCELLED" },
                        startsAt: { lt: endsAt },
                        endsAt: { gt: startsAt },
                    },
                });
                if (booking) stop(409, "This system was already booked. Please select another system.");

                const now = new Date();
                const anotherHold = await transaction.bookingHold.findFirst({
                    where: {
                        systemId,
                        studentId: { not: studentId },
                        expiresAt: { gt: now },
                        startsAt: { lt: endsAt },
                        endsAt: { gt: startsAt },
                    },
                });
                if (anotherHold) stop(409, "Another student is currently selecting this system. Please choose another system.");

                await transaction.bookingHold.deleteMany({
                    where: {
                        OR: [{ studentId }, { expiresAt: { lte: now } }],
                    },
                });

                return transaction.bookingHold.create({
                    data: {
                        studentId,
                        systemId,
                        startsAt,
                        endsAt,
                        expiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000),
                    },
                });
            },
            { isolationLevel: "Serializable" },
        );

        response.status(201).json({ hold: publicHold(hold, request.user) });
    } catch (error) {
        if (error.code === "P2034" || error.code === "P2002") {
            error.status = 409;
            error.message = "Another student selected this system first. Please choose another system.";
        }
        next(error);
    }
});

// Release a hold when the student changes their selection.
router.delete("/holds/:holdId", requireRole("student"), async (request, response, next) => {
    try {
        const database = getDatabase();
        const hold = await database.bookingHold.findUnique({
            where: { id: request.params.holdId },
        });

        if (!hold) {
            response.status(204).end();
            return;
        }
        if (hold.studentId !== request.user.id) {
            response.status(403).json({ message: "You can only release your own system hold." });
            return;
        }

        await database.bookingHold.delete({ where: { id: hold.id } });
        response.status(204).end();
    } catch (error) {
        next(error);
    }
});

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
                const validDuration =
                    bookedMinutes >= policy.minDurationMinutes &&
                    bookedMinutes <= policy.maxDurationMinutes &&
                    bookedMinutes % policy.bookingIncrementMinutes === 0;

                if (!validDuration) stop(400, "Provide a valid booking duration.");

                const startMinutes = getLabMinutes(startsAt);
                const endMinutes = startMinutes + bookedMinutes;
                if (startMinutes % policy.bookingIncrementMinutes !== 0) {
                    stop(400, `Start times must use ${policy.bookingIncrementMinutes}-minute intervals.`);
                }
                if (startsAt.getTime() <= Date.now()) {
                    stop(409, "Past time slots cannot be booked.");
                }
                if ((policy.sundayHoliday && isLabSunday(startsAt)) || startMinutes < policy.openMinutes || endMinutes > policy.closeMinutes) {
                    stop(409, "This slot is outside the current lab schedule.");
                }

                const student = await transaction.student.findUnique({ where: { id: studentId } });
                if (!student) stop(404, "Student not found.");

                const system = await transaction.system.findFirst({ where: { id: systemId, isActive: true } });
                if (!system) stop(409, "System is not available.");

                const endsAt = new Date(startsAt.getTime() + bookedMinutes * 60_000);
                const outage = await transaction.systemOutage.findFirst({
                    where: {
                        systemId,
                        startsAt: { lt: endsAt },
                        OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }],
                    },
                });
                if (outage) stop(409, "This system is unavailable during the selected time.");

                let bookingHold = null;
                if (request.user.role === "student") {
                    bookingHold = await transaction.bookingHold.findUnique({
                        where: { id: holdId },
                    });

                    if (!bookingHold) {
                        stop(409, "Your system hold has expired. Please select the system again.");
                    }

                    const belongsToStudent = bookingHold.studentId === studentId;
                    const sameSystem = bookingHold.systemId === systemId;
                    const sameStart = bookingHold.startsAt.getTime() === startsAt.getTime();
                    const sameEnd = bookingHold.endsAt.getTime() === endsAt.getTime();

                    if (!belongsToStudent || !sameSystem || !sameStart || !sameEnd) {
                        stop(409, "Your selected system does not match this booking.");
                    }
                    if (bookingHold.expiresAt.getTime() <= Date.now()) {
                        stop(409, "Your system hold has expired. Please select the system again.");
                    }
                }

                const holdWhere = {
                    systemId,
                    expiresAt: { gt: new Date() },
                    startsAt: { lt: endsAt },
                    endsAt: { gt: startsAt },
                };
                if (bookingHold) holdWhere.id = { not: bookingHold.id };

                const anotherHold = await transaction.bookingHold.findFirst({
                    where: holdWhere,
                });
                if (anotherHold) stop(409, "Another student is currently selecting this system.");

                const day = getLabDayRange(startsAt);
                const month = getLabMonthRange(startsAt);
                const dayBookings = await transaction.booking.findMany({
                    where: { studentId, status: { not: "CANCELLED" }, startsAt: { gte: day.start, lt: day.end } },
                });
                const dailyMinutes = totalMinutes(dayBookings);
                if (dailyMinutes + bookedMinutes > policy.dailyLimitMinutes) {
                    stop(409, `This booking exceeds the student's ${policy.dailyLimitMinutes / 60}-hour daily limit.`);
                }

                const monthBookings = await transaction.booking.findMany({
                    where: { studentId, status: { not: "CANCELLED" }, startsAt: { gte: month.start, lt: month.end } },
                });
                const monthlyMinutes = totalMinutes(monthBookings);
                if (monthlyMinutes + bookedMinutes > student.monthlyLimitMinutes) {
                    stop(409, "This booking exceeds the student's monthly usage limit.");
                }

                const overlap = await transaction.booking.findFirst({
                    where: {
                        systemId,
                        status: { not: "CANCELLED" },
                        startsAt: { lt: endsAt },
                        endsAt: { gt: startsAt },
                    },
                });
                if (overlap) stop(409, "This system is already booked during the selected time.");

                if (bookingHold) {
                    await transaction.bookingHold.delete({
                        where: { id: bookingHold.id },
                    });
                }

                const id = randomUUID();
                const savedBooking = await transaction.booking.create({
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

                return savedBooking;
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
