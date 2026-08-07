import jwt from "jsonwebtoken";
import { getDatabase } from "../config/database.js";
import { env } from "../config/env.js";

export async function requireLogin(request, response, next) {
    const token = request.cookies.authToken;

    if (!token) {
        response.status(401).json({ message: "Please log in first." });
        return;
    }

    try {
        const tokenUser = jwt.verify(token, env.JWT_SECRET);

        if (tokenUser.role === "student") {
            const student = await getDatabase().student.findUnique({
                where: { id: tokenUser.id },
                select: { sessionVersion: true },
            });

            if (!student || student.sessionVersion !== tokenUser.sessionVersion) {
                response.clearCookie("authToken");
                response.status(401).json({ message: "Your password changed. Please log in again." });
                return;
            }
        } else if (tokenUser.role === "admin") {
            const admin = await getDatabase().admin.findUnique({
                where: { id: tokenUser.id },
                select: { id: true },
            });

            if (!admin) {
                response.clearCookie("authToken");
                response.status(401).json({ message: "Your administrator account is no longer available." });
                return;
            }
        } else {
            response.status(401).json({ message: "Your session is invalid. Please log in again." });
            return;
        }

        const { sessionVersion, ...publicUser } = tokenUser;
        request.user = publicUser;
        next();
    } catch {
        response.status(401).json({ message: "Your session has expired. Please log in again." });
    }
}

export function requireRole(role) {
    return (request, response, next) => {
        if (request.user?.role !== role) {
            response.status(403).json({ message: "You do not have permission to access this resource." });
            return;
        }
        next();
    };
}
