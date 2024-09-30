const express = require('express');
const http = require('http');
const next = require('next');
const { Server } = require("socket.io");
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const MAX_USERS_PER_ROOM = 6;
const rooms = new Map();
const messages = new Map();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
    }
    return rooms.get(roomId);
}

function joinRoom(socket, roomId, userName, sessionId) {
    const room = getOrCreateRoom(roomId);
    const existingUser = Array.from(room.values()).find(user => user.sessionId === sessionId);

    if (existingUser) {
        room.delete(existingUser.id);
        existingUser.id = socket.id;
        room.set(socket.id, existingUser);
        logger.info(`User ${userName} rejoined room ${roomId}`);
        return false;
    } else {
        room.set(socket.id, { id: socket.id, userName, sessionId });
        logger.info(`User ${userName} joined room ${roomId}. Total users: ${room.size}`);
        return true;
    }
}

function leaveRoom(socket, roomId) {
    const room = rooms.get(roomId);
    if (room && room.has(socket.id)) {
        const user = room.get(socket.id);
        room.delete(socket.id);
        logger.info(`User ${user.userName} left room ${roomId}. Total users: ${room.size}`);
        if (room.size === 0) {
            rooms.delete(roomId);
            messages.delete(roomId);
            logger.info(`Room ${roomId} deleted as it's empty`);
        }
    }
    socket.leave(roomId);
}

function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        logger.info(`New connection: ${socket.id}`);

        socket.on('check room', (roomId, callback) => {
            const room = rooms.get(roomId);
            const roomSize = room ? room.size : 0;
            callback({ exists: roomSize > 0, canJoin: roomSize < MAX_USERS_PER_ROOM });
        });

        socket.on('join room', ({ roomId, userName, sessionId }) => {
            sessionId = sessionId || uuidv4();
            const room = getOrCreateRoom(roomId);

            if (room.size >= MAX_USERS_PER_ROOM) {
                socket.emit('room full');
                return;
            }

            socket.join(roomId);
            const isNewJoin = joinRoom(socket, roomId, userName, sessionId);

            const usersInRoom = Array.from(room.values());
            io.to(roomId).emit('all users', usersInRoom);

            if (isNewJoin) {
                socket.to(roomId).emit('user joined', { id: socket.id, userName });
            }

            if (messages.has(roomId)) {
                socket.emit('chat history', Array.from(messages.get(roomId).values()));
            }

            socket.emit('session', { sessionId });
        });

        socket.on('leave room', ({ roomId }) => {
            leaveRoom(socket, roomId);
            socket.to(roomId).emit('user left', socket.id);
            const room = rooms.get(roomId);
            if (room) {
                io.to(roomId).emit('all users', Array.from(room.values()));
            }
        });

        socket.on('disconnect', () => {
            rooms.forEach((room, roomId) => {
                if (room.has(socket.id)) {
                    leaveRoom(socket, roomId);
                    socket.to(roomId).emit('user left', socket.id);
                    io.to(roomId).emit('all users', Array.from(room.values()));
                }
            });
        });

        socket.on('chat message', (message) => {
            const newMessage = { ...message, timestamp: new Date().toISOString() };
            if (!messages.has(message.roomId)) {
                messages.set(message.roomId, new Map());
            }
            messages.get(message.roomId).set(message.id, newMessage);
            io.to(message.roomId).emit('chat message', newMessage);
        });
    });
}

app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer, {
        path: '/api/socketio',
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    setupSocketHandlers(io);

    server.all('*', (req, res) => handle(req, res));

    httpServer.listen(port, (err) => {
        if (err) throw err;
        logger.info(`Server ready on http://localhost:${port}`);
    });
});
