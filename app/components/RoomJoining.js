// app/components/RoomJoining.js
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RoomJoining() {
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const router = useRouter();

    const joinRoom = () => {
        if (roomId && userName) {
            router.push(`/room/${roomId}?name=${userName}`);
        }
    };

    return (
        <div className="space-y-4">
            <input
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
            />
            <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
            />
            <button
                onClick={joinRoom}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-md hover:from-purple-600 hover:to-purple-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
                Join Room
            </button>
        </div>
    );
}