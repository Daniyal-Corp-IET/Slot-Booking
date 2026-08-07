export async function lockBooking(transaction, systemId, studentId) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(1, ${systemId})`;
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(2, hashtext(${studentId}))`;
}

export async function lockCourse(transaction, courseId) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(3, ${courseId})`;
}
