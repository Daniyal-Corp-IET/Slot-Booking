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
                select: { firstName: true, lastName: true, sessionVersion: true },
            });

            if (!student || student.sessionVersion !== tokenUser.sessionVersion) {
                response.clearCookie("authToken");
                response.status(401).json({ message: "Your password changed. Please log in again." });
                return;
            }

            request.user = { id: tokenUser.id, role: "student", username: tokenUser.id, name: `${student.firstName} ${student.lastName}` };
        } else if (tokenUser.role === "admin") {
            const admin = await getDatabase().admin.findUnique({
                where: { id: tokenUser.id },
                select: { fullName: true, email: true, username: true, phoneNumber: true },
            });

            if (!admin) {
                response.clearCookie("authToken");
                response.status(401).json({ message: "Your administrator account is no longer available." });
                return;
            }

            request.user = {
                id: tokenUser.id,
                role: "admin",
                username: admin.username,
                name: admin.fullName,
                email: admin.email,
                phoneNumber: admin.phoneNumber,
            };
        } else {
            response.status(401).json({ message: "Your session is invalid. Please log in again." });
            return;
        }

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
