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

// Load GM credentials from GM_list.json
function loadGMCredentials(): Array<{ name: string; Password: string }> {
  try {
    const gmListPath = path.join(__dirname, "..", "GM_list.json");
    const fileContent = fs.readFileSync(gmListPath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error loading GM_list.json:", error);
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

// Legacy endpoint - kept for backward compatibility but will be removed
app.post("/create-room", express.json(), (req, res) => {
  const { gmName } = req.body;
  if (gmName && roomManager.hasRoom(gmName)) {
    res.json({ success: true, gmName });
  } else {
    res.status(400).json({ error: "Invalid GM name or room does not exist" });
  }
});

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

  socket.onAny((eventName, ...args) => {
    console.log(`⚡ event ${eventName}`, args);
  });

  socket.on("join-room", (player) => {
    console.log("👤 join-room payload:", player);
    roomManager.addPlayer(gmName, player);

    // right here, log the full room state so we can see it growing
    const newState = roomManager.getRoomState(gmName);
    console.log(
      "📣 broadcasting room-update:",
      newState.entries.map((e) => e.name)
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
    roomManager.removeEntry(gmName, id);
    io.to(gmName).emit("room-update", roomManager.getRoomState(gmName));
    console.log("remove-entry", id);
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
