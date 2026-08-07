import { env } from "../config/env.js";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export function requireSameOrigin(request, response, next) {
    if (env.NODE_ENV !== "production" || SAFE_METHODS.includes(request.method)) {
        next();
        return;
    }

    const origin = request.get("origin");
    if (!origin || new URL(origin).host === request.get("host")) {
        next();
        return;
    }

    response.status(403).json({ message: "Cross-site requests are not allowed." });
}
