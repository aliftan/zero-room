'use client';
import React, { useState, useEffect, useRef } from 'react';
import { initSocket, getSocket } from '@/app/lib/socket';
import { FaEdit, FaTrash, FaReply } from 'react-icons/fa';

export default function Chat({ roomId, userName }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const socketRef = useRef();
    const chatContainerRef = useRef();

    useEffect(() => {
        socketRef.current = initSocket();
        socketRef.current.emit('join chat', { roomId, userName });

        socketRef.current.on('chat message', message => {
            setMessages(prevMessages => [...prevMessages, message]);
        });

        socketRef.current.on('message edited', editedMessage => {
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === editedMessage.id ? editedMessage : msg
                )
            );
        });

        socketRef.current.on('message deleted', deletedMessageId => {
            setMessages(prevMessages =>
                prevMessages.filter(msg => msg.id !== deletedMessageId)
            );
        });

        return () => {
            socketRef.current.off('chat message');
            socketRef.current.off('message edited');
            socketRef.current.off('message deleted');
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

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.userName === userName ? 'justify-end' : 'justify-start'}`}>
                        <div className={`w-full px-4 py-2 rounded-lg ${msg.userName === userName ? 'bg-gray-700' : 'bg-gray-800'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-bold text-sm">{msg.userName}</p>
                                <p className="text-xs text-gray-400">{formatTimestamp(msg.timestamp)}</p>
                            </div>
                            {msg.replyTo && (
                                <p className="text-xs italic bg-gray-600 p-1 rounded mb-1">
                                    Replying to: {messages.find(m => m.id === msg.replyTo)?.message}
                                </p>
                            )}
                            <p className="break-words">{msg.message}</p>
                            <div className="mt-2 text-xs space-x-2 flex justify-end">
                                {msg.userName === userName && (
                                    <>
                                        <button onClick={() => setEditingMessage(msg)} className="p-1 hover:bg-gray-600 rounded"><FaEdit /></button>
                                        <button onClick={() => deleteMessage(msg.id)} className="p-1 hover:bg-gray-600 rounded"><FaTrash /></button>
                                    </>
                                )}
                                <button onClick={() => setReplyingTo(msg)} className="p-1 hover:bg-gray-600 rounded"><FaReply /></button>
                            </div>
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