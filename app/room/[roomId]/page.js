'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import VideoCall from '@/app/components/VideoCall';
import Chat from '@/app/components/Chat';

export default function Room({ params }) {
    const searchParams = useSearchParams();
    const userName = searchParams.get('name');
    const { roomId } = params;

    return (
        <div className="flex h-screen">
            <div className="flex-1">
                <VideoCall roomId={roomId} userName={userName} />
            </div>
            <div className="w-1/4 border-l">
                <Chat roomId={roomId} userName={userName} />
            </div>
        </div>
    );
}