import { Server } from "socket.io";
import { authenticateSocket } from "../middleware/socketAuth.js";

let io;

export function initializeSocket(httpServer) {
    io = new Server(httpServer, {
        path: "/api/socket.io",
    });

    io.use(authenticateSocket);

    io.on("connection", (socket) => {
        const user = socket.data.user;
        socket.join(`role:${user.role}`);
        socket.join(`user:${user.id}`);
    });

    return io;
}

export function getSocketServer() {
    return io;
}

export function disconnectSocketClients() {
    io?.disconnectSockets(true);
}
