import { cn } from "../../utils/cn";

const EMPHASIS_STYLES = {
    "extrabold-caps": "text-xs font-extrabold uppercase",
    bold: "text-[11px] font-bold",
    medium: "text-xs font-bold",
};

// Pure rendering primitive for a status pill. Callers own their own status->color mapping
// (e.g. BOOKING_BADGES, SYSTEM_STYLES) and just pass the resulting color classes in via toneClassName.
export function StatusBadge({ className, dotClassName, emphasis = "extrabold-caps", label, toneClassName }) {
    return (
        <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1.5", EMPHASIS_STYLES[emphasis], toneClassName, className)}>
            {dotClassName && <span className={cn("size-1.5 rounded-full", dotClassName)} />}
            {label}
        </span>
    );
}
