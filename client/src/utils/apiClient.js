const API_URL = import.meta.env.VITE_API_URL || "/api";

// Shared fetch wrapper for authenticated JSON API calls used across contexts and admin views.
export async function apiRequest(path, method = "GET", values, options = {}) {
    const { fallbackErrorMessage = "Something went wrong. Please try again." } = options;
    let response;
    const requestOptions = {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    };

    if (values) {
        requestOptions.body = JSON.stringify(values);
    }

    try {
        response = await fetch(`${API_URL}${path}`, requestOptions);
    } catch {
        throw new Error("Unable to connect to the server. Please start the backend and try again.");
    }

    if (response.status === 204) return {};

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || fallbackErrorMessage);
    }

    return data;
}
