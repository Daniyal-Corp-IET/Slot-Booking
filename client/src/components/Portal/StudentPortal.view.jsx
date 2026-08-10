import { useState } from "react";
import { X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { useLab } from "../../context/LabContext";
import { NotificationDialog } from "../Feedback/Feedback";
import { Navbar } from "../Navbar/Navbar";
import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarCollapseToggle } from "../Sidebar/SidebarCollapseToggle";
import { useSidebarCollapse } from "../Sidebar/useSidebarCollapse";
import { STUDENT_PAGE_TITLES } from "./StudentPortal.helpers";

// Student route layout
export function StudentPortalView({ onPasswordChanged, student }) {
    const location = useLocation();
    const { bookings, policy } = useLab();
    const [menuOpen, setMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [collapsed, toggleCollapsed] = useSidebarCollapse();
    const page = STUDENT_PAGE_TITLES[location.pathname] ?? STUDENT_PAGE_TITLES["/portal"];
    const identity = { name: student.name, initials: student.initials, subtitle: student.id };

    let upcomingBookings = 0;
    for (const booking of bookings) {
        const belongsToStudent = booking.studentId === student.id;
        if (belongsToStudent && booking.status === "Upcoming") upcomingBookings += 1;
    }

    const notifications = [
        `${upcomingBookings} upcoming lab bookings are scheduled.`,
        "You can end an active session early and unused time will be released.",
        `Lab bookings currently use ${policy.bookingIncrementMinutes}-minute increments.`,
    ];

    function closeMenu() {
        setMenuOpen(false);
    }

    return (
        <div className="portal-canvas relative min-h-screen text-itx-ink">
            <aside
                className={`portal-sidebar absolute inset-y-0 left-0 z-40 hidden transition-[width] duration-300 ease-smooth xl:block ${collapsed ? "w-20" : "w-72"}`}
            >
                <div className="sticky top-0 h-screen overflow-hidden">
                    <Sidebar collapsed={collapsed} identity={identity} />
                </div>
                <SidebarCollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
            </aside>

            {menuOpen && (
                <div className="ui-fade-in fixed inset-0 z-50 xl:hidden">
                    <button aria-label="Close navigation" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeMenu} type="button" />
                    <aside className="portal-sidebar ui-slide-in-left relative h-full w-72 max-w-[85vw] overflow-hidden shadow-2xl">
                        <button
                            aria-label="Close navigation"
                            className="absolute right-3 top-3 z-10 rounded-xl border border-itx-border bg-white p-2 text-itx-ink shadow-sm"
                            onClick={closeMenu}
                            type="button"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <Sidebar identity={identity} onNavigate={closeMenu} />
                    </aside>
                </div>
            )}

            <div className={`min-h-screen transition-[margin] duration-300 ${collapsed ? "xl:ml-20" : "xl:ml-72"}`}>
                <Navbar identity={identity} onMenuOpen={() => setMenuOpen(true)} onNotificationsOpen={() => setNotificationsOpen(true)} page={page} />
                <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10 xl:py-7">
                    <div className="ui-page-enter" key={location.pathname}>
                        <Outlet context={{ onPasswordChanged, student }} />
                    </div>
                </main>
            </div>
            <NotificationDialog items={notifications} onClose={() => setNotificationsOpen(false)} open={notificationsOpen} />
        </div>
    );
}
