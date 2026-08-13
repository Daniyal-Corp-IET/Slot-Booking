import { useState } from "react";
import { Check, Clock3 } from "lucide-react";

const PERIODS = [
    { id: "morning", label: "Morning", detail: "9 AM – 12 PM", start: 9 * 60, end: 12 * 60 },
    { id: "afternoon", label: "Afternoon", detail: "12 PM – 3 PM", start: 12 * 60, end: 15 * 60 },
    { id: "evening", label: "Evening", detail: "3 PM – 6 PM", start: 15 * 60, end: 18 * 60 },
];

function getAvailabilityStyle(count) {
    if (count >= 18) return "bg-itx-success/12 text-itx-success";
    if (count >= 10) return "bg-itx-warning/15 text-[#8a5a13]";
    return "bg-itx-danger/12 text-itx-danger";
}

export function TimeAvailabilityGrid({ intervalMinutes, onSelect, options, selectedTimeId }) {
    const [periodId, setPeriodId] = useState("morning");
    const selectedPeriod = PERIODS.find((period) => period.id === periodId) || PERIODS[0];
    const visibleOptions = options.filter((option) => {
        return option.startMinutes >= selectedPeriod.start && option.startMinutes < selectedPeriod.end;
    });

    return (
        <div>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-itx-border bg-slate-50 p-1">
                {PERIODS.map((period) => {
                    const selected = periodId === period.id;
                    let tabStyle = "text-slate-500 hover:bg-white hover:text-itx-ink";
                    if (selected) tabStyle = "bg-[#3096A7] text-white shadow-sm";

                    return (
                        <button
                            aria-pressed={selected}
                            className={`ui-press min-h-10 rounded-lg px-1 py-1.5 text-center outline-none transition-colors focus-visible:ring-4 focus-visible:ring-[#3096A7]/15 sm:px-2 ${tabStyle}`}
                            key={period.id}
                            onClick={() => setPeriodId(period.id)}
                            type="button"
                        >
                            <span className="block break-words text-[11px] font-bold leading-tight sm:text-xs">{period.label}</span>
                            <span className="mt-0.5 hidden text-[10px] font-medium opacity-75 sm:block">{period.detail}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-600">
                    <Clock3 className="size-3.5 text-[#3096A7]" />
                    Select a start time
                </p>
                <p className="text-[10px] font-semibold text-slate-400">
                    {intervalMinutes}-min intervals
                </p>
            </div>

            <div className="ui-fade-in mt-2.5 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3" key={selectedPeriod.id}>
                {visibleOptions.map((option) => {
                    const selected = selectedTimeId === option.id;
                    const startLabel = option.label.split(/\s+[–-]\s+/)[0];
                    let buttonStyle =
                        "border-itx-border bg-slate-50 text-slate-600 hover:border-[#3096A7]/50 hover:bg-[#3096A7]/8 hover:shadow-[0_14px_30px_-22px_rgba(48,150,167,0.3)]";
                    let availabilityStyle = getAvailabilityStyle(option.availableSystems);

                    if (selected) {
                        buttonStyle =
                            "border-[#3096A7] bg-[#3096A7] text-white shadow-lg shadow-[#3096A7]/20";
                        availabilityStyle = "bg-white/20 text-white ring-1 ring-white/25";
                    }

                    return (
                        <button
                            aria-label={`${option.label}, ${option.availableSystems} systems available`}
                            aria-pressed={selected}
                            className={`ui-press group relative min-h-13 overflow-hidden rounded-xl border px-2.5 py-2 text-left outline-none transition-[background-color,border-color,box-shadow,color] focus-visible:ring-4 focus-visible:ring-[#3096A7]/15 ${buttonStyle}`}
                            key={option.id}
                            onClick={() => onSelect(option.id)}
                            type="button"
                        >
                            <span className="relative block text-sm font-bold tabular-nums">{startLabel}</span>
                            <span
                                className={`relative mt-1 block w-fit whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${availabilityStyle}`}
                            >
                                {option.availableSystems} free
                            </span>
                            {selected && (
                                <span className="ui-fade-in absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white/20">
                                    <Check className="size-3" strokeWidth={3} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {visibleOptions.length === 0 && (
                <div className="ui-opacity-in relative mt-3 overflow-hidden rounded-xl border border-dashed border-itx-border bg-slate-50 py-6 text-center text-xs font-medium text-slate-400">
                    <span className="relative">No starts are available during this period.</span>
                </div>
            )}
        </div>
    );
}
