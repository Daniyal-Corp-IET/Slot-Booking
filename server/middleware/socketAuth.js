import jwt from "jsonwebtoken";
import { getDatabase } from "../config/database.js";
import { env } from "../config/env.js";

function getCookie(cookieHeader, cookieName) {
    const cookies = cookieHeader?.split(";") || [];

    for (const cookie of cookies) {
        const [name, ...valueParts] = cookie.trim().split("=");
        if (name === cookieName) return decodeURIComponent(valueParts.join("="));
    }

    return null;
}

export async function authenticateSocket(socket, next) {
    try {
        const token = getCookie(socket.handshake.headers.cookie, "authToken");
        if (!token) throw new Error("Authentication required.");

        const user = jwt.verify(token, env.JWT_SECRET);
        const database = getDatabase();

        if (user.role === "student") {
            const student = await database.student.findUnique({
                where: { id: user.id },
                select: { sessionVersion: true },
            });

            if (!student || student.sessionVersion !== user.sessionVersion) {
                throw new Error("Student session expired.");
            }
        } else if (user.role === "admin") {
            const admin = await database.admin.findUnique({
                where: { id: user.id },
                select: { id: true },
            });

            if (!admin) throw new Error("Administrator not found.");
        } else {
            throw new Error("Invalid user role.");
        }

        socket.data.user = { id: user.id, role: user.role };
        next();
    } catch {
        next(new Error("Authentication failed."));
    }
}
