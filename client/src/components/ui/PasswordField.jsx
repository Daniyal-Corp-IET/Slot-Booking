import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../utils/cn";
import { FORM_FIELD_CLASS } from "./fieldStyles";

// Self-contained show/hide password input. Owns its own visibility state.
export function PasswordField({ autoComplete, id, label, minLength, name, onChange, required = true, value }) {
    const [visible, setVisible] = useState(false);
    const fieldId = id ?? name;
    const Icon = visible ? EyeOff : Eye;

    return (
        <div>
            <label className="block text-sm font-bold text-slate-600" htmlFor={fieldId}>
                {label}
            </label>
            <div className="relative mt-2">
                <input
                    autoComplete={autoComplete}
                    className={cn(FORM_FIELD_CLASS, "pr-12")}
                    id={fieldId}
                    minLength={minLength}
                    name={name}
                    onChange={onChange}
                    required={required}
                    type={visible ? "text" : "password"}
                    value={value}
                />
                <button
                    aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
                    aria-pressed={visible}
                    className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#128a93]/10 hover:text-[#128a93]"
                    onClick={() => setVisible((current) => !current)}
                    type="button"
                >
                    <Icon aria-hidden="true" className="size-4.5" />
                </button>
            </div>
        </div>
    );
}
