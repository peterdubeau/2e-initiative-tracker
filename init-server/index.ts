import express from "express";
import http from "http";
import cors from "cors";
import { Server, Socket } from "socket.io";
import os from "os";
import fs from "fs";
import path from "path";
import { RoomManager } from "./roomManager"; // add .ts extension for ts-node resolution

const app = express();
const server = http.createServer(app);

// Allow CORS from localhost and any local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkRegex = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+):\d+$/;
    if (localNetworkRegex.test(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions,
});
const roomManager = new RoomManager();

// Load a single GM file
function loadGMFile(gmName: string): { name: string; Password: string; encounters?: any[] } | null {
  try {
    const gmFilePath = path.join(__dirname, "..", "gm_data", `${gmName}.json`);
    const fileContent = fs.readFileSync(gmFilePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading GM file for ${gmName}:`, error);
    return null;
  }
}

// Load GM credentials from individual files in gm_data/
function loadGMCredentials(): Array<{ name: string; Password: string }> {
  try {
    const gmListPath = path.join(__dirname, "..", "gm_data", "GM_list.json");
    const fileContent = fs.readFileSync(gmListPath, "utf-8");
    const gmIndex = JSON.parse(fileContent);
    
    // Handle both array of names and array of objects
    const gmNames = Array.isArray(gmIndex)
      ? gmIndex.map((item: any) => typeof item === 'string' ? item : item.name)
      : [];
    
    const credentials: Array<{ name: string; Password: string }> = [];
    
    for (const gmName of gmNames) {
      const gm = loadGMFile(gmName);
      if (gm && gm.name && gm.Password) {
        credentials.push({
          name: gm.name,
          Password: gm.Password,
        });
      }
    }
    
    return credentials;
  } catch (error) {
    console.error("Error loading GM credentials:", error);
    return [];
  }
}

const gmCredentials = loadGMCredentials();

// Validate GM credentials
function validateGMCredentials(name: string, password: string): boolean {
  const gm = gmCredentials.find(
    (g) => g.name === name && g.Password === password
  );
  return Boolean(gm);
}

// Get the server's local network IP address
function getLocalNetworkIP(): string {
  const interfaces = os.networkInterfaces();
  const localNetworkPrefixes = ["192.168.", "10.", "172.16.", "172.17.", "172.18.", "172.19.", 
                                 "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
                                 "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31."];
  
  // First pass: prefer local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        if (localNetworkPrefixes.some(prefix => addr.address.startsWith(prefix))) {
          return addr.address;
        }
      }
    }
  }
  
  // Fallback: return first non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return "localhost";
}

// Endpoint to get server configuration (IP and port)
app.get("/api-config", (req, res) => {
  let serverIP = getLocalNetworkIP(); // Fallback to detected IP
  
  // Try to get the IP from the Host header (the IP the client used to connect)
  const hostHeader = req.get("host") || "";
  // Extract IP from "192.168.1.160:3001" format
  const hostMatch = hostHeader.match(/^(\d+\.\d+\.\d+\.\d+)/);
  if (hostMatch) {
    const requestedIP = hostMatch[1];
    // If it's a local network IP, use it (it's the IP the frontend can reach us on)
    if (requestedIP.startsWith("192.168.") || 
        requestedIP.startsWith("10.") || 
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(requestedIP)) {
      serverIP = requestedIP;
    }
  }
  
  res.json({ 
    host: serverIP,
    port: PORT 
  });
});

// GM login endpoint
app.post("/login-gm", express.json(), (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) {
    res.status(400).json({ error: "Name and password are required" });
    return;
  }

  if (validateGMCredentials(name, password)) {
    // If room doesn't exist, create it. If it exists, allow reconnection.
    if (!roomManager.hasRoom(name)) {
      roomManager.createRoom(name);
    }
    res.json({ success: true, gmName: name });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Get list of active GMs
app.get("/active-gms", (_req, res) => {
  const activeGMs = roomManager.getActiveGMs();
  res.json({ gms: activeGMs });
});

// Get encounters for a specific GM
app.get("/gm-encounters/:gmName", (req, res) => {
  const { gmName } = req.params;
  try {
    const gm = loadGMFile(gmName);
    
    if (gm && gm.encounters && Array.isArray(gm.encounters) && gm.encounters.length > 0) {
      res.json({ encounters: gm.encounters });
    } else {
      res.json({ encounters: [] });
    }
  } catch (error) {
    console.error("Error loading GM encounters:", error);
    res.json({ encounters: [] });
  }
});

// Generate random roll between 7 and 27 (inclusive)
function generateRandomRoll(): number {
  return Math.floor(Math.random() * 21) + 7; // 21 possible values: 7-27
}

// Legacy endpoint - kept for backward compatibility but will be removed
app.post("/create-room", express.json(), (req, res) => {
  const { gmName } = req.body;
  if (gmName && roomManager.hasRoom(gmName)) {
    res.json({ success: true, gmName });
  } else {
    res.status(400).json({ error: "Invalid GM name or room does not exist" });
  }
});

// Track which socket belongs to which player entry
const socketToEntryId = new Map<string, string>();
const entryIdToSockets = new Map<string, Set<string>>();

io.on("connection", (socket: Socket) => {
  const { gmName, gm } = socket.handshake.query as {
    gmName: string;
    gm: string;
  };
  if (!roomManager.hasRoom(gmName)) {
    console.log(
      `❌ Room for GM ${gmName} does not exist, disconnecting socket ${socket.id}`
    );
    socket.emit("error", "Room does not exist");
    socket.disconnect(true);
    return;
  }

  console.log(
    `🔗 socket ${socket.id} connected, gmName="${gmName}", gm=${gm}`
  );

  socket.join(gmName);
  socket.emit("room-update", roomManager.getRoomState(gmName));

  // Clean up socket tracking on disconnect
  socket.on("disconnect", () => {
    const entryId = socketToEntryId.get(socket.id);
    if (entryId) {
      const sockets = entryIdToSockets.get(entryId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          entryIdToSockets.delete(entryId);
        }
      }
      socketToEntryId.delete(socket.id);
    }
  });

  socket.onAny((eventName, ...args) => {
    console.log(`⚡ event ${eventName}`, args);
  });

  socket.on("join-room", (player) => {
    console.log("👤 join-room payload:", player, "socket.id:", socket.id);
    
    // Check if player already exists in room (by name and color)
    const room = roomManager.getRoomState(gmName);
    const existingEntry = room.entries.find(
      (e) => !e.isMonster && e.name === player.name && e.color === player.color
    );
    
    let entry;
    if (existingEntry) {
      // Player already exists, just re-track the socket
      entry = existingEntry;
      console.log(`🔄 Re-tracking socket ${socket.id} -> existing entry ${entry.id} (${entry.name})`);
    } else {
      // New player, add them
      entry = roomManager.addPlayer(gmName, player);
      console.log(`➕ New player added: ${entry.name} (id: ${entry.id})`);
    }
    
    // Track this socket with the entry ID (remove old tracking first)
    const oldEntryId = socketToEntryId.get(socket.id);
    if (oldEntryId && oldEntryId !== entry.id) {
      console.log(`🔄 Removing old tracking: socket ${socket.id} was tracked to entry ${oldEntryId}`);
      const oldSockets = entryIdToSockets.get(oldEntryId);
      if (oldSockets) {
        oldSockets.delete(socket.id);
        if (oldSockets.size === 0) {
          entryIdToSockets.delete(oldEntryId);
        }
      }
    }
    
    socketToEntryId.set(socket.id, entry.id);
    if (!entryIdToSockets.has(entry.id)) {
      entryIdToSockets.set(entry.id, new Set());
    }
    entryIdToSockets.get(entry.id)!.add(socket.id);
    console.log(`📌 Tracked socket ${socket.id} -> entry ${entry.id} (${entry.name})`);
    console.log(`   Total sockets for this entry:`, entryIdToSockets.get(entry.id)!.size);

    // right here, log the full room state so we can see it growing
    const newState = roomManager.getRoomState(gmName);
    console.log(
      "📣 broadcasting room-update:",
      newState.entries.map((e) => `${e.name} (${e.id})`)
    );
    console.log(
      "🛋️  [server] sockets in room:",
      Array.from(io.sockets.adapter.rooms.get(gmName) || [])
    );
    io.to(gmName).emit("room-update", newState);
    console.log("📣 [server] emitting room-update to", gmName);
  });

  socket.on("add-monster", (monster) => {
    roomManager.addMonster(gmName, monster);
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
    console.log("monster added", monster);
  });

  socket.on("update-entry", (entry) => {
    roomManager.updateEntry(gmName, entry);
    console.log("update-entry", entry);
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
  });

  socket.on("reorder-entries", ({ from, to }) => {
    console.log("reorder-entries", { from, to });
    roomManager.reorderEntries(gmName, from, to);
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
  });

  socket.on("next-turn", () => {
    roomManager.nextTurn(gmName);
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
    console.log("next-turn");
  });

  socket.on("remove-entry", (id) => {
    console.log(`🔴 remove-entry called for id: ${id}`);
    const entry = roomManager.getEntryById(gmName, id);
    console.log(`Entry found:`, entry ? `${entry.name} (isMonster: ${entry.isMonster})` : 'not found');
    
    // If this was a player (not a monster), kick them BEFORE removing
    if (entry && !entry.isMonster) {
      const sockets = entryIdToSockets.get(id);
      console.log(`📋 Tracking map state:`);
      console.log(`  - entryIdToSockets keys:`, Array.from(entryIdToSockets.keys()));
      console.log(`  - socketToEntryId entries:`, Array.from(socketToEntryId.entries()));
      console.log(`  - Sockets for entry ${id}:`, sockets ? Array.from(sockets) : 'none');
      
      if (sockets && sockets.size > 0) {
        sockets.forEach((socketId) => {
          console.log(`📤 Emitting 'kicked' to socket ${socketId}`);
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket) {
            console.log(`✅ Socket ${socketId} found, emitting kicked event`);
            targetSocket.emit("kicked");
          } else {
            console.log(`❌ Socket ${socketId} not found in io.sockets.sockets`);
            console.log(`   Available sockets:`, Array.from(io.sockets.sockets.keys()));
          }
          socketToEntryId.delete(socketId);
        });
        entryIdToSockets.delete(id);
      } else {
        console.log(`⚠️ No sockets found for entry ${id} (${entry.name})`);
        console.log(`   This means the socket was never tracked or was disconnected`);
      }
    } else if (entry && entry.isMonster) {
      console.log(`👹 Removing monster ${entry.name}, no kick needed`);
    }
    
    roomManager.removeEntry(gmName, id);
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
    console.log(`✅ Entry ${id} removed, room-update sent`);
  });

  socket.on("toggle-hidden", (id) => {
    roomManager.toggleHidden(gmName, id);
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
    console.log("toggle-hidden", id);
  });

  socket.on("sort-by-initiative", () => {
    roomManager.sortByInitiative(gmName);
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
    console.log("sort-by-initiative");
  });

  socket.on("clear-all-players", () => {
    const playerIds = roomManager.clearAllPlayers(gmName);
    
    console.log(`Clearing all players, found ${playerIds.length} player IDs:`, playerIds);
    
    // Collect all player sockets to kick
    const socketsToKick = new Set<string>();
    
    // Kick all players by entry ID
    playerIds.forEach((entryId) => {
      const sockets = entryIdToSockets.get(entryId);
      if (sockets) {
        sockets.forEach((socketId) => {
          socketsToKick.add(socketId);
        });
        entryIdToSockets.delete(entryId);
      }
    });
    
    // Also kick any player sockets in the room that might not be tracked
    const roomSockets = io.sockets.adapter.rooms.get(gmName);
    if (roomSockets) {
      roomSockets.forEach((socketId) => {
        const s = io.sockets.sockets.get(socketId);
        if (s && s.handshake.query.gm === "false") {
          socketsToKick.add(socketId);
        }
      });
    }
    
    // Emit kicked to all player sockets
    socketsToKick.forEach((socketId) => {
      const targetSocket = io.sockets.sockets.get(socketId);
      if (targetSocket) {
        console.log(`Kicking socket ${socketId}`);
        targetSocket.emit("kicked");
        socketToEntryId.delete(socketId);
      }
    });
    
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
    console.log("clear-all-players completed, kicked", socketsToKick.size, "sockets");
  });

  socket.on("load-encounter", ({ encounterName, clearRoom, clearPlayers, clearMonsters }: { encounterName: string; clearRoom: boolean; clearPlayers: boolean; clearMonsters?: boolean }) => {
    console.log(`Loading encounter "${encounterName}" for GM ${gmName}, clearRoom: ${clearRoom}, clearPlayers: ${clearPlayers}, clearMonsters: ${clearMonsters}`);
    
    try {
      // Load individual GM file
      const gm = loadGMFile(gmName);
      
      if (!gm || !gm.encounters || !Array.isArray(gm.encounters) || gm.encounters.length === 0) {
        console.log(`No encounters found for GM ${gmName}`);
        return;
      }
      
      const encounter = gm.encounters.find((e: any) => e.name === encounterName);
      if (!encounter || !encounter.encounter) {
        console.log(`Encounter "${encounterName}" not found`);
        return;
      }
      
      // Clear room if requested
      if (clearRoom) {
        const playerIds = roomManager.clearAllPlayers(gmName);
        // Kick all players
        const socketsToKick = new Set<string>();
        playerIds.forEach((entryId) => {
          const sockets = entryIdToSockets.get(entryId);
          if (sockets) {
            sockets.forEach((socketId) => {
              socketsToKick.add(socketId);
            });
            entryIdToSockets.delete(entryId);
          }
        });
        const roomSockets = io.sockets.adapter.rooms.get(gmName);
        if (roomSockets) {
          roomSockets.forEach((socketId) => {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.handshake.query.gm === "false") {
              socketsToKick.add(socketId);
            }
          });
        }
        socketsToKick.forEach((socketId) => {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.emit("kicked");
            socketToEntryId.delete(socketId);
          }
        });
      } else if (clearPlayers) {
        const playerIds = roomManager.clearPlayersOnly(gmName);
        // Kick all players
        const socketsToKick = new Set<string>();
        playerIds.forEach((entryId) => {
          const sockets = entryIdToSockets.get(entryId);
          if (sockets) {
            sockets.forEach((socketId) => {
              socketsToKick.add(socketId);
            });
            entryIdToSockets.delete(entryId);
          }
        });
        const roomSockets = io.sockets.adapter.rooms.get(gmName);
        if (roomSockets) {
          roomSockets.forEach((socketId) => {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.handshake.query.gm === "false") {
              socketsToKick.add(socketId);
            }
          });
        }
        socketsToKick.forEach((socketId) => {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.emit("kicked");
            socketToEntryId.delete(socketId);
          }
        });
      } else if (clearMonsters) {
        roomManager.clearMonstersOnly(gmName);
      }
      
      // Load monsters from encounter
      encounter.encounter.forEach((monster: any) => {
        const roll = monster.roll !== undefined ? monster.roll : generateRandomRoll();
        const color = monster.color || "#888888";
        const hidden = monster.hidden !== undefined ? monster.hidden : false;
        
        roomManager.addMonster(gmName, {
          name: monster.name,
          roll: roll,
          color: color,
          hidden: hidden,
        });
        
        console.log(`Added monster: ${monster.name}, roll: ${roll}, color: ${color}, hidden: ${hidden}`);
      });
      
      // Emit room update
      io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
      console.log(`Encounter "${encounterName}" loaded successfully`);
    } catch (error) {
      console.error("Error loading encounter:", error);
    }
  });
});
// ensure PORT is numeric
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = "0.0.0.0";

// use the options overload: listen({ port, host }, callback)
server.listen({ port: PORT, host: HOST }, () => {
  const serverIP = getLocalNetworkIP();
  console.log(`Server listening on ${HOST}:${PORT}`);
  console.log(`Server IP: ${serverIP}`);
  console.log(`API config available at: http://${serverIP}:${PORT}/api-config`);
});
