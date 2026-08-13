import { ChevronLeft } from "lucide-react";
import { createPortal } from "react-dom";

// Floating toggle, portaled straight to <body> and flush against the desktop sidebar's edge.
// Every route in this app renders inside a `.ui-page-enter` wrapper (see AppRoutes.jsx) whose
// transition animation leaves a resolved (identity) `transform` on the element at rest. Per the
// CSS spec, ANY computed transform other than `none` — including an identity matrix — creates a
// new containing block for `position: fixed` descendants, so without the portal this button would
// center on that wrapper's (page-length) box instead of the real viewport. Portaling to <body>
// sidesteps that regardless of what ancestors do above it, now or later.
export function SidebarCollapseToggle({ collapsed, onToggle }) {
    return createPortal(
        <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={`ui-press fixed top-1/2 z-50 hidden size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-[#073844] text-white shadow-[0_12px_28px_-12px_rgba(7,56,68,0.65)] ring-4 ring-white/75 transition-[left] duration-300 hover:bg-[#3096A7] xl:flex ${collapsed ? "left-20" : "left-72"}`}
            onClick={onToggle}
            type="button"
        >
            <ChevronLeft className={`size-4 transition-transform duration-300 ease-smooth ${collapsed ? "rotate-180" : "rotate-0"}`} />
        </button>,
        document.body,
    );
}
