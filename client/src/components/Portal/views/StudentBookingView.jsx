import { useState } from "react";
import { ArrowDown, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, Sparkles, Timer } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { cn } from "../../../utils/cn";
import { TimeAvailabilityGrid } from "../../SystemCanvas/TimeAvailabilityGrid";
import {
    BOOKING_FLOW_STEPS,
    DURATION_PRESETS,
    formatDuration,
    getBookedSystems,
    getBookingDates,
    getDailyBookedMinutes,
    getHeldSystems,
    getStartTimes,
    getUnavailableSystems,
} from "../StudentPortal.helpers";
import { SystemMap } from "./StudentSystemMap";

function BookingProgress({ currentStep }) {
    const currentIndex = BOOKING_FLOW_STEPS.findIndex((step) => step.id === currentStep);
    const activeStep = BOOKING_FLOW_STEPS[Math.max(0, currentIndex)];
    return (
        <>
            <div className="border-b border-itx-border bg-slate-50 px-5 py-4 md:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-widest text-[#128a93]">
                            Step {currentIndex + 1} of {BOOKING_FLOW_STEPS.length}
                        </p>
                        <p className="mt-1 text-base font-bold text-itx-ink">{activeStep?.label}</p>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-[#128a93] to-[#17a870] text-sm font-black text-white shadow-lg shadow-[#128a93]/20">
                        {currentIndex + 1}
                    </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                        className="h-full rounded-full bg-linear-to-r from-[#128a93] via-[#17a870] to-[#5dceb9] shadow-[0_0_12px_rgba(18,138,147,0.28)] transition-[width] duration-500"
                        style={{ width: `${((currentIndex + 1) / BOOKING_FLOW_STEPS.length) * 100}%` }}
                    />
                </div>
            </div>

            <ol
                aria-label="Booking progress"
                className="hidden grid-cols-5 gap-1 border-b border-itx-border bg-slate-50 px-5 py-4 md:grid xl:px-7 xl:py-5"
            >
                {BOOKING_FLOW_STEPS.map((step, index) => {
                    const completed = currentStep === "complete" || index < currentIndex;
                    const active = index === currentIndex;
                    return (
                        <li className="relative flex flex-col items-center gap-2 text-center" key={step.id}>
                            {index > 0 && (
                                <span
                                    aria-hidden="true"
                                    className={cn("absolute right-1/2 top-3.5 h-0.5 w-full", completed || active ? "bg-[#128a93]" : "bg-slate-200")}
                                />
                            )}
                            <span
                                className={cn(
                                    "relative z-10 flex size-7 items-center justify-center rounded-full border text-[10px] font-black transition-colors duration-150",
                                    completed && "border-[#128a93] bg-linear-to-br from-[#128a93] to-[#0d6169] text-white shadow-md shadow-[#128a93]/20",
                                    active && !completed && "border-[#128a93] bg-white text-[#128a93] ring-4 ring-[#128a93]/15 shadow-sm",
                                    !active && !completed && "border-itx-border bg-white text-slate-400",
                                )}
                                key={`${step.id}-${active}`}
                            >
                                {completed ? <Check className="size-3.5" /> : index + 1}
                            </span>
                            <span
                                className={cn(
                                    "text-[10px] font-extrabold uppercase tracking-[0.08em]",
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

    const selectedTime = availableStartTimes.find((time) => time.id === selectedTimeId);
    let bookedSystems = new Set();
    let unavailableSystems = new Set();

    if (selectedDateKey && selectedTime) {
        bookedSystems = getBookedSystems(bookings, selectedDateKey, selectedTime.startMinutes, selectedDuration);
        const heldSystems = getHeldSystems(otherStudentHolds, selectedDateKey, selectedTime.startMinutes, selectedDuration);
        bookedSystems = new Set([...bookedSystems, ...heldSystems]);
        unavailableSystems = getUnavailableSystems(systemOutages, systemIds, selectedDateKey, selectedTime.startMinutes, selectedDuration);
    }
    const selectedSystemIsBlocked = selectedSystem && (bookedSystems.has(selectedSystem) || unavailableSystems.has(selectedSystem));
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
            setLimitMessage(error.message);
            await refreshBookingHolds();
        } finally {
            setHoldingSystemId(undefined);
        }
    };
    const showStartTimes = () => {
        document.getElementById("booking-start-times")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
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
                    <p className="relative mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">Step 5 of 5</p>
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
                            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-linear-to-r from-[#128a93] to-[#0d6169] px-5 text-sm font-bold text-white shadow-lg shadow-[#128a93]/20 transition-colors duration-150 hover:from-[#0d6169] hover:to-[#0a4f56]"
                            to="/portal"
                        >
                            Return home
                        </Link>
                        <button
                            className="h-12 flex-1 rounded-2xl border border-itx-border px-5 text-sm font-bold text-slate-600 transition hover:border-[#128a93] hover:text-[#128a93]"
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
        <div className="space-y-5">
            <section className="ui-fade-in portal-surface relative overflow-hidden rounded-4xl border p-5 shadow-xl shadow-[#17333e]/5 md:p-6 xl:p-7">
                <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_12%_100%,rgba(83,203,185,0.1),transparent_35%)]" />
                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#128a93] to-[#0d6169] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-[#128a93]/20">
                            <Sparkles className="size-3.5 text-[#f0bf68]" />
                            Guided booking
                        </span>
                        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-itx-ink md:text-3xl">Reserve a system in a few clear steps.</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            Choose only what you need now. Your selections stay visible as you continue.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:w-lg">
                        <div className="min-w-0 rounded-2xl border border-itx-border bg-slate-50 px-3 py-2.5 shadow-sm">
                            <p className="truncate text-sm font-bold text-itx-ink">{selectedDate ? `${selectedDate.date} ${selectedDate.month}` : "—"}</p>
                            <p className="text-xs text-slate-400">Date</p>
                        </div>
                        <div className="min-w-0 rounded-2xl border border-itx-border bg-slate-50 px-3 py-2.5 shadow-sm">
                            <p className="truncate text-sm font-bold text-itx-ink">{selectedTime?.label ?? "—"}</p>
                            <p className="text-xs text-slate-400">{formatDuration(selectedDuration)} · Time</p>
                        </div>
                        <div className="min-w-0 rounded-2xl border border-itx-border bg-slate-50 px-3 py-2.5 shadow-sm">
                            <p className="truncate text-sm font-bold text-itx-ink">
                                {selectedSystem ? `System ${String(selectedSystem).padStart(2, "0")}` : "—"}
                            </p>
                            <p className="text-xs text-slate-400">System</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <section className="portal-surface portal-ticket overflow-hidden rounded-4xl border shadow-xl shadow-[#17333e]/5">
                    <BookingProgress currentStep={currentStep} />

                        <div
                            className="ui-fade-in p-4 md:p-6 xl:p-8"
                            key={currentStep}
                        >
                            {currentStep === "date" && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#128a93]">1 of 5</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-itx-ink">Which day do you need a system?</h2>
                                    <p className="mt-2 text-sm text-slate-500">Choose one day. Bookings are available until the end of this week.</p>
                                    <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                        {bookingDates.map((date) => (
                                            <button
                                                aria-pressed={selectedDateKey === date.key}
                                                className={cn(
                                                    "relative min-h-28 overflow-hidden rounded-2xl border p-4 text-left transition-colors duration-150 md:min-h-24 md:p-3 xl:min-h-28 xl:p-4",
                                                    date.isHoliday && "cursor-not-allowed border-itx-border bg-slate-50 text-slate-300",
                                                    !date.isHoliday &&
                                                        selectedDateKey === date.key &&
                                                        "border-[#128a93] bg-[#128a93] text-white shadow-lg shadow-[#128a93]/20",
                                                    !date.isHoliday &&
                                                        selectedDateKey !== date.key &&
                                                        "border-itx-border bg-slate-50 text-slate-600 hover:border-[#128a93] hover:bg-white",
                                                )}
                                                disabled={date.isHoliday}
                                                key={date.key}
                                                onClick={() => chooseDate(date.key)}
                                                type="button"
                                            >
                                                <span>
                                                    <span className="block text-xs font-extrabold uppercase tracking-widest opacity-65">{date.day}</span>
                                                    <span className="mt-2 block text-2xl font-bold">{date.date}</span>
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
                                    <div className="mt-8 flex justify-end">
                                        <button
                                            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#128a93] px-6 text-sm font-bold text-white transition hover:bg-[#0d6169] disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
                                            disabled={!selectedDateKey}
                                            onClick={() => setCurrentStep("time")}
                                            type="button"
                                        >
                                            Select time <ChevronRight className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === "time" && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#128a93]">2 of 5</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-itx-ink">
                                        Choose duration and start time
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Complete both choices below. We will then show systems available for your full booking.
                                    </p>
                                    <section className="mt-6 rounded-3xl border border-itx-border bg-slate-50 p-4 shadow-sm sm:p-6">
                                        <div className="flex items-start gap-3">
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#128a93]/12 text-[#128a93]">
                                                <Timer className="size-5" />
                                            </span>
                                            <div>
                                                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#128a93]">Choice 1</p>
                                                <h3 className="mt-1 text-lg font-bold text-itx-ink">How long do you need?</h3>
                                            </div>
                                        </div>

                                        <div className={cn("mt-5 rounded-2xl border p-4", dailyAllowanceStyle)}>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Daily allowance</p>
                                                    <p className="mt-1 text-sm font-bold text-itx-ink">
                                                        {formatDuration(dailyRemainingMinutes)} remaining
                                                    </p>
                                                </div>
                                                <span className="w-fit rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-600">
                                                    {formatDuration(dailyBookedMinutes)} used / {dailyLimitHours} hr
                                                </span>
                                            </div>
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                                <div
                                                    className="h-full rounded-full bg-itx-success"
                                                    style={{ width: `${dailyUsagePercent}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                                                            "relative min-h-16 rounded-2xl border px-3 py-3 text-center transition-colors duration-150",
                                                            buttonStyle,
                                                        )}
                                                        disabled={unavailable}
                                                        key={duration}
                                                        onClick={() => chooseDuration(duration)}
                                                        type="button"
                                                    >
                                                        {selected && <Check className="absolute right-2 top-2 size-4" />}
                                                        <span className="block text-base font-extrabold">
                                                            {formatDuration(duration)}
                                                        </span>
                                                        {unavailable && (
                                                            <span className="mt-1 block text-xs font-semibold">Over daily balance</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-600">Adjust duration</p>
                                                <p className="mt-1 text-xs text-slate-500">{bookingIncrement}-minute increments</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    aria-label={`Reduce duration by ${bookingIncrement} minutes`}
                                                    className="flex size-10 items-center justify-center rounded-xl border border-itx-border bg-slate-50 text-lg font-bold text-slate-600 disabled:opacity-35"
                                                    disabled={selectedDuration <= policy.minDurationMinutes}
                                                    onClick={() => chooseDuration(selectedDuration - bookingIncrement)}
                                                    type="button"
                                                >
                                                    −
                                                </button>
                                                <span className="min-w-25 text-center text-sm font-extrabold text-itx-ink">
                                                    {formatDuration(selectedDuration)}
                                                </span>
                                                <button
                                                    aria-label={`Increase duration by ${bookingIncrement} minutes`}
                                                    className="flex size-10 items-center justify-center rounded-xl border border-itx-border bg-slate-50 text-lg font-bold text-slate-600 disabled:opacity-35"
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

                                        <button
                                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#128a93]/12 px-4 py-3 text-sm font-extrabold text-[#0d6169] hover:bg-[#128a93]/20"
                                            onClick={showStartTimes}
                                            type="button"
                                        >
                                            Next: choose a start time <ArrowDown className="size-4" />
                                        </button>
                                    </section>

                                    <section
                                        className="mt-5 scroll-mt-5 rounded-3xl border border-[#128a93]/20 bg-[#128a93]/5 p-4 shadow-sm sm:p-6"
                                        id="booking-start-times"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex items-start gap-3">
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#128a93] text-white shadow-md shadow-[#128a93]/20">
                                                    <Clock3 className="size-5" />
                                                </span>
                                                <div>
                                                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#128a93]">Choice 2</p>
                                                    <h3 className="mt-1 text-lg font-bold text-itx-ink">When do you want to start?</h3>
                                                    <p className="mt-1 text-sm text-slate-500">Choose one available time below.</p>
                                                </div>
                                            </div>
                                            <span className="w-fit rounded-full border border-itx-border bg-white px-3 py-2 text-xs font-extrabold text-slate-600">
                                                Duration: {formatDuration(selectedDuration)}
                                            </span>
                                        </div>

                                        <div className="mt-5 rounded-3xl border border-itx-border bg-white p-3 shadow-sm sm:p-5">
                                            <TimeAvailabilityGrid
                                                intervalMinutes={bookingIncrement}
                                                onSelect={chooseTime}
                                                options={availableStartTimes}
                                                selectedTimeId={selectedTimeId}
                                            />
                                        </div>

                                        {selectedTime ? (
                                            <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-itx-success/25 bg-itx-success/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex size-9 items-center justify-center rounded-xl bg-itx-success text-white">
                                                        <Check className="size-5" />
                                                    </span>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-itx-success">Start time selected</p>
                                                        <p className="mt-1 text-base font-extrabold text-itx-ink">{selectedTime.label}</p>
                                                    </div>
                                                </div>
                                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-itx-success">
                                                    {selectedTime.availableSystems} systems available
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-itx-border bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                                                <Clock3 className="size-4 shrink-0 text-[#128a93]" />
                                                Select a start time to continue.
                                            </div>
                                        )}
                                    </section>
                                    {limitMessage && (
                                        <p
                                            className="mt-4 rounded-2xl border border-itx-warning/25 bg-itx-warning/10 px-4 py-3 text-sm font-semibold text-[#8a5a13]"
                                            role="alert"
                                        >
                                            {limitMessage}
                                        </p>
                                    )}
                                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
                                            onClick={() => setCurrentStep("date")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#128a93] px-6 text-sm font-bold text-white transition hover:bg-[#0d6169] disabled:cursor-not-allowed disabled:opacity-35"
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
                                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#128a93]">3 of 5</p>
                                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-itx-ink">Available systems</h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Only systems available for the complete {selectedTime?.label} window can be selected.
                                        </p>
                                    </div>
                                    <div className="mt-7">
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
                                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
                                            onClick={() => setCurrentStep("time")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#128a93] px-6 text-sm font-bold text-white transition hover:bg-[#0d6169] disabled:cursor-not-allowed disabled:opacity-35"
                                            disabled={!selectedSystem || !selectedHoldId || selectedSystemIsBlocked || Boolean(holdingSystemId)}
                                            onClick={() => setCurrentStep("booking")}
                                            type="button"
                                        >
                                            Continue to booking <ChevronRight className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === "booking" && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#128a93]">4 of 5</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-itx-ink">Booking</h2>
                                    <p className="mt-2 text-sm text-slate-500">Confirm these details before reserving the system.</p>
                                    <p className="mt-4 rounded-2xl border border-itx-success/25 bg-itx-success/10 px-4 py-3 text-sm font-semibold text-itx-success">
                                        Your system is temporarily held. Confirm within 5 minutes to complete the booking.
                                    </p>
                                    <dl className="mt-7 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-itx-border bg-slate-50 p-4">
                                            <dt className="text-xs font-semibold text-slate-500">Date</dt>
                                            <dd className="mt-2 text-sm font-bold text-itx-ink">
                                                {selectedDate?.day}, {selectedDate?.date} {selectedDate?.month}
                                            </dd>
                                            <button className="mt-3 text-xs font-bold text-[#128a93]" onClick={() => setCurrentStep("date")} type="button">
                                                Change date
                                            </button>
                                        </div>
                                        <div className="rounded-2xl border border-itx-border bg-slate-50 p-4">
                                            <dt className="text-xs font-semibold text-slate-500">Time and duration</dt>
                                            <dd className="mt-2 text-sm font-bold text-itx-ink">{selectedTime?.label}</dd>
                                            <dd className="mt-1 text-xs font-semibold text-slate-500">{formatDuration(selectedDuration)}</dd>
                                            <button className="mt-3 text-xs font-bold text-[#128a93]" onClick={() => setCurrentStep("time")} type="button">
                                                Change time and duration
                                            </button>
                                        </div>
                                        <div className="rounded-2xl border border-itx-border bg-slate-50 p-4">
                                            <dt className="text-xs font-semibold text-slate-500">System</dt>
                                            <dd className="mt-2 text-sm font-bold text-itx-ink">System {String(selectedSystem).padStart(2, "0")}</dd>
                                            <button className="mt-3 text-xs font-bold text-[#128a93]" onClick={() => setCurrentStep("system")} type="button">
                                                Change system
                                            </button>
                                        </div>
                                    </dl>
                                    {limitMessage && (
                                        <p className="mt-4 rounded-2xl border border-itx-danger/25 bg-itx-danger/10 px-4 py-3 text-sm font-semibold text-itx-danger" role="alert">
                                            {limitMessage}
                                        </p>
                                    )}
                                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
                                            onClick={() => setCurrentStep("system")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-itx-success px-6 text-sm font-bold text-white transition hover:bg-[#128a5c] disabled:cursor-not-allowed disabled:opacity-40"
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

                <aside className="sticky top-6 hidden overflow-hidden rounded-3xl border border-itx-border bg-white p-5 text-itx-ink shadow-xl shadow-[#17333e]/6 xl:block">
                    <p className="relative text-xs font-extrabold uppercase tracking-[0.14em] text-[#0d6169]">Your selection</p>
                    <h2 className="relative mt-2 text-lg font-bold">Booking summary</h2>
                    <dl className="mt-5 space-y-4">
                        <div className="border-b border-itx-border pb-4">
                            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Date</dt>
                            <dd className="mt-1.5 text-sm font-bold">
                                {selectedDate ? `${selectedDate.day}, ${selectedDate.date} ${selectedDate.month}` : "Not selected"}
                            </dd>
                        </div>
                        <div className="border-b border-itx-border pb-4">
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
                    <div className="mt-6 rounded-2xl border border-itx-border bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                        Start times currently use {bookingIncrement}-minute intervals set by the lab administrator.
                    </div>
                </aside>
            </div>
        </div>
    );
}
