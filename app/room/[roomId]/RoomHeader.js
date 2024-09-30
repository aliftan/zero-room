import React from 'react';
import { FaCopy, FaSignOutAlt } from 'react-icons/fa';

export default function RoomHeader({ roomName, roomId, connectionStatus, handleCopyRoomCode, handleDisconnect }) {
    return (
        <header className="bg-gray-800 p-4 flex justify-between items-center">
            <div className="flex-1">
                <h1 className="text-left text-3xl font-extrabold gradient-text-hero">
                    Zero Room
                </h1>
            </div>
            <div className="flex-1 text-center">
                <h2 className="text-xl font-semibold">{roomName || `Room ${roomId}`}</h2>
            </div>
            <div className="flex-1 flex justify-end items-center space-x-4">
                <div className={`px-3 py-1 rounded-full border ${connectionStatus === 'connected' ? 'border-green-500 text-green-500' :
                    connectionStatus === 'connecting' ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-500'
                    } flex items-center space-x-2`}>
                    <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
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
    );
}
