import { getDatabase } from "../config/database.js";

export async function findAccountByLoginId(loginId) {
    const database = getDatabase();

    const admin = await database.admin.findFirst({
        where: {
            username: { equals: loginId, mode: "insensitive" },
        },
    });

    if (admin) {
        return {
            id: admin.id,
            username: admin.username,
            name: admin.fullName,
            email: admin.email,
            phoneNumber: admin.phoneNumber,
            passwordHash: admin.passwordHash,
            role: "admin",
            sessionVersion: null,
        };
    }

    const student = await database.student.findFirst({
        where: {
            id: { equals: loginId, mode: "insensitive" },
        },
    });

    if (!student) return null;

    return {
        id: student.id,
        username: student.id,
        name: `${student.firstName} ${student.lastName}`,
        passwordHash: student.passwordHash,
        role: "student",
        sessionVersion: student.sessionVersion,
    };
}

export function getPublicUser(user) {
    return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
    };
}
