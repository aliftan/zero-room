'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';

let idCounter = 0;
const generateUniqueId = () => {
    idCounter += 1;
    return `peer-${idCounter}`;
};

const MAX_PEERS = 6;

export default function VideoCall({ roomId, userName, socket, connectionStatus }) {
    const [peers, setPeers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [error, setError] = useState(null);
    const userVideo = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();

    const createPeer = useCallback((userToSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socket.emit('sending signal', { userToSignal, callerID, signal, userName });
        });

        peer.on('error', error => {
            console.error('Peer error in createPeer:', error);
            removePeer(callerID);
        });

        return peer;
    }, [socket, userName]);

    const addPeer = useCallback((incomingSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socket.emit('returning signal', { signal, callerID });
        });

        peer.on('error', error => {
            console.error('Peer error in addPeer:', error);
            removePeer(callerID);
        });

        peer.signal(incomingSignal);

        return peer;
    }, [socket]);

    const removePeer = useCallback((peerId) => {
        setPeers(prevPeers => prevPeers.filter(p => p.peerID !== peerId));
        peersRef.current = peersRef.current.filter(p => p.peerID !== peerId);
        const peerToRemove = peersRef.current.find(p => p.peerID === peerId);
        if (peerToRemove && peerToRemove.peer) {
            peerToRemove.peer.destroy();
        }
    }, []);

    useEffect(() => {
        if (connectionStatus !== 'connected') return;

        const setupMediaStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                }

                socket.emit('join room', { roomId, userName });

                socket.on('all users', users => {
                    const peers = [];
                    users.forEach(user => {
                        if (peers.length < MAX_PEERS - 1) {
                            const peer = createPeer(user.id, socket.id, stream);
                            const peerObj = {
                                peerID: user.id,
                                peer,
                                userName: user.userName,
                                uniqueId: generateUniqueId()
                            };
                            peersRef.current.push(peerObj);
                            peers.push(peerObj);
                        }
                    });
                    setPeers(peers);
                });

                socket.on('user joined', payload => {
                    if (peersRef.current.length < MAX_PEERS - 1) {
                        const peer = addPeer(payload.signal, payload.callerID, stream);
                        const peerObj = {
                            peerID: payload.callerID,
                            peer,
                            userName: payload.userName,
                            uniqueId: generateUniqueId()
                        };
                        peersRef.current.push(peerObj);
                        setPeers(prevPeers => [...prevPeers, peerObj]);
                    } else {
                        console.warn('Maximum number of peers reached. Cannot add new peer.');
                    }
                });

                socket.on('receiving returned signal', payload => {
                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    if (item && item.peer) {
                        item.peer.signal(payload.signal);
                    }
                });

                socket.on('user left', userId => {
                    removePeer(userId);
                });

                socket.on('room full', () => {
                    setError('The room is full. Cannot join.');
                });
            } catch (error) {
                console.error('Error accessing media devices:', error);
                setError('Unable to access camera or microphone');
            }
        };

        setupMediaStream();

        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
            peersRef.current.forEach(({ peer }) => peer.destroy());
            socket.off('all users');
            socket.off('user joined');
            socket.off('receiving returned signal');
            socket.off('user left');
            socket.off('room full');
            socket.emit('leave room', { roomId, userName });
        };
    }, [socket, roomId, userName, createPeer, addPeer, removePeer, connectionStatus]);

    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                if (track.kind === 'audio') track.enabled = connectionStatus === 'connected' && !isMuted;
                if (track.kind === 'video') track.enabled = connectionStatus === 'connected' && !isVideoOff;
            });
        }
    }, [connectionStatus, isMuted, isVideoOff]);

    const toggleAudio = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const toggleVideo = useCallback(() => {
        setIsVideoOff(prev => !prev);
    }, []);

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="relative h-full">
            <div className={`grid gap-2 h-full ${peers.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className="relative">
                    <video playsInline muted ref={userVideo} autoPlay className="w-full h-full object-cover rounded-lg" />
                    <p className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white">
                        You {connectionStatus !== 'connected' && '(Disconnected)'}
                    </p>
                </div>
                {peers.map((peerData) => (
                    <Video key={peerData.uniqueId} peer={peerData.peer} userName={peerData.userName} />
                ))}
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex justify-center space-x-4">
                <button
                    onClick={toggleAudio}
                    className={`px-4 py-2 rounded ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
                    disabled={connectionStatus !== 'connected'}
                >
                    {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                    onClick={toggleVideo}
                    className={`px-4 py-2 rounded ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
                    disabled={connectionStatus !== 'connected'}
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
            <video playsInline autoPlay ref={ref} className="w-full h-full object-cover rounded-lg" />
            <p className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white">
                {userName}
            </p>
        </div>
    );
};
