import { createContext, useContext, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

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

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
}

function getCurrentUser() {
    return apiRequest("/auth/me");
}

function loginRequest(username, password) {
    return apiRequest("/auth/login", "POST", { username, password });
}

function logoutRequest() {
    return apiRequest("/auth/logout", "POST");
}

const LoginContext = createContext(null);

export function LoginProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = () => {
        setUser(null);
        window.localStorage.setItem("itx-auth-change", String(Date.now()));
    };

    useEffect(() => {
        async function restoreSession() {
            try {
                const data = await getCurrentUser();
                setUser(data.user);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        restoreSession();
    }, []);

    useEffect(() => {
        if (!user) return undefined;

        const verifySession = async () => {
            try {
                const data = await getCurrentUser();
                setUser((currentUser) => {
                    const sameId = currentUser?.id === data.user.id;
                    const sameRole = currentUser?.role === data.user.role;
                    const sameUsername = currentUser?.username === data.user.username;
                    if (sameId && sameRole && sameUsername) return currentUser;
                    return data.user;
                });
            } catch {
                clearSession();
            }
        };
        const handleAuthChange = (event) => {
            if (event.key === "itx-auth-change") setUser(null);
        };

        const timer = window.setInterval(verifySession, 10_000);
        window.addEventListener("focus", verifySession);
        window.addEventListener("storage", handleAuthChange);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener("focus", verifySession);
            window.removeEventListener("storage", handleAuthChange);
        };
    }, [user]);

    const login = async (username, password) => {
        const data = await loginRequest(username, password);
        setUser(data.user);
        return data.user;
    };

    const logout = async () => {
        try {
            await logoutRequest();
        } finally {
            clearSession();
        }
    };

    return <LoginContext.Provider value={{ clearSession, loading, login, logout, user }}>{children}</LoginContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLogin() {
    const context = useContext(LoginContext);

    if (!context) throw new Error("useLogin must be used inside LoginProvider");
    return context;
}
