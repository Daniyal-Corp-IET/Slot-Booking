import { useEffect, useState } from "react";
import { CalendarX2, Check, Monitor, Play, TimerReset } from "lucide-react";
import { useLab } from "../../../context/LabContext";
import { formatBookingDate, formatBookingTime, hasPassedHalfwayWithoutStart } from "../../../context/LabContext.helpers";
import { AppDialog, EmptyState } from "../../Feedback/Feedback";
import { cn, formatDuration, getMonthlyBalances, getSessionUsage } from "../StudentPortal.helpers";

function formatStartedAt(startedAt) {
    if (!startedAt) return "";
    return new Date(startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Booking history page
export function HistoryView({ student }) {
    const { bookings, cancelBooking, endBooking, policy, startBooking } = useLab();
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const studentBookings = [];

    for (const booking of bookings) {
        const belongsToStudent = booking.studentId === student.id;
        const isVisible = booking.status !== "Cancelled";
        if (belongsToStudent && isVisible) studentBookings.push(booking);
    }

    const balances = getMonthlyBalances(studentBookings, student.monthlyLimitMinutes);
    const sessions = [];
    let nextSession;
    let readySession;

    for (const booking of studentBookings) {
        let status = booking.status;
        const endsAt = booking.endsAt ?? booking.startsAt + booking.bookedMinutes * 60_000;
        if (booking.status === "Active") status = "Ongoing";
        if (booking.status === "Upcoming" && booking.startsAt <= currentTime && endsAt > currentTime) {
            status = "Ready";
        }

        const session = {
            id: booking.id,
            reference: booking.reference,
            date: formatBookingDate(booking.startsAt),
            time: formatBookingTime(booking),
            system: `System ${String(booking.systemId).padStart(2, "0")}`,
            duration: formatDuration(booking.usedMinutes ?? booking.bookedMinutes),
            status,
            balanceAfter: balances[booking.id],
            bookedMinutes: booking.bookedMinutes,
            startsAt: booking.startsAt,
            endsAt,
            startedAt: booking.startedAt,
            startWarning: hasPassedHalfwayWithoutStart(booking, currentTime),
        };

        sessions.push(session);

        const isEarlierUpcomingSession = status === "Upcoming" && (!nextSession || session.startsAt < nextSession.startsAt);
        if (isEarlierUpcomingSession) nextSession = session;

        const isEarlierReadySession = status === "Ready" && (!readySession || session.startsAt < readySession.startsAt);
        if (isEarlierReadySession) readySession = session;
    }
    const [statusFilter, setStatusFilter] = useState("All");
    const [cancelledSlot, setCancelledSlot] = useState("");
    const [earlyEndMessage, setEarlyEndMessage] = useState("");
    const [startMessage, setStartMessage] = useState("");
    const [startingId, setStartingId] = useState("");
    const [actionError, setActionError] = useState("");
    const [pendingAction, setPendingAction] = useState();
    useEffect(() => {
        const interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);
    const remainingMilliseconds = Math.max(0, (nextSession?.startsAt ?? currentTime) - currentTime);
    const countdownHours = Math.floor(remainingMilliseconds / 3_600_000);
    const countdownMinutes = Math.floor((remainingMilliseconds % 3_600_000) / 60_000);
    const countdownSeconds = Math.floor((remainingMilliseconds % 60_000) / 1000);
    const canCancelNext = Boolean(nextSession && nextSession.startsAt - currentTime >= policy.cancelBeforeMinutes * 60_000);
    const featuredSession = readySession ?? nextSession;
    const featuredIsReady = featuredSession?.status === "Ready";
    const remainingSessions = [];

    for (const session of sessions) {
        const isFeaturedSession = session.id === featuredSession?.id;
        const matchesFilter = statusFilter === "All" || session.status === statusFilter;

        if (!isFeaturedSession && matchesFilter) remainingSessions.push(session);
    }

    const pendingSession = sessions.find((session) => session.id === pendingAction?.sessionId);
    let pendingUsage;

    if (pendingSession && pendingAction?.type === "end") {
        pendingUsage = getSessionUsage(
            pendingSession.bookedMinutes,
            pendingSession.startsAt,
            currentTime,
            policy.bookingIncrementMinutes,
        );
    }

    const cancellingBooking = pendingAction?.type === "cancel";
    let keepActionLabel = "Keep session";
    let confirmActionLabel = "End session now";
    let confirmActionStyle = "bg-amber-500";
    let dialogTitle = "End this session now?";
    let explanationStyle = "border-amber-400/25 bg-amber-400/10 text-amber-200";
    let explanation = "Only the time you used will be deducted.";

    if (cancellingBooking) {
        keepActionLabel = "Keep booking";
        confirmActionLabel = "Cancel booking";
        confirmActionStyle = "bg-rose-500";
        dialogTitle = "Cancel this booking?";
        explanationStyle = "border-rose-400/25 bg-rose-500/10 text-rose-200";
        explanation = "The system and time will be released for another student. No monthly hours will be deducted.";
    } else if (pendingUsage) {
        explanation = `If you end now, ${formatDuration(pendingUsage.usedMinutes)} will be deducted and the remaining ${formatDuration(pendingUsage.remainingMinutes)} will immediately become available to other students.`;
    }
    const cancelSession = async (sessionId) => {
        const session = sessions.find((item) => item.id === sessionId);

        if (!session || session.status !== "Upcoming") {
            return;
        }

        if (session.startsAt - currentTime < policy.cancelBeforeMinutes * 60_000) {
            return;
        }

        await cancelBooking(sessionId);
        setCancelledSlot(`${session.date} · ${session.time}`);
    };

    const endSessionEarly = async (sessionId) => {
        const session = sessions.find((item) => item.id === sessionId);

        if (!session || session.status !== "Ongoing") {
            return;
        }

        const updatedBooking = await endBooking(sessionId);
        const usedMinutes = updatedBooking.usedMinutes;
        const releasedMinutes = session.bookedMinutes - usedMinutes;
        setEarlyEndMessage(
            `${session.system} was booked for ${formatDuration(session.bookedMinutes)} but ended after ${formatDuration(usedMinutes)}. Only the time used was deducted, and ${formatDuration(releasedMinutes)} is now available to other students.`,
        );
    };
    const startSessionNow = async (sessionId) => {
        const session = sessions.find((item) => item.id === sessionId);
        if (!session || session.status !== "Ready") return;

        try {
            setActionError("");
            setStartingId(sessionId);
            const updatedBooking = await startBooking(sessionId);
            const actualStart = formatStartedAt(updatedBooking.startedAt);
            setStartMessage(
                `${session.system} started at ${actualStart}. Late arrival does not change the booked duration or scheduled end time.`,
            );
        } catch (error) {
            setActionError(error.message);
        } finally {
            setStartingId("");
        }
    };
    const confirmPendingAction = async () => {
        if (!pendingAction) return;

        try {
            setActionError("");
            if (pendingAction.type === "cancel") await cancelSession(pendingAction.sessionId);
            if (pendingAction.type === "end") await endSessionEarly(pendingAction.sessionId);
            setPendingAction(undefined);
        } catch (error) {
            setActionError(error.message);
        }
    };
    const badgeClasses = {
        Upcoming: "bg-[#2f9db0]/15 text-[#7fe0e8]",
        Ready: "bg-emerald-400/15 text-emerald-300",
        Ongoing: "bg-amber-400/15 text-amber-300",
        Completed: "bg-emerald-400/10 text-emerald-300/80",
    };
    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-white/55">Track your upcoming, ongoing, and completed computer lab sessions.</p>
                <span className="w-fit rounded-full bg-white/8 px-3 py-2 text-[10px] font-bold text-white/60 shadow-sm">
                    {policy.monthlyLimitHours} monthly hours
                </span>
            </div>

            {cancelledSlot && (
                <div
                    className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-xs font-semibold text-emerald-300"
                    role="status"
                >
                    <Check className="size-4 shrink-0" /> Booking for {cancelledSlot} was cancelled.
                </div>
            )}
            {earlyEndMessage && (
                <div
                    className="flex items-start gap-3 rounded-2xl border border-[#2f9db0]/25 bg-[#2f9db0]/10 px-4 py-3 text-xs font-semibold leading-5 text-[#7fe0e8]"
                    role="status"
                >
                    <TimerReset className="mt-0.5 size-4 shrink-0" />
                    {earlyEndMessage}
                </div>
            )}
            {startMessage && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300" role="status">
                    <Play className="mt-0.5 size-4 shrink-0" />
                    {startMessage}
                </div>
            )}
            {actionError && (
                <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300" role="alert">
                    {actionError}
                </div>
            )}

            {featuredSession && (
                <section className="premium-hero relative overflow-hidden rounded-4xl p-5 text-white md:p-6 xl:p-7">
                    <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-[#41c0ca]/15" />
                    <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#64d0d8]">
                                <span className="h-2 w-2 rounded-full bg-[#61d4b0]" /> {featuredIsReady ? "Ready to start" : "Next booking"}
                            </div>
                            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">
                                {featuredSession.date} · {featuredSession.time}
                            </h2>
                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-white/60">
                                <span className="flex items-center gap-2">
                                    <Monitor className="size-4 text-[#52c4ce]" />
                                    {featuredSession.system}
                                </span>
                                <span className="flex items-center gap-2">
                                    <TimerReset className="size-4 text-[#52c4ce]" />
                                    {featuredSession.duration}
                                </span>
                                <span className="rounded-lg border border-white/10 bg-white/8 px-2.5 py-1 font-bold tracking-wide text-white/75">
                                    {featuredSession.reference}
                                </span>
                            </div>
                            {featuredIsReady && featuredSession.startWarning && (
                                <div
                                    className="mt-5 max-w-2xl rounded-2xl border border-[#f3ca75]/35 bg-[#e5a83a]/15 px-4 py-3 text-sm font-semibold leading-6 text-[#ffe2a4]"
                                    role="alert"
                                >
                                    Half of your booked session has already passed. Start now to use the remaining time. The full booked duration will still be charged.
                                </div>
                            )}
                            <div className="mt-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                                {featuredIsReady ? (
                                    <>
                                        <button
                                            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#65d4b0] px-6 text-sm font-bold text-[#082d36] shadow-lg shadow-black/15 transition-colors hover:bg-[#7ce0be] disabled:cursor-wait disabled:opacity-60"
                                            disabled={startingId === featuredSession.id}
                                            onClick={() => startSessionNow(featuredSession.id)}
                                            type="button"
                                        >
                                            <Play className="size-4.5 fill-current" />
                                            {startingId === featuredSession.id ? "Starting..." : "Start session"}
                                        </button>
                                        <span className="max-w-md text-xs font-medium leading-5 text-white/50">
                                            Starting late does not reduce the booked charge or extend the scheduled end time.
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-rose-200/20 bg-white/10 px-5 text-sm font-bold text-white transition-colors duration-150 enabled:hover:border-rose-200/40 enabled:hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-45"
                                            disabled={!canCancelNext}
                                            onClick={() => setPendingAction({ type: "cancel", sessionId: featuredSession.id })}
                                            type="button"
                                        >
                                            <CalendarX2 className="size-4.5 text-rose-200" /> Cancel booking
                                        </button>
                                        <span className="text-xs font-medium text-white/40">
                                            {canCancelNext
                                                ? policy.cancelBeforeMinutes
                                                    ? `Available until ${policy.cancelBeforeMinutes} minutes before start`
                                                    : "Available until the session starts"
                                                : "Cancellation window closed"}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/7 p-4 backdrop-blur-sm sm:min-w-72">
                            {featuredIsReady ? (
                                <>
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/50">Session window is open</p>
                                    <p className="mt-3 text-xl font-semibold tracking-[-0.03em]">Start when you arrive</p>
                                    <p className="mt-2 text-xs font-medium leading-5 text-white/45">
                                        Your actual start time will be recorded for you and the lab administrator.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/50">Starts in</p>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                        {[
                                            { label: "Hours", value: countdownHours },
                                            { label: "Minutes", value: countdownMinutes },
                                            { label: "Seconds", value: countdownSeconds },
                                        ].map((unit) => (
                                            <div className="rounded-2xl bg-white/8 px-2 py-3" key={unit.label}>
                                                <span className="block text-2xl font-bold tabular-nums tracking-[-0.04em]">{String(unit.value).padStart(2, "0")}</span>
                                                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-white/45">{unit.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            )}

            <section className="portal-surface overflow-hidden rounded-3xl border">
                <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <h2 className="text-lg font-bold text-white">Booking history</h2>
                        <p className="mt-1 text-sm text-white/55">Your balance updates after each completed session.</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/5 p-1.5">
                        {["All", "Upcoming", "Ready", "Ongoing", "Completed"].map((filter) => (
                            <button
                                className={cn(
                                    "rounded-lg px-3 py-2 text-xs font-bold transition",
                                    statusFilter === filter ? "bg-white/12 text-[#2f9db0] shadow-sm" : "text-white/55 hover:text-white/80",
                                )}
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                type="button"
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="hidden grid-cols-[0.65fr_0.8fr_1fr_0.65fr_0.65fr_1fr_0.65fr_0.9fr] gap-3 border-b border-white/10 bg-white/4 px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/45 xl:grid">
                    <span>Date</span>
                    <span>Reference</span>
                    <span>Time</span>
                    <span>System</span>
                    <span>Duration</span>
                    <span>Balance after session</span>
                    <span>Status</span>
                    <span className="text-right">Action</span>
                </div>
                {remainingSessions.map((session) => (
                    <article
                        className={cn(
                            "grid gap-4 border-b border-white/10 p-5 last:border-0 xl:grid-cols-[0.65fr_0.8fr_1fr_0.65fr_0.65fr_1fr_0.65fr_0.9fr] xl:items-center xl:gap-3 xl:px-6",
                            session.status === "Ready" && "bg-emerald-400/5",
                            session.status === "Ongoing" && "bg-amber-400/5",
                        )}
                        key={session.id}
                    >
                        <div className="flex items-center justify-between xl:block">
                            <p className="text-sm font-bold text-white/80">{session.date}</p>
                            <span className={cn("w-fit rounded-full px-2.5 py-1.5 text-[11px] font-bold xl:hidden", badgeClasses[session.status])}>
                                {session.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45 xl:hidden">Reference</p>
                            <p className="mt-1 text-sm font-bold tracking-wide text-[#2f9db0] xl:mt-0">{session.reference}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45 xl:hidden">Time</p>
                            <p className="mt-1 text-sm font-bold text-white xl:mt-0">{session.time}</p>
                            {session.startedAt && <p className="mt-1 text-xs font-bold text-emerald-300">Started {formatStartedAt(session.startedAt)}</p>}
                            {!session.startedAt && session.status === "Ready" && <p className="mt-1 text-xs font-bold text-emerald-300">Awaiting your start</p>}
                            {session.startWarning && <p className="mt-1 text-xs font-bold text-amber-300">Warning: at least 50% of the slot has passed</p>}
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45 xl:hidden">System</p>
                            <p className="mt-1 text-sm font-semibold text-white/55 xl:mt-0">{session.system}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45 xl:hidden">Duration</p>
                            <p className="mt-1 text-sm font-semibold text-white/55 xl:mt-0">{session.duration}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45 xl:hidden">Balance after session</p>
                            <p className={cn("mt-1 text-sm font-bold xl:mt-0", session.balanceAfter ? "text-emerald-300" : "text-white/40")}>
                                {session.balanceAfter ? `${session.balanceAfter} remaining` : "Updates on completion"}
                            </p>
                        </div>
                        <span className={cn("hidden w-fit rounded-full px-2.5 py-1.5 text-[11px] font-bold xl:block", badgeClasses[session.status])}>
                            {session.status}
                        </span>
                        {session.status === "Upcoming" && session.startsAt - currentTime >= policy.cancelBeforeMinutes * 60_000 && (
                            <button
                                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 text-sm font-bold text-rose-300 transition active:scale-[0.98] hover:border-rose-400/40 hover:bg-rose-500/15 xl:ml-auto xl:h-10 xl:w-fit xl:px-3 xl:text-xs"
                                onClick={() => setPendingAction({ type: "cancel", sessionId: session.id })}
                                type="button"
                            >
                                <CalendarX2 className="size-4" /> Cancel booking
                            </button>
                        )}
                        {session.status === "Ready" && (
                            <button
                                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2d9b78] px-4 text-sm font-bold text-white shadow-sm shadow-[#2d9b78]/20 transition-colors hover:bg-[#278568] disabled:cursor-wait disabled:opacity-60 xl:ml-auto xl:h-10 xl:w-fit xl:px-3 xl:text-xs"
                                disabled={startingId === session.id}
                                onClick={() => startSessionNow(session.id)}
                                type="button"
                            >
                                <Play className="size-4 fill-current" /> {startingId === session.id ? "Starting..." : "Start session"}
                            </button>
                        )}
                        {session.status === "Ongoing" && (
                            <button
                                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#a36d1c] px-4 text-sm font-bold text-white shadow-sm shadow-[#a36d1c]/20 transition-colors duration-150 active:scale-[0.98] hover:bg-[#8e5d17] xl:ml-auto xl:h-10 xl:w-fit xl:px-3 xl:text-xs"
                                onClick={() => setPendingAction({ type: "end", sessionId: session.id })}
                                type="button"
                            >
                                <TimerReset className="size-4" /> End session
                            </button>
                        )}
                        {session.status === "Completed" && <span className="hidden text-right text-xs text-white/35 xl:block">—</span>}
                    </article>
                ))}
                {remainingSessions.length === 0 && <EmptyState message={`No ${statusFilter.toLowerCase()} sessions to show.`} />}
            </section>

            {pendingAction && pendingSession && (
                <AppDialog
                    description="Review the session details before continuing."
                    footer={
                        <>
                            <button
                                className="h-12 rounded-2xl border border-white/15 px-5 text-sm font-bold text-white/60"
                                onClick={() => setPendingAction(undefined)}
                                type="button"
                            >
                                {keepActionLabel}
                            </button>
                            <button
                                className={cn("h-12 rounded-2xl px-5 text-sm font-bold text-white", confirmActionStyle)}
                                onClick={confirmPendingAction}
                                type="button"
                            >
                                {confirmActionLabel}
                            </button>
                        </>
                    }
                    onClose={() => setPendingAction(undefined)}
                    open
                    title={dialogTitle}
                >
                    <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">System</p>
                            <p className="mt-1 text-sm font-bold text-white/80">{pendingSession.system}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Duration</p>
                            <p className="mt-1 text-sm font-bold text-white/80">{pendingSession.duration}</p>
                        </div>
                        <div className="col-span-2 border-t border-white/10 pt-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Scheduled</p>
                            <p className="mt-1 text-sm font-bold text-white/80">
                                {pendingSession.date} · {pendingSession.time}
                            </p>
                        </div>
                    </div>

                    {pendingAction.type === "end" && pendingUsage && (
                        <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl border border-amber-400/25 bg-amber-400/10 p-4">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300/80">Time remaining</p>
                                <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-amber-300">{formatDuration(pendingUsage.remainingMinutes)}</p>
                            </div>
                            <div className="border-l border-amber-400/20 pl-4 text-right">
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-300/70">Used so far</p>
                                <p className="mt-1 text-sm font-bold text-amber-200">{formatDuration(pendingUsage.usedMinutes)}</p>
                            </div>
                        </div>
                    )}

                    <div
                        className={cn("mt-4 rounded-2xl border p-4 text-sm font-medium leading-6", explanationStyle)}
                    >
                        {explanation}
                    </div>
                </AppDialog>
            )}
        </div>
    );
}
