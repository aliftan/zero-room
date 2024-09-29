import React from 'react';
import RoomCreation from '@/app/components/RoomCreation';
import RoomJoining from '@/app/components/RoomJoining';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-extrabold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Zero Room
        </h1>
        <p className="text-xl text-center mb-12 text-gray-300">
          Secure, instant video conferencing for the modern world
        </p>
        {/* add github button. link to this repo: https://github.com/aliftan/zero-room */}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">Create a Room</h2>
            <RoomCreation />
          </div>

          <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 hover:border-purple-500 transition-all duration-300">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">Join a Room</h2>
            <RoomJoining />
          </div>
        </div>
      </div>

      <footer className="mt-4 text-center text-gray-500">
        <p>Crafted with passion 💖</p>
      </footer>
    </div>
  );
}