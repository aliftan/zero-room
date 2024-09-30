'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VideoCall from '@/app/components/VideoCall';
import Chat from '@/app/components/Chat';
import { initSocket } from '@/app/lib/socket';
import { FaCopy, FaSignOutAlt, FaComments, FaArrowLeft, FaBackward, FaAngleLeft } from 'react-icons/fa';

export default function Room({ params }) {
    const searchParams = useSearchParams();
    const userName = searchParams.get('name');
    const roomName = searchParams.get('roomName');
    const { roomId } = params;
    const router = useRouter();

    const [socket, setSocket] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    const setupSocket = useCallback(async () => {
        try {
            const newSocket = await initSocket();
            setSocket(newSocket);

            const addCurrentUser = () => {
                setOnlineUsers(prevUsers => {
                    if (!prevUsers.some(u => u.userName === userName)) {
                        return [...prevUsers, { id: newSocket.id, userName }];
                    }
                    return prevUsers;
                });
            };

            newSocket.on('connect', () => {
                setConnectionStatus('connected');
                newSocket.emit('join room', { roomId, userName, roomName });
                addCurrentUser();
            });

            newSocket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                setConnectionStatus('error');
            });

            newSocket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                setConnectionStatus('disconnected');
                setOnlineUsers([]);
            });

            newSocket.on('all users', (users) => {
                setOnlineUsers(currentUsers => {
                    const uniqueUsers = users.reduce((acc, user) => {
                        if (!acc.some(u => u.id === user.id || u.userName === user.userName)) {
                            acc.push(user);
                        }
                        return acc;
                    }, []);
                    if (!uniqueUsers.some(u => u.userName === userName)) {
                        uniqueUsers.push({ id: newSocket.id, userName });
                    }
                    return uniqueUsers;
                });
            });

            newSocket.on('user joined', (user) => {
                setOnlineUsers((prevUsers) => {
                    if (!prevUsers.some(u => u.id === user.id || u.userName === user.userName)) {
                        return [...prevUsers, user];
                    }
                    return prevUsers;
                });
            });

            newSocket.on('user left', (userId) => {
                setOnlineUsers((prevUsers) => prevUsers.filter(user => user.id !== userId));
            });

            setConnectionStatus('connected');
            newSocket.emit('join room', { roomId, userName, roomName });
            addCurrentUser();

        } catch (error) {
            console.error('Failed to initialize socket:', error);
            setConnectionStatus('error');
        }
    }, [roomId, userName, roomName]);

    useEffect(() => {
        let isMounted = true;

        const initializeSocket = async () => {
            if (isMounted) {
                await setupSocket();
            }
        };

        initializeSocket();

        return () => {
            isMounted = false;
            if (socket) {
                socket.emit('leave room', { roomId, userName });
                socket.disconnect();
            }
        };
    }, [setupSocket, socket, roomId, userName]);

    const handleDisconnect = useCallback(() => {
        if (socket) {
            socket.emit('leave room', { roomId, userName });
            socket.disconnect();
        }
        router.push('/');
    }, [socket, roomId, userName, router]);

    const handleCopyRoomCode = useCallback(() => {
        navigator.clipboard.writeText(roomId);
        alert('Room code copied to clipboard!');
    }, [roomId]);

    const getUserInitial = (user) => {
        return user && user.userName && typeof user.userName === 'string'
            ? user.userName.charAt(0).toUpperCase()
            : '?';
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <header className="bg-gray-800 p-4 flex justify-between items-center">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        ZeroRoom
                    </h1>
                </div>
                <div className="flex-1 text-center">
                    <h2 className="text-xl font-semibold">{roomName || `Room ${roomId}`}</h2>
                </div>
                <div className="flex-1 flex justify-end items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full border ${
                        connectionStatus === 'connected' ? 'border-green-500 text-green-500' :
                        connectionStatus === 'connecting' ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-500'
                    } flex items-center space-x-2`}>
                        <div className={`w-2 h-2 rounded-full ${
                            connectionStatus === 'connected' ? 'bg-green-500' :
                            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium">{connectionStatus}</span>
                    </div>
                    <button
                        onClick={handleCopyRoomCode}
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                        <FaCopy />
                        <span>Copy Room Code</span>
                    </button>
                    <button
                        onClick={handleDisconnect}
                        className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                        <FaSignOutAlt />
                        <span>Disconnect</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-64 bg-gray-800 p-4 overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4">Online ({onlineUsers.length})</h2>
                    <div className="space-y-2">
                        {onlineUsers.map((user) => (
                            <div key={user.id || user.userName} className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                                    {getUserInitial(user)}
                                </div>
                                <span>{user.userName || 'Anonymous'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex">
                    <div className="flex-1">
                        {socket && <VideoCall
                            roomId={roomId}
                            userName={userName}
                            socket={socket}
                            connectionStatus={connectionStatus}
                        />}
                    </div>
                    <div className={`w-1/3 border-l border-gray-700 transition-all duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        {socket && <Chat roomId={roomId} userName={userName} socket={socket} />}
                    </div>
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-l-md hover:bg-gray-600 transition-colors"
                        aria-label={isChatOpen ? "Close chat" : "Open chat"}
                    >
                        <FaAngleLeft className={`text-xl ${isChatOpen ? 'rotate-180' : ''} transition-transform`} />
                    </button>
                </div>
            </div>
        </div>
    );
}
