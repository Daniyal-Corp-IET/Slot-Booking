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
        <div className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-inner shadow-black/20">
            <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 -z-10 size-48 rounded-full bg-[#74ccc7]/10 blur-3xl" />
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3 shadow-[0_8px_22px_-22px_rgba(2,10,14,0.7)]">
                <div>
                    <p className="text-sm font-bold text-white/80">
                        {formatHour(openMinutes)} – {formatHour(closeMinutes)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-white/55">15-minute intervals</p>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-[#2f9db0]/25 bg-[#2f9db0]/10 px-3 py-1.5 text-xs font-bold text-[#7fe0e8] shadow-inner shadow-black/10">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[#2f9db0]" />
                    Scroll to explore
                </span>
            </div>
            <div
                aria-label="Scrollable daily system occupancy timeline"
                className="max-h-120 overflow-y-auto overscroll-contain scroll-smooth py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2f9db0] motion-reduce:scroll-auto"
                tabIndex={0}
            >
                <div className="relative min-w-80" style={{ height: `${(totalMinutes / 60) * 6}rem`, minHeight: "36rem" }}>
                    {hours.map((minutes) => (
                        <div
                            className="absolute inset-x-0 flex items-start"
                            key={minutes}
                            style={{ top: `${((minutes - openMinutes) / totalMinutes) * 100}%` }}
                        >
                            <span className="w-20 -translate-y-2 px-2 text-right text-xs font-extrabold tabular-nums text-white/55 sm:w-24 sm:px-3 sm:text-sm">
                                {formatHour(minutes)}
                            </span>
                            <span className="h-px flex-1 bg-white/10" />
                        </div>
                    ))}
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-20 right-0 top-0 sm:left-24"
                        style={{
                            backgroundImage:
                                "linear-gradient(to bottom, transparent 24%, rgba(255,255,255,.08) 25%, transparent 26%, transparent 49%, rgba(255,255,255,.08) 50%, transparent 51%, transparent 74%, rgba(255,255,255,.08) 75%, transparent 76%)",
                            backgroundSize: "100% 6rem",
                        }}
                    />
                    {blocks.map((block, index) => {
                        const start = Math.max(openMinutes, block.startMinutes);
                        const end = Math.min(closeMinutes, block.endMinutes);
                        if (end <= start) return null;
                        let blockStyle = "border-[#3ba572]/40 bg-gradient-to-br from-[#173a2b] to-[#122d21] text-[#8ce0b4]";
                        let accentStyle = "bg-[#3ba572]";

                        if (block.tone === "elapsed") {
                            blockStyle = "border-white/12 bg-white/5 text-white/40";
                            accentStyle = "bg-white/30";
                        }
                        if (block.tone === "unavailable") {
                            blockStyle = "border-[#e0637a]/40 bg-gradient-to-br from-[#3d1e26] to-[#2e161d] text-[#ff9fb0]";
                            accentStyle = "bg-[#e0637a]";
                        }
                        if (block.tone === "hold") {
                            blockStyle = "border-[#f0b65e]/40 bg-gradient-to-br from-[#3e2f14] to-[#332711] text-[#ffd699]";
                            accentStyle = "bg-[#f0b65e]";
                        }
                        return (
                            <div
                                className={`absolute left-20 right-3 flex min-h-14 flex-col justify-center overflow-hidden rounded-xl border px-3 py-2 shadow-[0_12px_25px_-20px_rgba(2,10,14,0.75)] sm:left-24 sm:right-4 sm:px-4 ${blockStyle}`}
                                key={`${block.startMinutes}-${block.endMinutes}-${index}`}
                                style={{
                                    height: `${((end - start) / totalMinutes) * 100}%`,
                                    top: `${((start - openMinutes) / totalMinutes) * 100}%`,
                                }}
                            >
                                <span aria-hidden="true" className={`absolute inset-y-2 left-1 w-1 rounded-full ${accentStyle}`} />
                                <p className="relative text-xs font-extrabold uppercase tracking-[0.08em]">{block.title ?? "Booked"}</p>
                                <p className="relative mt-1 text-sm font-bold tabular-nums sm:text-base">{block.label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
