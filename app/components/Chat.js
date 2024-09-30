'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaTrash, FaReply } from 'react-icons/fa';

export default function Chat({ roomId, userName, socket }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const chatContainerRef = useRef();
    const inputRef = useRef();

    useEffect(() => {
        if (!socket) return;

        socket.on('chat message', message => {
            console.log('Received chat message:', message);
            setMessages(prevMessages => [...prevMessages, message]);
        });

        socket.on('message edited', editedMessage => {
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === editedMessage.id ? editedMessage : msg
                )
            );
        });

        socket.on('message deleted', deletedMessageId => {
            setMessages(prevMessages =>
                prevMessages.filter(msg => msg.id !== deletedMessageId)
            );
        });

        return () => {
            socket.off('chat message');
            socket.off('message edited');
            socket.off('message deleted');
        };
    }, [socket]);

    useEffect(() => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (replyingTo) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputMessage.trim() && socket) {
            const newMessage = {
                id: Date.now().toString(),
                roomId,
                userName,
                message: inputMessage,
                replyTo: replyingTo ? replyingTo.id : null,
                mentions: extractMentions(inputMessage),
                timestamp: new Date().toISOString()
            };
            console.log('Sending message:', newMessage);
            socket.emit('chat message', newMessage);

            setInputMessage('');
            setReplyingTo(null);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    const editMessage = (messageId, newContent) => {
        if (socket) {
            socket.emit('edit message', { messageId, newContent, roomId });
            setEditingMessage(null);
        }
    };

    const deleteMessage = (messageId) => {
        if (socket) {
            socket.emit('delete message', { messageId, roomId });
        }
    };

    const extractMentions = (message) => {
        const mentions = message.match(/@(\w+)/g);
        return mentions ? mentions.map(m => m.slice(1)) : [];
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleReply = (msg) => {
        setReplyingTo(msg);
        inputRef.current.focus();
    };

    const renderMessage = (msg) => {
        const isOwnMessage = msg.userName === userName;
        const replyToMessage = messages.find(m => m.id === msg.replyTo);
    
        return (
            <div key={msg.id} className="mb-4">
                <div className={`w-full rounded-lg ${isOwnMessage ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    {replyToMessage && (
                        <div className="px-4 py-2 bg-opacity-50 bg-gray-600 rounded-t-lg border-b border-gray-500">
                            <p className="text-xs text-gray-300">Replying to {replyToMessage.userName}</p>
                            <p className="text-sm text-gray-200 truncate">{replyToMessage.message}</p>
                        </div>
                    )}
                    <div className="px-4 py-2">
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-bold text-sm">{msg.userName}</p>
                            <p className="text-xs text-gray-300">{formatTimestamp(msg.timestamp)}</p>
                        </div>
                        <p className="break-words">{msg.message}</p>
                        <div className="mt-2 text-xs space-x-2 flex justify-end">
                            {isOwnMessage && (
                                <>
                                    <button onClick={() => setEditingMessage(msg)} className="p-1 hover:bg-gray-600 rounded"><FaEdit /></button>
                                    <button onClick={() => deleteMessage(msg.id)} className="p-1 hover:bg-gray-600 rounded"><FaTrash /></button>
                                </>
                            )}
                            <button onClick={() => handleReply(msg)} className="p-1 hover:bg-gray-600 rounded"><FaReply /></button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };        

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                {messages.map(renderMessage)}
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
                        onKeyPress={handleKeyPress}
                        ref={inputRef}
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
