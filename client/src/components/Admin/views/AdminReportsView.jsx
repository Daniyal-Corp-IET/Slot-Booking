import { Activity, Clock3, Download, Laptop, UsersRound } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { formatBookingDate, formatBookingTime } from "../../../context/LabContext.helpers";
import { getReportMetrics, joinClasses } from "../AdminPanel.helpers";
import { AdminAction, AdminReveal, MetricCard, surface } from "../AdminPanel.view";

// Reports page
export function ReportsView() {
    const { courses, students } = useOutletContext();
    const { bookings, policy, systems } = useLab();
    const report = getReportMetrics(bookings, systems.length, policy);
    const courseCounts = [];
    let largestCourse = 1;

    for (const course of courses) {
        let studentCount = 0;

        for (const student of students) {
            if (student.program === course.name) studentCount += 1;
        }

        courseCounts.push({ ...course, students: studentCount });
        if (studentCount > largestCourse) largestCourse = studentCount;
    }
    const exportReport = () => {
        const rows = [["Booking reference", "Student", "System", "Date", "Time", "Status"]];

        for (const booking of bookings) {
            rows.push([
                booking.reference,
                booking.studentName,
                `System ${booking.systemId}`,
                formatBookingDate(booking.startsAt),
                formatBookingTime(booking),
                booking.status,
            ]);
        }

        const csvLines = [];
        for (const row of rows) csvLines.push(row.join(","));
        const csv = csvLines.join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "itx-lab-report.csv";
        link.click();
        URL.revokeObjectURL(url);
    };
    return (
        <div className="mx-auto max-w-400 space-y-5">
            <div className="flex justify-end">
                <AdminAction
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:border-[#2f9db0]/40 hover:text-[#2f9db0] hover:shadow-[0_12px_25px_-18px_rgba(31,184,196,0.8)]"
                    onClick={exportReport}
                    type="button"
                >
                    <Download className="h-4 w-4" /> Export report
                </AdminAction>
            </div>
            <AdminReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard accent="bg-[#1aa7b6]" icon={Activity} label="Avg. utilisation" note={report.comparison} value={`${report.average}%`} />
                <MetricCard accent="bg-[#6376b8]" icon={Clock3} label="Lab hours used" note="Current week" value={report.labHours} />
                <MetricCard accent="bg-[#45a982]" icon={UsersRound} label="Registered students" note="Current directory" value={students.length} />
                <MetricCard accent="bg-[#e4a541]" icon={Laptop} label="Peak demand" note={report.peakLabel} value={`${report.peak}%`} />
            </AdminReveal>
            <AdminReveal className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
                <article className={joinClasses(surface, "overflow-hidden p-5 text-white sm:p-6")}>
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Weekly utilisation</h2>
                            <p className="mt-1 text-xs text-white/60">Booked system capacity by day</p>
                        </div>
                        <span className="rounded-full bg-[#2f9db0]/15 px-3 py-1.5 text-[10px] font-bold text-[#5fd3dc]">This week</span>
                    </div>
                    <div className="mt-8 grid h-64 grid-cols-6 items-end gap-3 sm:gap-5">
                        {report.utilisation.map((item) => (
                            <div className="flex h-full flex-col justify-end gap-2" key={item.day}>
                                <div className="flex flex-1 items-end rounded-t-xl bg-white/5 shadow-inner">
                                    <div
                                        className="group relative w-full rounded-t-xl bg-gradient-to-t from-[#128793] to-[#3ee7c2] shadow-[0_-8px_20px_-15px_rgba(31,184,196,0.8)] transition-colors"
                                        style={{ height: item.value ? `${Math.max(item.value, 3)}%` : "0%" }}
                                    >
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-extrabold text-white/70">
                                            {item.value}%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-center text-[11px] font-bold text-white/60">{item.day}</p>
                            </div>
                        ))}
                    </div>
                </article>
                <article className={joinClasses(surface, "p-5 text-white sm:p-6")}>
                    <h2 className="text-lg font-bold">Students by program</h2>
                    <p className="mt-1 text-xs text-white/60">{students.length} active student accounts</p>
                    <div className="mt-7 space-y-5">
                        {courseCounts.map((course, index) => (
                            <div key={course.abbreviation}>
                                <div className="mb-2 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-white/70">{course.name}</span>
                                    <span className="font-extrabold">{course.students}</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className={joinClasses(
                                            "h-full rounded-full",
                                            ["bg-[#2f9db0]", "bg-[#6577b9]", "bg-[#e2a54b]", "bg-[#3ee7c2]"][index % 4],
                                        )}
                                        style={{ width: `${(course.students / largestCourse) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-7 rounded-2xl bg-white/5 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/60">Demand insight</p>
                        <p className="mt-2 text-xs leading-5 text-white/70">
                            {report.peak
                                ? `The highest demand this week is ${report.peak}% at ${report.peakLabel}.`
                                : "There are no bookings to report for this week yet."}
                        </p>
                    </div>
                </article>
            </AdminReveal>
        </div>
    );
}
