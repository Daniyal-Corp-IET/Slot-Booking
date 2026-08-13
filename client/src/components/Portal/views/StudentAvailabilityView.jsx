import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { cn } from "../../../utils/cn";
import { EmptyState } from "../../Feedback/Feedback";
import { SystemDayTimeline } from "../../SystemCanvas/SystemDayTimeline";
import {
    formatDuration,
    getBookingDates,
    getCoveredMinutes,
    getIndefinitelyUnavailableSystems,
    getSystemSchedule,
    getUnavailableSystems,
} from "../StudentPortal.helpers";

// System availability page
export function AvailabilityView() {
    const { bookingHolds, bookings, policy, systems, systemOutages } = useLab();
    const systemIds = [];
    for (const system of systems) systemIds.push(system.id);

    const bookingDates = getBookingDates(new Date(), policy.sundayHoliday);
    const firstBookableDate = bookingDates.find((date) => !date.isHoliday)?.key ?? "";
    const [selectedDateKey, setSelectedDateKey] = useState(firstBookableDate);
    const [selectedSystemId, setSelectedSystemId] = useState(1);
    const indefinitelyUnavailableSystems = getIndefinitelyUnavailableSystems(systemOutages);
    const viewableSystemIds = [];
    for (const systemId of systemIds) {
        if (!indefinitelyUnavailableSystems.has(systemId)) viewableSystemIds.push(systemId);
    }

    let activeSystemId = viewableSystemIds[0];
    if (viewableSystemIds.includes(selectedSystemId)) activeSystemId = selectedSystemId;
    const selectedDate = bookingDates.find((date) => date.key === selectedDateKey);
    const unavailableDaySystems = getUnavailableSystems(
        systemOutages,
        systemIds,
        selectedDateKey,
        policy.openMinutes,
        policy.closeMinutes - policy.openMinutes,
    );
    let systemSchedule = [];
    if (activeSystemId) {
        systemSchedule = getSystemSchedule(bookings, systemOutages, selectedDateKey, activeSystemId, bookingHolds);
    }
    const labMinutes = Math.max(1, policy.closeMinutes - policy.openMinutes);
    const blockedMinutes = getCoveredMinutes(systemSchedule, policy.openMinutes, policy.closeMinutes);
    const bookedMinutes = getCoveredMinutes(systemSchedule, policy.openMinutes, policy.closeMinutes, (block) => block.tone === "booking");
    const freeMinutes = Math.max(0, labMinutes - blockedMinutes);
    const occupancyPercent = Math.min(100, Math.round((bookedMinutes / labMinutes) * 100));
    return (
        <div className="student-workspace-page space-y-5">
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="grid items-stretch gap-5 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] xl:order-2 xl:sticky xl:top-28 xl:grid-cols-1">
                <article className="portal-surface rounded-[22px] border p-5 sm:p-6">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-[#3096A7]">Choose a date</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                        {bookingDates.map((date) => (
                            <button
                                aria-pressed={selectedDateKey === date.key}
                                className={cn(
                                    "relative min-h-17 overflow-hidden rounded-xl border px-3 py-3 text-left transition-colors duration-150 active:scale-[0.98]",
                                    date.isHoliday && "cursor-not-allowed border-itx-border bg-slate-50 text-slate-300",
                                    !date.isHoliday && selectedDateKey === date.key && "border-[#3096A7] bg-[#3096A7] text-white shadow-[0_12px_24px_-18px_rgba(48,150,167,0.8)]",
                                    !date.isHoliday && selectedDateKey !== date.key && "border-itx-border bg-[#f7fafb] text-slate-600 hover:border-[#3096A7]/50 hover:bg-white",
                                )}
                                disabled={date.isHoliday}
                                key={date.key}
                                onClick={() => setSelectedDateKey(date.key)}
                                type="button"
                            >
                                <span className="block text-[10px] font-bold uppercase tracking-wide opacity-65">{date.day}</span>
                                <span className="mt-1 block text-sm font-extrabold">{date.date} {date.month}</span>
                            </button>
                        ))}
                    </div>
                </article>

                <article className="portal-surface rounded-[22px] border p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-[#3096A7]">Choose a system</p>
                        <p className="text-xs font-semibold text-slate-400">{viewableSystemIds.length} available</p>
                    </div>
                    <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5">
                        {systemIds.map((system) => {
                            const unavailableUntilChanged = indefinitelyUnavailableSystems.has(system);
                            const unavailableToday = unavailableDaySystems.has(system);
                            const selected = activeSystemId === system;
                            let availabilityLabel = "";
                            if (unavailableToday) availabilityLabel = ", temporarily unavailable";
                            if (unavailableUntilChanged) availabilityLabel = ", unavailable until changed";

                            let buttonStyle = "border-itx-border bg-[#f7fafb] text-slate-500 hover:border-[#3096A7]/50 hover:bg-white hover:text-[#3096A7]";
                            if (unavailableToday) buttonStyle = "border-itx-border bg-slate-100 text-slate-300";
                            if (unavailableUntilChanged) buttonStyle = "cursor-not-allowed border-itx-danger/35 bg-itx-danger/10 text-itx-danger";
                            if (selected) buttonStyle = "border-[#3096A7] bg-[#3096A7] text-white shadow-[0_10px_20px_-16px_rgba(48,150,167,0.8)]";

                            return (
                                <button
                                    aria-label={`View System ${String(system).padStart(2, "0")} availability${availabilityLabel}`}
                                    aria-pressed={selected}
                                    className={cn("relative flex aspect-square min-h-10 items-center justify-center rounded-xl border text-xs font-extrabold transition-colors duration-150 active:scale-95", buttonStyle)}
                                    disabled={unavailableUntilChanged}
                                    key={system}
                                    onClick={() => setSelectedSystemId(system)}
                                    type="button"
                                >
                                    {String(system).padStart(2, "0")}
                                    {unavailableToday && <span aria-hidden="true" className={cn("absolute right-1 top-1 size-1.5 rounded-full", unavailableUntilChanged ? "bg-itx-danger" : "bg-slate-300")} />}
                                </button>
                            );
                        })}
                    </div>
                    {indefinitelyUnavailableSystems.size > 0 && (
                        <p className="mt-4 text-xs font-semibold leading-5 text-itx-danger">Red systems are unavailable until restored by the lab administrator.</p>
                    )}
                </article>
            </section>

            {activeSystemId ? (
                <article className="ui-fade-in portal-surface rounded-[22px] border p-4 sm:p-6 xl:order-1" key={`${selectedDateKey}-${activeSystemId}`}>
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-widest text-[#3096A7]">System {String(activeSystemId).padStart(2, "0")}</p>
                            <h3 className="mt-2 text-xl font-bold text-itx-ink">Occupancy for {selectedDate?.date} {selectedDate?.month}</h3>
                            <p className="mt-1 text-sm text-slate-500">Review the timeline below to find a free period.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-itx-success/20 bg-itx-success/8 px-3 py-2"><p className="text-sm font-bold text-itx-success">{formatDuration(freeMinutes)}</p><p className="text-xs text-itx-success/70">Free</p></div>
                            <div className="rounded-xl border border-[#3096A7]/20 bg-[#3096A7]/8 px-3 py-2"><p className="text-sm font-bold text-[#277f8e]">{formatDuration(bookedMinutes)}</p><p className="text-xs text-[#277f8e]/70">Booked</p></div>
                            <div className="rounded-xl border border-itx-warning/25 bg-itx-warning/10 px-3 py-2"><p className="text-sm font-bold text-[#8a5a13]">{occupancyPercent}%</p><p className="text-xs text-[#8a5a13]/70">Occupancy</p></div>
                        </div>
                    </div>
                    <SystemDayTimeline blocks={systemSchedule} closeMinutes={policy.closeMinutes} openMinutes={policy.openMinutes} />
                    <Link className="group mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3096A7] px-5 text-sm font-bold text-white shadow-[0_12px_24px_-18px_rgba(48,150,167,0.7)] transition-colors hover:bg-[#277f8e] sm:ml-auto sm:w-fit" to={`/portal/book?date=${selectedDateKey}`}>
                        Book this time <ArrowUpRight className="size-4" />
                    </Link>
                </article>
            ) : (
                <article className="portal-surface rounded-[22px] border p-6 xl:order-1"><EmptyState message="No system activity is available because every system is unavailable until changed by the administrator." /></article>
            )}
            </div>
        </div>
    );
}
