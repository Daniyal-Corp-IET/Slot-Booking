import { cn } from "../../utils/cn";

const SURFACE_CLASS = "admin-surface rounded-3xl shadow-[0_20px_55px_-40px_rgba(2,10,14,0.7)]";

// Shared stat-tile card. `variant="strip"` (default) is the admin look: accent is a top border
// strip and the icon sits in a neutral badge. `variant="fill"` is the student look: accent is
// applied as the icon badge's own background/text color.
export function MetricCard({ accent, className, icon: Icon, label, note, value, variant = "strip" }) {
    if (variant === "fill") {
        return (
            <article
                className={cn(
                    "ui-fade-in portal-metric group relative overflow-hidden rounded-3xl border p-4 shadow-lg shadow-[#17333e]/4 transition-colors duration-150 hover:border-[#b9dcda] xl:p-5",
                    className,
                )}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-slate-500">{label}</p>
                        <p className="mt-3 text-xl font-semibold tracking-[-0.04em] text-itx-ink sm:text-2xl">{value}</p>
                        <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">{note}</p>
                    </div>
                    <div className={cn("flex size-11 items-center justify-center rounded-2xl shadow-sm", accent)}>
                        <Icon className="size-5" />
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
                "portal-metric group relative overflow-hidden p-4 text-itx-ink transition-colors duration-150 hover:border-[#128a93]/25 xl:p-5",
                className,
            )}
        >
            <span className={cn("absolute inset-x-0 top-0 h-1", accent)} />
            <div className="flex items-start justify-between gap-3">
                <div className="relative">
                    <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tighter text-itx-ink xl:text-3xl">{value}</p>
                </div>
                <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-itx-border bg-slate-50 text-[#128a93] shadow-[0_10px_22px_-16px_rgba(15,23,42,0.15)] xl:h-11 xl:w-11">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
            </div>
            <p className="relative mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{note}</p>
        </article>
    );
}
