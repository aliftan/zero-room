const express = require('express');
const http = require('http');
const next = require('next');
const { Server } = require("socket.io");

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Constants
const MAX_USERS_PER_ROOM = 6;

// Data storage
const rooms = new Map();
const messages = new Map();

// Room management functions
function joinRoom(socket, roomId, userName) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add({ id: socket.id, userName });
    console.log(`User ${userName} joined room ${roomId}`);
}

function leaveRoom(socket, roomId) {
    if (rooms.has(roomId)) {
        const user = Array.from(rooms.get(roomId)).find(u => u.id === socket.id);
        if (user) {
            rooms.get(roomId).delete(user);
            console.log(`User ${user.userName} left room ${roomId}`);
            if (rooms.get(roomId).size === 0) {
                rooms.delete(roomId);
                messages.delete(roomId);
                console.log(`Room ${roomId} deleted as it's empty`);
            }
        }
    }
    socket.leave(roomId);
}

// Message management functions
function addMessage(message) {
    if (!messages.has(message.roomId)) {
        messages.set(message.roomId, new Map());
    }
    const newMessage = {
        ...message,
        timestamp: new Date().toISOString()
    };
    messages.get(message.roomId).set(message.id, newMessage);
    return newMessage;
}

function editMessage(messageId, newContent, roomId) {
    if (messages.has(roomId) && messages.get(roomId).has(messageId)) {
        const message = messages.get(roomId).get(messageId);
        message.message = newContent;
        message.edited = true;
        messages.get(roomId).set(messageId, message);
        return message;
    }
    return null;
}

function deleteMessage(messageId, roomId) {
    if (messages.has(roomId) && messages.get(roomId).has(messageId)) {
        messages.get(roomId).delete(messageId);
        return true;
    }
    return false;
}

// Socket event handlers
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('check room', (roomId, callback) => {
            console.log(`Checking room: ${roomId}`);  // Add this line
            const room = io.sockets.adapter.rooms.get(roomId);
            const roomSize = room ? room.size : 0;
            const roomExists = roomSize > 0;
            const canJoin = roomSize < MAX_USERS_PER_ROOM;
            console.log(`Room ${roomId} status: exists=${roomExists}, canJoin=${canJoin}`);  // Add this line
            callback({ exists: roomExists, canJoin: canJoin });
        });        

        socket.on('join room', ({ roomId, userName, roomName }) => {
            const room = io.sockets.adapter.rooms.get(roomId);
            const roomSize = room ? room.size : 0;

            if (roomSize >= MAX_USERS_PER_ROOM) {
                socket.emit('room full');
                return;
            }

            socket.join(roomId);
            joinRoom(socket, roomId, userName);

            const usersInRoom = Array.from(rooms.get(roomId));
            io.to(roomId).emit('all users', usersInRoom);
            socket.to(roomId).emit('user joined', { id: socket.id, userName });

            if (messages.has(roomId)) {
                console.log(`Sending chat history to user ${userName} in room ${roomId}`);
                socket.emit('chat history', Array.from(messages.get(roomId).values()));
            }
        });

        socket.on('leave room', ({ roomId }) => {
            console.log(`User leaving room ${roomId}`);
            leaveRoom(socket, roomId);
            socket.to(roomId).emit('user left', socket.id);
            io.to(roomId).emit('all users', Array.from(rooms.get(roomId) || []));
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
            for (const [roomId, users] of rooms.entries()) {
                if (Array.from(users).some(user => user.id === socket.id)) {
                    leaveRoom(socket, roomId);
                    socket.to(roomId).emit('user left', socket.id);
                    io.to(roomId).emit('all users', Array.from(rooms.get(roomId) || []));
                    break;
                }
            }
        });

        socket.on('sending signal', payload => {
            console.log('Sending signal:', payload);
            io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID, userName: payload.userName });
        });

        socket.on('returning signal', payload => {
            console.log('Returning signal:', payload);
            io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
        });

        socket.on('chat message', (message) => {
            console.log('Received chat message:', message);
            const newMessage = addMessage(message);
            io.to(message.roomId).emit('chat message', newMessage);
        });

        socket.on('edit message', ({ messageId, newContent, roomId }) => {
            console.log(`Editing message ${messageId} in room ${roomId}`);
            const editedMessage = editMessage(messageId, newContent, roomId);
            if (editedMessage) {
                io.to(roomId).emit('message edited', editedMessage);
            }
        });

        socket.on('delete message', ({ messageId, roomId }) => {
            console.log(`Deleting message ${messageId} from room ${roomId}`);
            if (deleteMessage(messageId, roomId)) {
                io.to(roomId).emit('message deleted', messageId);
            }
        });
    });
}

// Server setup
app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer, {
        path: '/api/socketio',
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    setupSocketHandlers(io);

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
