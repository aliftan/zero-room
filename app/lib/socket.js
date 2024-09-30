import { io } from 'socket.io-client';

let socket;
let heartbeatInterval;

export const initSocket = () => {
    return new Promise((resolve, reject) => {
        if (socket && socket.connected) {
            resolve(socket);
            return;
        }

        const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3000';
        const socketPath = process.env.NEXT_PUBLIC_SOCKET_PATH || '/api/socketio';

        console.log('Attempting to connect to socket server at:', socketServerUrl, 'with path:', socketPath);

        socket = io(socketServerUrl, {
            path: socketPath,
            transports: ['websocket'],
            reconnectionAttempts: 5,
            timeout: 10000,
            autoConnect: false,
        });

        socket.on('connect', () => {
            console.log('Socket connected successfully');
            resolve(socket);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            reject(error);
        });

        socket.on('error', (error) => {
            console.error('Socket general error:', error);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            if (reason === 'io server disconnect') {
                // the disconnection was initiated by the server, you need to reconnect manually
                socket.connect();
            }
            stopHeartbeat();
        });

        socket.connect();
    });
};

export const getSocket = () => {
    if (!socket) {
        throw new Error('Socket not initialized. Call initSocket() first.');
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        stopHeartbeat();
        socket.disconnect();
        socket = null;
    }
};

export const startHeartbeat = (roomId) => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    heartbeatInterval = setInterval(() => {
        if (socket && socket.connected) {
            socket.emit('heartbeat', { roomId });
        }
    }, 30000); // Send heartbeat every 30 seconds
};

export const stopHeartbeat = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
};

export const joinRoom = (roomData) => {
    if (socket && socket.connected) {
        socket.emit('join room', roomData);
        startHeartbeat(roomData.roomId);
    } else {
        console.error('Socket not connected. Cannot join room.');
    }
};

export const leaveRoom = (roomData) => {
    if (socket && socket.connected) {
        socket.emit('leave room', roomData);
        stopHeartbeat();
    } else {
        console.error('Socket not connected. Cannot leave room.');
    }
};
