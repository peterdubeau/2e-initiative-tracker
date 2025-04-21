import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
let socket: Socket;

export function connect(roomCode: string, isGM: boolean) {
  socket = io(SOCKET_URL, { query: { room: roomCode, gm: isGM } });
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not initialized");
  return socket;
}
