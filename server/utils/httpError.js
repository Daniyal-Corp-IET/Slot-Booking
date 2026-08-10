// Throws an Error carrying an HTTP status, for routes to surface via their error-handling middleware.
export function stop(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
