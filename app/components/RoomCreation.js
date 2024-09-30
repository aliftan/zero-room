'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function RoomCreation() {
    const [roomName, setRoomName] = useState('');
    const [userName, setUserName] = useState('');
    const [errors, setErrors] = useState({ roomName: '', userName: '' });
    const router = useRouter();

    const validateInputs = () => {
        let isValid = true;
        const newErrors = { roomName: '', userName: '' };

        if (!roomName.trim()) {
            newErrors.roomName = 'Room name is required';
            isValid = false;
        }

        if (!userName.trim()) {
            newErrors.userName = 'Your name is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const createRoom = () => {
        if (validateInputs()) {
            const roomId = uuidv4();
            router.push(`/room/${roomId}?name=${encodeURIComponent(userName)}&roomName=${encodeURIComponent(roomName)}`);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            createRoom();
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <input
                    type="text"
                    placeholder="Enter room name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
                {errors.roomName && <p className="text-red-500 text-sm mt-1">{errors.roomName}</p>}
            </div>
            <div>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
                {errors.userName && <p className="text-red-500 text-sm mt-1">{errors.userName}</p>}
            </div>
            <button
                onClick={createRoom}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-md hover:from-blue-600 hover:to-blue-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
                Create Room
            </button>
        </div>
    );
}
