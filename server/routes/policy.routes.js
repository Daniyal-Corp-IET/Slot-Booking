import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { getPolicy, publicPolicy } from "../services/policy.service.js";
import { notifyPolicyChanged } from "../services/socket.service.js";
import { stop } from "../utils/httpError.js";

const router = Router();

router.use(requireLogin);

// --- Policy update rules -------------------------------------------------
// Each function checks one rule against the submitted settings and throws
// (via `stop`) if it fails. Reading them in order tells the full story of
// what makes a policy update valid.

function assertValidMinuteValues(values) {
    const hasInvalidValue = values.some((value) => !Number.isInteger(value) || value < 0);
    if (hasInvalidValue) stop(400, "Settings must contain valid whole-minute values.");
}

function assertValidIncrement(bookingIncrementMinutes) {
    const allowedIncrements = [5, 10, 15, 30];
    if (!allowedIncrements.includes(bookingIncrementMinutes)) {
        stop(400, "Choose a booking increment of 5, 10, 15, or 30 minutes.");
    }
}

function assertValidUsageLimits(monthlyLimitMinutes, dailyLimitMinutes) {
    const invalidMonthlyLimit = monthlyLimitMinutes < 60;
    const invalidDailyLimit = dailyLimitMinutes < 60 || dailyLimitMinutes > 24 * 60;
    if (invalidMonthlyLimit || invalidDailyLimit) stop(400, "Usage limits are outside the allowed range.");
}

function assertValidDurationRange(minDurationMinutes, maxDurationMinutes, bookingIncrementMinutes) {
    const durationTooShort = minDurationMinutes < bookingIncrementMinutes || maxDurationMinutes < minDurationMinutes;
    const durationNotOnInterval =
        minDurationMinutes % bookingIncrementMinutes !== 0 || maxDurationMinutes % bookingIncrementMinutes !== 0;
    if (durationTooShort || durationNotOnInterval) {
        stop(400, `Session durations must use ${bookingIncrementMinutes}-minute intervals.`);
    }
}

function assertValidLabHours(openMinutes, closeMinutes, maxDurationMinutes, bookingIncrementMinutes) {
    const labTimesNotOnInterval = openMinutes % bookingIncrementMinutes !== 0 || closeMinutes % bookingIncrementMinutes !== 0;
    const invalidLabTimeRange = openMinutes >= closeMinutes || closeMinutes > 24 * 60;
    if (labTimesNotOnInterval || invalidLabTimeRange) {
        stop(400, `Lab hours must use valid ${bookingIncrementMinutes}-minute times.`);
    }
    if (maxDurationMinutes > closeMinutes - openMinutes) {
        stop(400, "The maximum session cannot be longer than the lab day.");
    }
}

function assertValidCancellationAndHoliday(cancelBeforeMinutes, bookingIncrementMinutes, sundayHoliday) {
    const invalidCancellationTime = cancelBeforeMinutes % bookingIncrementMinutes !== 0;
    const invalidHolidaySetting = typeof sundayHoliday !== "boolean";
    if (invalidCancellationTime || invalidHolidaySetting) {
        stop(400, "Cancellation and holiday settings are invalid.");
    }
}

router.get("/", async (request, response, next) => {
    try {
        response.json({ policy: publicPolicy(await getPolicy(getDatabase())) });
    } catch (error) {
        next(error);
    }
});

router.patch("/", requireRole("admin"), async (request, response, next) => {
    try {
        const monthlyLimitMinutes = Number(request.body.monthlyLimitHours) * 60;
        const dailyLimitMinutes = Number(request.body.dailyLimitHours) * 60;
        const bookingIncrementMinutes = Number(request.body.bookingIncrementMinutes);
        const minDurationMinutes = Number(request.body.minDurationMinutes);
        const maxDurationMinutes = Number(request.body.maxDurationMinutes);
        const openMinutes = Number(request.body.openMinutes);
        const closeMinutes = Number(request.body.closeMinutes);
        const cancelBeforeMinutes = Number(request.body.cancelBeforeMinutes);
        const sundayHoliday = request.body.sundayHoliday;

        assertValidMinuteValues([
            monthlyLimitMinutes,
            dailyLimitMinutes,
            bookingIncrementMinutes,
            minDurationMinutes,
            maxDurationMinutes,
            openMinutes,
            closeMinutes,
            cancelBeforeMinutes,
        ]);
        assertValidIncrement(bookingIncrementMinutes);
        assertValidUsageLimits(monthlyLimitMinutes, dailyLimitMinutes);
        assertValidDurationRange(minDurationMinutes, maxDurationMinutes, bookingIncrementMinutes);
        assertValidLabHours(openMinutes, closeMinutes, maxDurationMinutes, bookingIncrementMinutes);
        assertValidCancellationAndHoliday(cancelBeforeMinutes, bookingIncrementMinutes, sundayHoliday);

        const policyData = {
            monthlyLimitMinutes,
            dailyLimitMinutes,
            bookingIncrementMinutes,
            minDurationMinutes,
            maxDurationMinutes,
            openMinutes,
            closeMinutes,
            cancelBeforeMinutes,
            sundayHoliday,
        };

        const database = getDatabase();
        const [policy] = await database.$transaction([
            database.labPolicy.upsert({
                where: { id: 1 },
                update: policyData,
                create: { id: 1, ...policyData },
            }),
            database.student.updateMany({ data: { monthlyLimitMinutes } }),
        ]);

        notifyPolicyChanged();
        response.json({ message: "Booking policy updated successfully.", policy: publicPolicy(policy) });
    } catch (error) {
        next(error);
    }
});

export default router;
