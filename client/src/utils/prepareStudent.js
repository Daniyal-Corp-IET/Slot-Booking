function formatMonthYear(value) {
    return new Date(value).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatUsageMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
}

// Derives the display-ready student shape (name, initials, term label, usage stats) from a raw student record.
export function prepareStudent(student) {
    const percent = Math.min(100, Math.round((student.monthlyUsedMinutes / student.monthlyLimitMinutes) * 100));
    let status = "Active";

    if (percent >= 85) status = "Near limit";

    return {
        ...student,
        name: `${student.firstName} ${student.lastName}`,
        initials: `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase(),
        program: student.course.name,
        term: `${formatMonthYear(student.programStart)} – ${formatMonthYear(student.programEnd)}`,
        phone: student.phoneNumber || "Not provided",
        monthly: formatUsageMinutes(student.monthlyUsedMinutes),
        monthlyLimit: formatUsageMinutes(student.monthlyLimitMinutes),
        monthlyRemaining: formatUsageMinutes(Math.max(0, student.monthlyLimitMinutes - student.monthlyUsedMinutes)),
        percent,
        status,
    };
}
