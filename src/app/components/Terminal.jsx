"use client"

import { useState, useEffect, useRef } from 'react';

export default function Terminal({ logs = [], isOpen, setIsOpen }) {
  const [visibleLogs, setVisibleLogs] = useState([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const terminalRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState({
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTime: 0,
    messageCount: 0
  });
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
    
    // Check if dark mode is enabled
    if (typeof window !== 'undefined') {
      const isDark = localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
      
      // Listen for theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const isDarkNow = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDarkNow);
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
    }
  }, []);

  // Extract metrics from logs
  useEffect(() => {
    if (!mounted || logs.length === 0) return;
    
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTime = 0;
    let messageCount = 0;
    
    // Parse logs for token and time metrics
    logs.forEach(log => {
      if (!log || typeof log.content !== 'string') return;
      
      const content = log.content;
      
      // Check for token information in logs
      if (content.includes('tokens')) {
        // Extract token counts
        const tokenMatch = content.match(/(\d+)\s*tokens/);
        if (tokenMatch && tokenMatch[1]) {
          const tokens = parseInt(tokenMatch[1], 10);
          totalTokens += tokens;
          
          // Determine if prompt or completion tokens
          if (content.includes('User message') || content.includes('prompt')) {
            promptTokens += tokens;
          } else if (content.includes('Response') || content.includes('completion') || content.includes('generated')) {
            completionTokens += tokens;
          }
        }
      }
      
      // Check for time information
      const timeMatch = content.match(/(\d+\.?\d*)s/);
      if (timeMatch && timeMatch[1]) {
        totalTime += parseFloat(timeMatch[1]);
      }
      
      // Count messages
      if (content.includes('User message') || content.includes('Response completed')) {
        messageCount++;
      }
    });
    
    setMetrics({
      totalTokens,
      promptTokens,
      completionTokens,
      totalTime,
      messageCount
    });
  }, [logs, mounted]);

  // Add logs with typing animation
  useEffect(() => {
    if (!mounted) return;
    
    if (currentLogIndex < logs.length) {
      if (!isTyping) {
        setIsTyping(true);
        setCurrentText('');
      } else if (logs[currentLogIndex] && typeof logs[currentLogIndex].content === 'string') {
        const targetText = logs[currentLogIndex].content;
        const currentLen = currentText.length;
        
        if (currentLen < targetText.length) {
          const timer = setTimeout(() => {
            setCurrentText(targetText.substring(0, currentLen + 1));
          }, 5); // Speed of typing animation
          return () => clearTimeout(timer);
        } else {
          setVisibleLogs(prev => [...prev, logs[currentLogIndex]]);
          setCurrentLogIndex(prev => prev + 1);
          setIsTyping(false);
        }
      } else {
        // Skip invalid logs
        setCurrentLogIndex(prev => prev + 1);
        setIsTyping(false);
      }
    }
  }, [logs, currentLogIndex, isTyping, currentText, mounted]);

  // Get color based on log type and theme
  const getLogColor = (log) => {
    if (!log || !log.type) return 'dark:text-white text-gray-800';
    
    switch(log.type) {
      case 'error':
        return 'dark:text-red-500 text-red-500';
      case 'warning':
        return 'dark:text-amber-500 text-amber-500';
      case 'success':
        return 'dark:text-green-500 text-green-500';
      case 'info':
        return 'dark:text-blue-400 text-blue-600';
      case 'command':
        return 'dark:text-white text-black font-bold';
      default:
        return 'dark:text-gray-300 text-gray-700';
    }
  };

  // Scroll to bottom when new logs are added
  useEffect(() => {
    if (terminalRef.current && isOpen) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleLogs, isOpen]);

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-20 flex flex-col transition-all duration-300 ${
        isOpen ? 'h-64' : 'h-8'
      } border-t dark:border-gray-700 dark:bg-black text-white border-gray-300 bg-gray-100 text-black`}
    >
      <div 
        className={`handle h-8 flex items-center justify-between cursor-pointer px-4 dark:bg-gray-900 border-b dark:border-gray-700 border-gray-300`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <div className="flex space-x-1 mr-3">
            <span className="text-red-500 text-xl">•</span>
            <span className="text-yellow-500 text-xl">•</span>
            <span className="text-green-500 text-xl">•</span>
          </div>
          <h3 className={`text-sm font-mono dark:text-gray-200 text-gray-800`}>Terminal</h3>
          
          {/* Terminal Stats */}
          {metrics.totalTokens > 0 && (
            <div className={`ml-4 text-xs font-mono dark:text-gray-400 text-gray-600`}>
              <span title="Total tokens used">{metrics.totalTokens} tokens</span>
              <span className="mx-2">|</span>
              <span title="Time spent generating responses">{metrics.totalTime.toFixed(1)}s</span>
              <span className="mx-2">|</span>
              <span title="Number of messages">{metrics.messageCount} msgs</span>
            </div>
          )}
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 dark:text-gray-400 text-gray-600 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>
      
      {isOpen && (
        <>
          <div 
            ref={terminalRef}
            className={`flex-1 p-3 overflow-y-auto font-mono text-sm dark:bg-black bg-white`}
          >
            {visibleLogs.map((log, index) => (
              <div key={index} className="mb-2">
                <span className={`text-blue-400 dark:text-blue-600`}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>{' '}
                <span 
                  className={getLogColor(log)} 
                  dangerouslySetInnerHTML={{ __html: (log.content || '').replace(/\n/g, '<br/>') }} 
                />
              </div>
            ))}
            {isTyping && currentLogIndex < logs.length && logs[currentLogIndex] && (
              <div className="mb-2">
                <span className={`text-blue-400 dark:text-blue-600`}>
                  [{new Date().toLocaleTimeString()}]
                </span>{' '}
                <span className={getLogColor(logs[currentLogIndex])}>{currentText}</span>
                <span className={`animate-pulse dark:text-white text-black`}>▌</span>
              </div>
            )}
          </div>
          
          {/* Terminal metrics footer */}
          <div className={`px-3 py-1 border-t text-xs font-mono flex justify-between text-gray-400 dark:bg-gray-900 dark:border-gray-700`}>
            <div>
              <span className="text-green-500 mr-1">❯</span> 
              <span className={`dark:text-white text-black`}>Session:</span> 
              <span className={`dark:text-blue-400 text-blue-600 ml-1`}>{metrics.promptTokens}</span> prompt + 
              <span className={`dark:text-purple-400 text-purple-600 ml-1`}>{metrics.completionTokens}</span> completion = 
              <span className={`dark:text-yellow-400 text-yellow-600 ml-1`}>{metrics.totalTokens}</span> total tokens
            </div>
            <div className={`dark:text-gray-400 text-gray-600`}>
              Response time: <span className={`dark:text-yellow-400 text-yellow-600`}>{metrics.totalTime.toFixed(2)}s</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 