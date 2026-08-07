import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { getPolicy } from "../services/policy.service.js";
import { notifySystemsChanged } from "../services/socket.service.js";
import { dateKeyToLabRange, getLabDayRange, getLabMinutes } from "../utils/time.js";

const router = Router();

router.use(requireLogin);

function activeOutage(outages, now = new Date()) {
    return outages.find((outage) => outage.startsAt <= now && (!outage.endsAt || outage.endsAt > now));
}

function publicSystem(system) {
    const outage = activeOutage(system.outages);
    const outages = [];

    for (const item of system.outages) {
        outages.push({
            id: item.id,
            systemId: system.id,
            startsAt: item.startsAt.getTime(),
            endsAt: item.endsAt?.getTime() ?? null,
        });
    }

    let status = "available";
    if (outage) status = "unavailable";

    return {
        id: system.id,
        status,
        unavailableFrom: outage?.startsAt.getTime() ?? null,
        unavailableUntil: outage?.endsAt?.getTime() ?? null,
        outages,
        createdAt: system.createdAt,
    };
}

function dateRange(dateValue) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue || "")) return null;
    const range = dateKeyToLabRange(dateValue);
    if (!range) return null;
    return { dayStart: range.start, dayEnd: range.end };
}

function buildSegments(bookings, outages, openMinutes, closeMinutes) {
    const slots = [];

    for (let startMinutes = openMinutes; startMinutes < closeMinutes; startMinutes += 5) {
        const endMinutes = startMinutes + 5;
        const outage = outages.find((item) => startMinutes < item.endMinutes && endMinutes > item.startMinutes);
        const booking = bookings.find((item) => startMinutes < item.endMinutes && endMinutes > item.startMinutes);
        let status = "available";
        if (booking) status = "booked";
        if (outage) status = "unavailable";
        const referenceId = outage?.id ?? booking?.id ?? null;
        const openEnded = Boolean(outage?.openEnded);
        const previous = slots.at(-1);

        if (previous?.status === status && previous.referenceId === referenceId) {
            previous.endMinutes = endMinutes;
        } else {
            slots.push({
                startMinutes,
                endMinutes,
                status,
                referenceId,
                openEnded,
                actualStartsAt: outage?.actualStartsAt ?? null,
                studentId: booking?.studentId ?? null,
                studentName: booking?.studentName ?? null,
            });
        }
    }

    return slots;
}

// Student and admin system list.
router.get("/", async (request, response, next) => {
    try {
        const systems = await getDatabase().system.findMany({
            where: { isActive: true },
            include: {
                outages: {
                    where: {
                        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
                    },
                    orderBy: { startsAt: "desc" },
                },
            },
            orderBy: { id: "asc" },
        });

        const publicSystems = [];
        for (const system of systems) publicSystems.push(publicSystem(system));
        response.json({ systems: publicSystems });
    } catch (error) {
        next(error);
    }
});

// Day timeline used by system management.
router.get("/:systemId/history", requireRole("admin"), async (request, response, next) => {
    try {
        const systemId = Number(request.params.systemId);
        const range = dateRange(request.query.date);

        if (!systemId || !range) {
            response.status(400).json({ message: "Provide a valid system and date." });
            return;
        }

        const database = getDatabase();
        const policy = await getPolicy(database);
        const system = await database.system.findUnique({ where: { id: systemId } });
        if (!system) {
            response.status(404).json({ message: "System not found." });
            return;
        }

        const [savedBookings, savedOutages] = await Promise.all([
            database.booking.findMany({
                where: {
                    systemId,
                    status: { not: "CANCELLED" },
                    startsAt: { gte: range.dayStart, lt: range.dayEnd },
                },
                include: {
                    student: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                },
            }),
            database.systemOutage.findMany({
                where: {
                    systemId,
                    startsAt: { lt: range.dayEnd },
                    OR: [{ endsAt: null }, { endsAt: { gt: range.dayStart } }],
                },
            }),
        ]);

        const bookings = [];
        for (const booking of savedBookings) {
            bookings.push({
                id: booking.id,
                startMinutes: getLabMinutes(booking.startsAt),
                endMinutes: getLabMinutes(booking.endsAt),
                studentId: booking.student.id,
                studentName: `${booking.student.firstName} ${booking.student.lastName}`,
            });
        }

        const outages = [];
        for (const outage of savedOutages) {
            let startMinutes = getLabMinutes(outage.startsAt);
            let endMinutes = 24 * 60;
            if (outage.endsAt) endMinutes = getLabMinutes(outage.endsAt);
            if (outage.startsAt < range.dayStart) startMinutes = 0;
            if (!outage.endsAt || outage.endsAt >= range.dayEnd) endMinutes = 24 * 60;

            outages.push({
                id: outage.id,
                openEnded: outage.endsAt === null,
                actualStartsAt: outage.startsAt.getTime(),
                startMinutes,
                endMinutes,
            });
        }

        response.json({
            date: request.query.date,
            openMinutes: policy.openMinutes,
            closeMinutes: policy.closeMinutes,
            segments: buildSegments(bookings, outages, policy.openMinutes, policy.closeMinutes),
        });
    } catch (error) {
        next(error);
    }
});

// Add and remove lab systems.
router.post("/", requireRole("admin"), async (request, response, next) => {
    try {
        const database = getDatabase();
        const removedSystem = await database.system.findFirst({
            where: { isActive: false },
            orderBy: { id: "asc" },
        });
        let system;
        if (removedSystem) {
            system = await database.system.update({
                where: { id: removedSystem.id },
                data: { isActive: true },
                include: { outages: true },
            });
        } else {
            system = await database.system.create({ data: {}, include: { outages: true } });
        }

        notifySystemsChanged();
        response.status(201).json({ message: "System added successfully.", system: publicSystem(system) });
    } catch (error) {
        next(error);
    }
});

router.delete("/:systemId", requireRole("admin"), async (request, response, next) => {
    try {
        const systemId = Number(request.params.systemId);
        const database = getDatabase();
        const activeSystemCount = await database.system.count({ where: { isActive: true } });

        if (activeSystemCount <= 1) {
            response.status(409).json({ message: "The lab must keep at least one active system." });
            return;
        }

        const futureBooking = await database.booking.findFirst({
            where: {
                systemId,
                OR: [{ status: "ACTIVE" }, { status: "UPCOMING", startsAt: { gte: new Date() } }],
            },
        });

        if (futureBooking) {
            response.status(409).json({ message: "Cancel this system's upcoming bookings before removing it." });
            return;
        }

        const system = await database.system.findUnique({ where: { id: systemId } });
        if (!system?.isActive) {
            response.status(404).json({ message: "System not found." });
            return;
        }

        const now = new Date();
        await database.$transaction([
            database.system.update({ where: { id: systemId }, data: { isActive: false } }),
            database.systemOutage.updateMany({
                where: {
                    systemId,
                    startsAt: { lte: now },
                    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
                },
                data: { endsAt: now },
            }),
        ]);
        notifySystemsChanged();
        response.json({ message: "System removed successfully." });
    } catch (error) {
        next(error);
    }
});

// Restore or edit unavailable periods.
router.patch("/:systemId/available", requireRole("admin"), async (request, response, next) => {
    try {
        const systemId = Number(request.params.systemId);
        const now = new Date();
        const database = getDatabase();
        const system = await database.system.findFirst({ where: { id: systemId, isActive: true } });

        if (!system) {
            response.status(404).json({ message: "System not found." });
            return;
        }

        await database.systemOutage.updateMany({
            where: {
                systemId,
                startsAt: { lte: now },
                OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
            data: { endsAt: now },
        });
        notifySystemsChanged();
        response.json({ message: "System is available." });
    } catch (error) {
        next(error);
    }
});

router.delete("/:systemId/outages/:outageId", requireRole("admin"), async (request, response, next) => {
    try {
        const systemId = Number(request.params.systemId);
        const database = getDatabase();
        const outage = await database.systemOutage.findFirst({
            where: { id: request.params.outageId, systemId },
        });

        if (!outage) {
            response.status(404).json({ message: "This unavailable period no longer exists." });
            return;
        }

        await database.systemOutage.delete({ where: { id: outage.id } });
        notifySystemsChanged();
        response.json({ message: "Unavailable period removed." });
    } catch (error) {
        next(error);
    }
});

router.patch("/:systemId/outages/:outageId", requireRole("admin"), async (request, response, next) => {
    try {
        const systemId = Number(request.params.systemId);
        const startsAt = new Date(request.body.startsAt);
        const endsAt = new Date(request.body.endsAt);

        if (!systemId || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
            response.status(400).json({ message: "Provide a valid unavailable time range." });
            return;
        }

        const database = getDatabase();
        const outage = await database.systemOutage.findFirst({
            where: { id: request.params.outageId, systemId },
        });
        if (!outage) {
            response.status(404).json({ message: "This unavailable period no longer exists." });
            return;
        }

        const now = new Date();
        const outageIsActive = outage.startsAt <= now && (!outage.endsAt || outage.endsAt > now);
        const outageHasEnded = outage.endsAt && outage.endsAt <= now;
        if (outageHasEnded) {
            response.status(409).json({ message: "A completed unavailable period cannot be changed." });
            return;
        }
        if (outageIsActive && startsAt.getTime() !== outage.startsAt.getTime()) {
            response.status(409).json({ message: "The start time has passed. Only the end time can be changed." });
            return;
        }
        if (!outageIsActive && startsAt < now) {
            response.status(409).json({ message: "The unavailable period cannot start in the past." });
            return;
        }
        if (endsAt <= now) {
            response.status(409).json({ message: "The unavailable period must end in the future." });
            return;
        }
        if (
            (!outageIsActive && (startsAt.getMinutes() % 5 !== 0 || startsAt.getSeconds() !== 0)) ||
            endsAt.getMinutes() % 5 !== 0 ||
            endsAt.getSeconds() !== 0
        ) {
            response.status(400).json({ message: "Unavailable time must follow the 5-minute timeline lines." });
            return;
        }

        const dayStart = getLabDayRange(startsAt).start;
        const bookings = await database.booking.findMany({
            where: {
                systemId,
                status: { not: "CANCELLED" },
                startsAt: { gte: dayStart, lt: endsAt },
            },
        });
        let overlapsBooking = false;
        for (const booking of bookings) {
            const bookingStart = booking.startsAt.getTime();
            const bookingEnd = booking.endsAt.getTime();
            if (bookingStart < endsAt.getTime() && bookingEnd > startsAt.getTime()) {
                overlapsBooking = true;
                break;
            }
        }
        if (overlapsBooking) {
            response.status(409).json({ message: "The unavailable period overlaps a booking." });
            return;
        }

        const overlappingOutage = await database.systemOutage.findFirst({
            where: {
                systemId,
                id: { not: outage.id },
                startsAt: { lt: endsAt },
                OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }],
            },
        });
        if (overlappingOutage) {
            response.status(409).json({ message: "The unavailable period overlaps another unavailable period." });
            return;
        }

        await database.systemOutage.update({
            where: { id: outage.id },
            data: { startsAt, endsAt },
        });
        notifySystemsChanged();
        response.json({ message: "Unavailable period updated." });
    } catch (error) {
        next(error);
    }
});

router.patch("/:systemId/unavailable", requireRole("admin"), async (request, response, next) => {
    try {
        const systemId = Number(request.params.systemId);
        const now = new Date();
        const hasScheduledStart = Boolean(request.body.startsAt);
        let startsAt = now;
        let endsAt = null;
        if (hasScheduledStart) startsAt = new Date(request.body.startsAt);
        if (request.body.endsAt) endsAt = new Date(request.body.endsAt);

        if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
            response.status(400).json({ message: "Provide a valid unavailable time range." });
            return;
        }
        if (hasScheduledStart && (startsAt < now || startsAt.getMinutes() % 5 !== 0 || startsAt.getSeconds() !== 0)) {
            response.status(400).json({ message: "Scheduled outages must start in the future on a 5-minute interval." });
            return;
        }
        if (endsAt && (endsAt <= startsAt || endsAt.getMinutes() % 5 !== 0 || endsAt.getSeconds() !== 0)) {
            response.status(400).json({ message: "The end time must be after the start on a 5-minute interval." });
            return;
        }

        const database = getDatabase();
        const system = await database.system.findFirst({ where: { id: systemId, isActive: true } });
        if (!system) {
            response.status(404).json({ message: "System not found." });
            return;
        }

        const dayStart = getLabDayRange(startsAt).start;
        const savedBookings = await database.booking.findMany({
            where: {
                systemId,
                status: { not: "CANCELLED" },
                startsAt: { gte: dayStart },
            },
        });
        let outageEndTime = Number.POSITIVE_INFINITY;
        if (endsAt) outageEndTime = endsAt.getTime();

        let bookingClash = false;
        for (const booking of savedBookings) {
            const bookingStart = booking.startsAt.getTime();
            const bookingEnd = booking.endsAt.getTime();
            if (bookingStart < outageEndTime && bookingEnd > startsAt.getTime()) {
                bookingClash = true;
                break;
            }
        }
        if (bookingClash) {
            let message = "Cancel this system's active or upcoming bookings before marking it unavailable until changed.";
            if (endsAt) message = "This period contains a booking. Choose an available time range.";
            response.status(409).json({ message });
            return;
        }

        const currentOutage = await database.systemOutage.findFirst({
            where: {
                systemId,
                startsAt: { lte: now },
                OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
        });
        const outageSearch = {
            systemId,
            OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }],
        };
        if (currentOutage && !hasScheduledStart) {
            outageSearch.id = { not: currentOutage.id };
        }
        if (endsAt) outageSearch.startsAt = { lt: endsAt };

        const overlappingOutage = await database.systemOutage.findFirst({ where: outageSearch });
        if (overlappingOutage) {
            response.status(409).json({ message: "This system is already unavailable during part of that period." });
            return;
        }

        let outage;
        if (currentOutage && !hasScheduledStart) {
            outage = await database.systemOutage.update({
                where: { id: currentOutage.id },
                data: { endsAt },
            });
        } else {
            outage = await database.systemOutage.create({
                data: { systemId, startsAt, endsAt },
            });
        }

        notifySystemsChanged();
        response.json({
            message: "System marked unavailable.",
            outage: {
                id: outage.id,
                systemId,
                startsAt: outage.startsAt.getTime(),
                endsAt: outage.endsAt?.getTime() ?? null,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
