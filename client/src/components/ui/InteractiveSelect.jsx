import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

export function InteractiveSelect({ children, className, defaultValue = "All", label, onChange, value }) {
    const [open, setOpen] = useState(false);
    const controlId = useId();
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const options = Children.toArray(children)
        .filter(isValidElement)
        .map((option) => ({
            disabled: Boolean(option.props.disabled),
            label: option.props.children,
            value: String(option.props.value ?? option.props.children),
        }));
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === String(value)));
    const selectedOption = options[selectedIndex];
    const filtered = String(value) !== String(defaultValue);

    useEffect(() => {
        if (!open) return undefined;

        const closeOnOutsideClick = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        window.requestAnimationFrame(() => {
            listRef.current?.querySelector(`[data-option-index="${selectedIndex}"]`)?.focus();
        });

        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [open, selectedIndex]);

    const chooseOption = (nextValue) => {
        onChange({ target: { value: nextValue } });
        setOpen(false);
        window.requestAnimationFrame(() => rootRef.current?.querySelector("[data-select-trigger]")?.focus());
    };

    const moveOptionFocus = (event, direction) => {
        event.preventDefault();
        const optionButtons = [...listRef.current.querySelectorAll("[data-option-index]:not(:disabled)")];
        const currentIndex = optionButtons.indexOf(document.activeElement);
        const nextIndex = (currentIndex + direction + optionButtons.length) % optionButtons.length;
        optionButtons[nextIndex]?.focus();
    };

    return (
        <div className={cn("group relative min-w-0", className)} ref={rootRef}>
            <button
                aria-controls={`${controlId}-listbox`}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={`${label}: ${selectedOption?.label ?? value}`}
                className={cn(
                    "flex h-11 w-full items-center rounded-xl border pl-3.5 pr-2 text-left text-sm font-bold outline-none",
                    "transition-[border-color,background-color,box-shadow,color] duration-200",
                    "focus-visible:border-[#3096A7] focus-visible:bg-white focus-visible:text-itx-ink focus-visible:ring-4 focus-visible:ring-[#3ee7c2]/15",
                    filtered
                        ? "border-[#3096A7]/30 bg-[#3096A7]/6 text-[#287f8e] hover:border-[#3096A7]/50"
                        : "border-itx-border bg-[#f8fafb] text-slate-600 shadow-sm hover:border-[#3096A7]/35 hover:bg-white hover:text-itx-ink",
                )}
                data-select-trigger
                onClick={() => setOpen((current) => !current)}
                onKeyDown={(event) => {
                    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
                type="button"
            >
                <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? value}</span>
                <span
                    aria-hidden="true"
                    className={cn(
                        "ml-3 flex size-7 shrink-0 items-center justify-center rounded-lg transition-[background-color,color,transform] duration-200",
                        open && "rotate-180",
                        filtered ? "bg-[#3096A7] text-white" : "bg-[#3096A7]/9 text-[#3096A7] group-hover:bg-[#3096A7]/14",
                    )}
                >
                    <ChevronDown className="size-4" strokeWidth={2.25} />
                </span>
            </button>

            {open && (
                <div
                    aria-label={label}
                    className="ui-fade-in absolute inset-x-0 top-[calc(100%+0.4rem)] z-50 max-h-64 overflow-y-auto rounded-xl border border-[#cfe4e6] bg-white p-1.5 shadow-[0_22px_48px_-22px_rgba(7,56,68,0.38)]"
                    id={`${controlId}-listbox`}
                    ref={listRef}
                    role="listbox"
                >
                    {options.map((option, index) => {
                        const selected = option.value === String(value);
                        return (
                            <button
                                aria-selected={selected}
                                className={cn(
                                    "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold outline-none transition-colors duration-150",
                                    "focus-visible:ring-2 focus-visible:ring-[#3096A7]/20",
                                    selected
                                        ? "bg-[#3096A7]/10 text-[#287f8e]"
                                        : "text-slate-600 hover:bg-[#f0f8f8] hover:text-itx-ink",
                                )}
                                data-option-index={index}
                                disabled={option.disabled}
                                key={option.value}
                                onClick={() => chooseOption(option.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "ArrowDown") moveOptionFocus(event, 1);
                                    if (event.key === "ArrowUp") moveOptionFocus(event, -1);
                                    if (event.key === "Home") {
                                        event.preventDefault();
                                        listRef.current.querySelector("[data-option-index]:not(:disabled)")?.focus();
                                    }
                                    if (event.key === "End") {
                                        event.preventDefault();
                                        const optionButtons = listRef.current.querySelectorAll("[data-option-index]:not(:disabled)");
                                        optionButtons[optionButtons.length - 1]?.focus();
                                    }
                                }}
                                role="option"
                                type="button"
                            >
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                {selected && (
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#3096A7] text-white">
                                        <Check className="size-3.5" strokeWidth={2.6} />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
