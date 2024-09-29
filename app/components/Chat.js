'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/app/lib/socket';

export default function Chat({ roomId, userName }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const socketRef = useRef();
    const chatContainerRef = useRef();

    useEffect(() => {
        socketRef.current = getSocket();
        socketRef.current.emit('join chat', { roomId, userName });

        socketRef.current.on('chat message', message => {
            setMessages(prevMessages => [...prevMessages, message]);
        });

        return () => {
            socketRef.current.off('chat message');
        };
    }, [roomId, userName]);

    useEffect(() => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputMessage) {
            socketRef.current.emit('chat message', {
                roomId,
                userName,
                message: inputMessage
            });
            setInputMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`mb-2 ${msg.userName === userName ? 'text-right' : ''}`}>
                        <span className="font-bold">{msg.userName}: </span>
                        <span>{msg.message}</span>
                    </div>
                ))}
            </div>
            <form onSubmit={sendMessage} className="p-4">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="w-full border p-2 rounded"
                    placeholder="Type a message..."
                />
            </form>
        </div>
    );
}