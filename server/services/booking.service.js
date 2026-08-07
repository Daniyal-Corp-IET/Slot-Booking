export async function refreshBookingStatuses(database) {
    const now = new Date();
    const expiredBookings = await database.booking.findMany({
        where: {
            status: { in: ["UPCOMING", "ACTIVE"] },
            endsAt: { lte: now },
        },
        select: { id: true, bookedMinutes: true, endsAt: true },
    });

    if (expiredBookings.length) {
        const updates = [];

        for (const booking of expiredBookings) {
            const update = database.booking.update({
                where: { id: booking.id },
                data: {
                    status: "COMPLETED",
                    usedMinutes: booking.bookedMinutes,
                    endedAt: booking.endsAt,
                },
            });
            updates.push(update);
        }

        await database.$transaction(updates);
    }

    return expiredBookings.length;
}
