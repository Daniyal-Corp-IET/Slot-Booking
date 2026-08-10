import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { notifySystemsChanged } from "../services/socket.service.js";

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

export default router;
