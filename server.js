const express = require('express');
const http = require('http');
const next = require('next');
const { Server } = require("socket.io");

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer, {
        path: '/api/socketio',
    });

    const rooms = new Map();
    const messages = new Map();

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
                } else {
                    io.to(roomId).emit('user left', socket.id);
                    io.to(roomId).emit('all users', Array.from(rooms.get(roomId)));
                }
            }
        }
        socket.leave(roomId);
    }

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('join room', ({ roomId, userName }) => {
            console.log(`User ${userName} joining room ${roomId}`);
            socket.join(roomId);
            
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add({ id: socket.id, userName });

            const usersInRoom = Array.from(rooms.get(roomId));
            io.to(roomId).emit('all users', usersInRoom);

            socket.to(roomId).emit('user joined', { id: socket.id, userName });

            if (messages.has(roomId)) {
                console.log(`Sending chat history to user ${userName} in room ${roomId}`);
                socket.emit('chat history', Array.from(messages.get(roomId).values()));
            }
        });

        socket.on('leave room', ({ roomId }) => {
            leaveRoom(socket, roomId);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
            for (const [roomId, users] of rooms.entries()) {
                if (Array.from(users).some(user => user.id === socket.id)) {
                    leaveRoom(socket, roomId);
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
            if (!messages.has(message.roomId)) {
                messages.set(message.roomId, new Map());
            }
            const newMessage = {
                ...message,
                timestamp: new Date().toISOString()
            };
            messages.get(message.roomId).set(message.id, newMessage);
            console.log('Broadcasting message to room:', message.roomId);
            io.to(message.roomId).emit('chat message', newMessage);
        });

        socket.on('edit message', ({ messageId, newContent, roomId }) => {
            console.log(`Editing message ${messageId} in room ${roomId}`);
            if (messages.has(roomId) && messages.get(roomId).has(messageId)) {
                const message = messages.get(roomId).get(messageId);
                message.message = newContent;
                message.edited = true;
                messages.get(roomId).set(messageId, message);
                io.to(roomId).emit('message edited', message);
            }
        });

        socket.on('delete message', ({ messageId, roomId }) => {
            console.log(`Deleting message ${messageId} from room ${roomId}`);
            if (messages.has(roomId) && messages.get(roomId).has(messageId)) {
                messages.get(roomId).delete(messageId);
                io.to(roomId).emit('message deleted', messageId);
            }
        });
    });

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});