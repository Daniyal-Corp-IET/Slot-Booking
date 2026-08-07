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
        sundayHoliday: policy.sundayHoliday,
    };
}
