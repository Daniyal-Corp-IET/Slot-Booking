import { cn } from "../../utils/cn";

const SURFACE_CLASS = "admin-surface rounded-2xl border";

// Shared compact stat tile. `variant="fill"` allows the caller to provide a
// complete icon badge color pair.
export function MetricCard({ accent, className, icon: Icon, label, value, variant = "strip" }) {
    if (variant === "fill") {
        return (
            <article
                className={cn(
                    "ui-fade-in portal-metric group relative overflow-hidden rounded-2xl border px-3.5 py-3.5",
                    className,
                )}
            >
                <div className="relative flex items-center gap-3">
                    <span className={cn("portal-metric-glow pointer-events-none absolute left-1 top-0.5 size-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40", accent)} />
                    <div className={cn("metric-icon-badge relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl", accent)}>
                        <Icon className="relative size-[1.125rem]" strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.075em] text-slate-500">{label}</p>
                        <p className="mt-1.5 truncate text-2xl font-black leading-none tracking-[-0.045em] text-itx-ink">{value}</p>
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
                "portal-metric group relative overflow-hidden px-3.5 py-3.5 text-itx-ink",
                className,
            )}
        >
            <div className="relative flex items-center gap-3">
                <span className={cn("portal-metric-glow pointer-events-none absolute left-1 top-0.5 size-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30", accent)} />
                <span className={cn("metric-icon-badge relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white", accent)}>
                    <Icon className="relative size-[1.125rem]" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.075em] text-slate-500">{label}</p>
                    <p className="mt-1.5 truncate text-2xl font-black leading-none tracking-[-0.045em] text-itx-ink transition-colors duration-200 group-hover:text-[#0d6169]">
                        {value}
                    </p>
                </div>
            </div>
        </article>
    );
}
