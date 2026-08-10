import { CalendarDays, CalendarSearch, History, Home } from "lucide-react";
import { bookingWindow, isBookingBlocking, isSystemUnavailable } from "../../context/LabContext.helpers";

export const STUDENT_NAVIGATION = [
    { label: "Home", path: "/portal", icon: Home, end: true },
    { label: "Availability", path: "/portal/availability", icon: CalendarSearch },
    { label: "Book Slot", path: "/portal/book", icon: CalendarDays },
    { label: "History", path: "/portal/history", icon: History },
];

export const STUDENT_PAGE_TITLES = {
    "/portal": { title: "Overview", description: "Your bookings and lab activity at a glance." },
    "/portal/availability": { title: "System availability", description: "Check open lab systems across the week." },
    "/portal/book": { title: "Book a slot", description: "Reserve a lab system for your session." },
    "/portal/history": { title: "Booking history", description: "Review your past and upcoming bookings." },
};

export const DURATION_PRESETS = [30, 40, 45, 60, 75, 90, 120, 150, 180];

export const BOOKING_FLOW_STEPS = [
    { id: "date", label: "Select date" },
    { id: "time", label: "Select time" },
    { id: "system", label: "Available systems" },
    { id: "booking", label: "Booking" },
    { id: "complete", label: "Booking successful" },
];

const LAB_OPEN_MINUTES = 9 * 60;
const LAB_CLOSE_MINUTES = 18 * 60;

function toLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return new Date(2000, 0, 1, hours, mins).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function getBookingDates(referenceDate = new Date(), sundayHoliday = true) {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const daysUntilSunday = (7 - start.getDay()) % 7;
    const dates = [];

    for (let offset = 0; offset <= daysUntilSunday; offset += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + offset);

        dates.push({
            key: toLocalDateKey(date),
            day: date.toLocaleDateString("en-US", { weekday: "short" }),
            date: String(date.getDate()).padStart(2, "0"),
            month: date.toLocaleDateString("en-US", { month: "short" }),
            isHoliday: sundayHoliday && date.getDay() === 0,
        });
    }

    return dates;
}

export function getAvailableStartTimes(durationMinutes, openMinutes = LAB_OPEN_MINUTES, closeMinutes = LAB_CLOSE_MINUTES, incrementMinutes = 10) {
    const options = [];

    for (let start = openMinutes; start <= closeMinutes - durationMinutes; start += incrementMinutes) {
        options.push({
            id: String(start),
            label: `${formatMinutes(start)} – ${formatMinutes(start + durationMinutes)}`,
            startMinutes: start,
        });
    }

    return options;
}

export function getBookedSystems(bookings, date, startMinutes, durationMinutes) {
    const bookedSystems = new Set();

    for (const booking of bookings) {
        if (isBookingBlocking(booking, date, startMinutes, durationMinutes)) {
            bookedSystems.add(booking.systemId);
        }
    }

    return bookedSystems;
}

export function getHeldSystems(holds, date, startMinutes, durationMinutes, ignoredHoldId = "") {
    const heldSystems = new Set();
    const selectedEnd = startMinutes + durationMinutes;

    for (const hold of holds) {
        const holdIsActive = hold.expiresAt > Date.now();
        const sameDate = hold.dateKey === date;
        const overlaps = startMinutes < hold.startMinutes + hold.bookedMinutes && selectedEnd > hold.startMinutes;

        if (hold.id !== ignoredHoldId && holdIsActive && sameDate && overlaps) {
            heldSystems.add(hold.systemId);
        }
    }

    return heldSystems;
}

export function getUnavailableSystems(outages, systemIds, date, startMinutes, durationMinutes) {
    const timeWindow = bookingWindow(date, startMinutes, durationMinutes);
    const unavailableSystems = new Set();

    for (const systemId of systemIds) {
        const unavailable = isSystemUnavailable(outages, systemId, timeWindow.startsAt, timeWindow.endsAt);
        if (unavailable) unavailableSystems.add(systemId);
    }

    return unavailableSystems;
}

export function getIndefinitelyUnavailableSystems(outages) {
    const systemIds = new Set();

    for (const outage of outages) {
        if (outage.endsAt === null) systemIds.add(outage.systemId);
    }

    return systemIds;
}

export function getSystemSchedule(bookings, outages, date, systemId, holds = []) {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const blocks = [];

    if (date === todayKey) {
        blocks.push({
            startMinutes: 0,
            endMinutes: Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5,
            label: "Unavailable for booking",
            title: "Time passed",
            tone: "elapsed",
        });
    }

    const bookingsForDay = [];
    for (const booking of bookings) {
        const sameDay = booking.dateKey === date;
        const sameSystem = booking.systemId === systemId;
        const activeBooking = booking.status !== "Cancelled";

        if (sameDay && sameSystem && activeBooking) {
            bookingsForDay.push({
                startMinutes: booking.startMinutes,
                endMinutes: booking.startMinutes + (booking.usedMinutes ?? booking.bookedMinutes),
            });
        }
    }
    bookingsForDay.sort((first, second) => first.startMinutes - second.startMinutes);

    const mergedBookings = [];
    for (const booking of bookingsForDay) {
        const previousBooking = mergedBookings.at(-1);
        const overlapsPrevious = previousBooking && booking.startMinutes <= previousBooking.endMinutes;

        if (overlapsPrevious) {
            previousBooking.endMinutes = Math.max(previousBooking.endMinutes, booking.endMinutes);
        } else {
            mergedBookings.push({ ...booking });
        }
    }

    for (const booking of mergedBookings) {
        blocks.push({
            ...booking,
            label: `${formatMinutes(booking.startMinutes)} – ${formatMinutes(booking.endMinutes)}`,
            tone: "booking",
        });
    }

    for (const hold of holds) {
        const activeHold = hold.expiresAt > Date.now();
        if (!activeHold || hold.dateKey !== date || hold.systemId !== systemId) continue;

        blocks.push({
            startMinutes: hold.startMinutes,
            endMinutes: hold.startMinutes + hold.bookedMinutes,
            label: `${formatMinutes(hold.startMinutes)} – ${formatMinutes(hold.startMinutes + hold.bookedMinutes)}`,
            title: "Temporarily held",
            tone: "hold",
        });
    }

    const day = bookingWindow(date, 0, 24 * 60);
    for (const outage of outages) {
        const sameSystem = outage.systemId === systemId;
        const startsBeforeDayEnds = outage.startsAt < day.endsAt;
        const endsAfterDayStarts = outage.endsAt === null || outage.endsAt > day.startsAt;

        if (!sameSystem || !startsBeforeDayEnds || !endsAfterDayStarts) continue;

        const startMinutes = Math.max(0, Math.floor((outage.startsAt - day.startsAt) / 60_000));
        const outageEnd = outage.endsAt ?? day.endsAt;
        const endMinutes = Math.min(24 * 60, Math.ceil((outageEnd - day.startsAt) / 60_000));
        let label = "Until changed by admin";
        if (outage.endsAt) label = `${formatMinutes(startMinutes)} – ${formatMinutes(endMinutes)}`;

        blocks.push({
            startMinutes,
            endMinutes,
            label,
            title: "Not available",
            tone: "unavailable",
        });
    }

    return blocks;
}

export function getCoveredMinutes(blocks, openMinutes, closeMinutes, includeBlock = () => true) {
    const intervals = [];

    for (const block of blocks) {
        if (!includeBlock(block)) continue;

        const start = Math.max(openMinutes, block.startMinutes);
        const end = Math.min(closeMinutes, block.endMinutes);
        if (end > start) intervals.push({ start, end });
    }

    intervals.sort((first, second) => first.start - second.start);

    let total = 0;
    let currentEnd = openMinutes;
    for (const interval of intervals) {
        const start = Math.max(interval.start, currentEnd);
        if (interval.end > start) total += interval.end - start;
        currentEnd = Math.max(currentEnd, interval.end);
    }

    return total;
}

export function getStartTimes(bookings, outages, systemIds, date, durationMinutes, openMinutes, closeMinutes, incrementMinutes = 10, holds = []) {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const nextStartMinutes = Math.ceil((now.getHours() * 60 + now.getMinutes()) / incrementMinutes) * incrementMinutes;
    const options = getAvailableStartTimes(durationMinutes, openMinutes, closeMinutes, incrementMinutes);
    const startTimes = [];

    for (const option of options) {
        const timeHasPassed = date === todayKey && option.startMinutes < nextStartMinutes;
        if (timeHasPassed) continue;

        const bookedSystems = getBookedSystems(bookings, date, option.startMinutes, durationMinutes);
        const heldSystems = getHeldSystems(holds, date, option.startMinutes, durationMinutes);
        const unavailableSystems = getUnavailableSystems(outages, systemIds, date, option.startMinutes, durationMinutes);
        const blockedSystems = new Set([...bookedSystems, ...heldSystems, ...unavailableSystems]);
        const availableSystems = systemIds.length - blockedSystems.size;

        if (availableSystems > 0) {
            startTimes.push({ ...option, availableSystems });
        }
    }

    return startTimes;
}

export function getDailyBookedMinutes(bookings, dateKey, studentId) {
    let totalMinutes = 0;

    for (const booking of bookings) {
        const belongsToStudent = booking.studentId === studentId;
        const sameDay = booking.dateKey === dateKey;
        const activeBooking = booking.status !== "Cancelled";

        if (belongsToStudent && sameDay && activeBooking) {
            totalMinutes += booking.usedMinutes ?? booking.bookedMinutes;
        }
    }

    return totalMinutes;
}

export function getSessionUsage(bookedMinutes, startsAt, currentTime, incrementMinutes = 10) {
    const elapsedMinutes = (currentTime - startsAt) / 60_000;
    const roundedMinutes = Math.ceil(elapsedMinutes / incrementMinutes) * incrementMinutes;
    const usedMinutes = Math.min(bookedMinutes - incrementMinutes, Math.max(incrementMinutes, roundedMinutes));
    return { usedMinutes, remainingMinutes: bookedMinutes - usedMinutes };
}

export function getMonthlyBalances(bookings, monthlyLimitMinutes) {
    const usedByMonth = {};
    const balances = {};
    const completedBookings = [];

    for (const booking of bookings) {
        if (booking.status === "Completed") completedBookings.push(booking);
    }
    completedBookings.sort((first, second) => first.startsAt - second.startsAt);

    for (const booking of completedBookings) {
        const date = new Date(booking.startsAt);
        const month = `${date.getFullYear()}-${date.getMonth()}`;
        const usedMinutes = booking.usedMinutes ?? booking.bookedMinutes;
        usedByMonth[month] = (usedByMonth[month] || 0) + usedMinutes;
        balances[booking.id] = formatDuration(Math.max(0, monthlyLimitMinutes - usedByMonth[month]));
    }

    return balances;
}

export function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes} min`;
    if (remainingMinutes === 0) return `${hours} hr`;
    return `${hours} hr ${remainingMinutes} min`;
}

export function formatCurrentDate(referenceDate = new Date()) {
    return referenceDate.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

export function formatCurrentWeek(referenceDate = new Date()) {
    const start = new Date(referenceDate);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startLabel = start.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const endLabel = end.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    return `${startLabel} – ${endLabel}`;
}
