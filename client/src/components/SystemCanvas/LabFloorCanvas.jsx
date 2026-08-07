import { Check } from "lucide-react";

const STATE_STYLES = {
    available: {
        card: "border-white/10 bg-white/5 text-white/75 hover:border-[#34c98a]/45 hover:bg-white/8 hover:shadow-[0_16px_34px_-22px_rgba(52,201,138,0.35)]",
        dot: "bg-[#42aa7e]",
        label: "Available",
        monitor: "bg-[#16323a]",
        screen: "bg-[#1c3d46] text-white/70",
        stand: "bg-white/25",
    },
    booked: {
        card: "border-white/12 bg-gradient-to-br from-[#4a545a] to-[#363f44] text-white/65 shadow-inner shadow-white/5",
        dot: "bg-[#aeb7ba]",
        label: "Booked",
        monitor: "bg-[#273137]",
        screen: "bg-[#3a4449] text-white/55",
        stand: "bg-[#303a3f]",
    },
    selected: {
        card: "border-[#269763] bg-gradient-to-br from-[#36b67e] to-[#258f60] text-white shadow-[0_18px_38px_-20px_rgba(31,127,83,0.9)] ring-4 ring-[#2da56f]/20",
        dot: "bg-white",
        label: "Selected",
        monitor: "bg-[#164934]",
        screen: "bg-[#f3fff8] text-[#237e56]",
        stand: "bg-[#176c48]",
    },
    occupied: {
        card: "border-[#2f9db0]/30 bg-gradient-to-br from-[#123c44] to-[#0e2f37] text-[#7fe0e8] hover:border-[#2f9db0]/55 hover:shadow-[0_16px_34px_-23px_rgba(31,184,196,0.45)]",
        dot: "bg-[#2f9db0]",
        label: "In use",
        monitor: "bg-[#173d46]",
        screen: "bg-[#1c6874] text-white",
        stand: "bg-[#225c66]",
    },
    offline: {
        card: "border-white/10 bg-white/4 text-white/40 hover:border-white/20",
        dot: "bg-white/35",
        label: "Not available",
        monitor: "bg-[#3a4245]",
        screen: "bg-[#4a5255] text-white/40",
        stand: "bg-white/20",
    },
    unavailableUntilChanged: {
        card: "border-[#e0637a]/35 bg-gradient-to-br from-[#3d1e26] to-[#2e161d] text-[#ff9fb0] shadow-[0_14px_30px_-25px_rgba(184,78,91,0.55)]",
        dot: "bg-[#e0637a]",
        label: "Unavailable",
        monitor: "bg-[#5a2530]",
        screen: "bg-[#7a3542] text-white/80",
        stand: "bg-[#5a2530]",
    },
};
function Workstation({ compact, item, onSelect, selected }) {
    const styles = STATE_STYLES[item.state];
    const systemNumber = String(item.id).padStart(2, "0");
    const sizeStyle = compact ? "min-h-23 p-2.5" : "min-h-27 p-3";
    const cursorStyle = item.disabled ? "cursor-not-allowed" : "cursor-pointer";
    const visibilityStyle = item.dimmed ? "opacity-20 grayscale" : "opacity-100";
    let selectedStyle = "";
    if (selected && item.state !== "selected") selectedStyle = "ring-4 ring-[#2f9db0]/18";

    const cardStyle = [
        "group relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border outline-none",
        "transition-[background-color,border-color,box-shadow,opacity,filter] duration-150 focus-visible:ring-4 focus-visible:ring-[#2f9db0]/20",
        sizeStyle,
        styles.card,
        cursorStyle,
        visibilityStyle,
        selectedStyle,
    ].join(" ");

    return (
        <button
            aria-label={`System ${systemNumber}, ${styles.label}`}
            aria-pressed={selected}
            className={cardStyle}
            disabled={item.disabled}
            onClick={() => onSelect?.(item.id)}
            type="button"
        >
            <span className={`relative block w-full max-w-17 rounded-lg p-1 shadow-[0_7px_16px_-8px_rgba(7,28,40,0.85)] ${styles.monitor}`}>
                <span className={`relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded ${styles.screen}`}>
                    <span aria-hidden="true" className="absolute -right-1 -top-4 h-8 w-4 rotate-30 bg-white/15 blur-sm" />
                    <span className="text-[10px] font-black tracking-[-0.03em]">{systemNumber}</span>
                    {item.state === "selected" && (
                        <span className="absolute right-1 top-1">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                    )}
                </span>
            </span>
            <span className={`block h-1.5 w-1.5 ${styles.stand}`} />
            <span className={`block h-1 w-6 rounded-full ${styles.stand}`} />
            <span className={`mt-2.5 flex items-center gap-1.5 text-[11px] font-extrabold sm:text-xs ${compact ? "opacity-80" : ""}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                {styles.label}
            </span>
        </button>
    );
}
export function LabFloorCanvas({ ariaLabel, compact = false, items, onSelect, selectedId }) {
    return (
        <section
            aria-label={ariaLabel}
            className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 shadow-inner shadow-black/20 sm:p-4"
        >
            <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10 size-64 rounded-full bg-[#7fd0cb]/10 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 -z-10 size-56 rounded-full bg-[#f0b65e]/8 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-2.5 min-[380px]:grid-cols-3 sm:gap-3 md:grid-cols-5">
                {items.map((item) => (
                    <Workstation compact={compact} item={item} key={item.id} onSelect={onSelect} selected={selectedId === item.id} />
                ))}
            </div>
        </section>
    );
}
