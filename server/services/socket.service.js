import { SOCKET_EVENTS } from "../constants/socketEvents.js";
import { getSocketServer } from "../config/socket.js";

function emitUpdate(eventName) {
    getSocketServer()?.emit(eventName, { updatedAt: Date.now() });
}

export function notifySystemsChanged() {
    emitUpdate(SOCKET_EVENTS.SYSTEMS_CHANGED);
}

export function notifyBookingsChanged() {
    emitUpdate(SOCKET_EVENTS.BOOKINGS_CHANGED);
}

export function notifyHoldsChanged() {
    emitUpdate(SOCKET_EVENTS.HOLDS_CHANGED);
}

export function notifyStudentsChanged() {
    emitUpdate(SOCKET_EVENTS.STUDENTS_CHANGED);
}

export function notifyCoursesChanged() {
    emitUpdate(SOCKET_EVENTS.COURSES_CHANGED);
}

export function notifyPolicyChanged() {
    emitUpdate(SOCKET_EVENTS.POLICY_CHANGED);
}

export function notifySessionEndedEarly(notice) {
    const io = getSocketServer();
    io?.to("role:admin").emit(SOCKET_EVENTS.SESSION_ENDED_EARLY, notice);
    io?.to(`user:${notice.studentId}`).emit(SOCKET_EVENTS.SESSION_ENDED_EARLY, notice);
}
