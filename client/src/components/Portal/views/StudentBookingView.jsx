import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, Timer } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { cn } from "../../../utils/cn";
import { TimeAvailabilityGrid } from "../../SystemCanvas/TimeAvailabilityGrid";
import {
    BOOKING_FLOW_STEPS,
    DURATION_PRESETS,
    formatDuration,
    getAvailableStartTimes,
    getBookedSystems,
    getBookingDates,
    getDailyBookedMinutes,
    getHeldSystems,
    getStartTimes,
    getUnavailableSystems,
} from "../StudentPortal.helpers";
import { SystemMap } from "./StudentSystemMap";

function BookingProgress({ currentStep }) {
    const bookingComplete = currentStep === "complete";
    const currentIndex = bookingComplete ? BOOKING_FLOW_STEPS.length : BOOKING_FLOW_STEPS.findIndex((step) => step.id === currentStep);
    const activeStep = bookingComplete ? { label: "Complete" } : BOOKING_FLOW_STEPS[Math.max(0, currentIndex)];
    const visibleStep = Math.min(currentIndex + 1, BOOKING_FLOW_STEPS.length);
    return (
        <>
            <div className="border-b border-itx-border bg-[#f8fafb] px-4 py-3 md:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#3096A7]">
                            Step {visibleStep} of {BOOKING_FLOW_STEPS.length}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-itx-ink">{activeStep.label}</p>
                    </div>
                    <span className="flex size-8 items-center justify-center rounded-lg bg-[#3096A7] text-xs font-black text-white shadow-[0_8px_18px_-12px_rgba(48,150,167,0.8)]">
                        {bookingComplete ? <Check className="size-4" /> : visibleStep}
                    </span>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                        className="h-full rounded-full bg-[#3096A7] transition-[width] duration-300"
                        style={{ width: `${(visibleStep / BOOKING_FLOW_STEPS.length) * 100}%` }}
                    />
                </div>
            </div>

            <ol
                aria-label="Booking progress"
                className="hidden grid-cols-4 gap-2 border-b border-itx-border bg-[#f8fafb] px-5 py-3 md:grid xl:px-6"
            >
                {BOOKING_FLOW_STEPS.map((step, index) => {
                    const completed = bookingComplete || index < currentIndex;
                    const active = index === currentIndex;
                    return (
                        <li className={cn("flex min-w-0 items-center gap-2 rounded-xl px-3 py-2", active && "bg-white shadow-sm ring-1 ring-slate-200")} key={step.id}>
                            <span
                                className={cn(
                                    "flex size-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black transition-colors duration-150",
                                    completed && "border-[#3096A7] bg-[#3096A7] text-white",
                                    active && !completed && "border-[#3096A7] bg-[#3096A7]/10 text-[#277f8e]",
                                    !active && !completed && "border-itx-border bg-white text-slate-400",
                                )}
                            >
                                {completed ? <Check className="size-3.5" /> : index + 1}
                            </span>
                            <span
                                className={cn(
                                    "truncate text-xs font-bold",
                                    active || completed ? "text-itx-ink" : "text-slate-400",
                                )}
                            >
                                {step.label}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </>
    );
}

function formatCompactDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (!hours) return `${minutes} min`;
    if (!remainingMinutes) return `${hours} hr`;
    return `${hours}h ${remainingMinutes}m`;
}

function getSelectedStartTimestamp(dateKey, startMinutes) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day, 0, startMinutes).getTime();
}

function hasSelectedTimeExpired(dateKey, startMinutes, graceMinutes, currentTime = Date.now()) {
    if (!dateKey || !Number.isFinite(startMinutes)) return false;
    return currentTime > getSelectedStartTimestamp(dateKey, startMinutes) + graceMinutes * 60_000;
}

// Slot booking page
export function BookSlotView({ student }) {
    const {
        addBooking,
        bookingHolds,
        bookings,
        holdSystem,
        policy,
        refreshBookingHolds,
        releaseSystemHold,
        systems,
        systemOutages,
    } = useLab();
    const systemIds = systems.map((system) => system.id);
    const otherStudentHolds = bookingHolds.filter((hold) => !hold.isMine);
    const bookingDates = getBookingDates(new Date(), policy.sundayHoliday);
    const bookingIncrement = policy.bookingIncrementMinutes ?? 10;
    const bookingStartGraceMinutes = policy.bookingStartGraceMinutes ?? 5;
    const [searchParams] = useSearchParams();
    const requestedDate = searchParams.get("date") ?? "";
    const requestedDuration = Math.min(
        policy.maxDurationMinutes,
        Math.max(
            policy.minDurationMinutes,
            Math.round((Number(searchParams.get("duration")) || 60) / bookingIncrement) * bookingIncrement,
        ),
    );
    const requestedStart = searchParams.get("start") ?? "";
    const hasRequestedDate = bookingDates.some((date) => date.key === requestedDate && !date.isHoliday);
    const hasAvailabilitySelection =
        hasRequestedDate &&
        getStartTimes(
            bookings,
            systemOutages,
            systemIds,
            requestedDate,
            requestedDuration,
            policy.openMinutes,
            policy.closeMinutes,
            bookingIncrement,
            otherStudentHolds,
        ).some((time) => time.id === requestedStart);

    let firstStep = "date";
    if (hasRequestedDate) firstStep = "time";
    if (hasAvailabilitySelection) firstStep = "system";

    let firstDate = "";
    if (hasRequestedDate) firstDate = requestedDate;

    let firstTime = "";
    if (hasAvailabilitySelection) firstTime = requestedStart;

    const [currentStep, setCurrentStep] = useState(firstStep);
    const [selectedDateKey, setSelectedDateKey] = useState(firstDate);
    const [selectedDuration, setSelectedDuration] = useState(requestedDuration);
    const [selectedTimeId, setSelectedTimeId] = useState(firstTime);
    const [selectedSystem, setSelectedSystem] = useState();
    const [selectedHoldId, setSelectedHoldId] = useState("");
    const [holdingSystemId, setHoldingSystemId] = useState();
    const [limitMessage, setLimitMessage] = useState("");
    const selectedDate = bookingDates.find((date) => date.key === selectedDateKey);
    const dailyLimitHours = policy.dailyLimitHours ?? 5;
    const dailyLimitMinutes = dailyLimitHours * 60;
    let dailyBookedMinutes = 0;

    if (selectedDateKey) {
        dailyBookedMinutes = getDailyBookedMinutes(bookings, selectedDateKey, student.id);
    }

    const dailyRemainingMinutes = Math.max(0, dailyLimitMinutes - dailyBookedMinutes);
    const durationFitsDailyLimit = selectedDuration <= dailyRemainingMinutes;
    const durationOptions = [];

    for (const duration of DURATION_PRESETS) {
        const meetsMinimum = duration >= policy.minDurationMinutes;
        const meetsMaximum = duration <= policy.maxDurationMinutes;
        const followsIncrement = duration % bookingIncrement === 0;
        if (meetsMinimum && meetsMaximum && followsIncrement) durationOptions.push(duration);
    }

    let dailyAllowanceStyle = "border-itx-warning/25 bg-itx-warning/8";
    if (dailyRemainingMinutes > 0) dailyAllowanceStyle = "border-itx-success/20 bg-itx-success/8";

    const dailyUsagePercent = Math.min(100, (dailyBookedMinutes / dailyLimitMinutes) * 100);

    let availableStartTimes = [];
    if (selectedDateKey) {
        availableStartTimes = getStartTimes(
            bookings,
            systemOutages,
            systemIds,
            selectedDateKey,
            selectedDuration,
            policy.openMinutes,
            policy.closeMinutes,
            bookingIncrement,
            otherStudentHolds,
        );
    }

    const selectedTime =
        availableStartTimes.find((time) => time.id === selectedTimeId) ??
        getAvailableStartTimes(
            selectedDuration,
            policy.openMinutes,
            policy.closeMinutes,
            bookingIncrement,
        ).find((time) => time.id === selectedTimeId);
    let bookedSystems = new Set();
    let unavailableSystems = new Set();

    if (selectedDateKey && selectedTime) {
        bookedSystems = getBookedSystems(bookings, selectedDateKey, selectedTime.startMinutes, selectedDuration);
        const heldSystems = getHeldSystems(otherStudentHolds, selectedDateKey, selectedTime.startMinutes, selectedDuration);
        bookedSystems = new Set([...bookedSystems, ...heldSystems]);
        unavailableSystems = getUnavailableSystems(systemOutages, systemIds, selectedDateKey, selectedTime.startMinutes, selectedDuration);
    }
    const selectedSystemIsBlocked = selectedSystem && (bookedSystems.has(selectedSystem) || unavailableSystems.has(selectedSystem));
    const resetExpiredSelection = () => {
        const holdId = selectedHoldId;

        setSelectedDateKey("");
        setSelectedTimeId("");
        setSelectedSystem(undefined);
        setSelectedHoldId("");
        setHoldingSystemId(undefined);
        setCurrentStep("date");
        setLimitMessage(
            `Your selected start time has expired after the ${bookingStartGraceMinutes}-minute grace period. Choose a new date and time.`,
        );

        if (holdId) {
            releaseSystemHold(holdId).catch((error) => {
                console.warn("Unable to release expired system hold:", error.message);
            });
        }
    };
    const selectedTimeIsExpired = () => {
        return hasSelectedTimeExpired(
            selectedDateKey,
            Number(selectedTimeId),
            bookingStartGraceMinutes,
        );
    };

    useEffect(() => {
        if (!selectedDateKey || !selectedTimeId || currentStep === "complete") return undefined;

        const checkExpiry = () => {
            const expired = hasSelectedTimeExpired(
                selectedDateKey,
                Number(selectedTimeId),
                bookingStartGraceMinutes,
            );
            if (!expired) return;

            setSelectedDateKey("");
            setSelectedTimeId("");
            setSelectedSystem(undefined);
            setSelectedHoldId("");
            setHoldingSystemId(undefined);
            setCurrentStep("date");
            setLimitMessage(
                `Your selected start time has expired after the ${bookingStartGraceMinutes}-minute grace period. Choose a new date and time.`,
            );

            if (selectedHoldId) {
                releaseSystemHold(selectedHoldId).catch((error) => {
                    console.warn("Unable to release expired system hold:", error.message);
                });
            }
        };

        checkExpiry();
        const timer = window.setInterval(checkExpiry, 1_000);
        return () => window.clearInterval(timer);
    }, [bookingStartGraceMinutes, currentStep, releaseSystemHold, selectedDateKey, selectedHoldId, selectedTimeId]);

    const clearSystemHold = () => {
        const holdId = selectedHoldId;
        setSelectedHoldId("");
        setSelectedSystem(undefined);

        if (holdId) {
            releaseSystemHold(holdId).catch((error) => {
                console.warn("Unable to release system hold:", error.message);
            });
        }
    };
    const chooseDate = (dateKey) => {
        clearSystemHold();
        setSelectedDateKey(dateKey);
        setSelectedTimeId("");
        setLimitMessage("");
    };
    const chooseTime = (timeId) => {
        clearSystemHold();
        setSelectedTimeId(timeId);
        setLimitMessage("");
    };
    const chooseDuration = (duration) => {
        const nextDuration = Math.min(policy.maxDurationMinutes, Math.max(policy.minDurationMinutes, duration));
        if (nextDuration > dailyRemainingMinutes) {
            setLimitMessage(`You have ${formatDuration(dailyRemainingMinutes)} remaining for this date.`);
            return;
        }
        clearSystemHold();
        setSelectedDuration(nextDuration);
        setSelectedTimeId("");
        setLimitMessage("");
    };
    const chooseSystem = async (systemId) => {
        if (!selectedDateKey || !selectedTime || systemId === selectedSystem) return;
        if (selectedTimeIsExpired()) {
            resetExpiredSelection();
            return;
        }

        setHoldingSystemId(systemId);
        setLimitMessage("");

        try {
            const hold = await holdSystem({
                systemId,
                dateKey: selectedDateKey,
                startMinutes: selectedTime.startMinutes,
                bookedMinutes: selectedDuration,
            });
            setSelectedSystem(systemId);
            setSelectedHoldId(hold.id);
        } catch (error) {
            if (error.message.toLowerCase().includes("expired")) {
                resetExpiredSelection();
                return;
            }
            setLimitMessage(error.message);
            await refreshBookingHolds();
        } finally {
            setHoldingSystemId(undefined);
        }
    };
    const startAnotherBooking = () => {
        setSelectedDateKey("");
        setSelectedDuration(requestedDuration);
        setSelectedTimeId("");
        setSelectedSystem(undefined);
        setSelectedHoldId("");
        setCurrentStep("date");
    };
    const confirmBooking = async () => {
        if (!selectedDateKey || !selectedTime || !selectedSystem) return;
        if (selectedTimeIsExpired()) {
            resetExpiredSelection();
            return;
        }
        if (bookedSystems.has(selectedSystem) || unavailableSystems.has(selectedSystem)) {
            setLimitMessage("That system is no longer available. Please choose another system.");
            setSelectedSystem(undefined);
            setCurrentStep("system");
            return;
        }
        if (!durationFitsDailyLimit) {
            setLimitMessage(`This booking exceeds your ${dailyLimitHours}-hour daily limit.`);
            setCurrentStep("time");
            return;
        }
        try {
            await addBooking({
                studentName: student.name,
                studentId: student.id,
                systemId: selectedSystem,
                dateKey: selectedDateKey,
                startMinutes: selectedTime.startMinutes,
                bookedMinutes: selectedDuration,
                holdId: selectedHoldId,
            });
            setCurrentStep("complete");
        } catch (error) {
            if (error.message.toLowerCase().includes("expired")) {
                resetExpiredSelection();
                return;
            }
            setLimitMessage(error.message);
            if (error.message.toLowerCase().includes("hold")) {
                setSelectedSystem(undefined);
                setSelectedHoldId("");
                setCurrentStep("system");
                await refreshBookingHolds();
            }
        }
    };
    if (currentStep === "complete") {
        return (
            <section className="ui-fade-in mx-auto max-w-2xl overflow-hidden rounded-4xl border border-itx-border bg-white shadow-2xl shadow-[#17333e]/10">
                <BookingProgress currentStep="complete" />
                <div className="relative overflow-hidden bg-linear-to-br from-[#2fa473] via-[#258f70] to-[#187178] px-6 py-8 text-white sm:px-9">
                    <span className="relative flex size-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-xl shadow-black/10">
                        <CircleCheck className="size-8" strokeWidth={1.8} />
                    </span>
                    <p className="relative mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">Booking complete</p>
                    <h2 className="relative mt-2 text-3xl font-semibold tracking-[-0.04em]">Booking successful</h2>
                    <p className="mt-2 text-sm text-white/80">System {String(selectedSystem).padStart(2, "0")} is reserved for you.</p>
                </div>
                <div className="p-6 sm:p-9">
                    <dl className="divide-y divide-itx-border rounded-3xl border border-itx-border bg-slate-50 px-5 shadow-inner shadow-[#17333e]/5">
                        <div className="flex items-center justify-between gap-4 py-4">
                            <dt className="text-xs font-semibold text-slate-500">Date</dt>
                            <dd className="text-right text-sm font-bold text-itx-ink">
                                {selectedDate?.day}, {selectedDate?.date} {selectedDate?.month}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-4">
                            <dt className="text-xs font-semibold text-slate-500">Time and duration</dt>
                            <dd className="text-right text-sm font-bold text-itx-ink">
                                {selectedTime?.label} · {formatDuration(selectedDuration)}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-4">
                            <dt className="text-xs font-semibold text-slate-500">System</dt>
                            <dd className="text-right text-sm font-bold text-itx-ink">System {String(selectedSystem).padStart(2, "0")}</dd>
                        </div>
                    </dl>
                    <p className="mt-5 text-sm leading-6 text-slate-500">Your booking has been confirmed and added to your history.</p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <Link
                            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#3096A7] px-5 text-sm font-bold text-white shadow-lg shadow-[#3096A7]/20 transition-colors duration-150 hover:bg-[#287f8e]"
                            to="/portal"
                        >
                            Return home
                        </Link>
                        <button
                            className="h-11 flex-1 rounded-xl border border-itx-border px-5 text-sm font-bold text-slate-600 transition hover:border-[#3096A7] hover:text-[#3096A7]"
                            onClick={startAnotherBooking}
                            type="button"
                        >
                            Book another system
                        </button>
                    </div>
                </div>
            </section>
        );
    }
    return (
        <div className="student-workspace-page space-y-5">
            <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_16rem]">
                <section className="portal-surface portal-ticket overflow-hidden rounded-[22px] border">
                    <BookingProgress currentStep={currentStep} />

                        <div className="ui-fade-in p-4 sm:p-5 xl:p-6" key={currentStep}>
                            {currentStep === "date" && limitMessage && (
                                <p
                                    className="mb-4 rounded-xl border border-itx-danger/25 bg-itx-danger/10 px-4 py-3 text-sm font-semibold text-itx-danger"
                                    role="alert"
                                >
                                    {limitMessage}
                                </p>
                            )}
                            {currentStep === "date" && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Step 1 of 4</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-itx-ink">Which day do you need a system?</h2>
                                    <p className="mt-2 text-sm text-slate-500">Choose one day. Bookings are available until the end of this week.</p>
                                    <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                                        {bookingDates.map((date) => (
                                            <button
                                                aria-pressed={selectedDateKey === date.key}
                                                className={cn(
                                                    "relative min-h-20 overflow-hidden rounded-xl border p-3 text-left transition-colors duration-150",
                                                    date.isHoliday && "cursor-not-allowed border-itx-border bg-slate-50 text-slate-300",
                                                    !date.isHoliday &&
                                                        selectedDateKey === date.key &&
                                                        "border-[#3096A7] bg-[#3096A7] text-white shadow-lg shadow-[#3096A7]/20",
                                                    !date.isHoliday &&
                                                        selectedDateKey !== date.key &&
                                                        "border-itx-border bg-slate-50 text-slate-600 hover:border-[#3096A7] hover:bg-white",
                                                )}
                                                disabled={date.isHoliday}
                                                key={date.key}
                                                onClick={() => chooseDate(date.key)}
                                                type="button"
                                            >
                                                <span>
                                                    <span className="block text-xs font-extrabold uppercase tracking-widest opacity-65">{date.day}</span>
                                                    <span className="mt-1.5 block text-xl font-bold">{date.date}</span>
                                                    <span className="text-sm font-semibold opacity-75">{date.month}</span>
                                                </span>
                                                {date.isHoliday ? (
                                                    <span className="absolute right-2.5 top-2.5 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 xl:right-3 xl:top-3">
                                                        Holiday
                                                    </span>
                                                ) : (
                                                    selectedDateKey === date.key && <Check className="absolute right-3 top-3 size-5" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-5 flex justify-end">
                                        <button
                                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3096A7] px-6 text-sm font-bold text-white transition hover:bg-[#287f8e] disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
                                            disabled={!selectedDateKey}
                                            onClick={() => setCurrentStep("time")}
                                            type="button"
                                        >
                                            Continue to time <ChevronRight className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === "time" && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Step 2 of 4</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-itx-ink">
                                        Choose your time
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Set a duration, then select an available start time.
                                    </p>
                                    <div className="mt-5 grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
                                    <section className="rounded-xl border border-itx-border bg-[#f8fafb] p-4">
                                        <div className="flex items-start gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#3096A7]/10 text-[#3096A7]">
                                                <Timer className="size-5" />
                                            </span>
                                            <div>
                                                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#3096A7]">Duration</p>
                                                <h3 className="mt-0.5 text-base font-bold text-itx-ink">How long?</h3>
                                            </div>
                                        </div>

                                        {dailyRemainingMinutes <= 3 * 60 && (
                                            <div className={cn("mt-4 rounded-xl border p-3", dailyAllowanceStyle)}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Daily allowance</p>
                                                        <p className="mt-0.5 text-sm font-bold text-itx-ink">
                                                            {formatDuration(dailyRemainingMinutes)} remaining
                                                        </p>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-500">{formatDuration(dailyBookedMinutes)} used</span>
                                                </div>
                                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                                                    <div
                                                        className="h-full rounded-full bg-itx-success"
                                                        style={{ width: `${dailyUsagePercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                            {durationOptions.map((duration) => {
                                                const unavailable = duration > dailyRemainingMinutes;
                                                const selected = selectedDuration === duration;
                                                let buttonStyle =
                                                    "border-itx-border bg-white text-slate-600 hover:border-itx-success/50 hover:bg-itx-success/5";

                                                if (unavailable) {
                                                    buttonStyle = "cursor-not-allowed border-itx-border bg-slate-100 text-slate-300";
                                                } else if (selected) {
                                                    buttonStyle =
                                                        "border-itx-success bg-itx-success text-white shadow-lg shadow-itx-success/20";
                                                }

                                                return (
                                                    <button
                                                        aria-pressed={selected}
                                                        className={cn(
                                                            "relative min-h-10 rounded-xl border px-1.5 py-1.5 text-center transition-colors duration-150",
                                                            buttonStyle,
                                                        )}
                                                        disabled={unavailable}
                                                        key={duration}
                                                        onClick={() => chooseDuration(duration)}
                                                        type="button"
                                                    >
                                                        <span className="block text-xs font-extrabold">
                                                            {formatCompactDuration(duration)}
                                                        </span>
                                                        {unavailable && (
                                                            <span className="sr-only">Over daily balance</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-itx-border bg-white p-2.5">
                                            <div>
                                                <p className="text-xs font-bold text-slate-600">Fine tune</p>
                                                <p className="text-[10px] text-slate-400">{bookingIncrement}-min steps</p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    aria-label={`Reduce duration by ${bookingIncrement} minutes`}
                                                    className="flex size-8 items-center justify-center rounded-lg border border-itx-border bg-slate-50 text-base font-bold text-slate-600 disabled:opacity-35"
                                                    disabled={selectedDuration <= policy.minDurationMinutes}
                                                    onClick={() => chooseDuration(selectedDuration - bookingIncrement)}
                                                    type="button"
                                                >
                                                    −
                                                </button>
                                                <span className="min-w-16 text-center text-xs font-extrabold text-itx-ink">
                                                    {formatDuration(selectedDuration)}
                                                </span>
                                                <button
                                                    aria-label={`Increase duration by ${bookingIncrement} minutes`}
                                                    className="flex size-8 items-center justify-center rounded-lg border border-itx-border bg-slate-50 text-base font-bold text-slate-600 disabled:opacity-35"
                                                    disabled={
                                                        selectedDuration >= policy.maxDurationMinutes ||
                                                        selectedDuration + bookingIncrement > dailyRemainingMinutes
                                                    }
                                                    onClick={() => chooseDuration(selectedDuration + bookingIncrement)}
                                                    type="button"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                    </section>

                                    <section className="rounded-xl border border-[#3096A7]/20 bg-[#3096A7]/5 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex items-start gap-3">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#3096A7] text-white">
                                                    <Clock3 className="size-5" />
                                                </span>
                                                <div>
                                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#3096A7]">Start time</p>
                                                    <h3 className="mt-0.5 text-base font-bold text-itx-ink">When should it start?</h3>
                                                </div>
                                            </div>
                                            <span className="w-fit rounded-lg border border-itx-border bg-white px-2.5 py-1.5 text-xs font-extrabold text-slate-600">
                                                {formatDuration(selectedDuration)}
                                            </span>
                                        </div>

                                        <div className="mt-4 rounded-xl border border-itx-border bg-white p-3">
                                            <TimeAvailabilityGrid
                                                intervalMinutes={bookingIncrement}
                                                onSelect={chooseTime}
                                                options={availableStartTimes}
                                                selectedTimeId={selectedTimeId}
                                            />
                                        </div>

                                        {selectedTime ? (
                                            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-itx-success/25 bg-itx-success/10 px-3 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex size-8 items-center justify-center rounded-lg bg-itx-success text-white">
                                                        <Check className="size-5" />
                                                    </span>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-itx-success">Selected</p>
                                                        <p className="mt-0.5 text-sm font-extrabold text-itx-ink">{selectedTime.label}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-itx-success">
                                                    {selectedTime.availableSystems} free
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-itx-border bg-white px-3 py-2.5 text-xs font-semibold text-slate-500">
                                                <Clock3 className="size-4 shrink-0 text-[#3096A7]" />
                                                Select a start time to continue.
                                            </div>
                                        )}
                                    </section>
                                    </div>
                                    {limitMessage && (
                                        <p
                                            className="mt-4 rounded-2xl border border-itx-warning/25 bg-itx-warning/10 px-4 py-3 text-sm font-semibold text-[#8a5a13]"
                                            role="alert"
                                        >
                                            {limitMessage}
                                        </p>
                                    )}
                                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
                                            onClick={() => setCurrentStep("date")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3096A7] px-6 text-sm font-bold text-white transition hover:bg-[#287f8e] disabled:cursor-not-allowed disabled:opacity-35"
                                            disabled={!durationFitsDailyLimit || dailyRemainingMinutes < policy.minDurationMinutes || !selectedTimeId}
                                            onClick={() => setCurrentStep("system")}
                                            type="button"
                                        >
                                            {selectedTime ? "View available systems" : "Select a start time above"}
                                            <ChevronRight className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === "system" && (
                                <div>
                                    <div>
                                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Step 3 of 4</p>
                                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-itx-ink">Choose a workstation</h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Only systems available for the complete {selectedTime?.label} window can be selected.
                                        </p>
                                    </div>
                                    <div className="mt-5">
                                        <SystemMap
                                            bookedSystems={bookedSystems}
                                            onSelect={chooseSystem}
                                            selectionPending={Boolean(holdingSystemId)}
                                            selectedSystem={selectedSystem}
                                            systemIds={systemIds}
                                            unavailableSystems={unavailableSystems}
                                        />
                                    </div>
                                    {limitMessage && (
                                        <p className="mt-4 rounded-2xl border border-itx-warning/25 bg-itx-warning/10 px-4 py-3 text-sm font-semibold text-[#8a5a13]" role="alert">
                                            {limitMessage}
                                        </p>
                                    )}
                                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
                                            onClick={() => setCurrentStep("time")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3096A7] px-6 text-sm font-bold text-white transition hover:bg-[#287f8e] disabled:cursor-not-allowed disabled:opacity-35"
                                            disabled={!selectedSystem || !selectedHoldId || selectedSystemIsBlocked || Boolean(holdingSystemId)}
                                            onClick={() => setCurrentStep("booking")}
                                            type="button"
                                        >
                                            Review booking <ChevronRight className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === "booking" && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Step 4 of 4</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-itx-ink">Review and confirm</h2>
                                    <p className="mt-2 text-sm text-slate-500">Confirm these details before reserving the system.</p>
                                    <p className="mt-4 rounded-xl border border-itx-success/25 bg-itx-success/10 px-3.5 py-2.5 text-sm font-semibold text-itx-success">
                                        Your system is temporarily held. Confirm within 5 minutes to complete the booking.
                                    </p>
                                    <dl className="mt-5 grid gap-2.5 sm:grid-cols-3">
                                        <div className="rounded-xl border border-itx-border bg-slate-50 p-3.5">
                                            <dt className="text-xs font-semibold text-slate-500">Date</dt>
                                            <dd className="mt-2 text-sm font-bold text-itx-ink">
                                                {selectedDate?.day}, {selectedDate?.date} {selectedDate?.month}
                                            </dd>
                                            <button className="mt-3 text-xs font-bold text-[#3096A7]" onClick={() => setCurrentStep("date")} type="button">
                                                Change date
                                            </button>
                                        </div>
                                        <div className="rounded-xl border border-itx-border bg-slate-50 p-3.5">
                                            <dt className="text-xs font-semibold text-slate-500">Time and duration</dt>
                                            <dd className="mt-2 text-sm font-bold text-itx-ink">{selectedTime?.label}</dd>
                                            <dd className="mt-1 text-xs font-semibold text-slate-500">{formatDuration(selectedDuration)}</dd>
                                            <button className="mt-3 text-xs font-bold text-[#3096A7]" onClick={() => setCurrentStep("time")} type="button">
                                                Change time and duration
                                            </button>
                                        </div>
                                        <div className="rounded-xl border border-itx-border bg-slate-50 p-3.5">
                                            <dt className="text-xs font-semibold text-slate-500">System</dt>
                                            <dd className="mt-2 text-sm font-bold text-itx-ink">System {String(selectedSystem).padStart(2, "0")}</dd>
                                            <button className="mt-3 text-xs font-bold text-[#3096A7]" onClick={() => setCurrentStep("system")} type="button">
                                                Change system
                                            </button>
                                        </div>
                                    </dl>
                                    {limitMessage && (
                                        <p className="mt-4 rounded-2xl border border-itx-danger/25 bg-itx-danger/10 px-4 py-3 text-sm font-semibold text-itx-danger" role="alert">
                                            {limitMessage}
                                        </p>
                                    )}
                                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
                                            onClick={() => setCurrentStep("system")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-itx-success px-6 text-sm font-bold text-white transition hover:bg-[#128a5c] disabled:cursor-not-allowed disabled:opacity-40"
                                            disabled={!selectedHoldId || selectedSystemIsBlocked}
                                            onClick={confirmBooking}
                                            type="button"
                                        >
                                            <Check className="size-4" /> Confirm booking
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                </section>

                <aside className="portal-surface sticky top-36 hidden overflow-hidden rounded-[22px] border p-4 text-itx-ink 2xl:block">
                    <p className="relative text-xs font-extrabold uppercase tracking-[0.14em] text-[#3096A7]">Your selection</p>
                    <h2 className="relative mt-2 text-lg font-bold">Booking summary</h2>
                    <dl className="mt-4 space-y-3">
                        <div className="border-b border-itx-border pb-3">
                            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Date</dt>
                            <dd className="mt-1.5 text-sm font-bold">
                                {selectedDate ? `${selectedDate.day}, ${selectedDate.date} ${selectedDate.month}` : "Not selected"}
                            </dd>
                        </div>
                        <div className="border-b border-itx-border pb-3">
                            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Time and duration</dt>
                            <dd className="mt-1.5 text-sm font-bold">{selectedTime?.label ?? "Not selected"}</dd>
                            <dd className="mt-1 text-xs font-semibold text-slate-500">{formatDuration(selectedDuration)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">System</dt>
                            <dd className="mt-1.5 text-sm font-bold">
                                {selectedSystem ? `System ${String(selectedSystem).padStart(2, "0")}` : "Not selected"}
                            </dd>
                        </div>
                    </dl>
                    <div className="mt-4 rounded-xl border border-itx-border bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                        Start times use {bookingIncrement}-minute intervals.
                    </div>
                </aside>
            </div>
        </div>
    );
}
