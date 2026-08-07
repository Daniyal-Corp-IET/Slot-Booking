import { useState } from "react";
import { Check, Clock3 } from "lucide-react";

const PERIODS = [
    { id: "morning", label: "Morning", detail: "9 AM – 12 PM", start: 9 * 60, end: 12 * 60 },
    { id: "afternoon", label: "Afternoon", detail: "12 PM – 3 PM", start: 12 * 60, end: 15 * 60 },
    { id: "evening", label: "Evening", detail: "3 PM – 6 PM", start: 15 * 60, end: 18 * 60 },
];

function getAvailabilityStyle(count) {
    if (count >= 18) return "bg-emerald-400/15 text-emerald-300";
    if (count >= 10) return "bg-amber-400/15 text-amber-300";
    return "bg-rose-400/15 text-rose-300";
}

export function TimeAvailabilityGrid({ intervalMinutes, onSelect, options, selectedTimeId }) {
    const [periodId, setPeriodId] = useState("morning");
    const selectedPeriod = PERIODS.find((period) => period.id === periodId) || PERIODS[0];
    const visibleOptions = options.filter((option) => {
        return option.startMinutes >= selectedPeriod.start && option.startMinutes < selectedPeriod.end;
    });

    return (
        <div>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-[0_12px_30px_-26px_rgba(2,10,14,0.7)]">
                {PERIODS.map((period) => {
                    const selected = periodId === period.id;
                    let tabStyle = "text-white/50 hover:bg-white/8 hover:text-white/80";
                    if (selected) tabStyle = "text-white shadow-md";

                    return (
                        <button
                            aria-pressed={selected}
                            className={`ui-press relative isolate min-h-13 overflow-hidden rounded-xl px-1.5 py-2 text-center outline-none transition-colors focus-visible:ring-4 focus-visible:ring-[#2f9db0]/15 sm:px-2 ${tabStyle}`}
                            key={period.id}
                            onClick={() => setPeriodId(period.id)}
                            type="button"
                        >
                            {selected && (
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-[#173c4a] to-[#102f3d] shadow-inner shadow-white/5"
                                />
                            )}
                            <span className="relative block text-[13px] font-bold">{period.label}</span>
                            <span className="relative mt-0.5 hidden text-[11px] font-medium opacity-60 sm:block">{period.detail}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.06em] text-white/70">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-[#2f9db0]/15 text-[#2f9db0] shadow-inner shadow-black/10">
                        <Clock3 className="size-4" />
                    </span>
                    Select a start time
                </p>
                <p className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/55">
                    {intervalMinutes}-minute intervals
                </p>
            </div>

            <div className="ui-fade-in mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" key={selectedPeriod.id}>
                {visibleOptions.map((option) => {
                    const selected = selectedTimeId === option.id;
                    const startLabel = option.label.split(/\s+[–-]\s+/)[0];
                    let buttonStyle =
                        "border-white/10 bg-white/5 text-white/80 hover:border-[#2f9db0]/50 hover:bg-white/8 hover:shadow-[0_14px_30px_-22px_rgba(31,184,196,0.35)]";
                    let availabilityStyle = getAvailabilityStyle(option.availableSystems);

                    if (selected) {
                        buttonStyle =
                            "border-[#2f9db0] bg-gradient-to-br from-[#2f9db0] to-[#138b99] text-white shadow-lg shadow-[#2f9db0]/20";
                        availabilityStyle = "bg-white/15 text-white ring-1 ring-white/10";
                    }

                    return (
                        <button
                            aria-label={`${option.label}, ${option.availableSystems} systems available`}
                            aria-pressed={selected}
                            className={`ui-press group relative min-h-17 overflow-hidden rounded-2xl border px-3 py-2.5 text-left outline-none transition-[background-color,border-color,box-shadow,color] focus-visible:ring-4 focus-visible:ring-[#2f9db0]/15 ${buttonStyle}`}
                            key={option.id}
                            onClick={() => onSelect(option.id)}
                            type="button"
                        >
                            <span className="relative block text-[15px] font-bold tabular-nums">{startLabel}</span>
                            <span
                                className={`relative mt-1.5 block w-fit whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${availabilityStyle}`}
                            >
                                {option.availableSystems} free
                            </span>
                            {selected && (
                                <span className="ui-fade-in absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white/15">
                                    <Check className="size-3" strokeWidth={3} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {visibleOptions.length === 0 && (
                <div className="ui-opacity-in relative mt-3 overflow-hidden rounded-2xl border border-dashed border-white/12 bg-white/5 py-10 text-center text-xs font-medium text-white/45">
                    <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6bcac4]/10 blur-2xl"
                    />
                    <span className="relative">No starts are available during this period.</span>
                </div>
            )}
        </div>
    );
}
