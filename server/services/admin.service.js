import { stop } from "../utils/httpError.js";

export function publicAdmin(admin) {
    return {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        username: admin.username,
        phoneNumber: admin.phoneNumber,
        createdAt: admin.createdAt,
    };
}

export function assertValidAdminProfile({ fullName, email, username }) {
    if (!fullName) stop(400, "Full name is required.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) stop(400, "A valid email address is required.");
    if (!username || !/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
        stop(400, "Username must contain 3 to 30 letters, numbers, dots, dashes, or underscores.");
    }
}

// A student's ID doubles as their username, so both tables must be checked for clashes.
export async function assertAdminIdentityAvailable(database, { email, username, excludeAdminId }) {
    const adminWhere = {
        OR: [{ email: { equals: email, mode: "insensitive" } }, { username: { equals: username, mode: "insensitive" } }],
    };
    if (excludeAdminId) adminWhere.id = { not: excludeAdminId };

    const existingAdmin = await database.admin.findFirst({ where: adminWhere });
    const studentWithSameId = await database.student.findFirst({
        where: { id: { equals: username, mode: "insensitive" } },
        select: { id: true },
    });

    if (studentWithSameId) stop(409, "This username is already used as a student ID.");
    if (existingAdmin) {
        const field = existingAdmin.email?.toLowerCase() === email ? "email" : "username";
        stop(409, `This ${field} is already registered.`);
    }
}
