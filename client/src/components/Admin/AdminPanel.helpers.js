import { BarChart3, CalendarClock, LayoutDashboard, Settings, UsersRound } from "lucide-react";
import { formatBookingDate, formatBookingTime, hasPassedHalfwayWithoutStart } from "../../context/LabContext.helpers";

export const SYSTEM_STYLES = {
    available: { label: "Available", dot: "bg-itx-success" },
    offline: { label: "Unavailable", dot: "bg-slate-300" },
};

export const BOOKING_BADGES = {
    Active: "bg-[#e5f6f1] text-[#257c62]",
    Ready: "bg-[#ddf5ef] text-[#247b62]",
    Upcoming: "bg-[#e6f5f7] text-[#287f8e]",
    Completed: "bg-[#edf0f1] text-[#64757a]",
    Cancelled: "bg-[#fdecee] text-[#b55460]",
};

export const MONTH_OPTIONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PROGRAM_STYLES = {
    "Data Science": { accent: "bg-[#3096A7]", badge: "bg-[#e8f7f8] text-[#287f8e]", avatar: "bg-[#287f8e]" },
    "Full Stack Development": { accent: "bg-[#6376b8]", badge: "bg-[#eef0fb] text-[#596cad]", avatar: "bg-[#5d6fae]" },
    "Python Full Stack": { accent: "bg-[#6376b8]", badge: "bg-[#eef0fb] text-[#596cad]", avatar: "bg-[#5d6fae]" },
    "Cyber Security": { accent: "bg-[#e4a541]", badge: "bg-[#fff5e4] text-[#956316]", avatar: "bg-[#a87525]" },
    "Cloud Computing": { accent: "bg-[#45a982]", badge: "bg-[#e9f7f1] text-[#28795f]", avatar: "bg-[#398c6d]" },
    default: { accent: "bg-[#3096A7]", badge: "bg-[#e8f7f8] text-[#287f8e]", avatar: "bg-[#287f8e]" },
};

export const ADMIN_NAVIGATION = [
    { label: "Overview", path: "/admin", icon: LayoutDashboard, end: true },
    { label: "Bookings", path: "/admin/bookings", icon: CalendarClock },
    { label: "Students", path: "/admin/students", icon: UsersRound },
    { label: "Reports", path: "/admin/reports", icon: BarChart3 },
    { label: "Settings", path: "/admin/settings", icon: Settings },
];

export const ADMIN_PAGE_TITLES = {
    "/admin": { title: "Operations overview", description: "Monitor the lab and handle today’s priorities." },
    "/admin/systems": { title: "System management", description: "Keep systems available or mark them offline." },
    "/admin/bookings": { title: "Booking management", description: "Review and manage student bookings." },
    "/admin/students": { title: "Student management", description: "Track access, course details, and monthly usage." },
    "/admin/courses": { title: "Course management", description: "Manage offered programs and their abbreviations." },
    "/admin/reports": { title: "Usage reports", description: "Understand lab demand and system utilisation." },
    "/admin/settings": { title: "Lab settings", description: "Configure booking rules and operating policy." },
};

export function displayBooking(booking, students, currentTime = Date.now()) {
    const student = students.find((item) => item.id === booking.studentId);
    let timePeriod = "Evening";
    let status = booking.status;
    const endsAt = booking.endsAt ?? booking.startsAt + booking.bookedMinutes * 60_000;

    if (booking.status === "Upcoming" && booking.startsAt <= currentTime && endsAt > currentTime) {
        status = "Ready";
    }

    if (booking.startMinutes < 12 * 60) {
        timePeriod = "Morning";
    } else if (booking.startMinutes < 16 * 60) {
        timePeriod = "Afternoon";
    }

    return {
        ...booking,
        student: booking.studentName,
        system: `System ${String(booking.systemId).padStart(2, "0")}`,
        date: formatBookingDate(booking.startsAt),
        time: formatBookingTime(booking),
        program: student?.program ?? "Program not assigned",
        timePeriod,
        status,
        startWarning: hasPassedHalfwayWithoutStart(booking, currentTime),
    };
}

export function getAdminCanvasItems(systems, filter = "all") {
    return systems.map((system) => ({
        id: system.id,
        state: system.status,
        dimmed: filter !== "all" && system.status !== filter,
    }));
}

export function historyDates() {
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return {
            key,
            label: date.toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
            day: date.toLocaleDateString("en-US", { weekday: "short" }),
        };
    });
}

export function formatMinutes(minutes) {
    const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function monthLabel(value) {
    if (!value) return "Select month";
    const [year, month] = value.split("-");
    return `${MONTH_OPTIONS[Number(month) - 1]} ${year}`;
}

export function termDuration(start, end) {
    if (!start || !end || end < start) return 0;
    const [startYear, startMonth] = start.split("-").map(Number);
    const [endYear, endMonth] = end.split("-").map(Number);
    return (endYear - startYear) * 12 + endMonth - startMonth + 1;
}

export function shiftMonth(value, offset) {
    const [year, month] = value.split("-").map(Number);
    const total = year * 12 + month - 1 + offset;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function minutesToTime(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    return `${hours}:${mins}`;
}

export function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

const REPORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(date) {
    const start = new Date(date);
    const daysFromMonday = (start.getDay() + 6) % 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - daysFromMonday);
    return start;
}

function usedBookingMinutes(booking, now) {
    if (booking.status === "Cancelled" || booking.startsAt > now) return 0;
    if (booking.status === "Completed") return booking.usedMinutes ?? booking.bookedMinutes;

    const elapsedMinutes = (now - booking.startsAt) / 60_000;
    if (elapsedMinutes < 0) return 0;
    if (elapsedMinutes > booking.bookedMinutes) return booking.bookedMinutes;
    return elapsedMinutes;
}

function formatHours(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
}

function formatPercentage(minutes, capacity) {
    const percentage = (minutes / capacity) * 100;
    if (percentage === 0) return 0;
    if (percentage < 10) return Number(percentage.toFixed(1));
    return Math.round(percentage);
}

export function getReportMetrics(bookings, systemCount, policy) {
    const now = Date.now();
    const weekStart = startOfWeek(now);
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() + REPORT_DAYS.length);

    const openMinutes = policy.openMinutes;
    const closeMinutes = policy.closeMinutes;
    const dayCapacity = Math.max(1, systemCount * (closeMinutes - openMinutes));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + REPORT_DAYS.length);

    const usableBookings = [];
    for (const booking of bookings) {
        if (booking.status !== "Cancelled") usableBookings.push(booking);
    }

    const currentWeekBookings = [];
    let currentBookedMinutes = 0;
    let previousBookedMinutes = 0;
    let usedMinutes = 0;

    for (const booking of usableBookings) {
        const inCurrentWeek = booking.startsAt >= weekStart.getTime() && booking.startsAt < weekEnd.getTime();
        const inPreviousWeek = booking.startsAt >= previousWeekStart.getTime() && booking.startsAt < previousWeekEnd.getTime();

        if (inCurrentWeek) {
            currentWeekBookings.push(booking);
            currentBookedMinutes += booking.bookedMinutes;
            usedMinutes += usedBookingMinutes(booking, now);
        }

        if (inPreviousWeek) previousBookedMinutes += booking.bookedMinutes;
    }

    const utilisation = [];
    for (let dayIndex = 0; dayIndex < REPORT_DAYS.length; dayIndex += 1) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(dayStart.getDate() + dayIndex);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        let bookedMinutes = 0;
        for (const booking of currentWeekBookings) {
            const belongsToDay = booking.startsAt >= dayStart.getTime() && booking.startsAt < dayEnd.getTime();
            if (belongsToDay) bookedMinutes += booking.bookedMinutes;
        }

        const value = Math.min(100, formatPercentage(bookedMinutes, dayCapacity));
        utilisation.push({ day: REPORT_DAYS[dayIndex], value });
    }

    let peakCount = 0;
    let peakLabel = "No bookings this week";
    for (let dayIndex = 0; dayIndex < REPORT_DAYS.length; dayIndex += 1) {
        const day = REPORT_DAYS[dayIndex];
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);

        for (let minute = openMinutes; minute < closeMinutes; minute += policy.bookingIncrementMinutes) {
            const point = new Date(date);
            point.setMinutes(minute);

            let bookingCount = 0;
            for (const booking of currentWeekBookings) {
                const end = booking.startsAt + booking.bookedMinutes * 60_000;
                const activeAtThisTime = booking.startsAt <= point.getTime() && end > point.getTime();
                if (activeAtThisTime) bookingCount += 1;
            }

            if (bookingCount > peakCount) {
                peakCount = bookingCount;
                peakLabel = `${day}, ${point.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
            }
        }
    }

    const weekCapacity = dayCapacity * REPORT_DAYS.length;
    const average = formatPercentage(currentBookedMinutes, weekCapacity);
    const previousAverage = formatPercentage(previousBookedMinutes, weekCapacity);
    const difference = average - previousAverage;
    let comparison = "Same as last week";

    if (difference > 0) comparison = `${difference} pts up from last week`;
    if (difference < 0) comparison = `${Math.abs(difference)} pts down from last week`;

    let peak = 0;
    if (systemCount > 0) peak = Math.round((peakCount / systemCount) * 100);

    return {
        average,
        comparison,
        labHours: formatHours(usedMinutes),
        peak,
        peakLabel,
        utilisation,
    };
}

export function joinClasses(...classes) {
    return classes.filter(Boolean).join(" ");
}
