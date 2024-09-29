'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RoomJoining() {
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const [errors, setErrors] = useState({ roomId: '', userName: '' });
    const router = useRouter();

    const validateInputs = () => {
        let isValid = true;
        const newErrors = { roomId: '', userName: '' };

        if (!roomId.trim()) {
            newErrors.roomId = 'Room ID is required';
            isValid = false;
        }

        if (!userName.trim()) {
            newErrors.userName = 'Your name is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const joinRoom = () => {
        if (validateInputs()) {
            router.push(`/room/${roomId}?name=${encodeURIComponent(userName)}`);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            joinRoom();
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <input
                    type="text"
                    placeholder="Enter room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                />
                {errors.roomId && <p className="text-red-500 text-sm mt-1">{errors.roomId}</p>}
            </div>
            <div>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                />
                {errors.userName && <p className="text-red-500 text-sm mt-1">{errors.userName}</p>}
            </div>
            <button
                onClick={joinRoom}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-md hover:from-purple-600 hover:to-purple-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
                Join Room
            </button>
        </div>
    );
}