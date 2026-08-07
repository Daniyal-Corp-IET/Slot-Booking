import { DateTime } from "luxon";
import { env } from "../config/env.js";

export function getLabDateTime(value = new Date()) {
    return DateTime.fromJSDate(new Date(value), { zone: "utc" }).setZone(env.LAB_TIME_ZONE);
}

export function getLabDateKey(value = new Date()) {
    return getLabDateTime(value).toFormat("yyyy-LL-dd");
}

export function getLabMinutes(value) {
    const date = getLabDateTime(value);
    return date.hour * 60 + date.minute;
}

export function isLabSunday(value) {
    return getLabDateTime(value).weekday === 7;
}

export function getLabDayRange(value) {
    const day = getLabDateTime(value).startOf("day");
    return {
        start: day.toUTC().toJSDate(),
        end: day.plus({ days: 1 }).toUTC().toJSDate(),
    };
}

export function getLabMonthRange(value) {
    const month = getLabDateTime(value).startOf("month");
    return {
        start: month.toUTC().toJSDate(),
        end: month.plus({ months: 1 }).toUTC().toJSDate(),
    };
}

export function dateKeyToLabRange(dateKey) {
    const day = DateTime.fromISO(dateKey, { zone: env.LAB_TIME_ZONE }).startOf("day");
    if (!day.isValid) return null;
    return {
        start: day.toUTC().toJSDate(),
        end: day.plus({ days: 1 }).toUTC().toJSDate(),
    };
}
