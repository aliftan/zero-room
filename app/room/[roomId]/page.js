'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { initSocket, startHeartbeat } from '@/app/lib/socket';
import RoomHeader from './RoomHeader';
import UserList from './UserList';
import RoomContent from './RoomContent';
import Toast from '@/app/components/Toast';

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
    const [toast, setToast] = useState(null);

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
                // Start the heartbeat when connected
                startHeartbeat(roomId);
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

            // Start the heartbeat
            startHeartbeat(roomId);

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
        setToast('Room code copied to clipboard!');
    }, [roomId]);

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <RoomHeader
                roomName={roomName}
                roomId={roomId}
                connectionStatus={connectionStatus}
                handleCopyRoomCode={handleCopyRoomCode}
                handleDisconnect={handleDisconnect}
            />

            <div className="flex flex-1 overflow-hidden">
                <UserList onlineUsers={onlineUsers} />
                <RoomContent
                    socket={socket}
                    roomId={roomId}
                    userName={userName}
                    connectionStatus={connectionStatus}
                    isChatOpen={isChatOpen}
                    setIsChatOpen={setIsChatOpen}
                    user={{ userName }}
                />
            </div>
            {toast && (
                <Toast
                    message={toast}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
