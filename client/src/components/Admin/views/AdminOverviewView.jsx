import { useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CalendarDays, Check, Monitor } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { EmptyState } from "../../Feedback/Feedback";
import { LabFloorCanvas } from "../../SystemCanvas/LabFloorCanvas";
import { formatBookingDate, isSystemUnavailable } from "../../../context/LabContext.helpers";
import { displayBooking, getAdminCanvasItems, joinClasses } from "../AdminPanel.helpers";
import { AdminReveal, MetricCard, StatusLegend, surface } from "../AdminPanel.view";

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
            <AdminReveal className="premium-hero group relative overflow-hidden rounded-4xl border border-white/7 p-6 text-white shadow-[0_30px_70px_-38px_rgba(4,27,39,0.85)] md:p-7 xl:p-8">
                <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-[#48bfca]/15" />
                <div aria-hidden="true" className="absolute -right-2 top-5 h-44 w-44 rounded-full bg-[#2f9db0]/15 blur-2xl" />
                <div aria-hidden="true" className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-[#6376b8]/12 blur-3xl" />
                <div className="relative grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70 shadow-inner backdrop-blur-sm">
                            <span className="h-2 w-2 rounded-full bg-[#65d4b0] shadow-[0_0_12px_rgba(101,212,176,0.9)]" /> Live lab status
                        </span>
                        <h2 className="mt-5 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.045em] md:text-3xl xl:text-4xl">
                            The lab is operating normally.
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                            {activeBookings} students are in active sessions. {counts.offline} systems are unavailable, and released time becomes immediately
                            bookable.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/6 p-4 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.75)] backdrop-blur-md">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white/7 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">Available</p>
                                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#8be6c7]">{counts.available}</p>
                            </div>
                            <div className="rounded-2xl bg-white/7 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">Live sessions</p>
                                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#72d6de]">{activeBookings}</p>
                            </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <Link
                                className="group/link inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3ee7c2] px-4 py-3 text-sm font-bold text-[#082330] shadow-[0_12px_24px_-16px_rgba(79,216,189,0.6)] transition-colors duration-150 hover:bg-[#6ee2cb]"
                                to="/admin/systems"
                            >
                                Manage systems <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/7 px-4 py-3 text-sm font-bold transition-colors duration-150 hover:bg-white/12"
                                to="/admin/bookings"
                            >
                                View bookings
                            </Link>
                        </div>
                    </div>
                </div>
            </AdminReveal>

            <AdminReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard accent="bg-[#6376b8]" icon={Monitor} label="Total systems" note="Single computer lab" value={systems.length} />
                <MetricCard accent="bg-[#1aa7b6]" icon={Activity} label="In use now" note="Current active sessions" value={activeBookings} />
                <MetricCard accent="bg-[#45a982]" icon={Check} label="Available" note="Ready for immediate use" value={counts.available} />
                <MetricCard accent="bg-[#e4a541]" icon={AlertTriangle} label="Unavailable" note="Not open for booking" value={counts.offline} />
            </AdminReveal>

            <AdminReveal className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
                <article className={joinClasses(surface, "group overflow-hidden p-5 text-white transition-colors duration-150 hover:border-[#3ee7c2]/30 sm:p-6")}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-lg font-bold tracking-[-0.025em]">Live system map</p>
                            <p className="mt-1 text-sm text-white/60">{systems.length} systems · status updates in real time</p>
                        </div>
                        <StatusLegend />
                    </div>
                    <div className="mt-5 overflow-hidden rounded-3xl shadow-[0_22px_45px_-35px_rgba(17,78,89,0.65)]">
                        <LabFloorCanvas ariaLabel="Live overview of the computer lab" compact items={getAdminCanvasItems(overviewSystems)} />
                    </div>
                    <Link
                        className="group/link mt-5 inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-bold text-[#2f9db0] transition hover:bg-[#2f9db0]/10 hover:text-[#5fd3dc]"
                        to="/admin/systems"
                    >
                        Open system controls <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                </article>

                <article className={joinClasses(surface, "relative overflow-hidden p-5 text-white transition-colors duration-150 hover:border-[#3ee7c2]/30 sm:p-6")}>
                    <span aria-hidden="true" className="absolute right-0 top-0 size-32 rounded-full bg-[#2f9db0]/8 blur-2xl" />
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-lg font-bold tracking-[-0.025em]">Schedule for {formatBookingDate(currentTime)}</p>
                            <p className="mt-1 text-sm text-white/60">{scheduledBookings.length} active or upcoming bookings</p>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-[#2f9db0] shadow-sm">
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
                                        className="group/item flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors duration-150 hover:border-[#3ee7c2]/30"
                                        key={booking.id}
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#2f9db0,#128793)] text-[11px] font-black text-[#082330] shadow-md">
                                            {booking.system.replace("System ", "S")}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold">{booking.student}</p>
                                            <p className="mt-1 text-xs text-white/50">{booking.time}</p>
                                        </div>
                                        <span
                                            className={joinClasses(
                                                "rounded-full px-2 py-1 text-[10px] font-extrabold uppercase",
                                                booking.status === "Active" ? "bg-[#3ee7c2]/15 text-[#5fe3b8]" : "bg-[#2f9db0]/15 text-[#5fd3dc]",
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
