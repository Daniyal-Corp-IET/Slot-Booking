import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";

// Inline tab row: icon + label with a soft fill highlight on the active tab.
// Matches the secondary-nav pattern used by enterprise dashboards (GitHub,
// Linear, Stripe) — sits flush in the section header instead of floating as
// a separate pill switcher.
export function SectionTabs({ tabs }) {
    return (
        <div className="hidden-scrollbar flex items-center gap-1.5 overflow-x-auto py-2.5" role="tablist">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <NavLink
                        className={({ isActive }) =>
                            cn(
                                "group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold outline-none transition-colors duration-150 sm:px-4",
                                isActive ? "bg-itx-teal/10 text-itx-ink" : "text-slate-500 hover:bg-slate-50 hover:text-itx-ink",
                            )
                        }
                        end={tab.end} key={tab.path} role="tab" to={tab.path}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon aria-hidden="true" className={cn("size-4", isActive ? "text-itx-teal" : "text-slate-400 group-hover:text-slate-500")} strokeWidth={2} />
                                {tab.label}
                            </>
                        )}
                    </NavLink>
                );
            })}
        </div>
    );
}
