'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VideoCall from '@/app/components/VideoCall';
import Chat from '@/app/components/Chat';
import { initSocket, getSocket } from '@/app/lib/socket';

export default function Room({ params }) {
    const searchParams = useSearchParams();
    const userName = searchParams.get('name');
    const { roomId } = params;
    const router = useRouter();
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = initSocket();
        socketRef.current.emit('join room', { roomId, userName });

        socketRef.current.on('all users', (users) => {
            console.log('Received all users:', users);
            setOnlineUsers(users);
        });

        socketRef.current.on('user joined', (user) => {
            console.log('User joined:', user);
            setOnlineUsers((prevUsers) => {
                if (!prevUsers.some(u => u.id === user.id)) {
                    return [...prevUsers, user];
                }
                return prevUsers;
            });
        });

        socketRef.current.on('user left', (userId) => {
            console.log('User left:', userId);
            setOnlineUsers((prevUsers) => prevUsers.filter(user => user.id !== userId));
        });

        return () => {
            console.log('Disconnecting socket');
            socketRef.current.emit('leave room', { roomId, userName });
            socketRef.current.disconnect();
        };
    }, [roomId, userName]);

    const handleDisconnect = () => {
        socketRef.current.emit('leave room', { roomId, userName });
        router.push('/');
    };

    const handleCopyRoomCode = () => {
        navigator.clipboard.writeText(roomId);
        alert('Room code copied to clipboard!');
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <header className="bg-gray-800 p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    ZeroRoom
                </h1>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleCopyRoomCode}
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                    >
                        Copy Room Code
                    </button>
                    <button
                        onClick={handleDisconnect}
                        className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel for Online Users */}
                <div className="w-64 bg-gray-800 p-4 overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4">Online ({onlineUsers.length})</h2>
                    <div className="space-y-2">
                        {onlineUsers.map((user, index) => (
                            <div key={user.id} className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                                    {user.userName.charAt(0).toUpperCase()}
                                </div>
                                <span>{user.userName}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex">
                    <div className="flex-1">
                        <VideoCall roomId={roomId} userName={userName} socket={socketRef.current} />
                    </div>
                    <div className={`w-1/3 border-l border-gray-700 transition-all duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <Chat roomId={roomId} userName={userName} socket={socketRef.current} />
                    </div>
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-l-md"
                    >
                        {isChatOpen ? '→' : '←'}
                    </button>
                </div>
            </div>
        </div>
    );
}