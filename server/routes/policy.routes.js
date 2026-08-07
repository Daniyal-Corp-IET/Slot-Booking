import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireLogin, requireRole } from "../middleware/auth.js";
import { getPolicy, publicPolicy } from "../services/policy.service.js";
import { notifyPolicyChanged } from "../services/socket.service.js";

const router = Router();

router.use(requireLogin);

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
        const minuteValues = [
            monthlyLimitMinutes,
            dailyLimitMinutes,
            bookingIncrementMinutes,
            minDurationMinutes,
            maxDurationMinutes,
            openMinutes,
            closeMinutes,
            cancelBeforeMinutes,
        ];

        let containsInvalidMinutes = false;
        for (const value of minuteValues) {
            if (!Number.isInteger(value) || value < 0) containsInvalidMinutes = true;
        }

        if (containsInvalidMinutes) {
            response.status(400).json({ message: "Settings must contain valid whole-minute values." });
            return;
        }

        const allowedIncrements = [5, 10, 15, 30];
        if (!allowedIncrements.includes(bookingIncrementMinutes)) {
            response.status(400).json({ message: "Choose a booking increment of 5, 10, 15, or 30 minutes." });
            return;
        }

        const invalidMonthlyLimit = monthlyLimitMinutes < 60;
        const invalidDailyLimit = dailyLimitMinutes < 60 || dailyLimitMinutes > 24 * 60;
        if (invalidMonthlyLimit || invalidDailyLimit) {
            response.status(400).json({ message: "Usage limits are outside the allowed range." });
            return;
        }

        const durationTooShort = minDurationMinutes < bookingIncrementMinutes || maxDurationMinutes < minDurationMinutes;
        const durationNotOnInterval =
            minDurationMinutes % bookingIncrementMinutes !== 0 || maxDurationMinutes % bookingIncrementMinutes !== 0;
        if (durationTooShort || durationNotOnInterval) {
            response.status(400).json({ message: `Session durations must use ${bookingIncrementMinutes}-minute intervals.` });
            return;
        }

        const labTimesNotOnInterval = openMinutes % bookingIncrementMinutes !== 0 || closeMinutes % bookingIncrementMinutes !== 0;
        const invalidLabTimeRange = openMinutes >= closeMinutes || closeMinutes > 24 * 60;
        if (labTimesNotOnInterval || invalidLabTimeRange) {
            response.status(400).json({ message: `Lab hours must use valid ${bookingIncrementMinutes}-minute times.` });
            return;
        }
        if (maxDurationMinutes > closeMinutes - openMinutes) {
            response.status(400).json({ message: "The maximum session cannot be longer than the lab day." });
            return;
        }
        const invalidCancellationTime = cancelBeforeMinutes % bookingIncrementMinutes !== 0;
        const invalidHolidaySetting = typeof sundayHoliday !== "boolean";
        if (invalidCancellationTime || invalidHolidaySetting) {
            response.status(400).json({ message: "Cancellation and holiday settings are invalid." });
            return;
        }

        const database = getDatabase();
        const [policy] = await database.$transaction([
            database.labPolicy.upsert({
                where: { id: 1 },
                update: {
                    monthlyLimitMinutes,
                    dailyLimitMinutes,
                    bookingIncrementMinutes,
                    minDurationMinutes,
                    maxDurationMinutes,
                    openMinutes,
                    closeMinutes,
                    cancelBeforeMinutes,
                    sundayHoliday,
                },
                create: {
                    id: 1,
                    monthlyLimitMinutes,
                    dailyLimitMinutes,
                    bookingIncrementMinutes,
                    minDurationMinutes,
                    maxDurationMinutes,
                    openMinutes,
                    closeMinutes,
                    cancelBeforeMinutes,
                    sundayHoliday,
                },
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
