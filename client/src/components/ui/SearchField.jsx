import { Search } from "lucide-react";
import { cn } from "../../utils/cn";

// Shared search-input pattern: icon + text input, visually-hidden label for a11y.
export function SearchField({ className, label, onChange, placeholder, value }) {
    return (
        <label className="relative block">
            <span className="sr-only">{label}</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
                className={cn(
                    "h-11 w-full rounded-xl border border-itx-border bg-[#f8fafb] pl-10 pr-3 text-sm font-semibold text-itx-ink shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-[#128a93] focus:bg-white focus:ring-4 focus:ring-[#3ee7c2]/15",
                    className,
                )}
                onChange={onChange}
                placeholder={placeholder}
                value={value}
            />
        </label>
    );
}
