import { Check } from "lucide-react";

const STATE_STYLES = {
    available: {
        card: "border-itx-border bg-white text-slate-600 hover:border-itx-success/45 hover:bg-itx-success/5 hover:shadow-[0_16px_34px_-22px_rgba(23,168,112,0.3)]",
        dot: "bg-itx-success",
        label: "Available",
        monitor: "bg-[#16323a]",
        screen: "bg-[#1c3d46] text-white/70",
        stand: "bg-slate-300",
    },
    booked: {
        card: "border-itx-border bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 shadow-inner shadow-white/40",
        dot: "bg-slate-400",
        label: "Booked",
        monitor: "bg-[#273137]",
        screen: "bg-[#3a4449] text-white/55",
        stand: "bg-slate-400",
    },
    selected: {
        card: "border-[#269763] bg-gradient-to-br from-[#36b67e] to-[#258f60] text-white shadow-[0_18px_38px_-20px_rgba(31,127,83,0.55)] ring-4 ring-[#2da56f]/20",
        dot: "bg-white",
        label: "Selected",
        monitor: "bg-[#164934]",
        screen: "bg-[#f3fff8] text-[#237e56]",
        stand: "bg-[#176c48]",
    },
    occupied: {
        card: "border-[#128a93]/30 bg-gradient-to-br from-[#e8f6f7] to-[#d9eef0] text-[#0d6169] hover:border-[#128a93]/55 hover:shadow-[0_16px_34px_-23px_rgba(18,138,147,0.3)]",
        dot: "bg-[#128a93]",
        label: "In use",
        monitor: "bg-[#173d46]",
        screen: "bg-[#1c6874] text-white",
        stand: "bg-[#225c66]",
    },
    offline: {
        card: "border-itx-border bg-slate-50 text-slate-400 hover:border-slate-300",
        dot: "bg-slate-300",
        label: "Not available",
        monitor: "bg-slate-300",
        screen: "bg-slate-200 text-slate-400",
        stand: "bg-slate-300",
    },
    unavailableUntilChanged: {
        card: "border-itx-danger/35 bg-gradient-to-br from-[#fdecef] to-[#fbdfe3] text-[#9c3f4d] shadow-[0_14px_30px_-25px_rgba(224,99,122,0.3)]",
        dot: "bg-itx-danger",
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
    if (selected && item.state !== "selected") selectedStyle = "ring-4 ring-[#128a93]/18";

    const cardStyle = [
        "group relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border outline-none",
        "transition-[background-color,border-color,box-shadow,opacity,filter] duration-150 focus-visible:ring-4 focus-visible:ring-[#128a93]/20",
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
            className="relative isolate overflow-hidden rounded-3xl border border-itx-border bg-slate-50 p-3 shadow-inner shadow-white/40 sm:p-4"
        >
            <div className="relative grid grid-cols-2 gap-2.5 min-[380px]:grid-cols-3 sm:gap-3 md:grid-cols-5">
                {items.map((item) => (
                    <Workstation compact={compact} item={item} key={item.id} onSelect={onSelect} selected={selectedId === item.id} />
                ))}
            </div>
        </section>
    );
}
