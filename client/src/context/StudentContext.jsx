import { createContext, useContext, useEffect, useState } from "react";
import { useLab } from "./LabContext";
import { useLogin } from "./LoginContext";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function apiRequest(path) {
    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });
    } catch {
        throw new Error("Unable to connect to the server. Please start the backend and try again.");
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
}

function monthLabel(value) {
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
}

function usageLabel(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
}

function prepareStudent(student) {
    const name = `${student.firstName} ${student.lastName}`;
    const percent = Math.min(100, Math.round((student.monthlyUsedMinutes / student.monthlyLimitMinutes) * 100));
    let status = "Active";
    if (percent >= 85) status = "Near limit";

    return {
        ...student,
        name,
        initials: `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase(),
        program: student.course.name,
        term: `${monthLabel(student.programStart)} – ${monthLabel(student.programEnd)}`,
        phone: student.phoneNumber || "Not provided",
        monthly: usageLabel(student.monthlyUsedMinutes),
        monthlyLimit: usageLabel(student.monthlyLimitMinutes),
        monthlyRemaining: usageLabel(Math.max(0, student.monthlyLimitMinutes - student.monthlyUsedMinutes)),
        percent,
        status,
    };
}

async function getStudent(studentId) {
    const data = await apiRequest(`/students/${studentId}`);
    return prepareStudent(data.student);
}

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
    const { bookings, policy } = useLab();
    const { user } = useLogin();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!user?.id) return;

        let active = true;
        async function loadStudent() {
            try {
                const savedStudent = await getStudent(user.id);
                if (!active) return;
                setStudent(savedStudent);
                setError("");
            } catch (requestError) {
                if (active) setError(requestError.message);
            } finally {
                if (active) setLoading(false);
            }
        }

        loadStudent();

        return () => {
            active = false;
        };
    }, [bookings, policy.monthlyLimitHours, user?.id]);

    return <StudentContext.Provider value={{ student, loading, error }}>{children}</StudentContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudent() {
    const context = useContext(StudentContext);

    if (!context) {
        throw new Error("useStudent must be used inside StudentProvider");
    }

    return context;
}
