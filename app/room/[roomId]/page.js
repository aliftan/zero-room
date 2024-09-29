'use client';
import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VideoCall from '@/app/components/VideoCall';
import Chat from '@/app/components/Chat';

export default function Room({ params }) {
    const searchParams = useSearchParams();
    const userName = searchParams.get('name');
    const { roomId } = params;
    const router = useRouter();
    const [isChatOpen, setIsChatOpen] = useState(true);

    const handleDisconnect = () => {
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
                <div className="space-x-4">
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
                <div className="flex-1">
                    <VideoCall roomId={roomId} userName={userName} />
                </div>
                <div className={`w-1/4 border-l border-gray-700 transition-all duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <Chat roomId={roomId} userName={userName} />
                </div>
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-l-md"
                >
                    {isChatOpen ? '→' : '←'}
                </button>
            </div>
        </div>
    );
}