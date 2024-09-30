'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';

export default function VideoCall({ roomId, userName, socket, connectionStatus }) {
    const [peers, setPeers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
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
            socket.emit('sending signal', { userToSignal, callerID, signal });
        });

        peer.on('error', error => {
            console.error('Peer error:', error);
            peer.destroy();
        });

        return peer;
    }, [socket]);

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
            console.error('Peer error:', error);
            peer.destroy();
        });

        peer.signal(incomingSignal);

        return peer;
    }, [socket]);

    useEffect(() => {
        if (connectionStatus !== 'connected') return;

        const setupMediaStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                }

                socket.on('all users', users => {
                    const peers = [];
                    users.forEach(user => {
                        const peer = createPeer(user.id, socket.id, stream);
                        peersRef.current.push({
                            peerID: user.id,
                            peer,
                            userName: user.userName
                        });
                        peers.push({ peer, userName: user.userName });
                    });
                    setPeers(peers);
                });

                socket.on('user joined', payload => {
                    const peer = addPeer(payload.signal, payload.callerID, stream);
                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                        userName: payload.userName
                    });
                    setPeers(prevPeers => [...prevPeers, { peer, userName: payload.userName }]);
                });

                socket.on('receiving returned signal', payload => {
                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    if (item && !item.peer.destroyed) {
                        item.peer.signal(payload.signal);
                    }
                });

                socket.on('user left', userId => {
                    const peerObj = peersRef.current.find(p => p.peerID === userId);
                    if (peerObj) {
                        peerObj.peer.destroy();
                    }
                    const remainingPeers = peersRef.current.filter(p => p.peerID !== userId);
                    peersRef.current = remainingPeers;
                    setPeers(prevPeers => prevPeers.filter(p => p.peer.peerID !== userId));
                });
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        };

        setupMediaStream();

        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
            peersRef.current.forEach(({ peer }) => {
                if (peer && !peer.destroyed) {
                    peer.destroy();
                }
            });
        };
    }, [socket, roomId, userName, createPeer, addPeer, connectionStatus]);

    useEffect(() => {
        if (connectionStatus !== 'connected' && streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.enabled = false);
        } else if (connectionStatus === 'connected' && streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                if (track.kind === 'audio') track.enabled = !isMuted;
                if (track.kind === 'video') track.enabled = !isVideoOff;
            });
        }
    }, [connectionStatus, isMuted, isVideoOff]);

    const toggleAudio = useCallback(() => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    }, []);

    return (
        <div className="relative h-full">
            <div className="grid grid-cols-2 gap-2 h-full">
                <div className="relative">
                    <video playsInline muted ref={userVideo} autoPlay className="w-full h-full object-cover rounded-lg" />
                    <p className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white">
                        You {connectionStatus !== 'connected' && '(Disconnected)'}
                    </p>
                </div>
                {peers.map((peer, index) => (
                    <Video key={peer.peer.peerID} peer={peer.peer} userName={peer.userName} />
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

const Video = React.memo(({ peer, userName }) => {
    const ref = useRef();

    useEffect(() => {
        if (peer) {
            peer.on('stream', stream => {
                if (ref.current) {
                    ref.current.srcObject = stream;
                }
            });
        }
        return () => {
            if (peer && !peer.destroyed) {
                peer.destroy();
            }
        };
    }, [peer]);

    return (
        <div className="relative">
            <video playsInline autoPlay ref={ref} className="w-full h-full object-cover rounded-lg" />
            <p className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white">
                {userName}
            </p>
        </div>
    );
});

Video.displayName = 'Video';