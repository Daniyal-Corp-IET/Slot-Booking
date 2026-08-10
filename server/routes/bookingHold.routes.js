import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { lockBooking } from "../services/databaseLocks.js";
import { getPolicy } from "../services/policy.service.js";
import { notifyHoldsChanged } from "../services/socket.service.js";
import { stop } from "../utils/httpError.js";
import { getLabDateKey, getLabMinutes, isLabSunday } from "../utils/time.js";

const router = Router();
const HOLD_MINUTES = 5;
router.use(requireLogin);

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

        notifyHoldsChanged();
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
        notifyHoldsChanged();
        response.status(204).end();
    } catch (error) {
        next(error);
    }
});

export default router;
