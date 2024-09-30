'use client';

import React, { useState } from 'react';
import RoomCreation from '@/app/components/RoomCreation';
import RoomJoining from '@/app/components/RoomJoining';
import UsernameInput from '@/app/components/UsernameInput';

export default function Home() {
  const [username, setUsername] = useState('');

  const handleUsernameSubmit = (name) => {
    setUsername(name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-extrabold mb-8 text-center gradient-text-hero">
          Zero Room
        </h1>
        <p className="text-xl text-center mb-12 text-gray-300">
          Secure, instant video conferencing for the modern world
        </p>

        {!username ? (
          <UsernameInput onUsernameSubmit={handleUsernameSubmit} />
        ) : (
          <>
            <div className="text-center mb-8">
              <p className="text-2xl font-semibold text-green-400">
                Welcome, <span className="text-yellow-300">{username}!</span>
              </p>
              <p className="text-lg text-gray-400 mt-2">
                You can now create or join a room.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 hover:border-blue-500 transition-all duration-300">
                <h2 className="text-2xl font-bold mb-4 text-blue-400">Create a Room</h2>
                <RoomCreation username={username} />
              </div>

              <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 hover:border-purple-500 transition-all duration-300">
                <h2 className="text-2xl font-bold mb-4 text-purple-400">Join a Room</h2>
                <RoomJoining username={username} />
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="mt-4 text-center text-gray-500">
        <p>Crafted with passion 💖</p>
      </footer>
    </div>
  );
}
