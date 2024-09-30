'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { initSocket, getSocket } from '@/app/lib/socket';

export default function RoomJoining({ username }) {
    const [roomCode, setRoomCode] = useState('');
    const [errors, setErrors] = useState({ roomCode: '', general: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [socket, setSocket] = useState(null);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const setupSocket = async () => {
            try {
                const initializedSocket = await initSocket();
                if (isMounted) {
                    setSocket(initializedSocket);
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

    const validateInput = useCallback(() => {
        const newErrors = { roomCode: '', general: '' };
        let isValid = true;

        if (!roomCode.trim()) {
            newErrors.roomCode = 'Room code is required';
            isValid = false;
        } else if (roomCode.length < 6 || !/^[A-Za-z0-9-]+$/.test(roomCode)) {
            newErrors.roomCode = 'Room code must be at least 6 characters long and can contain letters, numbers, and hyphens';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    }, [roomCode]);

    const checkRoomExists = useCallback(async (roomCode) => {
        try {
            const response = await fetch(`/api/check-room?code=${roomCode}`);
            if (!response.ok) {
                throw new Error(`Failed to check room existence: ${response.statusText}`);
            }
            const data = await response.json();
            return data.exists;
        } catch (error) {
            console.error('Error checking room:', error);
            throw error;
        }
    }, []);

    const joinRoom = useCallback(async () => {
        if (validateInput()) {
            setIsLoading(true);
            setErrors(prev => ({ ...prev, general: '' }));
            try {
                const exists = await checkRoomExists(roomCode);

                if (exists) {
                    router.push(`/room/${encodeURIComponent(roomCode)}?name=${encodeURIComponent(username)}&roomCode=${encodeURIComponent(roomCode)}`);
                } else {
                    setErrors(prev => ({ ...prev, general: 'This room does not exist. Please check the room code and try again.' }));
                }
            } catch (error) {
                console.error('Error joining room:', error);
                setErrors(prev => ({ ...prev, general: 'Failed to join the room. Please try again later.' }));
            } finally {
                setIsLoading(false);
            }
        }
    }, [roomCode, username, validateInput, router, checkRoomExists]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            joinRoom();
        }
    }, [joinRoom]);

    return (
        <div className="space-y-6">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 pr-10"
                    disabled={isLoading}
                    maxLength={36}
                />
                {errors.roomCode && <p className="text-red-500 text-sm mt-1">{errors.roomCode}</p>}
            </div>
            {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
            <button
                onClick={joinRoom}
                className={`w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-md hover:from-purple-600 hover:to-purple-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking...
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Join Room
                    </>
                )}
            </button>
        </div>
    );
}
