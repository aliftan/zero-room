'use client';
import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { initSocket, getSocket } from '@/app/lib/socket';

export default function VideoCall({ roomId, userName }) {
    const [peers, setPeers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();

    useEffect(() => {
        socketRef.current = initSocket();
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            streamRef.current = stream;
            userVideo.current.srcObject = stream;
            socketRef.current.emit('join room', { roomId, userName });

            socketRef.current.on('all users', users => {
                const peers = [];
                users.forEach(user => {
                    const peer = createPeer(user.id, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: user.id,
                        peer,
                        userName: user.userName
                    });
                    peers.push({ peer, userName: user.userName });
                });
                setPeers(peers);
            });

            socketRef.current.on('user joined', payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                    userName: payload.userName
                });
                setPeers(peers => [...peers, { peer, userName: payload.userName }]);
            });

            socketRef.current.on('receiving returned signal', payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });

            socketRef.current.on('user left', userId => {
                const peerObj = peersRef.current.find(p => p.peerID === userId);
                if (peerObj) {
                    peerObj.peer.destroy();
                }
                const remainingPeers = peersRef.current.filter(p => p.peerID !== userId);
                peersRef.current = remainingPeers;
                setPeers(peers => peers.filter(p => p.peerID !== userId));
            });
        });

        return () => {
            socketRef.current.disconnect();
            peers.forEach(peer => peer.peer.destroy());
        };
    }, [roomId, userName]);

    const toggleAudio = () => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks()[0].enabled = isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks()[0].enabled = isVideoOff;
            setIsVideoOff(!isVideoOff);
        }
    };

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('sending signal', { userToSignal, callerID, signal });
        });

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('returning signal', { signal, callerID });
        });

        peer.signal(incomingSignal);

        return peer;
    }

    return (
        <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <video playsInline muted ref={userVideo} autoPlay className="w-full rounded-lg" />
                {peers.map((peer, index) => (
                    <Video key={index} peer={peer.peer} userName={peer.userName} />
                ))}
            </div>
            <div className="flex justify-center space-x-4">
                <button
                    onClick={toggleAudio}
                    className={`px-4 py-2 rounded ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
                >
                    {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                    onClick={toggleVideo}
                    className={`px-4 py-2 rounded ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
                >
                    {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
                </button>
            </div>
        </div>
    );
}

const Video = ({ peer, userName }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            ref.current.srcObject = stream;
        });
    }, [peer]);

    return (
        <div className="relative">
            <video playsInline autoPlay ref={ref} className="w-full rounded-lg" />
            <p className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white">
                {userName}
            </p>
        </div>
    );
};