'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';

let idCounter = 0;
const generateUniqueId = () => {
    idCounter += 1;
    return `peer-${idCounter}`;
};

const MAX_PEERS = 6;

export default function VideoCall({ roomId, userName, socket, connectionStatus, user }) {
    const [peers, setPeers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [error, setError] = useState(null);
    const userVideo = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();

    const removePeer = useCallback((peerId) => {
        console.log('Removing peer:', peerId);
        setPeers(prevPeers => prevPeers.filter(p => p.peerID !== peerId));
        peersRef.current = peersRef.current.filter(p => p.peerID !== peerId);
        const peerToRemove = peersRef.current.find(p => p.peerID === peerId);
        if (peerToRemove && peerToRemove.peer) {
            peerToRemove.peer.destroy();
        }
    }, []);

    const createPeer = useCallback((userToSignal, callerID, stream) => {
        console.log('Creating peer for:', userToSignal);
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            console.log('Sending signal to:', userToSignal);
            socket.emit('sending signal', { userToSignal, callerID, signal, userName });
        });

        peer.on('connect', () => {
            console.log('Peer connected:', userToSignal);
        });

        peer.on('error', error => {
            console.error('Peer error in createPeer:', error);
            removePeer(callerID);
        });

        return peer;
    }, [socket, userName, removePeer]);

    const addPeer = useCallback((incomingSignal, callerID, stream) => {
        console.log('Adding peer for:', callerID);
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            console.log('Returning signal to:', callerID);
            socket.emit('returning signal', { signal, callerID });
        });

        peer.on('connect', () => {
            console.log('Peer connected:', callerID);
        });

        peer.on('error', error => {
            console.error('Peer error in addPeer:', error);
            removePeer(callerID);
        });

        // Wrap the signaling in a try-catch block
        try {
            if (peer && typeof peer.signal === 'function') {
                peer.signal(incomingSignal);
            } else {
                console.error('Peer object is not properly initialized');
                removePeer(callerID);
            }
        } catch (error) {
            console.error('Error signaling peer:', error);
            removePeer(callerID);
        }

        return peer;
    }, [socket, removePeer]);


    useEffect(() => {
        if (connectionStatus !== 'connected' || !socket) return;

        const setupMediaStream = async () => {
            try {
                console.log('Setting up media stream');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                }

                socket.emit('join room', { roomId, userName });

                socket.on('all users', users => {
                    console.log('Received all users:', users);
                    const peers = [];
                    users.forEach(user => {
                        if (peers.length < MAX_PEERS - 1 && user.id !== socket.id) {
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
                    console.log('User joined:', payload);
                    if (peersRef.current.length < MAX_PEERS - 1 && payload.callerID !== socket.id) {
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
                        console.warn('Maximum number of peers reached or self-connection attempted. Cannot add new peer.');
                    }
                });

                socket.on('receiving returned signal', payload => {
                    console.log('Received returned signal:', payload);
                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    if (item && item.peer) {
                        item.peer.signal(payload.signal);
                    }
                });

                socket.on('user left', userId => {
                    console.log('User left:', userId);
                    removePeer(userId);
                });

                socket.on('room full', () => {
                    console.log('Room is full');
                    setError('The room is full. Cannot join.');
                });
            } catch (error) {
                console.error('Error accessing media devices:', error);
                setError('Unable to access camera or microphone');
            }
        };

        setupMediaStream();

        return () => {
            console.log('Cleaning up VideoCall component');
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
                        {user ? user.userName : 'You'} {connectionStatus !== 'connected' && '(Disconnected)'}
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
    const [hasVideo, setHasVideo] = useState(false);

    useEffect(() => {
        peer.on('stream', stream => {
            console.log('Received stream for peer:', userName);
            if (ref.current) {
                ref.current.srcObject = stream;
                setHasVideo(stream.getVideoTracks().length > 0);
            }
        });

        peer.on('error', error => {
            console.error('Peer connection error:', error);
            setHasVideo(false);
        });

        peer.on('connect', () => {
            console.log('Peer connection established for:', userName);
        });

        return () => {
            peer.destroy();
        };
    }, [peer, userName]);

    return (
        <div className="relative">
            <video
                playsInline
                autoPlay
                ref={ref}
                className={`w-full h-full object-cover rounded-lg ${hasVideo ? '' : 'hidden'}`}
            />
            {!hasVideo && (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-lg">
                    <p className="text-white">Waiting for video from {userName}...</p>
                </div>
            )}
            <p className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white">
                {userName}
            </p>
        </div>
    );
};
