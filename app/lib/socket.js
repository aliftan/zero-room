import { io } from 'socket.io-client';

let socket;

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
        });
    });
};

export const getSocket = () => {
    if (!socket) {
        throw new Error('Socket not initialized. Call initSocket() first.');
    }
    return socket;
};
