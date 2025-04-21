import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager';  // add .ts extension for ts-node resolution

const app = express();
app.use(cors());
const server = http.createServer(app);
app.use(
  cors({
    origin: [ 'http://localhost:5173', 'http://192.168.1.154:5173' ],
    methods: [ 'GET','POST' ],
    credentials: true
  })
)

const io = new Server(server, {
  cors: {
    origin: [ 'http://localhost:5173', 'http://192.168.1.154:5173' ],
    methods: [ 'GET','POST' ]
  }
})
const roomManager = new RoomManager();

app.post('/create-room', (_req, res) => {
  const code = roomManager.createRoom();
  res.json({ code });
});


io.on('connection', (socket: Socket) => {
  const { room: roomCode, gm } = socket.handshake.query as { room: string; gm: string };
  if (!roomManager.hasRoom(roomCode)) {
    socket.emit('error', 'Room does not exist');
    return;
  }
  socket.join(roomCode);
  socket.emit('room-update', roomManager.getRoomState(roomCode));

  socket.on('join-room', (player) => {
    roomManager.addPlayer(roomCode, player);
    io.to(roomCode).emit('room-update', roomManager.getRoomState(roomCode));
  });

  socket.on('add-monster', (monster) => {
    roomManager.addMonster(roomCode, monster);
    io.to(roomCode).emit('room-update', roomManager.getRoomState(roomCode));
  });

  socket.on('update-entry', (entry) => {
    roomManager.updateEntry(roomCode, entry);
    io.to(roomCode).emit('room-update', roomManager.getRoomState(roomCode));
  });

  socket.on('reorder-entries', ({ from, to }) => {
    roomManager.reorderEntries(roomCode, from, to);
    io.to(roomCode).emit('room-update', roomManager.getRoomState(roomCode));
  });

  socket.on('next-turn', () => {
    roomManager.nextTurn(roomCode);
    io.to(roomCode).emit('room-update', roomManager.getRoomState(roomCode));
  });

  socket.on('remove-entry', (id) => {
    roomManager.removeEntry(roomCode, id);
    io.to(roomCode).emit('room-update', roomManager.getRoomState(roomCode));
  });

  socket.on('toggle-hidden', (id) => {
    roomManager.toggleHidden(roomCode, id);
    io.to(roomCode).emit('room-update', roomManager.getRoomState(roomCode));
  });
});
// ensure PORT is numeric
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = '0.0.0.0'

// use the options overload: listen({ port, host }, callback)
server.listen({ port: PORT, host: HOST }, () => {
  console.log(`Server listening on ${HOST}:${PORT}`)
})