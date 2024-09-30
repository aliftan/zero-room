'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { initSocket, getSocket } from '@/app/lib/socket';

export default function RoomJoining() {
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const [errors, setErrors] = useState({ roomId: '', userName: '', general: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isSocketReady, setIsSocketReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const setupSocket = async () => {
            try {
                await initSocket();
                if (isMounted) {
                    setIsSocketReady(true);
                    console.log("Socket initialized successfully");
                }
            } catch (error) {
                console.error('Failed to initialize socket:', error);
                if (isMounted) {
                    setErrors(prev => ({ ...prev, general: 'Failed to connect to the server. Please try again later.' }));
                }
            }
        };

        setupSocket();

        return () => {
            isMounted = false;
        };
    }, []);

    const validateInputs = useCallback(() => {
        const newErrors = { roomId: '', userName: '', general: '' };
        let isValid = true;

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
    }, [roomId, userName]);

    const checkRoomExists = useCallback(async (roomId) => {
        if (!isSocketReady) {
            throw new Error('Socket not ready. Please try again in a moment.');
        }
        const socket = getSocket();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for room check response'));
            }, 5000);

            socket.emit('check room', roomId, (exists) => {
                clearTimeout(timeout);
                resolve(exists);
            });
        });
    }, [isSocketReady]);

    const joinRoom = useCallback(async () => {
        if (validateInputs()) {
            setIsLoading(true);
            setErrors(prev => ({ ...prev, general: '' }));
            try {
                const roomExists = await checkRoomExists(roomId);
                if (roomExists) {
                    router.push(`/room/${roomId}?name=${encodeURIComponent(userName)}`);
                } else {
                    setErrors(prev => ({ ...prev, general: 'This room does not exist. Please check the room ID and try again.' }));
                }
            } catch (error) {
                console.error('Error checking room:', error);
                setErrors(prev => ({ ...prev, general: `Error: ${error.message}. Please try again.` }));
            } finally {
                setIsLoading(false);
            }
        }
    }, [roomId, userName, validateInputs, checkRoomExists, router]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            joinRoom();
        }
    }, [joinRoom]);

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
                    disabled={isLoading}
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
                    disabled={isLoading}
                />
                {errors.userName && <p className="text-red-500 text-sm mt-1">{errors.userName}</p>}
            </div>
            {errors.general && <p className="text-red-500 text-sm mt-1">{errors.general}</p>}
            <button
                onClick={joinRoom}
                className={`w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-md hover:from-purple-600 hover:to-purple-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
            >
                {isLoading ? 'Checking...' : 'Join Room'}
            </button>
        </div>
    );
}