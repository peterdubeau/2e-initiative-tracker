import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentGmName: string | null = null;
let currentIsGM: boolean | null = null;

export function connect(gmName: string, isGM: boolean) {
  // Reuse existing socket if it's for the same room and role
  if (socket && socket.connected && currentGmName === gmName && currentIsGM === isGM) {
    console.log(`Reusing existing socket for ${gmName} (${isGM ? 'GM' : 'Player'})`);
    return socket;
  }

  // Disconnect old socket if it exists and is for a different room/role
  if (socket && (currentGmName !== gmName || currentIsGM !== isGM)) {
    console.log(`Disconnecting old socket (was ${currentGmName}, now ${gmName})`);
    socket.disconnect();
    socket = null;
  }

  // Create new socket if needed
  if (!socket || !socket.connected) {
    // build the socket URL dynamically from wherever the front‑end is served
    const hostname = window.location.hostname; // e.g. 192.168.1.154
    const SOCKET_PORT = import.meta.env.VITE_SOCKET_PORT || "3001";
    const SOCKET_URL = `http://${hostname}:${SOCKET_PORT}`;

    console.log(`Creating new socket for ${gmName} (${isGM ? 'GM' : 'Player'})`);
    socket = io(SOCKET_URL, {
      // server code reads `socket.handshake.query.gmName` and `.gm`
      query: { gmName: gmName, gm: isGM },
    });
    
    currentGmName = gmName;
    currentIsGM = isGM;
  }
  
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not initialized");
  return socket;
}
