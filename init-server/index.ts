import express from "express";
import http from "http";
import cors from "cors";
import { Server, Socket } from "socket.io";
import { RoomManager } from "./roomManager"; // add .ts extension for ts-node resolution

const app = express();
app.use(cors());
const server = http.createServer(app);
app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.1.154:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://192.168.1.154:5173"],
    methods: ["GET", "POST"],
  },
});
const roomManager = new RoomManager();

app.post("/create-room", (_req, res) => {
  const code = roomManager.createRoom();
  res.json({ code });
});

io.on("connection", (socket: Socket) => {
  const { room: roomCode, gm } = socket.handshake.query as {
    room: string;
    gm: string;
  };
  if (!roomManager.hasRoom(roomCode)) {
    console.log(
      `❌ Room ${roomCode} does not exist, disconnecting socket ${socket.id}`
    );
    socket.emit("error", "Room does not exist");
    socket.disconnect(true);
    return;
  }

  console.log(
    `🔗 socket ${socket.id} connected, roomCode="${roomCode}", gm=${gm}`
  );

  socket.join(roomCode);
  socket.emit("room-update", roomManager.getRoomState(roomCode));

  socket.onAny((eventName, ...args) => {
    console.log(`⚡ event ${eventName}`, args);
  });

  socket.on("join-room", (player) => {
    console.log("👤 join-room payload:", player);
    roomManager.addPlayer(roomCode, player);

    // right here, log the full room state so we can see it growing
    const newState = roomManager.getRoomState(roomCode);
    console.log(
      "📣 broadcasting room-update:",
      newState.entries.map((e) => e.name)
    );
    console.log(
      "🛋️  [server] sockets in room:",
      Array.from(io.sockets.adapter.rooms.get(roomCode) || [])
    );
    io.to(roomCode).emit("room-update", newState);
    console.log("📣 [server] emitting room-update to", roomCode);
  });

  socket.on("add-monster", (monster) => {
    roomManager.addMonster(roomCode, monster);
    io.to(roomCode).emit("room-update", roomManager.getRoomState(roomCode));
    console.log("monster added", monster);
  });

  socket.on("update-entry", (entry) => {
    roomManager.updateEntry(roomCode, entry);
    console.log("update-entry", entry);
    io.to(roomCode).emit("room-update", roomManager.getRoomState(roomCode));
  });

  socket.on("reorder-entries", ({ from, to }) => {
    console.log("reorder-entries", { from, to });
    roomManager.reorderEntries(roomCode, from, to);
    io.to(roomCode).emit("room-update", roomManager.getRoomState(roomCode));
  });

  socket.on("next-turn", () => {
    roomManager.nextTurn(roomCode);
    io.to(roomCode).emit("room-update", roomManager.getRoomState(roomCode));
    console.log("next-turn");
  });

  socket.on("remove-entry", (id) => {
    roomManager.removeEntry(roomCode, id);
    io.to(roomCode).emit("room-update", roomManager.getRoomState(roomCode));
    console.log("remove-entry", id);
  });

  socket.on("toggle-hidden", (id) => {
    roomManager.toggleHidden(roomCode, id);
    io.to(roomCode).emit("room-update", roomManager.getRoomState(roomCode));
    console.log("toggle-hidden", id);
  });
});
// ensure PORT is numeric
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = "0.0.0.0";

// use the options overload: listen({ port, host }, callback)
server.listen({ port: PORT, host: HOST }, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});
