import { io, Socket } from "socket.io-client";

let socket: Socket;
export function connect(gmName: string, isGM: boolean) {
  // build the socket URL dynamically from wherever the front‑end is served
  const hostname = window.location.hostname; // e.g. 192.168.1.154
  const SOCKET_PORT = import.meta.env.VITE_SOCKET_PORT || "3001";
  const SOCKET_URL = `http://${hostname}:${SOCKET_PORT}`;

  socket = io(SOCKET_URL, {
    // server code reads `socket.handshake.query.gmName` and `.gm`
    query: { gmName: gmName, gm: isGM },
  });
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not initialized");
  return socket;
}
