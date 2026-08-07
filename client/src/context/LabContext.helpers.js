export function formatBookingDate(startsAt) {
    return new Date(startsAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatBookingTime(booking) {
    const start = new Date(booking.startsAt);
    const end = new Date(booking.startsAt + booking.bookedMinutes * 60_000);
    const format = (date) => date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `${format(start)} – ${format(end)}`;
}

export function hasPassedHalfwayWithoutStart(booking, currentTime = Date.now()) {
    if (booking.status !== "Upcoming" || booking.startedAt) return false;

    const endsAt = booking.endsAt ?? booking.startsAt + booking.bookedMinutes * 60_000;
    if (currentTime >= endsAt) return false;

    const halfwayTime = booking.startsAt + (booking.bookedMinutes * 60_000) / 2;
    return currentTime >= halfwayTime;
}

export function isBookingBlocking(booking, date, startMinutes, durationMinutes) {
    if (booking.status === "Cancelled" || booking.status === "Completed" || booking.dateKey !== date) return false;
    return startMinutes < booking.startMinutes + booking.bookedMinutes && startMinutes + durationMinutes > booking.startMinutes;
}
export function bookingWindow(dateKey, startMinutes, durationMinutes) {
    const dateParts = dateKey.split("-");
    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);
    const startsAt = new Date(year, month - 1, day, 0, startMinutes).getTime();
    return { startsAt, endsAt: startsAt + durationMinutes * 60_000 };
}
export function isSystemUnavailable(outages, systemId, startsAt = Date.now(), endsAt = startsAt) {
    for (const outage of outages) {
        const sameSystem = outage.systemId === systemId;
        const startsBeforeBookingEnds = outage.startsAt < endsAt;
        const endsAfterBookingStarts = outage.endsAt === null || outage.endsAt > startsAt;

        if (sameSystem && startsBeforeBookingEnds && endsAfterBookingStarts) return true;
    }

    return false;
}
