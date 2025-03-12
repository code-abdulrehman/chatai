"use client"

import { useState } from 'react';

export default function ConversationSidebar({ 
  conversations, 
  activeConversationId, 
  onSelectConversation, 
  onNewConversation, 
  onDeleteConversation,
  isTemporaryChat
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter conversations based on search term
  const filteredConversations = conversations.filter(
    conv => conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full transition-[width] duration-300 border-r dark:border-gray-700  dark:bg-gray-900 dark:text-white text-gray-900 bg-white">
      {/* Sidebar Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <button
          onClick={onNewConversation}
          className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-md py-2 px-4 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isTemporaryChat}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          New Chat
        </button>
        
        <div className="mt-3">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          />
        </div>
      </div>
      
      {/* Conversations List */}
      <div className="flex-grow overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 p-4">
            No conversations yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredConversations.map(conv => (
              <li key={conv.id} className="relative hover:bg-gray-200 dark:hover:bg-gray-700">
                <div
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left py-3 px-4 cursor-pointer ${
                    activeConversationId === conv.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conv.title || "New Conversation"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(conv.lastUpdated)}
                      </p>
                    </div>
                    <div 
                      className="absolute right-4 top-3" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onDeleteConversation(conv.id)}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1"
                        aria-label="Delete conversation"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 