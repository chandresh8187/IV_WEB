import { io } from "socket.io-client";

const PRODUCTION_SOCKET_URL = "https://app.ivsquarestructure.com";
const configuredSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();
const SOCKET_URL =
  import.meta.env.PROD && !/^https?:\/\//i.test(configuredSocketUrl)
    ? PRODUCTION_SOCKET_URL
    : configuredSocketUrl || PRODUCTION_SOCKET_URL;

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
