import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { EmptyState } from "../../Feedback/Feedback";
import { SystemDayTimeline } from "../../SystemCanvas/SystemDayTimeline";
import {
    cn,
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
        <div className="space-y-4 sm:space-y-6">
            <section className="ui-fade-in premium-hero relative overflow-hidden rounded-4xl border border-[#27505b] p-5 text-white shadow-2xl shadow-[#102f3d]/18 md:p-6 xl:p-8">
                <div aria-hidden="true" className="absolute -right-20 -top-24 size-72 rounded-full border border-white/10" />
                <div aria-hidden="true" className="absolute -bottom-24 right-20 size-56 rounded-full bg-[#36c2ba]/15 blur-2xl" />
                <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(84,204,204,0.12),transparent_32%)]" />
                <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/75">
                            <span className="size-2 rounded-full bg-[#72e0bf]" /> Live availability
                        </span>
                        <h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-[-0.04em] md:text-3xl xl:text-4xl">Check a system's full day.</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
                            Select a date and system to review its booked, unavailable, and free periods in one clear timeline.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/12 bg-white/8 p-2 shadow-2xl shadow-black/10 backdrop-blur-sm">
                        <div className="rounded-xl border border-white/5 bg-white/7 px-3 py-2.5 transition hover:bg-white/12">
                            <p className="text-lg font-bold">
                                {selectedDate?.date} {selectedDate?.month}
                            </p>
                            <p className="text-xs font-semibold text-white/50">Selected date</p>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/7 px-3 py-2.5 transition hover:bg-white/12">
                            <p className="text-lg font-bold">{activeSystemId ? String(activeSystemId).padStart(2, "0") : "—"}</p>
                            <p className="text-xs font-semibold text-white/50">System</p>
                        </div>
                        <div className="rounded-xl bg-linear-to-br from-[#3ee7c2] to-[#17939c] px-3 py-2.5 shadow-lg shadow-black/10">
                            <p className="text-lg font-bold">{formatDuration(labMinutes)}</p>
                            <p className="text-xs font-semibold text-white/70">Lab day</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="portal-surface portal-ticket overflow-hidden rounded-3xl border shadow-lg shadow-[#17333e]/4">
                <div className="border-b border-white/10 bg-white/5 px-4 py-4 sm:px-5">
                    <p className="text-sm font-bold text-white">Check availability by system</p>
                    <p className="mt-1 text-sm text-white/55">Start by choosing the date you want to review.</p>
                </div>

                <div className="p-4 md:p-5 xl:p-6">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-widest text-[#2f9db0]">Choose a date</p>
                        <div className="relative mt-3">
                            <div className="hidden-scrollbar flex snap-x gap-2 overflow-x-auto px-1 pb-2">
                                {bookingDates.map((date) => (
                                    <button
                                        aria-pressed={selectedDateKey === date.key}
                                        className={cn(
                                            "relative min-w-25 snap-start overflow-hidden rounded-2xl border px-3 py-3 text-left transition-colors duration-150 active:scale-[0.98]",
                                            date.isHoliday && "cursor-not-allowed border-white/8 bg-white/4 text-white/30",
                                            !date.isHoliday &&
                                                selectedDateKey === date.key &&
                                                "border-[#2f9db0] bg-linear-to-br from-[#2f9db0] to-[#17939c] text-[#082330] shadow-lg shadow-[#2f9db0]/25",
                                            !date.isHoliday &&
                                                selectedDateKey !== date.key &&
                                                "border-white/10 bg-white/5 text-white/80 hover:border-[#2f9db0]/50 hover:bg-white/8",
                                        )}
                                        disabled={date.isHoliday}
                                        key={date.key}
                                        onClick={() => setSelectedDateKey(date.key)}
                                        type="button"
                                    >
                                        {selectedDateKey === date.key && !date.isHoliday && (
                                            <span aria-hidden="true" className="absolute -right-3 -top-3 size-10 rounded-full bg-white/10" />
                                        )}
                                        <span className="block text-xs font-bold uppercase opacity-65">{date.day}</span>
                                        <span className="mt-1 block text-sm font-bold">
                                            {date.date} {date.month}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-linear-to-r from-itx-surface to-transparent"
                            />
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-itx-surface to-transparent"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
                <aside className="portal-surface relative overflow-hidden rounded-3xl border p-5 shadow-lg shadow-[#17333e]/5 lg:sticky lg:top-6">
                    <span aria-hidden="true" className="absolute -right-12 -top-12 size-32 rounded-full bg-[#2f9db0]/7 blur-2xl" />
                    <p className="text-xs font-extrabold uppercase tracking-widest text-[#2f9db0]">Choose a system</p>
                    <p className="mt-2 text-sm leading-6 text-white/55">Tap a number to see its full day.</p>
                    <div className="mt-4 grid grid-cols-5 gap-2">
                        {systemIds.map((system) => {
                            const unavailableUntilChanged = indefinitelyUnavailableSystems.has(system);
                            const unavailableToday = unavailableDaySystems.has(system);
                            const selected = activeSystemId === system;

                            let availabilityLabel = "";
                            if (unavailableToday) availabilityLabel = ", temporarily unavailable";
                            if (unavailableUntilChanged) availabilityLabel = ", unavailable until changed";

                            let buttonStyle = "border-white/10 bg-white/5 text-white/60 hover:border-[#2f9db0]/50 hover:bg-white/10 hover:text-[#2f9db0]";
                            if (unavailableToday) buttonStyle = "border-white/8 bg-white/4 text-white/35";
                            if (unavailableUntilChanged) buttonStyle = "cursor-not-allowed border-[#e0637a]/35 bg-[#3d1e26]/60 text-[#ff9fb0]";
                            if (selected) {
                                buttonStyle =
                                    "border-[#2f9db0] bg-linear-to-br from-[#2f9db0] to-[#17939c] text-[#082330] shadow-lg shadow-[#2f9db0]/25 ring-2 ring-[#2f9db0]/15";
                            }

                            let statusDotStyle = "bg-white/40";
                            if (unavailableUntilChanged) statusDotStyle = "bg-[#e0637a]";

                            return (
                                <button
                                aria-label={`View System ${String(system).padStart(2, "0")} availability${availabilityLabel}`}
                                aria-pressed={activeSystemId === system}
                                className={cn(
                                    "relative flex aspect-square min-h-11 items-center justify-center overflow-hidden rounded-xl border text-xs font-extrabold transition-colors duration-150 active:scale-95",
                                    buttonStyle,
                                )}
                                disabled={unavailableUntilChanged}
                                key={system}
                                onClick={() => setSelectedSystemId(system)}
                                type="button"
                            >
                                {selected && <span aria-hidden="true" className="absolute -right-2 -top-2 size-6 rounded-full bg-white/15" />}
                                {String(system).padStart(2, "0")}
                                {unavailableToday && (
                                    <span
                                        aria-hidden="true"
                                        className={cn("absolute right-1 top-1 size-1.5 rounded-full", statusDotStyle)}
                                    />
                                )}
                            </button>
                            );
                        })}
                    </div>
                    {indefinitelyUnavailableSystems.size > 0 && (
                        <p className="mt-4 rounded-xl border border-[#e0637a]/30 bg-[#3d1e26]/60 px-3 py-2.5 text-xs font-semibold leading-5 text-[#ff9fb0]">
                            Red systems are unavailable until restored by the lab administrator. Their activity is hidden.
                        </p>
                    )}
                </aside>

                {activeSystemId ? (
                    <article
                        className="ui-fade-in portal-surface relative overflow-hidden rounded-3xl border p-4 shadow-lg shadow-[#17333e]/5 sm:p-6"
                        key={`${selectedDateKey}-${activeSystemId}`}
                    >
                        <span aria-hidden="true" className="absolute -right-20 -top-20 size-52 rounded-full bg-[#35b7b5]/6 blur-3xl" />
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-widest text-[#2f9db0]">
                                    System {String(activeSystemId).padStart(2, "0")}
                                </p>
                                <h3 className="mt-2 text-xl font-bold text-white">
                                    Occupancy for {selectedDate?.date} {selectedDate?.month}
                                </h3>
                                <p className="mt-1 text-sm text-white/55">Scroll through the day to find a free period.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2 shadow-sm">
                                    <p className="text-sm font-bold text-emerald-300">{formatDuration(freeMinutes)}</p>
                                    <p className="text-xs text-emerald-300/70">Free</p>
                                </div>
                                <div className="rounded-xl border border-[#2f9db0]/20 bg-[#2f9db0]/8 px-3 py-2 shadow-sm">
                                    <p className="text-sm font-bold text-[#7fe0e8]">{formatDuration(bookedMinutes)}</p>
                                    <p className="text-xs text-[#7fe0e8]/70">Booked</p>
                                </div>
                                <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-2 shadow-sm">
                                    <p className="text-sm font-bold text-amber-300">{occupancyPercent}%</p>
                                    <p className="text-xs text-amber-300/70">Occupancy</p>
                                </div>
                            </div>
                        </div>
                        <SystemDayTimeline blocks={systemSchedule} closeMinutes={policy.closeMinutes} openMinutes={policy.openMinutes} />
                        <Link
                            className="group mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#102f3d] to-[#174d5a] px-5 text-sm font-bold text-white shadow-lg shadow-[#102f3d]/15 transition-colors duration-150 hover:from-[#2f9db0] hover:to-[#17939c] sm:ml-auto sm:w-fit"
                            to={`/portal/book?date=${selectedDateKey}`}
                        >
                            Book this time <ArrowUpRight className="size-4" />
                        </Link>
                    </article>
                ) : (
                    <article className="portal-surface relative overflow-hidden rounded-3xl border p-6 shadow-lg shadow-[#17333e]/5">
                        <span aria-hidden="true" className="absolute inset-0 bg-linear-to-br from-white/4 to-transparent" />
                        <div className="relative">
                            <EmptyState message="No system activity is available because every system is unavailable until changed by the administrator." />
                        </div>
                    </article>
                )}
            </section>
        </div>
    );
}
