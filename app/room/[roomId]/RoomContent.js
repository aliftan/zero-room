import React from 'react';
import VideoCall from '@/app/components/VideoCall';
import Chat from '@/app/components/Chat';
import { FaAngleLeft } from 'react-icons/fa';

export default function RoomContent({ socket, roomId, userName, connectionStatus, isChatOpen, setIsChatOpen }) {
    return (
        <div className="flex-1 flex">
            <div className="flex-1">
                {socket && <VideoCall
                    roomId={roomId}
                    userName={userName}
                    socket={socket}
                    connectionStatus={connectionStatus}
                    user={{ userName }}
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
    );
}
