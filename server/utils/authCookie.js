import { env } from "../config/env.js";

export const AUTH_COOKIE_NAME = "authToken";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
};

export function setAuthCookie(response, token) {
    response.cookie(AUTH_COOKIE_NAME, token, { ...cookieOptions, maxAge: THREE_DAYS_MS });
}

export function clearAuthCookie(response) {
    response.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}
