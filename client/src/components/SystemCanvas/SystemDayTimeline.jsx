function formatHour(minutes) {
    return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function SystemDayTimeline({ blocks, closeMinutes, openMinutes }) {
    const totalMinutes = Math.max(60, closeMinutes - openMinutes);
    const hours = Array.from({ length: Math.floor(totalMinutes / 60) + 1 }, (_, index) => openMinutes + index * 60);

    return (
        <div className="relative isolate overflow-hidden rounded-2xl border border-itx-border bg-slate-50 shadow-inner shadow-[#17333e]/5">
            <div className="flex items-center justify-between gap-3 border-b border-itx-border bg-slate-50 px-4 py-3 shadow-[0_8px_22px_-22px_rgba(15,23,42,0.15)]">
                <div>
                    <p className="text-sm font-bold text-itx-ink">
                        {formatHour(openMinutes)} – {formatHour(closeMinutes)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">15-minute intervals</p>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-[#128a93]/25 bg-[#128a93]/10 px-3 py-1.5 text-xs font-bold text-[#0d6169] shadow-inner shadow-white/40">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[#128a93]" />
                    Scroll to explore
                </span>
            </div>
            <div
                aria-label="Scrollable daily system occupancy timeline"
                className="max-h-120 overflow-y-auto overscroll-contain scroll-smooth py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#128a93] motion-reduce:scroll-auto"
                tabIndex={0}
            >
                <div className="relative" style={{ height: `${(totalMinutes / 60) * 6}rem`, minHeight: "36rem" }}>
                    {hours.map((minutes) => (
                        <div
                            className="absolute inset-x-0 flex items-start"
                            key={minutes}
                            style={{ top: `${((minutes - openMinutes) / totalMinutes) * 100}%` }}
                        >
                            <span className="w-14 -translate-y-2 px-1.5 text-right text-[11px] font-extrabold tabular-nums text-slate-500 sm:w-24 sm:px-3 sm:text-sm">
                                {formatHour(minutes)}
                            </span>
                            <span className="h-px flex-1 bg-itx-border" />
                        </div>
                    ))}
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-14 right-0 top-0 sm:left-24"
                        style={{
                            backgroundImage:
                                "linear-gradient(to bottom, transparent 24%, rgba(15,23,42,.045) 25%, transparent 26%, transparent 49%, rgba(15,23,42,.045) 50%, transparent 51%, transparent 74%, rgba(15,23,42,.045) 75%, transparent 76%)",
                            backgroundSize: "100% 6rem",
                        }}
                    />
                    {blocks.map((block, index) => {
                        const start = Math.max(openMinutes, block.startMinutes);
                        const end = Math.min(closeMinutes, block.endMinutes);
                        if (end <= start) return null;
                        let blockStyle = "border-itx-success/35 bg-linear-to-br from-[#e3f7ec] to-[#d5f0e2] text-[#166a45]";
                        let accentStyle = "bg-itx-success";

                        if (block.tone === "elapsed") {
                            blockStyle = "border-itx-border bg-slate-100 text-slate-400";
                            accentStyle = "bg-slate-300";
                        }
                        if (block.tone === "unavailable") {
                            blockStyle = "border-itx-danger/35 bg-linear-to-br from-[#fdecef] to-[#fbdfe3] text-[#9c3f4d]";
                            accentStyle = "bg-itx-danger";
                        }
                        if (block.tone === "hold") {
                            blockStyle = "border-itx-warning/35 bg-linear-to-br from-[#fdf3e2] to-[#faead0] text-[#8a5a13]";
                            accentStyle = "bg-itx-warning";
                        }
                        return (
                            <div
                                className={`absolute left-14 right-2 flex min-h-14 flex-col justify-center overflow-hidden rounded-xl border px-2 py-2 shadow-[0_12px_25px_-20px_rgba(15,23,42,0.2)] sm:left-24 sm:right-4 sm:px-4 ${blockStyle}`}
                                key={`${block.startMinutes}-${block.endMinutes}-${index}`}
                                style={{
                                    height: `${((end - start) / totalMinutes) * 100}%`,
                                    top: `${((start - openMinutes) / totalMinutes) * 100}%`,
                                }}
                            >
                                <span aria-hidden="true" className={`absolute inset-y-2 left-1 w-1 rounded-full ${accentStyle}`} />
                                <p className="relative truncate text-[11px] font-extrabold uppercase tracking-[0.08em] sm:text-xs">{block.title ?? "Booked"}</p>
                                <p className="relative mt-1 truncate text-xs font-bold tabular-nums sm:text-base">{block.label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
