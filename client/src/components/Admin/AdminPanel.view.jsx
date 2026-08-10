import { useEffect, useState } from "react";
import { TimerReset, X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { useLab } from "../../context/LabContext";
import { useLogin } from "../../context/LoginContext";
import { formatActivityMinutes } from "../../utils/sessionActivity";
import { NotificationDialog } from "../Feedback/Feedback";
import { Navbar } from "../Navbar/Navbar";
import { Sidebar } from "../Sidebar/Sidebar";
import { ADMIN_PAGE_TITLES, SYSTEM_STYLES, joinClasses } from "./AdminPanel.helpers";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function apiRequest(path, method = "GET", values) {
    let response;
    const requestOptions = {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    };

    if (values) {
        requestOptions.body = JSON.stringify(values);
    }

    try {
        response = await fetch(`${API_URL}${path}`, requestOptions);
    } catch {
        throw new Error("Unable to connect to the server. Please start the backend and try again.");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
    }

    return data;
}

function monthLabel(value) {
    return new Date(value).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function usageLabel(minutes) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function prepareStudent(student) {
    const percent = Math.min(100, Math.round((student.monthlyUsedMinutes / student.monthlyLimitMinutes) * 100));
    let status = "Active";

    if (percent >= 85) status = "Near limit";

    return {
        ...student,
        name: `${student.firstName} ${student.lastName}`,
        initials: `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase(),
        program: student.course.name,
        term: `${monthLabel(student.programStart)} – ${monthLabel(student.programEnd)}`,
        phone: student.phoneNumber || "Not provided",
        monthly: usageLabel(student.monthlyUsedMinutes),
        monthlyLimit: usageLabel(student.monthlyLimitMinutes),
        monthlyRemaining: usageLabel(Math.max(0, student.monthlyLimitMinutes - student.monthlyUsedMinutes)),
        percent,
        status,
    };
}

async function getCourses() {
    const data = await apiRequest("/courses");
    return data.courses;
}

async function createCourse(course) {
    const data = await apiRequest("/courses", "POST", course);
    return data.course;
}

async function getStudents() {
    const data = await apiRequest("/students");
    return data.students.map(prepareStudent);
}

async function createStudent(student) {
    const data = await apiRequest("/students", "POST", student);
    return prepareStudent(data.student);
}

export const surface = "admin-surface rounded-3xl shadow-[0_20px_55px_-40px_rgba(2,10,14,0.7)]";

// Shared admin layout
export function AdminReveal({ children, className }) {
    return <div className={joinClasses("ui-fade-in", className)}>{children}</div>;
}

export function AdminAction({ children, className, ...props }) {
    return (
        <button className={joinClasses("ui-press", className)} {...props}>
            {children}
        </button>
    );
}

function AdminShell({ children }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
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
            <aside className="portal-sidebar absolute inset-y-0 left-0 z-40 hidden w-72 xl:block">
                <div className="sticky top-0 h-screen overflow-hidden">
                    <Sidebar identity={identity} />
                </div>
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

            <div className="min-h-screen xl:ml-72">
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
export function MetricCard({ accent, icon: Icon, label, note, value }) {
    return (
        <article
            className={joinClasses(
                "ui-fade-in",
                surface,
                "portal-metric group relative overflow-hidden p-4 text-itx-ink transition-colors duration-150 hover:border-[#128a93]/25 xl:p-5",
            )}
        >
            <span className={joinClasses("absolute inset-x-0 top-0 h-1", accent)} />
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
export function StatusLegend() {
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(SYSTEM_STYLES).map(([status, styles]) => (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500" key={status}>
                    <span className={joinClasses("h-2 w-2 rounded-full", styles.dot)} />
                    {styles.label}
                </span>
            ))}
        </div>
    );
}

// Admin route layout and shared data
export function AdminPanelView() {
    const location = useLocation();
    const { bookings, clearEarlyEndNotice, earlyEndNotice, policy } = useLab();
    const [courses, setCourses] = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [coursesError, setCoursesError] = useState("");
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(true);
    const [studentsError, setStudentsError] = useState("");
    const loadCourses = async () => {
        try {
            setCoursesLoading(true);
            setCoursesError("");
            setCourses(await getCourses());
        } catch (error) {
            setCoursesError(error.message);
        } finally {
            setCoursesLoading(false);
        }
    };
    const addCourse = async (course) => {
        const savedCourse = await createCourse(course);
        setCourses((current) => [...current, savedCourse].sort((first, second) => first.name.localeCompare(second.name)));
    };
    const loadStudents = async () => {
        try {
            setStudentsLoading(true);
            setStudentsError("");
            setStudents(await getStudents());
        } catch (error) {
            setStudentsError(error.message);
        } finally {
            setStudentsLoading(false);
        }
    };
    const addStudent = async (studentDetails) => {
        const savedStudent = await createStudent(studentDetails);
        setStudents((current) => [savedStudent, ...current]);
        return savedStudent;
    };
    useEffect(() => {
        let pageIsOpen = true;

        async function loadInitialCourses() {
            try {
                const savedCourses = await getCourses();
                if (pageIsOpen) setCourses(savedCourses);
            } catch (error) {
                if (pageIsOpen) setCoursesError(error.message);
            } finally {
                if (pageIsOpen) setCoursesLoading(false);
            }
        }

        loadInitialCourses();

        return () => {
            pageIsOpen = false;
        };
    }, []);
    useEffect(() => {
        let pageIsOpen = true;

        async function loadCurrentStudents() {
            try {
                const savedStudents = await getStudents();
                if (pageIsOpen) setStudents(savedStudents);
            } catch (error) {
                if (pageIsOpen) setStudentsError(error.message);
            } finally {
                if (pageIsOpen) setStudentsLoading(false);
            }
        }

        loadCurrentStudents();

        return () => {
            pageIsOpen = false;
        };
    }, [bookings, policy.monthlyLimitHours]);
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
