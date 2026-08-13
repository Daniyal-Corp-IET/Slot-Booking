import { cn } from "../../utils/cn";

const SURFACE_CLASS = "admin-surface rounded-2xl border";

// Shared compact stat tile. Both variants keep the value immediately scannable;
// `variant="fill"` allows the caller to provide a complete icon badge color pair.
export function MetricCard({ accent, className, icon: Icon, label, note, value, variant = "strip" }) {
    if (variant === "fill") {
        return (
            <article
                className={cn(
                    "ui-fade-in portal-metric group relative overflow-hidden rounded-2xl border px-3.5 py-3",
                    className,
                )}
            >
                <div className="relative flex items-center gap-3">
                    <div className={cn("metric-icon-badge flex size-10 shrink-0 items-center justify-center rounded-xl", accent)}>
                        <Icon className="relative size-[1.125rem]" strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-slate-500">{label}</p>
                        <p className="mt-0.5 truncate text-xl font-semibold tracking-[-0.04em] text-itx-ink">{value}</p>
                        {note && <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">{note}</p>}
                    </div>
                </div>
            </article>
        );
    }

    return (
        <article
            className={cn(
                "ui-fade-in",
                SURFACE_CLASS,
                "portal-metric group relative overflow-hidden px-3.5 py-3 text-itx-ink",
                className,
            )}
        >
            <div className="relative flex items-center gap-3">
                <span className={cn("metric-icon-badge flex size-10 shrink-0 items-center justify-center rounded-xl text-white", accent)}>
                    <Icon className="relative size-[1.125rem]" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-slate-500">{label}</p>
                    <p className="mt-0.5 truncate text-xl font-semibold tracking-[-0.04em] text-itx-ink">{value}</p>
                </div>
            </div>
        </article>
    );
}
