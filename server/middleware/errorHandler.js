import { env } from "../config/env.js";

export function notFound(request, response) {
    response.status(404).json({ message: "API route not found." });
}

export function handleError(error, request, response, next) {
    if (response.headersSent) {
        next(error);
        return;
    }

    const databaseConflict = error.code === "23P01" || JSON.stringify(error.meta || {}).includes("23P01");
    let status = error.status || 500;
    if (databaseConflict) status = 409;

    console.error(error);

    let message = error.message;
    if (databaseConflict) message = "That time period conflicts with an existing booking or outage.";
    if (status === 500 && env.NODE_ENV === "production") message = "Something went wrong on the server.";

    response.status(status).json({ message });
}
