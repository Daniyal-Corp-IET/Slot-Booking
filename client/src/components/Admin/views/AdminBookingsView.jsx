import { useEffect, useState } from "react";
import { Activity, CalendarDays, Clock3, Monitor, MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { formatBookingDate, formatBookingTime } from "../../../context/LabContext.helpers";
import { useToast } from "../../../hooks/useToast";
import { AppDialog, ConfirmDialog, EmptyState, Toast } from "../../Feedback/Feedback";
import { cn } from "../../../utils/cn";
import { BOOKING_BADGES, displayBooking } from "../AdminPanel.helpers";
import { AdminReveal, surface } from "../AdminPanel.view";
import { MetricCard } from "../../ui/MetricCard";
import { SearchField } from "../../ui/SearchField";
import { StatusBadge } from "../../ui/StatusBadge";
import { SELECT_FIELD_CLASS } from "../../ui/fieldStyles";

function formatStartedAt(startedAt) {
    if (!startedAt) return "Not started by student";
    return new Date(startedAt).toLocaleString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Booking management page
export function BookingsView() {
    const { students } = useOutletContext();
    const { bookings, cancelBooking, systems } = useLab();
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("All");
    const [program, setProgram] = useState("All");
    const [timePeriod, setTimePeriod] = useState("All");
    const [pendingCancel, setPendingCancel] = useState("");
    const [detailsId, setDetailsId] = useState("");
    const { dismissToast, showToast, toastMessage } = useToast();
    const visible = [];
    const searchText = query.toLowerCase();

    for (const savedBooking of bookings) {
        const booking = displayBooking(savedBooking, students, currentTime);
        const searchableText = `${booking.reference} ${booking.student} ${booking.studentId} ${booking.system} ${booking.program}`.toLowerCase();
        const matchesSearch = searchableText.includes(searchText);
        const matchesStatus = status === "All" || booking.status === status;
        const matchesProgram = program === "All" || booking.program === program;
        const matchesTime = timePeriod === "All" || booking.timePeriod === timePeriod;

        if (matchesSearch && matchesStatus && matchesProgram && matchesTime) {
            visible.push(booking);
        }
    }

    const programNames = new Set();
    for (const student of students) programNames.add(student.program);
    const programs = [...programNames];

    const details = bookings.find((booking) => booking.id === detailsId);
    const detailsStudent = students.find((student) => student.id === details?.studentId);
    const displayedDetails = details ? displayBooking(details, students, currentTime) : null;
    const today = new Date(currentTime);
    let todayBookingCount = 0;
    let activeCount = 0;
    let readyCount = 0;
    let upcomingCount = 0;
    let nextBooking;

    for (const booking of bookings) {
        const date = new Date(booking.startsAt);
        if (date.toDateString() === today.toDateString()) todayBookingCount += 1;
        if (booking.status === "Active") activeCount += 1;

        if (booking.status === "Upcoming") {
            const ready = booking.startsAt <= currentTime && booking.endsAt > currentTime;
            if (ready) {
                readyCount += 1;
            } else if (booking.startsAt > currentTime) {
                upcomingCount += 1;
                if (!nextBooking || booking.startsAt < nextBooking.startsAt) nextBooking = booking;
            }
        }
    }

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 15_000);
        return () => window.clearInterval(timer);
    }, []);

    let nextSlot = "None";
    if (nextBooking) {
        nextSlot = new Date(nextBooking.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    const confirmCancel = async () => {
        try {
            await cancelBooking(pendingCancel);
            showToast("Booking cancelled. System availability has been updated.");
        } catch (error) {
            showToast(error.message);
        } finally {
            setPendingCancel("");
        }
    };
    return (
        <div className="mx-auto max-w-400 space-y-5">
            <AdminReveal className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    accent="bg-[#128a93]"
                    icon={CalendarDays}
                    label={formatBookingDate(currentTime)}
                    note={`Bookings across ${systems.length} systems`}
                    value={todayBookingCount}
                />
                <MetricCard accent="bg-[#45a982]" icon={Activity} label="Active now" note={`${readyCount} awaiting student start`} value={activeCount} />
                <MetricCard accent="bg-[#e4a541]" icon={Clock3} label="Next slot" note={`${upcomingCount} bookings scheduled`} value={nextSlot} />
            </AdminReveal>

            <AdminReveal className={cn(surface, "overflow-hidden")}>
                <div className="relative overflow-hidden border-b border-itx-border bg-slate-50 p-5 sm:p-6">
                    <div className="relative flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-itx-border bg-white text-[#128a93] shadow-sm">
                                <SlidersHorizontal className="size-4.5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-itx-ink">Bookings</h2>
                                <p className="mt-1 text-sm text-slate-500">Search, review, and manage student bookings.</p>
                            </div>
                        </div>
                        <span className="rounded-full border border-itx-border bg-white px-3 py-1.5 text-xs font-extrabold text-[#128a93] shadow-sm">
                            {visible.length} results
                        </span>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_auto_auto_auto]">
                        <SearchField
                            label="Search bookings"
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Booking reference, student or system"
                            value={query}
                        />
                        <select
                            aria-label="Filter by status"
                            className={SELECT_FIELD_CLASS}
                            onChange={(event) => setStatus(event.target.value)}
                            value={status}
                        >
                            {["All", "Active", "Ready", "Upcoming", "Completed", "Cancelled"].map((option) => (
                                <option key={option}>{option}</option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter by program"
                            className={SELECT_FIELD_CLASS}
                            onChange={(event) => setProgram(event.target.value)}
                            value={program}
                        >
                            <option value="All">All programs</option>
                            {programs.map((option) => (
                                <option key={option}>{option}</option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter by time period"
                            className={SELECT_FIELD_CLASS}
                            onChange={(event) => setTimePeriod(event.target.value)}
                            value={timePeriod}
                        >
                            <option value="All">All time periods</option>
                            {["Morning", "Afternoon", "Evening"].map((option) => (
                                <option key={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-[1080px] w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-4 py-4">Student</th>
                                <th className="px-4 py-4">Program</th>
                                <th className="px-4 py-4">Date</th>
                                <th className="px-4 py-4">Time</th>
                                <th className="px-4 py-4">System</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visible.map((booking) => (
                                <tr className="group text-itx-ink transition-colors duration-150 hover:bg-slate-50" key={booking.id}>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className="inline-flex rounded-lg border border-[#128a93]/25 bg-[#128a93]/10 px-2.5 py-1.5 text-xs font-extrabold tracking-wide text-[#0d6169]">
                                            {booking.reference}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-bold">{booking.student}</p>
                                        <p className="mt-1 text-xs text-slate-500">{booking.studentId}</p>
                                    </td>
                                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">{booking.program}</td>
                                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold">{booking.date}</td>
                                    <td className="whitespace-nowrap px-4 py-4">
                                        <p className="text-sm font-semibold">{booking.time}</p>
                                        <p className="mt-1 text-xs font-bold text-[#0d6169]">{booking.timePeriod}</p>
                                        {booking.startedAt && <p className="mt-1 text-xs font-bold text-itx-success">Started {formatStartedAt(booking.startedAt)}</p>}
                                        {!booking.startedAt && booking.status === "Ready" && (
                                            <p className="mt-1 text-xs font-bold text-itx-success">Awaiting student start</p>
                                        )}
                                        {booking.startWarning && <p className="mt-1 text-xs font-bold text-[#b57318]">50% elapsed · Not started</p>}
                                    </td>
                                    <td className="px-4 py-4 text-sm font-bold">
                                        <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-2.5 py-1.5 text-slate-600 transition group-hover:bg-[#128a93]/10 group-hover:text-[#0d6169]">
                                            <Monitor className="size-3.5" />
                                            {booking.system}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusBadge label={booking.status} toneClassName={BOOKING_BADGES[booking.status]} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {booking.status === "Upcoming" ? (
                                            <button
                                                className="rounded-lg px-3 py-2 text-xs font-bold text-itx-danger transition hover:bg-itx-danger/12"
                                                onClick={() => setPendingCancel(booking.id)}
                                                type="button"
                                            >
                                                Cancel
                                            </button>
                                        ) : (
                                            <button
                                                aria-label={`View details for ${booking.student}`}
                                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-itx-ink"
                                                onClick={() => setDetailsId(booking.id)}
                                                type="button"
                                            >
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 lg:hidden">
                    {visible.map((booking) => (
                        <article className="p-5 text-itx-ink transition-colors duration-150 hover:bg-slate-50" key={booking.id}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="inline-flex rounded-lg border border-[#128a93]/25 bg-[#128a93]/10 px-2.5 py-1.5 text-xs font-extrabold tracking-wide text-[#0d6169]">
                                        {booking.reference}
                                    </span>
                                    <p className="mt-3 text-base font-bold">{booking.student}</p>
                                    <p className="mt-1 text-sm text-slate-500">{booking.studentId}</p>
                                    <p className="mt-1 text-sm font-bold text-[#0d6169]">{booking.program}</p>
                                </div>
                                <StatusBadge label={booking.status} toneClassName={BOOKING_BADGES[booking.status]} />
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">Date</p>
                                    <p className="mt-1 font-semibold">{booking.date}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">Time</p>
                                    <p className="mt-1 font-semibold">{booking.time}</p>
                                    <p className="mt-1 text-xs font-bold text-[#0d6169]">{booking.timePeriod}</p>
                                    {booking.startedAt && <p className="mt-1 text-xs font-bold text-itx-success">Started {formatStartedAt(booking.startedAt)}</p>}
                                    {!booking.startedAt && booking.status === "Ready" && (
                                        <p className="mt-1 text-xs font-bold text-itx-success">Awaiting student start</p>
                                    )}
                                    {booking.startWarning && <p className="mt-1 text-xs font-bold text-[#b57318]">50% elapsed · Not started</p>}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">System</p>
                                    <p className="mt-1 font-semibold">{booking.system}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button
                                    className="min-h-11 rounded-xl border border-itx-border px-4 text-sm font-bold text-itx-ink transition hover:bg-slate-100"
                                    onClick={() => setDetailsId(booking.id)}
                                    type="button"
                                >
                                    View details
                                </button>
                                {booking.status === "Upcoming" && (
                                    <button
                                        className="min-h-11 rounded-xl bg-itx-danger/12 px-4 text-sm font-bold text-itx-danger"
                                        onClick={() => setPendingCancel(booking.id)}
                                        type="button"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
                {visible.length === 0 && <EmptyState message="No bookings match your filters." />}
            </AdminReveal>
            <ConfirmDialog
                confirmLabel="Cancel booking"
                description="The student will see the cancellation immediately and the system will become available again."
                onClose={() => setPendingCancel("")}
                onConfirm={confirmCancel}
                open={Boolean(pendingCancel)}
                title="Cancel this booking?"
            />
            {details && (
                <AppDialog description="Complete booking information." onClose={() => setDetailsId("")} open title="Booking details">
                    <dl className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <div className="flex justify-between gap-3">
                            <dt>Reference</dt>
                            <dd className="font-bold tracking-wide text-itx-ink">{details.reference}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt>Student</dt>
                            <dd className="font-bold text-itx-ink">{details.studentName}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt>Program</dt>
                            <dd className="font-bold text-itx-ink">{detailsStudent?.program ?? "Program not assigned"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt>System</dt>
                            <dd className="font-bold text-itx-ink">System {String(details.systemId).padStart(2, "0")}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt>Date</dt>
                            <dd className="font-bold text-itx-ink">{formatBookingDate(details.startsAt)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt>Time</dt>
                            <dd className="text-right font-bold text-itx-ink">{formatBookingTime(details)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt>Status</dt>
                            <dd className="font-bold text-itx-ink">{displayedDetails.status}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt>Session started</dt>
                            <dd className="text-right font-bold text-itx-ink">{formatStartedAt(details.startedAt)}</dd>
                        </div>
                        {displayedDetails.startWarning && (
                            <div className="flex justify-between gap-3 rounded-xl bg-itx-warning/15 px-3 py-2 text-[#8a5a13]">
                                <dt>Start warning</dt>
                                <dd className="text-right font-bold">At least 50% elapsed</dd>
                            </div>
                        )}
                    </dl>
                </AppDialog>
            )}
            {toastMessage && <Toast message={toastMessage} onClose={dismissToast} />}
        </div>
    );
}
