import { useEffect, useState } from "react";
import { TimerReset, X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { useLab } from "../../context/LabContext";
import { useLogin } from "../../context/LoginContext";
import { cn } from "../../utils/cn";
import { formatActivityMinutes } from "../../utils/sessionActivity";
import { NotificationDialog } from "../Feedback/Feedback";
import { Navbar } from "../Navbar/Navbar";
import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarCollapseToggle } from "../Sidebar/SidebarCollapseToggle";
import { useSidebarCollapse } from "../Sidebar/useSidebarCollapse";
import { ADMIN_PAGE_TITLES, SYSTEM_STYLES } from "./AdminPanel.helpers";

export const surface = "admin-surface rounded-3xl shadow-[0_20px_55px_-40px_rgba(2,10,14,0.7)]";

// Shared admin layout
export function AdminReveal({ children, className }) {
    return <div className={cn("ui-fade-in", className)}>{children}</div>;
}

export function AdminAction({ children, className, ...props }) {
    return (
        <button className={cn("ui-press", className)} {...props}>
            {children}
        </button>
    );
}

function AdminShell({ children }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [collapsed, toggleCollapsed] = useSidebarCollapse();
    const { bookings, earlyEndNotice } = useLab();
    const { user } = useLogin();
    const location = useLocation();
    const page = ADMIN_PAGE_TITLES[location.pathname] ?? ADMIN_PAGE_TITLES["/admin"];
    const adminName = user?.name || user?.username || "Administrator";
    const identity = {
        name: adminName,
        initials: adminName.slice(0, 2).toUpperCase(),
        subtitle: "Lab Administrator",
    };

    let activeSessions = 0;
    let upcomingBookings = 0;

    for (const booking of bookings) {
        if (booking.status === "Active") activeSessions += 1;
        if (booking.status === "Upcoming") upcomingBookings += 1;
    }

    const notificationItems = [
        `${activeSessions} sessions are active now.`,
        `${upcomingBookings} upcoming bookings need monitoring.`,
        "System and booking changes are shared with the student portal.",
    ];

    function closeMenu() {
        setMenuOpen(false);
    }

    return (
        <div className="admin-canvas relative min-h-screen text-itx-ink">
            <aside
                className={cn(
                    "portal-sidebar absolute inset-y-0 left-0 z-40 hidden transition-[width] duration-300 ease-smooth xl:block",
                    collapsed ? "w-20" : "w-72",
                )}
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

            <div className={cn("min-h-screen transition-[margin] duration-300", collapsed ? "xl:ml-20" : "xl:ml-72")}>
                <Navbar identity={identity} onMenuOpen={() => setMenuOpen(true)} onNotificationsOpen={() => setNotificationsOpen(true)} page={page} />
                <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10 xl:py-7">
                    {earlyEndNotice && (
                        <div
                            className="portal-surface ui-fade-in mx-auto mb-5 flex max-w-400 items-start gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm font-semibold leading-6 text-itx-success shadow-[0_16px_32px_-25px_rgba(15,23,42,0.1)]"
                            role="status"
                        >
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-itx-success/12 text-itx-success">
                                <TimerReset className="h-4 w-4" />
                            </span>
                            <span>
                                <strong>{earlyEndNotice.studentName}</strong> ended {earlyEndNotice.system} early. It was booked for{" "}
                                {formatActivityMinutes(earlyEndNotice.bookedMinutes)}, used for {formatActivityMinutes(earlyEndNotice.usedMinutes)}, and{" "}
                                {formatActivityMinutes(earlyEndNotice.releasedMinutes)} has been released for other students to book.
                            </span>
                        </div>
                    )}
                    {children}
                </main>
            </div>
            <NotificationDialog items={notificationItems} onClose={() => setNotificationsOpen(false)} open={notificationsOpen} />
        </div>
    );
}
export function StatusLegend() {
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(SYSTEM_STYLES).map(([status, styles]) => (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500" key={status}>
                    <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                    {styles.label}
                </span>
            ))}
        </div>
    );
}

// Admin route layout and shared data
export function AdminPanelView() {
    const location = useLocation();
    const {
        addCourse,
        addStudent,
        clearEarlyEndNotice,
        courses,
        coursesError,
        coursesLoading,
        earlyEndNotice,
        loadCourses,
        loadStudents,
        students,
        studentsError,
        studentsLoading,
    } = useLab();
    useEffect(() => {
        if (!earlyEndNotice) return undefined;

        const timeout = window.setTimeout(() => {
            clearEarlyEndNotice();
        }, 8000);

        return () => window.clearTimeout(timeout);
    }, [clearEarlyEndNotice, earlyEndNotice]);
    let releasedSystemId;

    if (earlyEndNotice) {
        releasedSystemId = Number(earlyEndNotice.system.replace(/\D/g, ""));
    }
    return (
        <AdminShell>
            <div className="ui-page-enter" key={location.pathname}>
                <Outlet
                    context={{
                        addCourse,
                        addStudent,
                        courses,
                        coursesError,
                        coursesLoading,
                        loadCourses,
                        loadStudents,
                        releasedSystemId,
                        students,
                        studentsError,
                        studentsLoading,
                    }}
                />
            </div>
        </AdminShell>
    );
}
