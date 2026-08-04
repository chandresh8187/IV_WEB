import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://app.ivsquarestructure.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (callback) => {
    callback({ token: localStorage.getItem("token") || undefined });
  },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export default socket;
