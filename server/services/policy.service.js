import { stop } from "../utils/httpError.js";
import { isLabSunday } from "../utils/time.js";

export const BOOKING_START_GRACE_MINUTES = 5;

const DEFAULT_POLICY = {
    id: 1,
    monthlyLimitMinutes: 35 * 60,
    dailyLimitMinutes: 5 * 60,
    bookingIncrementMinutes: 10,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    openMinutes: 9 * 60,
    closeMinutes: 18 * 60,
    cancelBeforeMinutes: 0,
    sundayHoliday: true,
};

export function getPolicy(database) {
    return database.labPolicy.upsert({
        where: { id: 1 },
        update: {},
        create: DEFAULT_POLICY,
    });
}

// Shared booking/hold rules -----------------------------------------------
// Both a booking and a system hold reserve a slot, so they must pass the
// same duration and schedule checks.

export function assertValidBookingDuration(policy, bookedMinutes) {
    const validDuration =
        bookedMinutes >= policy.minDurationMinutes &&
        bookedMinutes <= policy.maxDurationMinutes &&
        bookedMinutes % policy.bookingIncrementMinutes === 0;
    if (!validDuration) stop(400, "Provide a valid booking duration.");
}

// `action` customizes the past-slot message ("booked" for bookings, "selected" for holds).
export function assertSlotWithinSchedule(policy, startsAt, startMinutes, endMinutes, action = "booked") {
    if (startMinutes % policy.bookingIncrementMinutes !== 0) {
        stop(400, `Start times must use ${policy.bookingIncrementMinutes}-minute intervals.`);
    }
    const gracePeriodEndsAt = startsAt.getTime() + BOOKING_START_GRACE_MINUTES * 60_000;
    if (Date.now() > gracePeriodEndsAt) {
        stop(409, `This time slot has expired and cannot be ${action}. Please select a new date and time.`);
    }
    const outsideLabHours = startMinutes < policy.openMinutes || endMinutes > policy.closeMinutes;
    if ((policy.sundayHoliday && isLabSunday(startsAt)) || outsideLabHours) {
        stop(409, "This slot is outside the current lab schedule.");
    }
}

export function publicPolicy(policy) {
    return {
        monthlyLimitHours: policy.monthlyLimitMinutes / 60,
        dailyLimitHours: policy.dailyLimitMinutes / 60,
        bookingIncrementMinutes: policy.bookingIncrementMinutes,
        minDurationMinutes: policy.minDurationMinutes,
        maxDurationMinutes: policy.maxDurationMinutes,
        openMinutes: policy.openMinutes,
        closeMinutes: policy.closeMinutes,
        cancelBeforeMinutes: policy.cancelBeforeMinutes,
        bookingStartGraceMinutes: BOOKING_START_GRACE_MINUTES,
        sundayHoliday: policy.sundayHoliday,
    };
}
