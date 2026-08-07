import { useState } from "react";
import { ArrowDown, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, Sparkles, Timer } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useLab } from "../../../context/LabContext";
import { TimeAvailabilityGrid } from "../../SystemCanvas/TimeAvailabilityGrid";
import {
    BOOKING_FLOW_STEPS,
    DURATION_PRESETS,
    cn,
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
            <div className="border-b border-white/10 bg-white/5 px-5 py-4 md:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-widest text-[#2f9db0]">
                            Step {currentIndex + 1} of {BOOKING_FLOW_STEPS.length}
                        </p>
                        <p className="mt-1 text-base font-bold text-white">{activeStep?.label}</p>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-[#2f9db0] to-[#3ee7c2] text-sm font-black text-white shadow-lg shadow-[#2f9db0]/20">
                        {currentIndex + 1}
                    </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                        className="h-full rounded-full bg-linear-to-r from-[#2f9db0] via-[#3ee7c2] to-[#5dceb9] shadow-[0_0_12px_rgba(26,165,179,0.28)] transition-[width] duration-500"
                        style={{ width: `${((currentIndex + 1) / BOOKING_FLOW_STEPS.length) * 100}%` }}
                    />
                </div>
            </div>

            <ol
                aria-label="Booking progress"
                className="hidden grid-cols-5 gap-1 border-b border-white/10 bg-white/5 px-5 py-4 md:grid xl:px-7 xl:py-5"
            >
                {BOOKING_FLOW_STEPS.map((step, index) => {
                    const completed = currentStep === "complete" || index < currentIndex;
                    const active = index === currentIndex;
                    return (
                        <li className="relative flex flex-col items-center gap-2 text-center" key={step.id}>
                            {index > 0 && (
                                <span
                                    aria-hidden="true"
                                    className={cn("absolute right-1/2 top-3.5 h-0.5 w-full", completed || active ? "bg-[#2f9db0]" : "bg-white/12")}
                                />
                            )}
                            <span
                                className={cn(
                                    "relative z-10 flex size-7 items-center justify-center rounded-full border text-[10px] font-black transition-colors duration-150",
                                    completed && "border-[#2f9db0] bg-linear-to-br from-[#2f9db0] to-[#17939c] text-white shadow-md shadow-[#2f9db0]/20",
                                    active && !completed && "border-[#2f9db0] bg-white/8 text-[#2f9db0] ring-4 ring-[#2f9db0]/15 shadow-sm",
                                    !active && !completed && "border-white/12 bg-white/5 text-white/40",
                                )}
                                key={`${step.id}-${active}`}
                            >
                                {completed ? <Check className="size-3.5" /> : index + 1}
                            </span>
                            <span
                                className={cn(
                                    "text-[10px] font-extrabold uppercase tracking-[0.08em]",
                                    active || completed ? "text-white" : "text-white/40",
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

    let dailyAllowanceStyle = "border-amber-400/25 bg-amber-400/8";
    if (dailyRemainingMinutes > 0) dailyAllowanceStyle = "border-emerald-400/20 bg-emerald-400/8";

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
            <section className="ui-fade-in mx-auto max-w-2xl overflow-hidden rounded-4xl border border-white/10 bg-[#0f2f38]/90 shadow-2xl shadow-black/40">
                <BookingProgress currentStep="complete" />
                <div className="relative overflow-hidden bg-linear-to-br from-[#2fa473] via-[#258f70] to-[#187178] px-6 py-8 text-white sm:px-9">
                    <span aria-hidden="true" className="absolute -right-12 -top-12 size-44 rounded-full border-24 border-white/7" />
                    <span className="relative flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/12 shadow-xl shadow-black/10">
                        <CircleCheck className="size-8" strokeWidth={1.8} />
                    </span>
                    <p className="relative mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-white/65">Step 5 of 5</p>
                    <h2 className="relative mt-2 text-3xl font-semibold tracking-[-0.04em]">Booking successful</h2>
                    <p className="mt-2 text-sm text-white/75">System {String(selectedSystem).padStart(2, "0")} is reserved for you.</p>
                </div>
                <div className="p-6 sm:p-9">
                    <dl className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5 px-5 shadow-inner shadow-black/10">
                        <div className="flex items-center justify-between gap-4 py-4">
                            <dt className="text-xs font-semibold text-white/45">Date</dt>
                            <dd className="text-right text-sm font-bold text-white/80">
                                {selectedDate?.day}, {selectedDate?.date} {selectedDate?.month}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-4">
                            <dt className="text-xs font-semibold text-white/45">Time and duration</dt>
                            <dd className="text-right text-sm font-bold text-white/80">
                                {selectedTime?.label} · {formatDuration(selectedDuration)}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-4">
                            <dt className="text-xs font-semibold text-white/45">System</dt>
                            <dd className="text-right text-sm font-bold text-white/80">System {String(selectedSystem).padStart(2, "0")}</dd>
                        </div>
                    </dl>
                    <p className="mt-5 text-sm leading-6 text-white/55">Your booking has been confirmed and added to your history.</p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <Link
                            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-linear-to-r from-[#102f3d] to-[#174d5a] px-5 text-sm font-bold text-white shadow-lg shadow-[#102f3d]/15 transition-colors duration-150 hover:from-[#2f9db0] hover:to-[#17939c]"
                            to="/portal"
                        >
                            Return home
                        </Link>
                        <button
                            className="h-12 flex-1 rounded-2xl border border-white/15 px-5 text-sm font-bold text-white/80 transition hover:border-[#2f9db0] hover:text-[#2f9db0]"
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
                <div aria-hidden="true" className="absolute -right-16 -top-20 size-52 rounded-full border-24 border-dashed border-[#2f9db0]/6" />
                <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_12%_100%,rgba(83,203,185,0.08),transparent_35%)]" />
                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#102f3d] to-[#174d5a] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-[#102f3d]/12">
                            <Sparkles className="size-3.5 text-[#f0bf68]" />
                            Guided booking
                        </span>
                        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">Reserve a system in a few clear steps.</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                            Choose only what you need now. Your selections stay visible as you continue.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:w-lg">
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-md shadow-black/10">
                            <p className="truncate text-sm font-bold text-white/80">{selectedDate ? `${selectedDate.date} ${selectedDate.month}` : "—"}</p>
                            <p className="text-xs text-white/45">Date</p>
                        </div>
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-md shadow-black/10">
                            <p className="truncate text-sm font-bold text-white/80">{selectedTime?.label ?? "—"}</p>
                            <p className="text-xs text-white/45">{formatDuration(selectedDuration)} · Time</p>
                        </div>
                        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-md shadow-black/10">
                            <p className="truncate text-sm font-bold text-white/80">
                                {selectedSystem ? `System ${String(selectedSystem).padStart(2, "0")}` : "—"}
                            </p>
                            <p className="text-xs text-white/45">System</p>
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
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2f9db0]">1 of 5</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">Which day do you need a system?</h2>
                                    <p className="mt-2 text-sm text-white/55">Choose one day. Bookings are available until the end of this week.</p>
                                    <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                        {bookingDates.map((date) => (
                                            <button
                                                aria-pressed={selectedDateKey === date.key}
                                                className={cn(
                                                    "relative min-h-28 overflow-hidden rounded-2xl border p-4 text-left transition-colors duration-150 md:min-h-24 md:p-3 xl:min-h-28 xl:p-4",
                                                    date.isHoliday && "cursor-not-allowed border-white/8 bg-white/4 text-white/30",
                                                    !date.isHoliday &&
                                                        selectedDateKey === date.key &&
                                                        "border-[#2f9db0] bg-[#2f9db0] text-[#082330] shadow-lg shadow-[#2f9db0]/20",
                                                    !date.isHoliday &&
                                                        selectedDateKey !== date.key &&
                                                        "border-white/10 bg-white/5 text-white/80 hover:border-[#2f9db0] hover:bg-white/8",
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
                                                    <span className="absolute right-2.5 top-2.5 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-white/50 xl:right-3 xl:top-3">
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
                                            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#102f3d] px-6 text-sm font-bold text-white transition hover:bg-[#2f9db0] disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
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
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2f9db0]">2 of 5</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">
                                        Choose duration and start time
                                    </h2>
                                    <p className="mt-2 text-sm text-white/55">
                                        Complete both choices below. We will then show systems available for your full booking.
                                    </p>
                                    <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/10 sm:p-6">
                                        <div className="flex items-start gap-3">
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#2f9db0]/15 text-[#2f9db0]">
                                                <Timer className="size-5" />
                                            </span>
                                            <div>
                                                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2f9db0]">Choice 1</p>
                                                <h3 className="mt-1 text-lg font-bold text-white">How long do you need?</h3>
                                            </div>
                                        </div>

                                        <div className={cn("mt-5 rounded-2xl border p-4", dailyAllowanceStyle)}>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-xs font-extrabold uppercase tracking-widest text-white/55">Daily allowance</p>
                                                    <p className="mt-1 text-sm font-bold text-white/80">
                                                        {formatDuration(dailyRemainingMinutes)} remaining
                                                    </p>
                                                </div>
                                                <span className="w-fit rounded-full bg-white/10 px-3 py-2 text-xs font-extrabold text-white/80">
                                                    {formatDuration(dailyBookedMinutes)} used / {dailyLimitHours} hr
                                                </span>
                                            </div>
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className="h-full rounded-full bg-[#2d9d6c]"
                                                    style={{ width: `${dailyUsagePercent}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            {durationOptions.map((duration) => {
                                                const unavailable = duration > dailyRemainingMinutes;
                                                const selected = selectedDuration === duration;
                                                let buttonStyle =
                                                    "border-white/10 bg-white/5 text-white/80 hover:border-[#2d9d6c]/50 hover:bg-white/8";

                                                if (unavailable) {
                                                    buttonStyle = "cursor-not-allowed border-white/8 bg-white/4 text-white/30";
                                                } else if (selected) {
                                                    buttonStyle =
                                                        "border-[#2d9d6c] bg-[#2d9d6c] text-white shadow-lg shadow-[#2d9d6c]/15";
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
                                        <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-white/80">Adjust duration</p>
                                                <p className="mt-1 text-xs text-white/55">{bookingIncrement}-minute increments</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    aria-label={`Reduce duration by ${bookingIncrement} minutes`}
                                                    className="flex size-10 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-lg font-bold text-white/80 disabled:opacity-35"
                                                    disabled={selectedDuration <= policy.minDurationMinutes}
                                                    onClick={() => chooseDuration(selectedDuration - bookingIncrement)}
                                                    type="button"
                                                >
                                                    −
                                                </button>
                                                <span className="min-w-25 text-center text-sm font-extrabold text-white">
                                                    {formatDuration(selectedDuration)}
                                                </span>
                                                <button
                                                    aria-label={`Increase duration by ${bookingIncrement} minutes`}
                                                    className="flex size-10 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-lg font-bold text-white/80 disabled:opacity-35"
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
                                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f9db0]/12 px-4 py-3 text-sm font-extrabold text-[#7fe0e8] hover:bg-[#2f9db0]/20"
                                            onClick={showStartTimes}
                                            type="button"
                                        >
                                            Next: choose a start time <ArrowDown className="size-4" />
                                        </button>
                                    </section>

                                    <section
                                        className="mt-5 scroll-mt-5 rounded-3xl border border-[#2f9db0]/20 bg-[#2f9db0]/5 p-4 shadow-lg shadow-black/10 sm:p-6"
                                        id="booking-start-times"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex items-start gap-3">
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#2f9db0] text-white shadow-md shadow-[#2f9db0]/20">
                                                    <Clock3 className="size-5" />
                                                </span>
                                                <div>
                                                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2f9db0]">Choice 2</p>
                                                    <h3 className="mt-1 text-lg font-bold text-white">When do you want to start?</h3>
                                                    <p className="mt-1 text-sm text-white/55">Choose one available time below.</p>
                                                </div>
                                            </div>
                                            <span className="w-fit rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-extrabold text-white/75">
                                                Duration: {formatDuration(selectedDuration)}
                                            </span>
                                        </div>

                                        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-sm sm:p-5">
                                            <TimeAvailabilityGrid
                                                intervalMinutes={bookingIncrement}
                                                onSelect={chooseTime}
                                                options={availableStartTimes}
                                                selectedTimeId={selectedTimeId}
                                            />
                                        </div>

                                        {selectedTime ? (
                                            <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex size-9 items-center justify-center rounded-xl bg-[#2d9d6c] text-white">
                                                        <Check className="size-5" />
                                                    </span>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-300">Start time selected</p>
                                                        <p className="mt-1 text-base font-extrabold text-white/80">{selectedTime.label}</p>
                                                    </div>
                                                </div>
                                                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                                                    {selectedTime.availableSystems} systems available
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/55">
                                                <Clock3 className="size-4 shrink-0 text-[#2f9db0]" />
                                                Select a start time to continue.
                                            </div>
                                        )}
                                    </section>
                                    {limitMessage && (
                                        <p
                                            className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300"
                                            role="alert"
                                        >
                                            {limitMessage}
                                        </p>
                                    )}
                                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white/60 hover:bg-white/8"
                                            onClick={() => setCurrentStep("date")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#102f3d] px-6 text-sm font-bold text-white transition hover:bg-[#2f9db0] disabled:cursor-not-allowed disabled:opacity-35"
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
                                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2f9db0]">3 of 5</p>
                                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">Available systems</h2>
                                        <p className="mt-2 text-sm text-white/55">
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
                                    {selectedHoldId && (
                                        <p className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                                            System {String(selectedSystem).padStart(2, "0")} is held for you for 5 minutes. Continue to confirm the booking.
                                        </p>
                                    )}
                                    {limitMessage && (
                                        <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300" role="alert">
                                            {limitMessage}
                                        </p>
                                    )}
                                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white/60 hover:bg-white/8"
                                            onClick={() => setCurrentStep("time")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#102f3d] px-6 text-sm font-bold text-white transition hover:bg-[#2f9db0] disabled:cursor-not-allowed disabled:opacity-35"
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
                                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2f9db0]">4 of 5</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">Booking</h2>
                                    <p className="mt-2 text-sm text-white/55">Confirm these details before reserving the system.</p>
                                    <p className="mt-4 rounded-2xl border border-lime-400/25 bg-lime-400/10 px-4 py-3 text-sm font-semibold text-lime-300">
                                        Your system is temporarily held. Confirm within 5 minutes to complete the booking.
                                    </p>
                                    <dl className="mt-7 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                            <dt className="text-xs font-semibold text-white/45">Date</dt>
                                            <dd className="mt-2 text-sm font-bold text-white/80">
                                                {selectedDate?.day}, {selectedDate?.date} {selectedDate?.month}
                                            </dd>
                                            <button className="mt-3 text-xs font-bold text-[#2f9db0]" onClick={() => setCurrentStep("date")} type="button">
                                                Change date
                                            </button>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                            <dt className="text-xs font-semibold text-white/45">Time and duration</dt>
                                            <dd className="mt-2 text-sm font-bold text-white/80">{selectedTime?.label}</dd>
                                            <dd className="mt-1 text-xs font-semibold text-white/45">{formatDuration(selectedDuration)}</dd>
                                            <button className="mt-3 text-xs font-bold text-[#2f9db0]" onClick={() => setCurrentStep("time")} type="button">
                                                Change time and duration
                                            </button>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                            <dt className="text-xs font-semibold text-white/45">System</dt>
                                            <dd className="mt-2 text-sm font-bold text-white/80">System {String(selectedSystem).padStart(2, "0")}</dd>
                                            <button className="mt-3 text-xs font-bold text-[#2f9db0]" onClick={() => setCurrentStep("system")} type="button">
                                                Change system
                                            </button>
                                        </div>
                                    </dl>
                                    {limitMessage && (
                                        <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300" role="alert">
                                            {limitMessage}
                                        </p>
                                    )}
                                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white/60 hover:bg-white/8"
                                            onClick={() => setCurrentStep("system")}
                                            type="button"
                                        >
                                            <ChevronLeft className="size-4" /> Back
                                        </button>
                                        <button
                                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2d9d6c] px-6 text-sm font-bold text-white transition hover:bg-[#25865c] disabled:cursor-not-allowed disabled:opacity-40"
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

                <aside className="sticky top-6 hidden overflow-hidden rounded-3xl bg-[#102f3d] p-5 text-white shadow-xl shadow-[#102f3d]/15 xl:block">
                    <div aria-hidden="true" className="absolute -right-12 -top-12 size-32 rounded-full border border-white/10" />
                    <p className="relative text-xs font-extrabold uppercase tracking-[0.14em] text-[#62cbd1]">Your selection</p>
                    <h2 className="relative mt-2 text-lg font-bold">Booking summary</h2>
                    <dl className="mt-5 space-y-4">
                        <div className="border-b border-white/10 pb-4">
                            <dt className="text-xs font-bold uppercase tracking-widest text-white/40">Date</dt>
                            <dd className="mt-1.5 text-sm font-bold">
                                {selectedDate ? `${selectedDate.day}, ${selectedDate.date} ${selectedDate.month}` : "Not selected"}
                            </dd>
                        </div>
                        <div className="border-b border-white/10 pb-4">
                            <dt className="text-xs font-bold uppercase tracking-widest text-white/40">Time and duration</dt>
                            <dd className="mt-1.5 text-sm font-bold">{selectedTime?.label ?? "Not selected"}</dd>
                            <dd className="mt-1 text-xs font-semibold text-white/50">{formatDuration(selectedDuration)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-widest text-white/40">System</dt>
                            <dd className="mt-1.5 text-sm font-bold">
                                {selectedSystem ? `System ${String(selectedSystem).padStart(2, "0")}` : "Not selected"}
                            </dd>
                        </div>
                    </dl>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/7 p-3 text-xs leading-5 text-white/60">
                        Start times currently use {bookingIncrement}-minute intervals set by the lab administrator.
                    </div>
                </aside>
            </div>
        </div>
    );
}
