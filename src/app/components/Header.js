// components/Header.js
"use client"

import { useState, useEffect } from 'react';

export default function Header({ 
  onOpenSettings, 
  onTemporaryChat, 
  onEndTemporaryChat,
  onNewConversation, 
  isTemporaryChat,
  onToggleSidebar,
  onToggleTerminal,
  isMobile
}) {
  // Initialize with null state to avoid hydration mismatch
  const [darkMode, setDarkMode] = useState(null);
  const [modelDisplay, setModelDisplay] = useState('Claude 3.7 Sonnet');
  const [mounted, setMounted] = useState(false);

  // Only run this effect on the client side after hydration
  useEffect(() => {
    setMounted(true);
    
    // Check system preference or saved preference on component mount
    if (localStorage.theme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      localStorage.theme = 'dark'; 
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      localStorage.theme = 'light'; 
    }
    
    // Load model from settings
    const savedSettings = localStorage.getItem('aiApiSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      
      if (settings.model === 'custom') {
        setModelDisplay(settings.customModelName || 'Custom Model');
      } else {
        // Convert model ID to display name
        const modelDisplayNames = {
          'claude-3-7-sonnet': 'Claude 3.7 Sonnet',
          'claude-3-opus': 'Claude 3 Opus',
          'llama-3.3-70b-versatile': 'Llama 3.3 70B',
          'gemini-2.0-flash': 'Gemini 2.0 Flash',
          'gpt-4o': 'GPT-4o',
          'gpt-3.5-turbo': 'GPT-3.5 Turbo'
        };
        setModelDisplay(modelDisplayNames[settings.model] || settings.model);
      }
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
    setDarkMode(!darkMode);
  };

  // Don't render anything on the server or until mounted on client
  if (!mounted) return null;

  return (
    <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 py-2 px-4 flex items-center justify-between shadow-sm">
      {/* Left side with menu and logo */}
      <div className="flex items-center">
        <button 
          onClick={onToggleSidebar}
          className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Logo or app name */}
        <h1 className="ml-2 text-xl font-semibold text-gray-800 dark:text-white">ChatAI</h1>
        
        {/* Display current model */}
        <div className="ml-4 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-300">
          {modelDisplay}
        </div>
      </div>
      
      
      {/* Right side with actions */}
      <div className="flex items-center space-x-2">
        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        
        {/* Terminal toggle button */}
        <button
          onClick={onToggleTerminal}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
          title="Terminal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        
        
        {/* Temporary chat indicator/button */}
        {isTemporaryChat ? (
          <span className="cursor-pointer px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full text-sm font-medium" 
          onClick={onEndTemporaryChat}>
            Temporary Chat
          </span>
        ) : (
          <button
            onClick={onTemporaryChat}
            className="cursor-pointer px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium"
          >
            Temporary Chat
          </button>
        )}
        
      </div>
    </header>
  );
}
