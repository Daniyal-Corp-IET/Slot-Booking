import { useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CalendarDays, Check, Monitor } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { EmptyState } from "../../Feedback/Feedback";
import { LabFloorCanvas } from "../../SystemCanvas/LabFloorCanvas";
import { formatBookingDate, isSystemUnavailable } from "../../../context/LabContext.helpers";
import { cn } from "../../../utils/cn";
import { displayBooking, getAdminCanvasItems } from "../AdminPanel.helpers";
import { AdminReveal, StatusLegend, surface } from "../AdminPanel.view";
import { MetricCard } from "../../ui/MetricCard";

// Overview page
export function OverviewView() {
    const { students } = useOutletContext();
    const { bookings, systems, systemOutages } = useLab();
    const [currentTime] = useState(() => Date.now());
    const overviewSystems = [];
    let availableSystems = 0;

    for (const system of systems) {
        const unavailable = system.status === "unavailable" || isSystemUnavailable(systemOutages, system.id);
        let status = "available";
        if (unavailable) status = "offline";
        if (status === "available") availableSystems += 1;

        overviewSystems.push({ ...system, status });
    }

    let activeBookings = 0;
    const scheduledBookings = [];

    for (const booking of bookings) {
        if (booking.status === "Active") activeBookings += 1;
        if (booking.status === "Active" || booking.status === "Upcoming") scheduledBookings.push(booking);
    }

    const counts = {
        available: availableSystems,
        offline: overviewSystems.length - availableSystems,
    };
    return (
        <div className="mx-auto max-w-400 space-y-5 sm:space-y-6">
            <AdminReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard accent="bg-[#3096A7]" icon={Monitor} label="Total systems" value={systems.length} />
                <MetricCard accent="bg-[#3096A7]" icon={Activity} label="In use now" value={activeBookings} />
                <MetricCard accent="bg-itx-success" icon={Check} label="Available" value={counts.available} />
                <MetricCard accent="bg-itx-warning" icon={AlertTriangle} label="Unavailable" value={counts.offline} />
            </AdminReveal>

            <AdminReveal className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
                <article className={cn(surface, "group overflow-hidden p-5 text-itx-ink sm:p-6")}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-lg font-bold tracking-[-0.025em]">Live system map</p>
                            <p className="mt-1 text-sm text-slate-500">{systems.length} systems · status updates in real time</p>
                        </div>
                        <StatusLegend />
                    </div>
                    <div className="mt-5 overflow-hidden rounded-3xl shadow-[0_22px_45px_-35px_rgba(15,23,42,0.18)]">
                        <LabFloorCanvas ariaLabel="Live overview of the computer lab" compact items={getAdminCanvasItems(overviewSystems)} />
                    </div>
                    <Link
                        className="group/link mt-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-[#3096A7] transition hover:bg-[#3096A7]/10 hover:text-[#287f8e]"
                        to="/admin/systems"
                    >
                        Open system controls <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                </article>

                <article className={cn(surface, "relative overflow-hidden p-5 text-itx-ink sm:p-6")}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-lg font-bold tracking-[-0.025em]">Schedule for {formatBookingDate(currentTime)}</p>
                            <p className="mt-1 text-sm text-slate-500">{scheduledBookings.length} active or upcoming bookings</p>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3096A7]/10 text-[#3096A7]">
                            <CalendarDays className="h-5 w-5" />
                        </span>
                    </div>
                    {scheduledBookings.length === 0 ? (
                        <EmptyState message="No active or upcoming bookings." />
                    ) : (
                        <div className="mt-5 space-y-3">
                            {scheduledBookings
                                .sort((first, second) => first.startsAt - second.startsAt)
                                .slice(0, 4)
                                .map((booking) => displayBooking(booking, students))
                                .map((booking) => (
                                    <div
                                        className="group/item flex items-center gap-3 rounded-xl border border-itx-border bg-slate-50 p-3 transition-colors duration-150 hover:border-[#3096A7]/25"
                                        key={booking.id}
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3096A7] text-[11px] font-black text-white">
                                            {booking.system.replace("System ", "S")}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-itx-ink">{booking.student}</p>
                                            <p className="mt-1 text-xs text-slate-500">{booking.time}</p>
                                        </div>
                                        <span
                                            className={cn(
                                                "rounded-full px-2 py-1 text-[10px] font-extrabold uppercase",
                                                booking.status === "Active" ? "bg-itx-success/12 text-itx-success" : "bg-itx-info/12 text-itx-info",
                                            )}
                                        >
                                            {booking.status}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </article>
            </AdminReveal>
        </div>
    );
}
