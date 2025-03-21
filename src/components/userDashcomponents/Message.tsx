import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaSearch, FaEllipsisH, FaPaperPlane, FaPaperclip,
  FaSmile, FaUser, FaCircle, FaCheckDouble, FaMicrophone
} from 'react-icons/fa';

// Types for our message component
interface Conversation {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
}

interface Message {
  id: number;
  text: string;
  time: string;
  isMe: boolean;
  isRead: boolean;
}

const Message: React.FC = () => {
  const [activeConversation, setActiveConversation] = useState<number>(1);
  const [message, setMessage] = useState<string>('');

  // Demo conversations data
  const conversations: Conversation[] = [
    {
      id: 1,
      name: 'Sarah Miller',
      avatar: 'S',
      lastMessage: 'When will my package arrive?',
      time: '10:30 AM',
      unread: 2,
      isOnline: true
    },
    {
      id: 2,
      name: 'John Doe',
      avatar: 'J',
      lastMessage: 'Thanks for the quick delivery!',
      time: 'Yesterday',
      unread: 0,
      isOnline: false
    },
    {
      id: 3,
      name: 'Emma Wilson',
      avatar: 'E',
      lastMessage: 'I need to change my delivery address',
      time: 'Yesterday',
      unread: 1,
      isOnline: true
    },
    {
      id: 4,
      name: 'Michael Brown',
      avatar: 'M',
      lastMessage: 'Is the driver on the way?',
      time: 'Tue',
      unread: 0,
      isOnline: false
    },
    {
      id: 5,
      name: 'David Chen',
      avatar: 'D',
      lastMessage: 'Package received, thank you!',
      time: 'Mon',
      unread: 0,
      isOnline: true
    }
  ];

  // Demo messages for the active conversation
  const messages: Message[] = [
    {
      id: 1,
      text: 'Hello! I was wondering about my recent shipment.',
      time: '10:22 AM',
      isMe: false,
      isRead: true
    },
    {
      id: 2,
      text: 'Hi Sarah, how can I help you today?',
      time: '10:25 AM',
      isMe: true,
      isRead: true
    },
    {
      id: 3,
      text: 'When will my package arrive? The tracking shows it\'s in transit.',
      time: '10:30 AM',
      isMe: false,
      isRead: true
    },
    {
      id: 4,
      text: 'I\'ve checked your shipment. It\'s currently out for delivery and should arrive by 3 PM today.',
      time: '10:32 AM',
      isMe: true,
      isRead: false
    }
  ];

  const handleSendMessage = () => {
    if (message.trim() === '') return;
    // In a real app, you would add the message to the conversation
    // and send it to the server
    setMessage('');
  };

  return (
    <div className="container mx-auto">
      <div className="bg-white dark:bg-midnight-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-stone-700/20">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh-12rem)]">
          {/* Conversation List */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-1 border-r border-gray-200 dark:border-stone-700/20 h-full flex flex-col"
          >
            <div className="p-4 border-b border-gray-200 dark:border-stone-700/20">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Messages</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search messages..."
                  className="w-full bg-gray-100 dark:bg-midnight-700 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:bg-white dark:focus:bg-midnight-600"
                />
                <div className="absolute left-3 top-2.5 text-gray-400 dark:text-stone-500">
                  <FaSearch />
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1">
              {conversations.map((conversation) => (
                <div 
                  key={conversation.id}
                  onClick={() => setActiveConversation(conversation.id)}
                  className={`p-4 border-b border-gray-100 dark:border-stone-700/10 cursor-pointer transition-colors duration-150 ${
                    activeConversation === conversation.id 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-midnight-700/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                        {conversation.avatar}
                      </div>
                      {conversation.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-midnight-800"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conversation.name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-stone-400">{conversation.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-stone-400 truncate">{conversation.lastMessage}</p>
                    </div>
                    {conversation.unread > 0 && (
                      <div className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unread}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          
          {/* Message Thread */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col h-full"
          >
            {/* Active Conversation Header */}
            <div className="p-4 border-b border-gray-200 dark:border-stone-700/20 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                    {conversations.find(c => c.id === activeConversation)?.avatar || 'U'}
                  </div>
                  {conversations.find(c => c.id === activeConversation)?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-midnight-800"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {conversations.find(c => c.id === activeConversation)?.name || 'User'}
                  </h3>
                  <div className="flex items-center text-xs text-green-500">
                    <FaCircle className="w-2 h-2 mr-1" />
                    <span>Online</span>
                  </div>
                </div>
              </div>
              <button className="text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-white">
                <FaEllipsisH />
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex flex-col max-w-[75%]">
                    <div 
                      className={`px-4 py-3 rounded-2xl ${
                        msg.isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-gray-100 dark:bg-midnight-700 text-gray-800 dark:text-white rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <div className={`flex items-center mt-1 text-xs text-gray-500 dark:text-stone-400 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                      <span>{msg.time}</span>
                      {msg.isMe && (
                        <FaCheckDouble className={`ml-1 ${msg.isRead ? 'text-blue-500' : ''}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Compose Message */}
            <div className="p-4 border-t border-gray-200 dark:border-stone-700/20">
              <div className="flex items-center space-x-2">
                <button className="text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-white p-2">
                  <FaPaperclip />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-gray-100 dark:bg-midnight-700 border-none rounded-full py-2 px-4 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:bg-white dark:focus:bg-midnight-600 pr-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                  />
                  <button className="absolute right-3 top-2 text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300">
                    <FaSmile />
                  </button>
                </div>
                {message.trim() === '' ? (
                  <button className="text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-white p-2">
                    <FaMicrophone />
                  </button>
                ) : (
                  <button 
                    onClick={handleSendMessage}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 transition-colors duration-150"
                  >
                    <FaPaperPlane />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Message; 