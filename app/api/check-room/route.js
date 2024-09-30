import { NextResponse } from 'next/server';
import { io } from 'socket.io-client';

let socket;

async function getSocket() {
    if (!socket) {
        socket = io('http://localhost:3000', {
            path: '/api/socketio',
        });

        await new Promise((resolve) => {
            socket.on('connect', () => {
                console.log('Socket connected');
                resolve();
            });
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
        console.log('Attempting to get socket');
        const socket = await getSocket();
        console.log('Socket retrieved successfully');

        const exists = await new Promise((resolve, reject) => {
            console.log('Emitting check room event');
            socket.emit('check room', roomId, (exists) => {
                console.log('Received response from check room event:', exists);
                resolve(exists);
            });

            // Add a timeout in case the server doesn't respond
            setTimeout(() => {
                reject(new Error('Timeout waiting for room check response'));
            }, 5000);
        });

        console.log('Room exists:', exists);
        return NextResponse.json({ exists });
    } catch (error) {
        console.error('Detailed error in check room route:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}