import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../utils/apiClient";
import { prepareStudent } from "../utils/prepareStudent";
import { useLab } from "./LabContext";
import { useLogin } from "./LoginContext";

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
