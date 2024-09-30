import { NextResponse } from 'next/server';
import { io } from 'socket.io-client';

let socket;

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3000';
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || '/api/socketio';
const ROOM_CHECK_TIMEOUT = 5000; // 5 seconds

async function getSocket() {
    if (!socket || !socket.connected) {
        socket = io(SOCKET_SERVER_URL, {
            path: SOCKET_PATH,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        await new Promise((resolve, reject) => {
            socket.on('connect', resolve);
            socket.on('connect_error', reject);
            socket.on('error', reject);
        });
    }
    return socket;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    try {
        const socket = await getSocket();
        const roomStatus = await new Promise((resolve, reject) => {
            socket.emit('check room', roomId, (response) => {
                console.log('Room check response:', response);  // Add this line
                resolve(response);
            });

            // Set a timeout in case the server doesn't respond
            setTimeout(() => reject(new Error('Timeout checking room status')), ROOM_CHECK_TIMEOUT);
        });

        return NextResponse.json(roomStatus);
    } catch (error) {
        console.error('Detailed error checking room status:', error);  // Modified this line
        return NextResponse.json({ error: error.message || 'Failed to check room status' }, { status: 500 });
    }
}