import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";

// Contained tab switcher: icon stacked over label, with a soft highlight
// panel on the active tab instead of an underline. Matches the enterprise
// "selected panel" tab pattern used in workspace switchers.
export function SectionTabs({ tabs }) {
    return (
        <div className="inline-flex w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-auto" role="tablist">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <NavLink
                        className={({ isActive }) =>
                            cn(
                                "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl px-6 py-2.5 text-xs font-bold outline-none transition-colors duration-150 sm:min-w-28 sm:flex-none",
                                isActive ? "bg-[#eaf4f5] text-[#0d6169]" : "text-slate-500 hover:bg-slate-50 hover:text-itx-ink",
                            )
                        }
                        end={tab.end}
                        key={tab.path}
                        role="tab"
                        to={tab.path}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon aria-hidden="true" className={cn("size-[1.15rem]", isActive ? "text-[#3096A7]" : "text-slate-400")} strokeWidth={2} />
                                <span className="truncate">{tab.label}</span>
                            </>
                        )}
                    </NavLink>
                );
            })}
        </div>
    );
}
