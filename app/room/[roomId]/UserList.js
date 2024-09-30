import React from 'react';

export default function UserList({ onlineUsers }) {
    const getUserInitial = (user) => {
        return user && user.userName && typeof user.userName === 'string'
            ? user.userName.charAt(0).toUpperCase()
            : '?';
    };

    return (
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
    );
}
