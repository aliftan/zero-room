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

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('join room', ({ roomId, userName }) => {
            console.log(`User ${userName} joined room ${roomId}`);
            socket.join(roomId);
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add({ id: socket.id, userName });

            const usersInThisRoom = Array.from(rooms.get(roomId)).filter(user => user.id !== socket.id);
            socket.emit('all users', usersInThisRoom);

            socket.to(roomId).emit('user joined', { callerID: socket.id, userName });

            // Send existing messages to the newly joined user
            if (messages.has(roomId)) {
                console.log(`Sending chat history to user ${userName} in room ${roomId}`);
                socket.emit('chat history', Array.from(messages.get(roomId).values()));
            }

            socket.on('disconnect', () => {
                console.log(`User ${userName} disconnected from room ${roomId}`);
                if (rooms.has(roomId)) {
                    rooms.get(roomId).delete({ id: socket.id, userName });
                    if (rooms.get(roomId).size === 0) {
                        rooms.delete(roomId);
                        messages.delete(roomId);
                    }
                }
                socket.to(roomId).emit('user left', socket.id);
            });
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
            messages.get(message.roomId).set(message.id, message);
            console.log('Broadcasting message to room:', message.roomId);
            io.to(message.roomId).emit('chat message', message);
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