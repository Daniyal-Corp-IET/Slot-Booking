import { useEffect, useState } from "react";
import {
    ArrowRight,
    ArrowUpRight,
    CalendarCheck,
    CalendarDays,
    CircleCheck,
    Clock3,
    KeyRound,
    Monitor,
    Play,
    ShieldCheck,
    TimerReset,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { formatBookingDate, formatBookingTime, hasPassedHalfwayWithoutStart } from "../../../context/LabContext.helpers";
import { apiRequest } from "../../../utils/apiClient";
import { cn } from "../../../utils/cn";
import { AppDialog } from "../../Feedback/Feedback";
import { MetricCard } from "../../ui/MetricCard";
import { PasswordField } from "../../ui/PasswordField";
import { formatCurrentDate, formatDuration } from "../StudentPortal.helpers";

function changeStudentPassword(studentId, currentPassword, newPassword) {
    return apiRequest(
        `/students/${studentId}/change-password`,
        "POST",
        { currentPassword, newPassword },
        { fallbackErrorMessage: "Unable to change the password." },
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

function DashboardHero({ student, upcomingCount }) {
    return (
        <section className="student-home-hero relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(130deg,#073844_0%,#0b4b58_100%)] px-5 py-6 text-white shadow-[0_28px_60px_-34px_rgba(5,50,60,0.72)] sm:px-7 sm:py-7 lg:px-8">
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur-sm">
                        <CalendarDays className="size-3.5 text-[#3ee7c2]" />
                        {formatCurrentDate()}
                    </span>
                    <h2 className="mt-4 font-['Fraunces',serif]! text-[30px] font-medium leading-[1.08] tracking-[-0.025em] text-white sm:text-[36px] lg:text-[42px]">
                        Welcome back, {student.firstName}.
                    </h2>
                    <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-white/60">
                        Your lab time, upcoming sessions, and workstation access are all in one place.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-white/65">
                        <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[#3ee7c2] shadow-[0_0_12px_rgba(62,231,194,0.8)]" />
                            Student account active
                        </span>
                        <span>{upcomingCount} upcoming {upcomingCount === 1 ? "session" : "sessions"}</span>
                    </div>
                </div>

                <Link
                    className="ui-press group inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3ee7c2] px-5 text-sm font-extrabold text-[#05242c] shadow-[0_18px_34px_-16px_rgba(62,231,194,0.75)] hover:bg-[#55e9cb] sm:w-auto"
                    to="/portal/book"
                >
                    Book a workstation
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>
        </section>
    );
}

function MonthlyUsageCard({ student }) {
    const percent = Math.min(100, Math.max(0, student.percent));

    return (
        <article className="ui-fade-in portal-surface relative overflow-hidden rounded-[26px] border p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[#3096A7]/10 text-[#3096A7]">
                        <TimerReset className="size-5" strokeWidth={1.9} />
                    </span>
                    <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Monthly allowance</p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-itx-ink sm:text-4xl">{student.monthly}</h3>
                    <p className="mt-1.5 text-sm font-medium text-slate-500">of {student.monthlyLimit} used</p>
                </div>
                <span className="rounded-full border border-[#3096A7]/15 bg-[#3096A7]/8 px-3 py-1.5 text-sm font-extrabold text-[#227f8f]">{student.percent}%</span>
            </div>

            <div className="mt-7">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-900/[0.04]">
                    <div className="ui-grow-x h-full origin-left rounded-full bg-[#3096A7] shadow-[0_0_14px_rgba(48,150,167,0.32)]" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="text-slate-400">{student.percent}% consumed</span>
                    <span className="text-[#227f8f]">{student.monthlyRemaining} remaining</span>
                </div>
            </div>
        </article>
    );
}

function EmptyUpcomingSlot() {
    return (
        <article className="ui-fade-in portal-surface relative overflow-hidden rounded-[26px] border p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Your schedule</p>
                    <h3 className="mt-2 text-xl font-bold text-itx-ink">Next booking</h3>
                </div>
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#3096A7]/10 text-[#3096A7]">
                    <CalendarCheck className="size-5" />
                </span>
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-[#3096A7]/20 bg-[#f7fbfb] px-5 py-6 text-center">
                <p className="text-sm font-bold text-itx-ink">No booking scheduled</p>
                <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-slate-500">Reserve a workstation whenever you are ready for your next lab session.</p>
            </div>
            <Link className="ui-press mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3096A7] px-4 text-sm font-bold text-white shadow-[0_14px_28px_-16px_rgba(48,150,167,0.7)] hover:bg-[#278898]" to="/portal/book">
                Find an available slot <ArrowUpRight className="size-4" />
            </Link>
        </article>
    );
}

function UpcomingSlot({ booking, onStart, ready, startWarning, starting }) {
    if (!booking) return <EmptyUpcomingSlot />;

    return (
        <article className="ui-fade-in portal-surface relative overflow-hidden rounded-[26px] border p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Your schedule</p>
                    <h3 className="mt-2 text-xl font-bold text-itx-ink">Next booking</h3>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em]", ready ? "bg-itx-success/10 text-itx-success" : "bg-[#3096A7]/10 text-[#227f8f]")}>
                    <CircleCheck className="size-3.5" /> {ready ? "Ready" : "Confirmed"}
                </span>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-[#f8fafb] p-4">
                <div className="flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#073844] text-white shadow-[0_12px_22px_-14px_rgba(7,56,68,0.7)]">
                        <Monitor className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-base font-bold text-itx-ink">System {String(booking.systemId).padStart(2, "0")}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">{ready ? "Available to start now" : "Reserved for your upcoming session"}</p>
                    </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
                    <div>
                        <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Date</dt>
                        <dd className="mt-1 text-xs font-bold text-slate-700">{formatBookingDate(booking.startsAt)}</dd>
                    </div>
                    <div>
                        <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Time</dt>
                        <dd className="mt-1 text-xs font-bold text-slate-700">{formatBookingTime(booking)}</dd>
                    </div>
                </dl>
            </div>

            {ready ? (
                <>
                    {startWarning && (
                        <div className="mt-4 rounded-xl border border-itx-warning/25 bg-itx-warning/10 px-4 py-3 text-xs font-semibold leading-5 text-[#8a5a13]" role="alert">
                            Half of this session has passed. Start now to use the remaining time. The full booking remains chargeable.
                        </div>
                    )}
                    <button className="ui-press mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-itx-success px-4 text-sm font-bold text-white shadow-lg shadow-itx-success/15 hover:bg-[#128a5c] disabled:cursor-wait disabled:opacity-60" disabled={starting} onClick={onStart} type="button">
                        <Play className="size-4 fill-current" /> {starting ? "Starting..." : "Start session"}
                    </button>
                </>
            ) : (
                <Link className="ui-press mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:border-[#3096A7]/35 hover:text-[#227f8f]" to="/portal/history">
                    View booking details <ArrowUpRight className="size-4" />
                </Link>
            )}
        </article>
    );
}

function ActivityChart({ activity }) {
    let peakValue = 0;
    let totalMinutes = 0;
    for (const item of activity) {
        peakValue = Math.max(peakValue, item.value);
        totalMinutes += item.minutes;
    }

    return (
        <article className="ui-fade-in portal-surface relative overflow-hidden rounded-[26px] border p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-itx-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Last seven days</p>
                    <h3 className="mt-2 text-xl font-bold text-itx-ink">Weekly lab activity</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Completed workstation usage by day.</p>
                </div>
                <div className="sm:text-right">
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-itx-ink">{formatDuration(totalMinutes)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{formatDuration(Math.round(totalMinutes / 7))} daily average</p>
                </div>
            </div>

            <figure className="relative mt-6" aria-label="Weekly lab activity bar chart">
                <div aria-hidden="true" className="absolute inset-x-0 bottom-7 top-5 flex flex-col justify-between">
                    <span className="border-t border-dashed border-slate-200" />
                    <span className="border-t border-dashed border-slate-200" />
                    <span className="border-t border-dashed border-slate-200" />
                    <span className="border-t border-slate-200" />
                </div>
                <div className="relative grid h-56 grid-cols-7 gap-2 sm:gap-4">
                    {activity.map((item) => {
                        const isPeak = item.value > 0 && item.value === peakValue;
                        return (
                            <div aria-label={`${item.day}: ${item.label}`} className="flex min-w-0 flex-col items-center" key={item.day}>
                                <span className={cn("mb-2 h-5 whitespace-nowrap text-[10px] font-bold sm:text-xs", isPeak ? "text-[#227f8f]" : "text-slate-400")}>{item.minutes > 0 ? item.label : ""}</span>
                                <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                                    <div className={cn("ui-grow-height w-full max-w-8 rounded-t-md", isPeak ? "bg-[#3096A7] shadow-[0_8px_18px_-8px_rgba(48,150,167,0.65)]" : "bg-[#3096A7]/25")} style={{ "--bar-height": `${item.value}%`, height: `${item.value}%` }} />
                                </div>
                                <span className={cn("mt-2.5 text-xs font-bold", isPeak ? "text-itx-ink" : "text-slate-400")}>{item.day}</span>
                            </div>
                        );
                    })}
                </div>
                <figcaption className="sr-only">Hours spent in the computer lab during each of the last seven days.</figcaption>
            </figure>
        </article>
    );
}

export function DashboardHome({ onPasswordChanged, student }) {
    const { bookings, startBooking } = useLab();
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [startingId, setStartingId] = useState("");
    const [startError, setStartError] = useState("");
    let totalMinutes = 0;
    let upcomingCount = 0;
    let nextBooking;

    for (const booking of bookings) {
        const belongsToStudent = booking.studentId === student.id;
        const cancelled = booking.status === "Cancelled";
        if (!belongsToStudent || cancelled) continue;

        if (booking.status === "Completed") {
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
        <div className="student-workspace-page space-y-5 sm:space-y-6">
            {startError && <div className="rounded-xl border border-[#efcfd3] bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#a34854]" role="alert">{startError}</div>}

            <DashboardHero student={student} upcomingCount={upcomingCount} />

            <section className="grid gap-5 lg:grid-cols-2">
                <MonthlyUsageCard student={student} />
                <UpcomingSlot booking={nextBooking} onStart={startNextSession} ready={readyToStart} startWarning={showStartWarning} starting={startingId === nextBooking?.id} />
            </section>

            <section className="grid gap-3 md:grid-cols-3">
                <MetricCard accent="bg-[#3096A7]/10 text-[#3096A7]" className="border-slate-200/80 bg-white" icon={Clock3} label="Total lab time" value={formatDuration(totalMinutes)} variant="fill" />
                <MetricCard accent="bg-[#3096A7]/10 text-[#3096A7]" className="border-slate-200/80 bg-white" icon={CalendarCheck} label="Last seven days" value={formatDuration(recentMinutes)} variant="fill" />
                <MetricCard accent="bg-[#3096A7]/10 text-[#3096A7]" className="border-slate-200/80 bg-white" icon={Monitor} label="Upcoming sessions" value={`${upcomingCount} ${upcomingCount === 1 ? "session" : "sessions"}`} variant="fill" />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]">
                <ActivityChart activity={recentActivity} />
                <StudentCard onPasswordChanged={onPasswordChanged} student={student} />
            </section>
        </div>
    );
}

function ChangePasswordDialog({ onChanged, onClose, open, student }) {
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [message, setMessage] = useState("");

    const closeDialog = () => {
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
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
            <button className="h-12 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600" onClick={closeDialog} type="button">Cancel</button>
            <button className="h-12 rounded-xl bg-[#3096A7] px-5 text-sm font-bold text-white shadow-lg shadow-[#3096A7]/20" form="change-password-form" type="submit">Update password</button>
        </>
    );

    return (
        <AppDialog className="hidden-scrollbar" description="Use your student ID as the current password if it has never been changed." footer={footer} onClose={closeDialog} open={open} title="Change password">
            <form className="space-y-4" id="change-password-form" onSubmit={submit}>
                <PasswordField autoComplete="current-password" label="Current password" name="currentPassword" onChange={changeField} value={form.currentPassword} />
                <PasswordField autoComplete="new-password" label="New password" minLength="6" name="newPassword" onChange={changeField} value={form.newPassword} />
                <PasswordField autoComplete="new-password" label="Confirm new password" minLength="6" name="confirmPassword" onChange={changeField} value={form.confirmPassword} />
                <p className="text-xs leading-5 text-slate-500">Use at least 6 characters. Forgot your password? Contact the lab administrator to have it reset.</p>
                {message && <p className="rounded-xl bg-[#fff0f2] px-3 py-2.5 text-sm font-semibold text-[#ad4c59]" role="alert">{message}</p>}
            </form>
        </AppDialog>
    );
}

function StudentCard({ onPasswordChanged, student }) {
    const [passwordOpen, setPasswordOpen] = useState(false);

    return (
        <>
            <article className="ui-fade-in portal-surface relative overflow-hidden rounded-[26px] border p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Account</p>
                        <h3 className="mt-2 text-xl font-bold text-itx-ink">Student profile</h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-itx-success/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-itx-success">
                        <ShieldCheck className="size-3.5" /> Active
                    </span>
                </div>

                <div className="mt-6 flex items-center gap-3.5 border-b border-itx-border pb-5">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#073844] text-sm font-black text-white shadow-[0_12px_24px_-14px_rgba(7,56,68,0.65)]">{student.initials}</span>
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold text-itx-ink">{student.name}</p>
                        <p className="mt-1 text-xs font-bold text-[#3096A7]">{student.id}</p>
                    </div>
                </div>

                <dl className="mt-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <dt className="text-xs font-semibold text-slate-400">Program</dt>
                        <dd className="max-w-[65%] text-right text-xs font-bold leading-5 text-slate-700">{student.program}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                        <dt className="text-xs font-semibold text-slate-400">Term</dt>
                        <dd className="max-w-[65%] text-right text-xs font-bold leading-5 text-slate-700">{student.term}</dd>
                    </div>
                </dl>

                <button className="ui-press mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:border-[#3096A7]/35 hover:text-[#227f8f]" onClick={() => setPasswordOpen(true)} type="button">
                    <KeyRound className="size-4" /> Change password
                </button>
            </article>
            <ChangePasswordDialog onChanged={onPasswordChanged} onClose={() => setPasswordOpen(false)} open={passwordOpen} student={student} />
        </>
    );
}
