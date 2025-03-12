"use client"

import { useState, useRef, useEffect } from 'react';
import { renderMarkdown } from '../utils/markdownUtils';

export default function ChatInterface({ 
  messages, 
  setMessages, 
  isLoading, 
  setIsLoading,
  isTemporaryChat,
  addTerminalLog,
  terminalOpen
}) {
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesEndRef = useRef(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messageContentRef = useRef('');
  const responseStartTimeRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [sessionTokens, setSessionTokens] = useState({
    total: 0,
    prompt: 0,
    completion: 0
  });
  const [settings, setSettings] = useState({
    model: 'claude-3-7-sonnet',
    customModelName: '',
    temperature: 0.7,
    maxTokens: 1000,
    apiKey: '',
    role: 'Assistant'
  });
  const [currentModel, setCurrentModel] = useState('Claude 3.7 Sonnet');
  const [systemMessage, setSystemMessage] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Detect initial theme state
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      
      // Load settings from localStorage
      loadSettingsFromStorage();
      
      // Listen for theme changes using MutationObserver
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const isDarkNow = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDarkNow);
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      
      // Set up storage listener to detect settings changes
      const handleStorageChange = (e) => {
        if (e.key === 'aiApiSettings') {
          loadSettingsFromStorage();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        observer.disconnect();
        window.removeEventListener('storage', handleStorageChange);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, []);
  
  // Function to load settings from localStorage
  const loadSettingsFromStorage = () => {
    try {
      const savedSettings = localStorage.getItem('aiApiSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // Get model display name
        if (parsedSettings.model === 'custom') {
          setCurrentModel(parsedSettings.customModelName || 'Custom Model');
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
          setCurrentModel(modelDisplayNames[parsedSettings.model] || parsedSettings.model);
        }
        
        // Set system message
        setSystemMessage(parsedSettings.systemMessage || '');
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (mounted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, mounted, streamingText]);

  // Text streaming simulation
  useEffect(() => {
    if (isStreaming && messageContentRef.current) {
      let index = streamingText.length;
      if (index < messageContentRef.current.length) {
        const timer = setTimeout(() => {
          setStreamingText(messageContentRef.current.substring(0, index + 1));
        }, 15);
        return () => clearTimeout(timer);
      } else {
        // Finish streaming and add the complete message
        setIsStreaming(false);
        setIsLoading(false); // Ensure loading is properly turned off
        
        // Calculate estimated tokens and timing
        const estimatedTokens = Math.round(messageContentRef.current.length / 4);
        const responseTime = Date.now() - (responseStartTimeRef.current || Date.now());
        
        setMessages(prev => {
          const updatedMessages = [...prev];
          const lastIndex = updatedMessages.length - 1;
          
          // If the last message is a streaming assistant message, update it
          if (lastIndex >= 0 && 
              updatedMessages[lastIndex].role === 'assistant' && 
              updatedMessages[lastIndex].streaming) {
            
            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              content: messageContentRef.current,
              streaming: false,
              tokens: estimatedTokens,
              responseTime,
              timestamp: new Date().toISOString(),
              model: currentModel
            };
          }
          
          return updatedMessages;
        });
        
        addTerminalLog(`AI response completed (${estimatedTokens} tokens, ${(responseTime/1000).toFixed(1)}s)`, "success");
      }
    }
  }, [streamingText, isStreaming, setMessages, addTerminalLog, currentModel]);

  // Update token tracking
  const updateSessionTokens = (promptTokens, completionTokens) => {
    setSessionTokens(prev => ({
      prompt: prev.prompt + promptTokens,
      completion: prev.completion + completionTokens,
      total: prev.total + promptTokens + completionTokens
    }));
    
    // Log token usage to terminal
    addTerminalLog(`Token usage: ${promptTokens || 0} prompt + ${completionTokens || 0} completion = ${(promptTokens || 0) + (completionTokens || 0)} tokens`);
  };

  const handleSubmit = async () => {
    if (isLoading || isStreaming) {
      // Stop the current response if loading
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      setIsStreaming(false);
      addTerminalLog("User canceled the response", "warning");
      return;
    }
    
    if (!message.trim()) return;
    
    // Add user message to the chat
    const userMessageTimestamp = new Date().toISOString();
    const userMessage = {
      role: 'user',
      content: message.trim(),
      sender: 'You',
      timestamp: userMessageTimestamp
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Estimate token count for user message
    const estimatedTokens = Math.round(message.length / 4);
    addTerminalLog(`User message sent (${estimatedTokens} tokens)`, "info");
    
    // Clear input field
    setMessage('');
    
    // Set loading state
    setIsLoading(true);
    
    // Create placeholder for assistant response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      sender: 'AI',
      timestamp: new Date().toISOString(),
      streaming: true,
      model: currentModel
    }]);
    
    try {
      // In a real app, we would make an API call here
      // For now, simulate a response after a delay
      responseStartTimeRef.current = Date.now();
      abortControllerRef.current = new AbortController();
      
      // Add terminal log for API call
      addTerminalLog(`Sending request to ${currentModel}...`, "info");
      
      // Simulate API delay (1-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Check if request was aborted during the wait
      if (abortControllerRef.current.signal.aborted) {
        return;
      }
      
      // Generate a simulated response
      const aiResponse = `Thank you for your message: "${message.trim()}"\n\n${getSimulatedResponse(message.trim())}`;
      
      // Start streaming the response
      messageContentRef.current = aiResponse;
      setIsLoading(false);
      setIsStreaming(true);
      setStreamingText('');
      
    } catch (error) {
      // Handle errors
      setIsLoading(false);
      setIsStreaming(false);
      
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastIndex = updatedMessages.length - 1;
        
        if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant' && updatedMessages[lastIndex].streaming) {
          updatedMessages[lastIndex] = {
            role: 'system',
            content: `Error: ${error.message || 'Failed to generate response'}`,
            timestamp: new Date().toISOString()
          };
        }
        
        return updatedMessages;
      });
      
      addTerminalLog(`Error: ${error.message || 'Failed to generate response'}`, "error");
    }
  };

  // Helper function to generate simulated responses
  const getSimulatedResponse = (prompt) => {
    // For demo purposes only - in a real app this would come from an API
    const responses = [
      "I'd be happy to help you with that. Let me provide some information that might be useful...",
      "That's an interesting question. Here's what I know about the topic...",
      "Great question! Here's my analysis based on the available information...",
      "I understand you're asking about this topic. Let me break this down for you...",
      "Thanks for bringing this up. Let me share some insights that might help..."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)] + 
      "\n\nIs there anything specific about this you'd like me to elaborate on?";
  };

  // Copy message content to clipboard
  const copyToClipboard = (content, id) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(id);
      addTerminalLog("Message copied to clipboard", "info");
      
      // Reset copied status after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    }).catch(err => {
      addTerminalLog(`Failed to copy: ${err}`, "error");
    });
  };

  // Get appropriate sender color based on role and theme
  const getSenderColor = (role) => {
    if (isDarkMode) {
      // Dark mode colors
      switch (role) {
        case 'user': return 'text-blue-300';
        case 'assistant': return 'text-green-300';
        case 'system': return 'text-red-300';
        default: return 'text-gray-300';
      }
    } else {
      // Light mode colors
      switch (role) {
        case 'user': return 'text-blue-700 dark:text-blue-400 text-shadow-sm font-bold';
        case 'assistant': return 'text-green-700 dark:text-green-400 text-shadow-sm font-bold';
        case 'system': return 'text-red-700 dark:text-red-400 text-shadow-sm font-bold';
        default: return 'text-gray-700 dark:text-gray-400 text-shadow-sm font-bold';
      }
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  const startEditing = (index) => {
    setEditingMessageIndex(index);
    setEditingContent(messages[index].content);
  };

  const saveEdit = () => {
    if (editingMessageIndex === null) return;
    
    setMessages(prevMessages => {
      const newMessages = [...prevMessages];
      if (newMessages[editingMessageIndex]) {
        newMessages[editingIndex] = {
          ...newMessages[editingIndex],
          content: editingContent,
          isEdited: true
        };
        
        // Log the edit in the terminal
        addTerminalLog(`User edited a message`, "info");
        
        // If regenerating a response after this edited message is needed,
        // you could add that logic here
        
        return newMessages;
      }
      
      return prevMessages;
    });
    
    setEditingMessageIndex(null);
    setEditingContent('');
  };

  const cancelEditing = () => {
    setEditingMessageIndex(null);
    setEditingContent('');
  };

  // Get model display name
  const getModelDisplayName = (model, customName) => {
    const modelDisplayNames = {
      'claude-3-7-sonnet': 'Claude 3.7 Sonnet',
      'claude-3-opus': 'Claude 3 Opus',
      'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
      'claude-3-haiku': 'Claude 3 Haiku',
      'llama-3.3-70b-versatile': 'Llama 3.3 70B',
      'gemini-2.0-flash': 'Gemini 2.0 Flash',
      'gpt-4o': 'GPT-4o',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'custom': customName || 'Custom Model'
    };
    
    return model === 'custom' ? modelDisplayNames.custom : (modelDisplayNames[model] || model);
  };

  // Return early if not mounted to prevent hydration issues
  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Chat messages area - scrollable with dynamic padding for terminal */}
      <div className={`flex-grow overflow-y-auto ${terminalOpen ? 'pb-72' : 'pb-24'} transition-all duration-300`}>
        <div className="px-4 py-4 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="text-center py-10">
              <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Welcome to AI Chat
              </h2>
              {isTemporaryChat ? (
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Start a temporary chat with the AI assistant below. This chat will not be saved.
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Start a conversation with the AI assistant below.
                </p>
              )}
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Current model: <span className="font-medium">{currentModel}</span>
              </p>
            </div>
          )}
          
          {/* Chat messages */}
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-3xl rounded-lg ${
                msg.role === 'user' ? 'dark:bg-gray-800 border dark:border-gray-700 dark:text-white bg-white border border-gray-200 text-black ' : 
                msg.role === 'system' ? 'dark:bg-red-900/30 dark:border dark:border-red-700/50 dark:text-white bg-red-100 border border-red-200 text-black' : 
                'dark:bg-gray-800 border dark:border-gray-700 dark:text-white bg-white border border-gray-200 text-black '
              } p-4 relative group`}>
                {/* Message header with model info */}
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className={`font-medium ${getSenderColor(msg.role)}`}>
                    {msg.role === 'user' ? 'You' : 
                     msg.role === 'assistant' ? (msg.model || currentModel) : 
                     'System'}
                  </div>
                  
                  {/* Copy button - only for assistant messages */}
                  {msg.role === 'assistant' && (
                    <button 
                      onClick={() => copyToClipboard(msg.content, index)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-700 dark:hover:bg-gray-700`}
                      aria-label="Copy message"
                    >
                      {copiedMessageId === index ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 dark:text-gray-400 text-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Message content */}
                <div className={`pblue ${isDarkMode ? 'pblue-invert' : ''} max-w-none`}>
                  {/* Streaming content */}
                  {msg.role === 'assistant' && msg.streaming && index === messages.length - 1 ? (
                    <div>
                      {streamingText}
                      <span className="animate-pulse">▌</span>
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  )}
                </div>
                
                {/* Message footer with metadata */}
                {msg.timestamp && (
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      {msg.isEdited && (
                        <span className="mr-2 italic">edited</span>
                      )}
                    </div>
                    <div>
                      {(msg.role === 'assistant' || msg.role === 'user') && msg.tokens && (
                        <span className="mr-2">{msg.tokens} tokens</span>
                      )}
                      {msg.role === 'assistant' && msg.responseTime && (
                        <span className="mr-2">{(msg.responseTime/1000).toFixed(1)}s</span>
                      )}
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className={`max-w-3xl rounded-lg p-4 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-200'
              }`}>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {/* Message input area - fixed at bottom with better positioning for terminal */}
      <div className={`p-4 bottom-0 left-0 right-0 z-10 ${terminalOpen ? 'mb-64' : 'mb-0'} transition-all duration-300`}>
        <div className="max-w-4xl mx-auto flex items-end">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={isLoading || isStreaming ? "AI is responding..." : "Type your message here..."}
            className={`flex-grow resize-none p-3 rounded-l-lg h-20 dark:bg-gray-700 border dark:border-gray-600 dark:text-gray-200 bg-white border border-gray-300 text-gray-800 focus:ring-transparent focus:border-transparent`}
            rows="2"
            disabled={isLoading || isStreaming}
          ></textarea>
          <button
            onClick={handleSubmit}
            disabled={!message.trim() && !isLoading && !isStreaming}
            className={`p-3 rounded-r-lg h-20 ${
              !message.trim() && !isLoading && !isStreaming
                ? 'bg-blue-400 cursor-not-allowed' 
                : isLoading || isStreaming
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors`}
          >
            {isLoading || isStreaming ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12"></rect>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
        <div className="max-w-4xl mx-auto text-xs dark:text-gray-500 text-gray-400 mt-1 pl-1">
          {isLoading || isStreaming ? (
            <span>Click the stop button to cancel the response</span>
          ) : (
            <span>Press Ctrl+Enter to send</span>
          )}
          {isTemporaryChat && (
            <span className="ml-2 text-amber-500">• Temporary chat (not saved)</span>
          )}
        </div>
      </div>

    </div>
  );
}