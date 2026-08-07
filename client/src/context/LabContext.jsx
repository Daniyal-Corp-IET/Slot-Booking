import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../constants/socketEvents";
import { useLogin } from "./LoginContext";

const API_URL = import.meta.env.VITE_API_URL || "/api";
let socket;

async function apiRequest(path, method = "GET", values) {
    let response;

    try {
        const options = {
            method,
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        };
        if (values) options.body = JSON.stringify(values);

        response = await fetch(`${API_URL}${path}`, options);
    } catch {
        throw new Error("Unable to connect to the server. Please start the backend and try again.");
    }

    if (response.status === 204) return {};

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
}

function connectSocket() {
    if (!socket) {
        socket = io("/", {
            path: "/api/socket.io",
            withCredentials: true,
            autoConnect: false,
        });
    }

    if (!socket.connected) socket.connect();
    return socket;
}

function disconnectSocket() {
    socket?.disconnect();
    socket = undefined;
}

async function getBookings() {
    const data = await apiRequest("/bookings");
    return data.bookings;
}

async function getBookingHolds() {
    const data = await apiRequest("/bookings/holds");
    return data.holds;
}

async function getSystems() {
    const data = await apiRequest("/systems");
    return data.systems;
}

async function getPolicy() {
    const data = await apiRequest("/policy");
    return data.policy;
}

function getBookingStart(booking) {
    const hours = String(Math.floor(booking.startMinutes / 60)).padStart(2, "0");
    const minutes = String(booking.startMinutes % 60).padStart(2, "0");
    return new Date(`${booking.dateKey}T${hours}:${minutes}:00+05:30`).toISOString();
}

async function createBookingRequest(booking) {
    const values = {
        studentId: booking.studentId,
        systemId: booking.systemId,
        startsAt: getBookingStart(booking),
        bookedMinutes: booking.bookedMinutes,
        holdId: booking.holdId,
    };
    const data = await apiRequest("/bookings", "POST", values);
    return data.booking;
}

async function createSystemHoldRequest(selection) {
    const data = await apiRequest("/bookings/holds", "POST", {
        systemId: selection.systemId,
        startsAt: getBookingStart(selection),
        bookedMinutes: selection.bookedMinutes,
    });
    return data.hold;
}

function releaseSystemHoldRequest(holdId) {
    return apiRequest(`/bookings/holds/${holdId}`, "DELETE");
}

async function cancelBookingRequest(bookingId) {
    const data = await apiRequest(`/bookings/${bookingId}/cancel`, "PATCH");
    return data.booking;
}

async function startBookingRequest(bookingId) {
    const data = await apiRequest(`/bookings/${bookingId}/start`, "PATCH");
    return data.booking;
}

function endBookingRequest(bookingId) {
    return apiRequest(`/bookings/${bookingId}/end`, "PATCH");
}

async function updatePolicyRequest(policy) {
    const data = await apiRequest("/policy", "PATCH", policy);
    return data.policy;
}

function markAvailableRequest(systemId) {
    return apiRequest(`/systems/${systemId}/available`, "PATCH");
}

function markUnavailableRequest(systemId, endsAt, startsAt = null) {
    let startTime = null;
    let endTime = null;
    if (startsAt) startTime = new Date(startsAt).toISOString();
    if (endsAt) endTime = new Date(endsAt).toISOString();

    return apiRequest(`/systems/${systemId}/unavailable`, "PATCH", {
        startsAt: startTime,
        endsAt: endTime,
    });
}

async function addSystemRequest() {
    const data = await apiRequest("/systems", "POST");
    return data.system;
}

function removeSystemRequest(systemId) {
    return apiRequest(`/systems/${systemId}`, "DELETE");
}

const DEFAULT_POLICY = {
    monthlyLimitHours: 35,
    dailyLimitHours: 5,
    bookingIncrementMinutes: 10,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    openMinutes: 9 * 60,
    closeMinutes: 18 * 60,
    cancelBeforeMinutes: 0,
    sundayHoliday: true,
};

const LabContext = createContext(null);

function getOutages(systems) {
    const outages = [];

    for (const system of systems) {
        if (system.outages?.length) {
            outages.push(...system.outages);
        } else if (system.status === "unavailable") {
            outages.push({
                systemId: system.id,
                startsAt: system.unavailableFrom,
                endsAt: system.unavailableUntil,
            });
        }
    }

    return outages;
}

function replaceBooking(bookings, updatedBooking) {
    const otherBookings = bookings.filter((booking) => booking.id !== updatedBooking.id);
    return [updatedBooking, ...otherBookings].sort((first, second) => second.startsAt - first.startsAt);
}

export function LabProvider({ children }) {
    const { user } = useLogin();
    const [systems, setSystems] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [bookingHolds, setBookingHolds] = useState([]);
    const [policy, setPolicy] = useState(DEFAULT_POLICY);
    const [systemOutages, setSystemOutages] = useState([]);
    const [earlyEndNotice, setEarlyEndNotice] = useState(null);

    const loadBookings = useCallback(async () => {
        try {
            setBookings(await getBookings());
        } catch (error) {
            console.warn("Unable to load bookings:", error.message);
        }
    }, []);

    const loadBookingHolds = useCallback(async () => {
        try {
            setBookingHolds(await getBookingHolds());
        } catch (error) {
            console.warn("Unable to load system holds:", error.message);
        }
    }, []);

    const loadSystems = useCallback(async () => {
        try {
            const savedSystems = await getSystems();
            setSystems(savedSystems);
            setSystemOutages(getOutages(savedSystems));
        } catch (error) {
            console.warn("Unable to load systems:", error.message);
        }
    }, []);

    const loadPolicy = useCallback(async () => {
        try {
            setPolicy(await getPolicy());
        } catch (error) {
            console.warn("Unable to load lab policy:", error.message);
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        const timer = window.setTimeout(() => {
            loadBookings();
            loadBookingHolds();
            loadSystems();
            loadPolicy();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadBookingHolds, loadBookings, loadPolicy, loadSystems, user]);

    useEffect(() => {
        if (!user) return;

        const socket = connectSocket();
        const refreshEverything = () => {
            loadBookings();
            loadSystems();
            loadPolicy();
        };

        socket.on("connect", refreshEverything);
        socket.on(SOCKET_EVENTS.BOOKINGS_CHANGED, loadBookings);
        socket.on(SOCKET_EVENTS.SYSTEMS_CHANGED, loadSystems);
        socket.on(SOCKET_EVENTS.POLICY_CHANGED, loadPolicy);
        socket.on(SOCKET_EVENTS.SESSION_ENDED_EARLY, setEarlyEndNotice);

        return () => {
            socket.off("connect", refreshEverything);
            socket.off(SOCKET_EVENTS.BOOKINGS_CHANGED, loadBookings);
            socket.off(SOCKET_EVENTS.SYSTEMS_CHANGED, loadSystems);
            socket.off(SOCKET_EVENTS.POLICY_CHANGED, loadPolicy);
            socket.off(SOCKET_EVENTS.SESSION_ENDED_EARLY, setEarlyEndNotice);
            disconnectSocket();
        };
    }, [loadBookings, loadPolicy, loadSystems, user]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setSystemOutages((current) =>
                current.filter((outage) => {
                    return outage.endsAt === null || outage.endsAt > Date.now();
                }),
            );
            setBookingHolds((current) => current.filter((hold) => hold.expiresAt > Date.now()));
        }, 30_000);

        return () => window.clearInterval(timer);
    }, []);

    async function addBooking(details) {
        const booking = await createBookingRequest(details);
        setBookings((current) => replaceBooking(current, booking));
        setBookingHolds((current) => current.filter((hold) => hold.id !== details.holdId));
        return booking;
    }

    async function holdSystem(details) {
        const hold = await createSystemHoldRequest(details);
        setBookingHolds((current) => {
            const otherHolds = current.filter((item) => !item.isMine && item.id !== hold.id);
            return [hold, ...otherHolds];
        });
        return hold;
    }

    async function releaseSystemHold(holdId) {
        if (!holdId) return;
        await releaseSystemHoldRequest(holdId);
        setBookingHolds((current) => current.filter((hold) => hold.id !== holdId));
    }

    async function cancelBooking(bookingId) {
        const booking = await cancelBookingRequest(bookingId);
        setBookings((current) => replaceBooking(current, booking));
        return booking;
    }

    async function startBooking(bookingId) {
        const booking = await startBookingRequest(bookingId);
        setBookings((current) => replaceBooking(current, booking));
        return booking;
    }

    async function endBooking(bookingId) {
        const result = await endBookingRequest(bookingId);
        setBookings((current) => replaceBooking(current, result.booking));
        if (result.notice) setEarlyEndNotice(result.notice);
        return result.booking;
    }

    async function updatePolicy(changes) {
        const savedPolicy = await updatePolicyRequest({
            ...policy,
            ...changes,
        });
        setPolicy(savedPolicy);
        return savedPolicy;
    }

    async function markSystemAvailable(systemId) {
        await markAvailableRequest(systemId);
        await loadSystems();
    }

    async function markSystemUnavailable(systemId, endsAt, startsAt = null) {
        await markUnavailableRequest(systemId, endsAt, startsAt);
        await loadSystems();
    }

    async function addSystem() {
        const system = await addSystemRequest();
        setSystems((current) => [...current, system].sort((first, second) => first.id - second.id));
        return system;
    }

    async function removeSystem(systemId) {
        await removeSystemRequest(systemId);
        setSystems((current) => current.filter((system) => system.id !== systemId));
        setSystemOutages((current) => current.filter((outage) => outage.systemId !== systemId));
    }

    const clearEarlyEndNotice = useCallback(() => {
        setEarlyEndNotice(null);
    }, []);

    const value = {
        bookings,
        bookingHolds,
        policy,
        systems,
        systemOutages,
        earlyEndNotice,
        addSystem,
        addBooking,
        holdSystem,
        releaseSystemHold,
        refreshBookingHolds: loadBookingHolds,
        cancelBooking,
        startBooking,
        endBooking,
        markSystemAvailable,
        markSystemUnavailable,
        removeSystem,
        updatePolicy,
        clearEarlyEndNotice,
    };

    return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLab() {
    const context = useContext(LabContext);
    if (!context) throw new Error("useLab must be used inside LabProvider");
    return context;
}
