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

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('join room', ({ roomId, userName }) => {
            socket.join(roomId);
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add({ id: socket.id, userName });

            const usersInThisRoom = Array.from(rooms.get(roomId)).filter(user => user.id !== socket.id);
            socket.emit('all users', usersInThisRoom);

            socket.to(roomId).emit('user joined', { callerID: socket.id, userName });

            socket.on('disconnect', () => {
                console.log('A user disconnected');
                if (rooms.has(roomId)) {
                    rooms.get(roomId).delete({ id: socket.id, userName });
                    if (rooms.get(roomId).size === 0) {
                        rooms.delete(roomId);
                    }
                }
                socket.to(roomId).emit('user left', socket.id);
            });
        });

        socket.on('sending signal', payload => {
            io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID, userName: payload.userName });
        });

        socket.on('returning signal', payload => {
            io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
        });

        socket.on('chat message', ({ roomId, userName, message }) => {
            io.to(roomId).emit('chat message', { userName, message });
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