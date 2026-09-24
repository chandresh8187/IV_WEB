import { io } from "socket.io-client";

const PRODUCTION_SOCKET_URL = "https://app.ivsquarestructure.com";
const DEVELOPMENT_SOCKET_URL = "http://localhost:5000";
const configuredSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();
const defaultSocketUrl = import.meta.env.DEV
  ? DEVELOPMENT_SOCKET_URL
  : PRODUCTION_SOCKET_URL;
const SOCKET_URL = configuredSocketUrl || defaultSocketUrl;

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
