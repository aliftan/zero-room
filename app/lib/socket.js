import io from 'socket.io-client';

let socket = null;

export const initSocket = async () => {
    if (!socket) {
        console.log('Initializing new socket connection');
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
            path: '/api/socketio',
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        await new Promise((resolve, reject) => {
            socket.on('connect', () => {
                console.log('Socket connected successfully');
                resolve();
            });
            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                reject(error);
            });
        });
    } else {
        console.log('Using existing socket connection');
    }
    return socket;
};

export const getSocket = async () => {
    if (!socket) {
        await initSocket();
    }
    return socket;
};