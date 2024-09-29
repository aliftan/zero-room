'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/app/lib/socket';

export default function Chat({ roomId, userName }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const socketRef = useRef();
    const chatContainerRef = useRef();

    useEffect(() => {
        socketRef.current = getSocket();
        socketRef.current.emit('join chat', { roomId, userName });
        console.log('Joined chat room:', roomId, 'as', userName);

        socketRef.current.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        socketRef.current.on('connect_timeout', (timeout) => {
            console.error('Socket connection timeout:', timeout);
        });

        socketRef.current.on('error', (error) => {
            console.error('Socket error:', error);
        });

        socketRef.current.on('chat message', message => {
            console.log('Received message:', message);
            setMessages(prevMessages => {
                const newMessages = [...prevMessages, message];
                console.log('New messages state:', newMessages);
                return newMessages;
            });
        });

        socketRef.current.on('message edited', editedMessage => {
            console.log('Message edited:', editedMessage);
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === editedMessage.id ? editedMessage : msg
                )
            );
        });

        socketRef.current.on('message deleted', deletedMessageId => {
            console.log('Message deleted:', deletedMessageId);
            setMessages(prevMessages =>
                prevMessages.filter(msg => msg.id !== deletedMessageId)
            );
        });

        return () => {
            console.log('Cleaning up socket listeners');
            socketRef.current.off('chat message');
            socketRef.current.off('message edited');
            socketRef.current.off('message deleted');
            socketRef.current.off('connect_error');
            socketRef.current.off('connect_timeout');
            socketRef.current.off('error');
        };
    }, [roomId, userName]);

    useEffect(() => {
        console.log('Messages state updated:', messages);
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputMessage.trim()) {
            const newMessage = {
                id: Date.now().toString(),
                roomId,
                userName,
                message: inputMessage,
                replyTo: replyingTo ? replyingTo.id : null,
                mentions: extractMentions(inputMessage),
            };
            console.log('Sending message:', newMessage);
            socketRef.current.emit('chat message', newMessage);

            setMessages(prevMessages => [...prevMessages, newMessage]);
            setInputMessage('');
            setReplyingTo(null);
        }
    };

    const editMessage = (messageId, newContent) => {
        console.log('Editing message:', messageId, newContent);
        socketRef.current.emit('edit message', { messageId, newContent, roomId });
        setEditingMessage(null);
    };

    const deleteMessage = (messageId) => {
        console.log('Deleting message:', messageId);
        socketRef.current.emit('delete message', { messageId, roomId });
    };

    const extractMentions = (message) => {
        const mentions = message.match(/@(\w+)/g);
        return mentions ? mentions.map(m => m.slice(1)) : [];
    };

    const formatMessage = (message) => {
        return message.split(' ').map((word, index) => {
            if (word.startsWith('@')) {
                return <span key={index} className="text-blue-400">{word}</span>;
            }
            return word + ' ';
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.userName === userName ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.userName === userName ? 'bg-blue-600' : 'bg-gray-700'}`}>
                            <p className="font-bold text-sm">{msg.userName}</p>
                            {msg.replyTo && <p className="text-xs italic bg-gray-800 p-1 rounded mb-1">Replying to: {messages.find(m => m.id === msg.replyTo)?.message}</p>}
                            <p>{formatMessage(msg.message)}</p>
                            {msg.userName === userName && (
                                <div className="mt-2 text-xs space-x-2">
                                    <button onClick={() => setEditingMessage(msg)} className="text-gray-300 hover:text-white">Edit</button>
                                    <button onClick={() => deleteMessage(msg.id)} className="text-red-400 hover:text-red-300">Delete</button>
                                </div>
                            )}
                            <button onClick={() => setReplyingTo(msg)} className="text-gray-400 hover:text-gray-200 text-xs mt-1">Reply</button>
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 bg-gray-800">
                {replyingTo && (
                    <div className="mb-2 p-2 bg-gray-700 rounded flex justify-between items-center">
                        <p className="text-sm">Replying to: {replyingTo.message}</p>
                        <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">×</button>
                    </div>
                )}
                {editingMessage && (
                    <div className="mb-2 p-2 bg-gray-700 rounded flex justify-between items-center">
                        <input
                            type="text"
                            value={editingMessage.message}
                            onChange={(e) => setEditingMessage({ ...editingMessage, message: e.target.value })}
                            className="flex-1 bg-gray-600 text-white px-2 py-1 rounded"
                        />
                        <button onClick={() => editMessage(editingMessage.id, editingMessage.message)} className="ml-2 bg-green-600 text-white px-2 py-1 rounded">Save</button>
                        <button onClick={() => setEditingMessage(null)} className="ml-2 text-gray-400 hover:text-white">Cancel</button>
                    </div>
                )}
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type a message... (Use @ to mention)"
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}