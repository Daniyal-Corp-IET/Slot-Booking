import { Activity, Clock3, Download, Laptop, UsersRound } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { formatBookingDate, formatBookingTime } from "../../../context/LabContext.helpers";
import { cn } from "../../../utils/cn";
import { getReportMetrics } from "../AdminPanel.helpers";
import { AdminAction, AdminReveal, surface } from "../AdminPanel.view";
import { MetricCard } from "../../ui/MetricCard";

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
            <AdminReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard accent="bg-[#3096A7]" icon={Activity} label="Avg. utilisation" note={report.comparison} value={`${report.average}%`} />
                <MetricCard accent="bg-[#6376b8]" icon={Clock3} label="Lab hours used" note="Current week" value={report.labHours} />
                <MetricCard accent="bg-[#45a982]" icon={UsersRound} label="Registered students" note="Current directory" value={students.length} />
                <MetricCard accent="bg-[#e4a541]" icon={Laptop} label="Peak demand" note={report.peakLabel} value={`${report.peak}%`} />
            </AdminReveal>
            <AdminReveal className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
                <article className={cn(surface, "flex flex-col overflow-hidden p-5 text-itx-ink sm:p-6 lg:h-128")}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Weekly utilisation</h2>
                            <p className="mt-1 text-xs text-slate-500">Booked system capacity by day</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[#3096A7]/12 px-3 py-1.5 text-[10px] font-bold text-[#287f8e]">This week</span>
                            <AdminAction
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#3096A7]/20 bg-white px-3 text-xs font-bold text-[#287f8e] shadow-sm hover:border-[#3096A7]/40 hover:bg-[#3096A7]/5"
                                onClick={exportReport}
                                type="button"
                            >
                                <Download className="size-3.5" /> Export CSV
                            </AdminAction>
                        </div>
                    </div>
                    <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
                    <div className="mt-8 grid h-64 grid-cols-6 items-end gap-3 sm:gap-5">
                        {report.utilisation.map((item) => (
                            <div className="flex h-full flex-col justify-end gap-2" key={item.day}>
                                <div className="flex flex-1 items-end rounded-t-xl bg-slate-100 shadow-inner">
                                    <div
                                        className="group relative w-full rounded-t-xl bg-[#3096A7] shadow-[0_-8px_20px_-15px_rgba(48,150,167,0.45)] transition-colors"
                                        style={{ height: item.value ? `${Math.max(item.value, 3)}%` : "0%" }}
                                    >
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-extrabold text-slate-500">
                                            {item.value}%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-center text-[11px] font-bold text-slate-500">{item.day}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 rounded-xl border border-[#3096A7]/15 bg-[#3096A7]/6 px-4 py-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#287f8e]">Demand insight</p>
                        <p className="mt-1.5 text-xs leading-5 text-slate-600">
                            {report.peak
                                ? `The highest demand this week is ${report.peak}% at ${report.peakLabel}.`
                                : "There are no bookings to report for this week yet."}
                        </p>
                    </div>
                    </div>
                </article>
                <article className={cn(surface, "flex flex-col p-5 text-itx-ink sm:p-6 lg:h-128")}>
                    <h2 className="text-lg font-bold">Students by program</h2>
                    <p className="mt-1 text-xs text-slate-500">{students.length} active student accounts</p>
                    <div className="mt-7 min-h-0 space-y-5 lg:flex-1 lg:overflow-y-auto lg:pr-2">
                        {courseCounts.map((course, index) => (
                            <div key={course.abbreviation}>
                                <div className="mb-2 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-600">{course.name}</span>
                                    <span className="font-extrabold">{course.students}</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={cn(
                                            "h-full rounded-full",
                                            ["bg-[#3096A7]", "bg-[#6577b9]", "bg-[#e2a54b]", "bg-[#17a870]"][index % 4],
                                        )}
                                        style={{ width: `${(course.students / largestCourse) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </AdminReveal>
        </div>
    );
}
