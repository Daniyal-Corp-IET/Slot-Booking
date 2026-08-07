import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarCheck, CircleCheck, Clock3, Eye, EyeOff, KeyRound, Monitor, Play, Sparkles, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { formatBookingDate, formatBookingTime, hasPassedHalfwayWithoutStart } from "../../../context/LabContext.helpers";
import { AppDialog } from "../../Feedback/Feedback";
import { cn, formatCurrentDate, formatDuration } from "../StudentPortal.helpers";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function changeStudentPassword(studentId, currentPassword, newPassword) {
    let response;

    try {
        response = await fetch(`${API_URL}/students/${studentId}/change-password`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    } catch {
        throw new Error("Unable to connect to the server. Please start the backend and try again.");
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to change the password.");
    return data;
}

function MetricCard({ accent, icon: Icon, label, note, surface, value }) {
    return (
        <article
            className={cn(
                "ui-fade-in portal-metric group relative overflow-hidden rounded-3xl border p-4 shadow-lg shadow-[#17333e]/4 transition-colors duration-150 hover:border-[#b9dcda] xl:p-5",
                surface,
            )}
        >
            <span aria-hidden="true" className="absolute -right-6 -top-8 size-24 rounded-full border-[1.25rem] border-white/30" />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-[#2f9db0] via-[#55cbbb] to-[#f0b55c] opacity-70" />
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-white/55">{label}</p>
                    <p className="mt-3 text-xl font-semibold tracking-[-0.04em] text-itx-ink sm:text-2xl">{value}</p>
                    <p className="mt-1.5 text-xs font-semibold leading-5 text-white/45">{note}</p>
                </div>
                <div className={cn("flex size-11 items-center justify-center rounded-2xl shadow-sm", accent)}>
                    <Icon className="size-5" />
                </div>
            </div>
        </article>
    );
}
function MonthlyUsageCard({ student }) {
    return (
        <article className="ui-fade-in premium-hero group relative overflow-hidden rounded-4xl border border-white/7 p-5 text-white shadow-2xl shadow-[#102f3d]/18 md:p-6 xl:p-7">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(51,196,199,0.2),transparent_28%),radial-gradient(circle_at_15%_100%,rgba(244,183,83,0.1),transparent_35%)]"
            />
            <div aria-hidden="true" className="absolute -right-14 -top-20 size-56 rounded-full border-[2.5rem] border-dashed border-white/4.5" />
            <div className="relative grid grid-cols-[1fr_auto] items-center gap-4 sm:gap-6">
                <div>
                    <div className="flex items-center gap-2 text-[#8edce3]">
                        <TimerReset className="size-4" />
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Monthly lab allowance</span>
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-[-0.055em] md:mt-5 md:text-4xl xl:text-5xl">{student.monthly}</p>
                    <p className="mt-2 text-sm font-medium text-white/45">of {student.monthlyLimit} used this month</p>
                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5 sm:mt-6">
                        <div
                            className="ui-grow-x h-full origin-left rounded-full bg-linear-to-r from-[#29b7c4] via-[#65d8c3] to-[#f2c46d] shadow-[0_0_18px_rgba(98,213,189,0.45)]"
                            style={{ width: `${student.percent}%` }}
                        />
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-xs font-bold sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-white/45">{student.percent}% consumed</span>
                        <span className="text-[#7fe0ca]">{student.monthlyRemaining} remaining</span>
                    </div>
                </div>
                <div
                    className="relative mx-auto flex size-24 items-center justify-center rounded-full shadow-[0_0_50px_rgba(43,183,197,0.14)] md:size-30 xl:size-36"
                    style={{
                        background: `conic-gradient(#2bb7c5 0 ${student.percent}%, rgba(255,255,255,.09) ${student.percent}% 100%)`,
                    }}
                >
                    <div className="flex size-18 flex-col items-center justify-center rounded-full border border-white/8 bg-[#0c2a38] shadow-inner md:size-23 xl:size-28">
                        <span className="text-lg font-semibold md:text-xl xl:text-2xl">{student.percent}%</span>
                        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/45">this month</span>
                    </div>
                </div>
            </div>
        </article>
    );
}
function buildRecentActivity(bookings, studentId) {
    const activity = [];

    for (let index = 0; index < 7; index += 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));

        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        let minutes = 0;
        for (const booking of bookings) {
            const belongsToStudent = booking.studentId === studentId;
            const completed = booking.status === "Completed";
            const bookedOnThisDay = booking.startsAt >= date.getTime() && booking.startsAt < nextDate.getTime();

            if (belongsToStudent && completed && bookedOnThisDay) {
                minutes += booking.usedMinutes ?? booking.bookedMinutes;
            }
        }

        activity.push({
            day: date.toLocaleDateString("en-US", { weekday: "short" }),
            label: formatDuration(minutes),
            minutes,
            value: Math.min(100, Math.round((minutes / 300) * 100)),
        });
    }

    return activity;
}
function ActivityChart({ activity }) {
    let peakValue = 0;
    let totalMinutes = 0;
    for (const item of activity) {
        peakValue = Math.max(peakValue, item.value);
        totalMinutes += item.minutes;
    }
    return (
        <article className="ui-fade-in portal-surface relative overflow-hidden rounded-3xl border p-5 shadow-lg shadow-[#17333e]/5 sm:p-6">
            <div aria-hidden="true" className="absolute -right-20 -top-20 size-52 rounded-full bg-[#58c7c1]/7 blur-3xl" />
            <div className="relative flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2f9db0]">Last seven days</p>
                    <h2 className="mt-1.5 text-lg font-bold text-white">Weekly lab activity</h2>
                    <p className="mt-1 text-xs text-white/55">Daily time spent using a lab system.</p>
                </div>
                <div className="sm:text-right">
                    <p className="text-2xl font-bold tracking-[-0.04em] text-white">{formatDuration(totalMinutes)}</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/55">{formatDuration(Math.round(totalMinutes / 7))} daily average</p>
                </div>
            </div>

            <figure className="relative mt-6 rounded-2xl bg-white/3 px-2 pt-2" aria-label="Weekly lab activity bar chart">
                <div className="absolute bottom-7 left-0 top-5 flex flex-col justify-between text-xs font-semibold text-white/40">
                    <span>3h</span>
                    <span>2h</span>
                    <span>1h</span>
                    <span>0</span>
                </div>
                <div aria-hidden="true" className="absolute bottom-8 left-8 right-0 top-6 flex flex-col justify-between">
                    <span className="border-t border-white/8" />
                    <span className="border-t border-white/8" />
                    <span className="border-t border-white/8" />
                    <span className="border-t border-white/12" />
                </div>
                <div className="relative ml-8 grid h-55 grid-cols-7 gap-2 sm:gap-4">
                    {activity.map((item) => {
                        const isPeak = item.value > 0 && item.value === peakValue;
                        return (
                            <div aria-label={`${item.day}: ${item.label}`} className="flex min-w-0 flex-col items-center" key={item.day}>
                                <span
                                    className={cn(
                                        "mb-2 h-5 whitespace-nowrap text-xs font-semibold",
                                        isPeak ? "text-white" : "hidden text-white/55 sm:block",
                                    )}
                                >
                                    {item.label}
                                </span>
                                <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                                    <div
                                        className={cn(
                                            "ui-grow-height w-full max-w-8 rounded-t-lg shadow-sm transition-colors",
                                            isPeak
                                                ? "bg-linear-to-t from-[#2f9db0] to-[#3ee7c2] shadow-[#2f9db0]/30"
                                                : "bg-linear-to-t from-[#2f9db0]/40 to-[#3ee7c2]/40 hover:from-[#2f9db0]/60 hover:to-[#3ee7c2]/60",
                                        )}
                                        style={{ "--bar-height": `${item.value}%`, height: `${item.value}%` }}
                                    />
                                </div>
                                <span className={cn("mt-2.5 text-xs font-bold", isPeak ? "text-white" : "text-white/45")}>{item.day}</span>
                            </div>
                        );
                    })}
                </div>
                <figcaption className="sr-only">Hours spent in the computer lab during each of the last seven days.</figcaption>
            </figure>
        </article>
    );
}
function UpcomingSlot({ booking, onStart, ready, startWarning, starting }) {
    if (!booking) {
        return (
            <article className="ui-fade-in group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f2f38]/80 p-5 shadow-lg shadow-black/20 sm:p-6">
                <span aria-hidden="true" className="absolute -right-12 -top-12 size-36 rounded-full border-18 border-[#2f9db0]/6" />
                <h2 className="relative text-base font-bold text-white">Next booking</h2>
                <div className="relative mt-5 flex flex-col items-center rounded-3xl border border-dashed border-white/12 bg-white/5 px-4 py-6 text-center">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-[#2f9db0]/12 text-[#2f9db0] shadow-lg shadow-[#2f9db0]/10">
                        <CalendarCheck className="size-6" />
                    </span>
                    <p className="mt-4 text-sm font-bold text-white/80">Your schedule is clear</p>
                    <p className="mt-1 max-w-48 text-xs leading-5 text-white/55">Pick a time that works and make this space yours.</p>
                </div>
                <Link
                    className="group/link relative mt-4 flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-[#102f3d] to-[#174e5d] py-3 text-xs font-bold text-white shadow-lg shadow-[#102f3d]/15 transition-colors duration-150 hover:from-[#2f9db0] hover:to-[#17939c]"
                    to="/portal/book"
                >
                    Book a slot <ArrowUpRight className="size-3.5" />
                </Link>
            </article>
        );
    }
    return (
        <article className="ui-fade-in group relative overflow-hidden rounded-3xl border border-[#f0b65e]/25 bg-[#0f2f38]/80 p-5 shadow-lg shadow-black/20 sm:p-6">
            <span aria-hidden="true" className="absolute -right-10 -top-12 size-36 rounded-full bg-[#f2b85e]/10 blur-2xl" />
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Next booking</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-300">
                    <CircleCheck className="size-3.5" /> {ready ? "Ready" : "Confirmed"}
                </span>
            </div>
            <div className="relative mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#2f9db0]/12 text-[#2f9db0]">
                        <Monitor className="size-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">System {String(booking.systemId).padStart(2, "0")}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-white/45">{ready ? "Ready for you to start" : "Upcoming booking"}</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-white/5 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Date</p>
                        <p className="mt-1 text-xs font-bold text-white/80">{formatBookingDate(booking.startsAt)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Time</p>
                        <p className="mt-1 text-xs font-bold text-white/80">{formatBookingTime(booking)}</p>
                    </div>
                </div>
            </div>
            {ready ? (
                <>
                    {startWarning && (
                        <div className="relative mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-semibold leading-5 text-amber-200" role="alert">
                            Half of this session has passed. Start now to use the remaining time. The full booking will still be charged.
                        </div>
                    )}
                    <button
                        className="relative mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#238c70] px-4 text-sm font-bold text-white shadow-lg shadow-[#238c70]/15 transition-colors hover:bg-[#1d775f] disabled:cursor-wait disabled:opacity-60"
                        disabled={starting}
                        onClick={onStart}
                        type="button"
                    >
                        <Play className="size-4 fill-current" /> {starting ? "Starting..." : "Start session"}
                    </button>
                    <p className="relative mt-2 text-center text-xs font-medium leading-5 text-white/45">The full booked period remains chargeable if you start late.</p>
                </>
            ) : (
                <Link
                    className="group/link relative mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 py-3 text-xs font-bold text-white/80 transition-colors duration-150 hover:border-[#2f9db0] hover:text-[#2f9db0]"
                    to="/portal/history"
                >
                    View booking <ArrowUpRight className="size-3.5" />
                </Link>
            )}
        </article>
    );
}
// Student home page
export function DashboardHome({ onPasswordChanged, student }) {
    const { bookings, startBooking } = useLab();
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [startingId, setStartingId] = useState("");
    const [startError, setStartError] = useState("");
    let totalMinutes = 0;
    let completedCount = 0;
    let upcomingCount = 0;
    let nextBooking;

    for (const booking of bookings) {
        const belongsToStudent = booking.studentId === student.id;
        const cancelled = booking.status === "Cancelled";
        if (!belongsToStudent || cancelled) continue;

        if (booking.status === "Completed") {
            completedCount += 1;
            totalMinutes += booking.usedMinutes ?? booking.bookedMinutes;
        }
        if (booking.status === "Upcoming") {
            upcomingCount += 1;
            if (!nextBooking || booking.startsAt < nextBooking.startsAt) nextBooking = booking;
        }
    }

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 15_000);
        return () => window.clearInterval(timer);
    }, []);

    const nextBookingEndsAt = nextBooking?.endsAt ?? nextBooking?.startsAt + nextBooking?.bookedMinutes * 60_000;
    const readyToStart = Boolean(nextBooking && nextBooking.startsAt <= currentTime && nextBookingEndsAt > currentTime);
    const showStartWarning = Boolean(nextBooking && hasPassedHalfwayWithoutStart(nextBooking, currentTime));

    const startNextSession = async () => {
        if (!nextBooking || !readyToStart) return;

        try {
            setStartError("");
            setStartingId(nextBooking.id);
            await startBooking(nextBooking.id);
        } catch (error) {
            setStartError(error.message);
        } finally {
            setStartingId("");
        }
    };

    const recentActivity = buildRecentActivity(bookings, student.id);
    let recentMinutes = 0;
    for (const day of recentActivity) recentMinutes += day.minutes;
    return (
        <div className="space-y-5 sm:space-y-6">
            {startError && (
                <div className="rounded-2xl border border-[#efcfd3] bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#a34854]" role="alert">
                    {startError}
                </div>
            )}
            <section className="group relative flex flex-col justify-between gap-5 overflow-hidden rounded-4xl border border-[#d5e5e1] bg-linear-to-br from-white via-[#f7fbf9] to-[#eaf6f3] p-5 shadow-xl shadow-[#17333e]/5 sm:flex-row sm:items-end sm:p-6 xl:p-7">
                <div aria-hidden="true" className="absolute -right-16 -top-20 size-60 rounded-full bg-[#29b7c4]/9 blur-3xl" />
                <div aria-hidden="true" className="absolute bottom-0 left-0 h-1 w-36 bg-linear-to-r from-[#2f9db0] to-[#5dceb9]" />
                <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#cde3df] bg-white/75 px-3 py-1.5 text-xs font-bold text-[#537078] shadow-sm">
                        <Sparkles className="size-3.5 text-[#e7a743]" />
                        {formatCurrentDate()}
                    </span>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-itx-ink md:text-3xl xl:text-4xl">Welcome back, {student.firstName}.</h2>
                    <p className="mt-2 text-sm text-white/55">Here’s how your lab time is looking this week.</p>
                </div>
                <Link
                    className="group/link relative inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-[#2f9db0] to-[#17939c] px-5 text-base font-bold text-white shadow-lg shadow-[#2f9db0]/25 transition-colors duration-150 active:scale-[0.98] hover:from-[#2f9db0] hover:to-[#117b87] sm:h-12 sm:w-auto sm:text-sm"
                    to="/portal/book"
                >
                    <span className="relative">Book a new slot</span> <ArrowUpRight className="relative size-4" />
                </Link>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
                <MonthlyUsageCard student={student} />
                <UpcomingSlot
                    booking={nextBooking}
                    onStart={startNextSession}
                    ready={readyToStart}
                    startWarning={showStartWarning}
                    starting={startingId === nextBooking?.id}
                />
            </div>

            <section className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    accent="bg-[#e8f5f4] text-[#2f9db0]"
                    icon={Clock3}
                    label="Total lab time"
                    note={`Across ${completedCount} completed sessions`}
                    surface="border-[#dfe6e2] bg-white/90"
                    value={formatDuration(totalMinutes)}
                />
                <MetricCard
                    accent="bg-[#fff3df] text-[#bc7924]"
                    icon={CalendarCheck}
                    label="Last seven days"
                    note="Completed lab usage"
                    surface="border-[#dfe6e2] bg-white/90"
                    value={formatDuration(recentMinutes)}
                />
                <MetricCard
                    accent="bg-[#edf1fa] text-[#526aa5]"
                    icon={Monitor}
                    label="Upcoming sessions"
                    note="Current booking schedule"
                    surface="border-[#dfe6e2] bg-white/90"
                    value={`${upcomingCount} sessions`}
                />
            </section>

            <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
                <ActivityChart activity={recentActivity} />
                <StudentCard onPasswordChanged={onPasswordChanged} student={student} />
            </div>
        </div>
    );
}
const PASSWORD_FIELD_CLASS =
    "h-12 w-full rounded-xl border border-[#d9e3e0] bg-white px-4 pr-12 text-sm font-semibold outline-none focus:border-[#2f9db0] focus:ring-4 focus:ring-[#2f9db0]/10";

function PasswordField({ autoComplete, label, minLength, name, onChange, onToggle, value, visible }) {
    const Icon = visible ? EyeOff : Eye;
    return (
        <div>
            <label className="block text-sm font-bold text-white/80" htmlFor={name}>
                {label}
            </label>
            <div className="relative mt-2">
                <input
                    autoComplete={autoComplete}
                    className={PASSWORD_FIELD_CLASS}
                    id={name}
                    minLength={minLength}
                    name={name}
                    onChange={onChange}
                    required
                    type={visible ? "text" : "password"}
                    value={value}
                />
                <button
                    aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
                    aria-pressed={visible}
                    className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/55 transition hover:bg-[#eaf5f4] hover:text-[#2f9db0]"
                    onClick={onToggle}
                    type="button"
                >
                    <Icon aria-hidden="true" className="size-4.5" />
                </button>
            </div>
        </div>
    );
}

function ChangePasswordDialog({ onChanged, onClose, open, student }) {
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [message, setMessage] = useState("");
    const [visible, setVisible] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
    const closeDialog = () => {
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setVisible({ currentPassword: false, newPassword: false, confirmPassword: false });
        setMessage("");
        onClose();
    };
    const changeField = (event) => {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setMessage("");
    };
    const submit = async (event) => {
        event.preventDefault();
        if (form.newPassword !== form.confirmPassword) {
            setMessage("The new passwords do not match.");
            return;
        }
        try {
            await changeStudentPassword(student.id, form.currentPassword, form.newPassword);
            closeDialog();
            onChanged();
        } catch (error) {
            setMessage(error.message);
        }
    };
    const footer = (
        <>
            <button className="h-12 rounded-2xl border border-[#dce5e1] px-5 text-sm font-bold text-white/60" onClick={closeDialog} type="button">
                Cancel
            </button>
            <button
                className="h-12 rounded-2xl bg-itx-teal px-5 text-sm font-bold text-white shadow-lg shadow-itx-teal/20"
                form="change-password-form"
                type="submit"
            >
                Update password
            </button>
        </>
    );
    return (
        <AppDialog
            className="hidden-scrollbar"
            description="Use your student ID as the current password if it has never been changed."
            footer={footer}
            onClose={closeDialog}
            open={open}
            title="Change password"
        >
            <form className="space-y-4" id="change-password-form" onSubmit={submit}>
                <PasswordField
                    autoComplete="current-password"
                    label="Current password"
                    name="currentPassword"
                    onChange={changeField}
                    onToggle={() => setVisible((current) => ({ ...current, currentPassword: !current.currentPassword }))}
                    value={form.currentPassword}
                    visible={visible.currentPassword}
                />
                <PasswordField
                    autoComplete="new-password"
                    label="New password"
                    minLength="6"
                    name="newPassword"
                    onChange={changeField}
                    onToggle={() => setVisible((current) => ({ ...current, newPassword: !current.newPassword }))}
                    value={form.newPassword}
                    visible={visible.newPassword}
                />
                <PasswordField
                    autoComplete="new-password"
                    label="Confirm new password"
                    minLength="6"
                    name="confirmPassword"
                    onChange={changeField}
                    onToggle={() => setVisible((current) => ({ ...current, confirmPassword: !current.confirmPassword }))}
                    value={form.confirmPassword}
                    visible={visible.confirmPassword}
                />
                <p className="text-xs leading-5 text-white/55">
                    Use at least 6 characters. Forgot your password? Please contact the lab administrator to have it reset.
                </p>
                {message && (
                    <p className="rounded-xl bg-[#fff0f2] px-3 py-2.5 text-sm font-semibold text-[#ad4c59]" role="alert">
                        {message}
                    </p>
                )}
            </form>
        </AppDialog>
    );
}

function StudentCard({ onPasswordChanged, student }) {
    const [passwordOpen, setPasswordOpen] = useState(false);
    return (
        <>
            <article className="group relative overflow-hidden rounded-3xl border border-[#c5dfe0] bg-linear-to-br from-[#eff8f7] via-[#e8f4f5] to-[#e1eff1] p-5 shadow-lg shadow-[#17333e]/6 sm:p-6">
                <span aria-hidden="true" className="absolute -right-16 -top-16 size-48 rounded-full border-24 border-white/25" />
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Student details</h2>
                    <span className="rounded-full bg-white/65 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#23885b]">
                        Active student
                    </span>
                </div>
                <div className="mt-5 flex items-center gap-3.5">
                    <div className="relative flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#102f3d] to-[#186172] text-sm font-black text-white shadow-lg shadow-[#102f3d]/18 ring-4 ring-white/45">
                        {student.initials}
                        <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-[#eaf4f5] bg-[#40b681]" />
                    </div>
                    <div>
                        <p className="text-base font-bold text-white">{student.name}</p>
                        <p className="mt-1 text-xs font-semibold text-[#2f9db0]">{student.id}</p>
                    </div>
                </div>
                <dl className="relative mt-5 space-y-1 rounded-2xl border border-white/70 bg-white/55 p-2 shadow-inner shadow-white/40">
                    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-white/70">
                        <dt className="text-xs font-semibold text-white/55">Student ID</dt>
                        <dd className="text-right text-sm font-bold text-white/80">{student.id}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-white/70">
                        <dt className="text-xs font-semibold text-white/55">Student name</dt>
                        <dd className="text-right text-sm font-bold text-white/80">{student.name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-white/70">
                        <dt className="text-xs font-semibold text-white/45">Program</dt>
                        <dd className="text-right text-sm font-bold text-white/80">{student.program}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-white/70">
                        <dt className="pt-0.5 text-xs font-semibold text-white/45">Term</dt>
                        <dd className="max-w-44 text-right text-sm font-bold leading-5 text-white/80">{student.term}</dd>
                    </div>
                </dl>
                <div className="relative mt-5 flex flex-col gap-3 border-t border-[#c6dcdb] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-white/80 text-[#2f9db0] shadow-sm">
                            <KeyRound className="size-4" />
                        </span>
                        <div>
                            <p className="text-sm font-bold text-white/80">Password</p>
                            <p className="text-xs text-white/55">Manage your account access.</p>
                        </div>
                    </div>
                    <button
                        className="h-10 rounded-xl bg-linear-to-r from-[#102f3d] to-[#174d5a] px-4 text-xs font-bold text-white shadow-md shadow-[#102f3d]/12 transition-colors duration-150 hover:from-[#2f9db0] hover:to-[#17939c]"
                        onClick={() => setPasswordOpen(true)}
                        type="button"
                    >
                        Change password
                    </button>
                </div>
            </article>
            <ChangePasswordDialog onChanged={onPasswordChanged} onClose={() => setPasswordOpen(false)} open={passwordOpen} student={student} />
        </>
    );
}
