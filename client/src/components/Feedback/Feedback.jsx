import { useEffect, useId, useRef } from "react";
import { Bell, CheckCircle2, Inbox, X } from "lucide-react";

export function AppDialog({ children, className = "", description, footer, open, title, onClose }) {
    const dialogRef = useRef(null);
    const previousFocus = useRef(null);
    const titleId = useId();
    const descriptionId = useId();
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            previousFocus.current = document.activeElement;
            dialog.showModal();
        }
        if (!open && dialog.open) {
            dialog.close();
            previousFocus.current?.focus();
        }
        return () => {
            if (open && dialog.open) dialog.close();
            if (open) previousFocus.current?.focus();
        };
    }, [open]);
    return (
        <dialog
            aria-describedby={description ? descriptionId : undefined}
            aria-labelledby={titleId}
            className={`app-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-4xl border border-itx-border bg-[linear-gradient(145deg,#ffffff_0%,#fbfdfc_58%,#f4f9f8_100%)] p-0 text-itx-ink shadow-[0_32px_90px_-28px_rgba(15,23,42,0.28)] ${className}`}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            ref={dialogRef}
        >
            <div className="ui-fade-in relative isolate overflow-hidden p-5 sm:p-7" key={open ? "open" : "closed"}>
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#128a93] via-[#2bb8c6] to-[#e3ac5c]" />
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-itx-ink" id={titleId}>
                            {title}
                        </h2>
                        {description && (
                            <p className="mt-2 text-sm leading-6 text-slate-500" id={descriptionId}>
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        aria-label="Close dialog"
                        className="ui-press flex size-10 shrink-0 items-center justify-center rounded-xl border border-itx-border bg-slate-50 text-slate-500 shadow-sm outline-none transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-itx-ink focus-visible:ring-4 focus-visible:ring-[#128a93]/15"
                        onClick={onClose}
                        type="button"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                <div className="mt-5">{children}</div>
                {footer && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
            </div>
        </dialog>
    );
}
export function ConfirmDialog({ confirmLabel, description, open, title, tone = "danger", onClose, onConfirm }) {
    const confirmClass = tone === "danger" ? "from-[#c45c68] to-[#a6414e] shadow-[#a6414e]/20" : "from-[#b47b27] to-[#8d5b16] shadow-[#8d5b16]/20";
    return (
        <AppDialog
            description={description}
            footer={
                <>
                    <button
                        className="ui-press h-12 rounded-2xl border border-itx-border bg-slate-50 px-5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-itx-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#128a93]/15"
                        onClick={onClose}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        className={`ui-press h-12 rounded-2xl bg-gradient-to-br px-5 text-sm font-bold text-white shadow-lg transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-current/20 ${confirmClass}`}
                        onClick={onConfirm}
                        type="button"
                    >
                        {confirmLabel}
                    </button>
                </>
            }
            onClose={onClose}
            open={open}
            title={title}
        >
            <div className="rounded-2xl border border-itx-border bg-slate-50 p-4 text-sm leading-6 text-slate-500 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.1)]">
                This action updates both the student and admin portals.
            </div>
        </AppDialog>
    );
}
export function NotificationDialog({ items, open, onClose }) {
    return (
        <AppDialog description="Recent lab and booking updates." onClose={onClose} open={open} title="Notifications">
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div
                        className="group flex gap-3 rounded-2xl border border-itx-border bg-slate-50 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.12)] transition-colors duration-150 hover:border-[#128a93]/25 hover:bg-[#128a93]/5"
                        key={`${item}-${index}`}
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#128a93]/10 text-[#128a93] shadow-inner shadow-black/5">
                            <Bell className="size-4" />
                        </span>
                        <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
                    </div>
                ))}
            </div>
        </AppDialog>
    );
}
export function Toast({ message, onClose }) {
    useEffect(() => {
        const timeout = window.setTimeout(onClose, 3500);
        return () => window.clearTimeout(timeout);
    }, [onClose]);
    return (
        <div
            className="ui-opacity-in fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-60 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 overflow-hidden rounded-2xl border border-itx-border bg-white px-4 py-3 text-sm font-semibold text-itx-ink shadow-[0_24px_60px_-22px_rgba(15,23,42,0.25)] sm:bottom-5 sm:left-auto sm:right-5 sm:w-full sm:translate-x-0"
            role="status"
        >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-itx-teal to-itx-success" />
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-itx-success/12 ring-1 ring-itx-success/20">
                <CheckCircle2 className="size-4 text-itx-success" />
            </span>
            <span className="flex-1">{message}</span>
            <button
                aria-label="Dismiss message"
                className="ui-press flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-itx-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                onClick={onClose}
                type="button"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}
export function EmptyState({ message }) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <span className="relative mx-auto flex size-12 items-center justify-center rounded-2xl border border-itx-border bg-white text-slate-400 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.15)]">
                <Inbox className="size-6" />
            </span>
            <p className="relative mt-4 text-sm font-semibold text-slate-500">{message}</p>
        </div>
    );
}
export function LoadingState({ message }) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <span className="relative mx-auto flex size-12 items-center justify-center rounded-2xl border border-itx-border bg-white text-[#128a93] shadow-[0_14px_30px_-22px_rgba(15,23,42,0.15)]">
                <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-current" />
            </span>
            <p className="relative mt-4 text-sm font-semibold text-slate-500" role="status">
                {message}
            </p>
        </div>
    );
}
