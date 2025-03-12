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
  terminalOpen,
  onUpdateChatTitle
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
  const streamingCompleteCallback = useRef(null);
  const [autoTitleGenerated, setAutoTitleGenerated] = useState(false);

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
    let animationFrame;
    let startTime;
    
    const animateText = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      
      // Adjust speed based on content length (faster for longer content)
      const animationDuration = Math.min(
        5000, 
        Math.max(2000, messageContentRef.current.length * 15)
      );
      
      // Calculate how much of the text to show
      const progress = Math.min(elapsedTime / animationDuration, 1);
      const charactersToShow = Math.floor(messageContentRef.current.length * progress);
      
      // Update the displayed text
      setStreamingText(messageContentRef.current.substring(0, charactersToShow));
      
      // Continue animation or finish
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animateText);
      } else {
        setIsStreaming(false);
        // Call completion callback if defined
        if (streamingCompleteCallback.current) {
          streamingCompleteCallback.current();
          streamingCompleteCallback.current = null;
        }
      }
    };
    
    if (isStreaming) {
      startTime = null;
      animationFrame = requestAnimationFrame(animateText);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isStreaming]);

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
      // Replace the simulation with a real API call
      responseStartTimeRef.current = Date.now();
      abortControllerRef.current = new AbortController();
      
      // Add terminal log for API call
      addTerminalLog(`Sending request to ${currentModel}...`, "info");
      
      // Get settings from localStorage
      const settings = JSON.parse(localStorage.getItem('aiApiSettings') || '{}');
      const { apiKey, model, systemMessage, temperature, maxTokens, customApiUrl } = settings;
      
      // Make the actual API call
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          model: model || 'claude-3-7-sonnet',
          apiKey: apiKey || '',
          systemMessage: systemMessage || 'You are a helpful AI assistant.',
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 1024,
          customApiUrl: customApiUrl || ''
        }),
        signal: abortControllerRef.current.signal
      });
      
      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }
      
      // Handle non-success responses
      if (!response.ok) {
        let errorMessage = 'API request failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Error: ${response.status} ${response.statusText}`;
        } catch (e) {
          errorMessage = `Error: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse the successful response
      const data = await response.json();
      
      // Handle streaming and animation
      const responseContent = data.content || data.text || 'No response content received';
      messageContentRef.current = responseContent;
      setIsLoading(false);
      setIsStreaming(true);
      setStreamingText('');
      
      // Calculate response time
      const responseTime = Date.now() - responseStartTimeRef.current;
      
      // Update terminal with timing information
      addTerminalLog(`Response received in ${responseTime}s`, "success");
      
      // Extract token usage based on model type
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;

      if (data.usage) {
        // Standard OpenAI/Claude/Groq format
        promptTokens = data.usage.prompt_tokens || 0;
        completionTokens = data.usage.completion_tokens || 0;
        totalTokens = data.usage.total_tokens || (promptTokens + completionTokens);
      } else if (data.usageMetadata) {
        // Gemini format
        promptTokens = data.usageMetadata.promptTokenCount || 0;
        completionTokens = data.usageMetadata.candidatesTokenCount || 0;
        totalTokens = data.usageMetadata.totalTokenCount || 0;
      }

      // Update messages with model info
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastIndex = updatedMessages.length - 1;
        
        if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
          updatedMessages[lastIndex] = {
            ...updatedMessages[lastIndex],
            content: responseContent,
            streaming: false,
            model: data.model || currentModel,
            responseTime: responseTime,
            tokens: {
              prompt: promptTokens,
              completion: completionTokens,
              total: totalTokens
            }
          };
        }
        
        return updatedMessages;
      });

      // Update token counts
      if (promptTokens > 0 || completionTokens > 0) {
        updateSessionTokens(promptTokens, completionTokens);
        
        // Log token usage to terminal
        addTerminalLog(
          `Token usage: ${promptTokens} prompt + ${completionTokens} completion = ${totalTokens} total`, 
          "info"
        );
      }

      // When streaming animation completes, update metrics
      streamingCompleteCallback.current = () => {
        // Terminal metrics are handled through the Terminal component
        // which should pick up the token information from logs
        
        // Add extra terminal log with the complete metrics for the Terminal component to parse
        addTerminalLog(
          `METRICS_UPDATE|${promptTokens}|${completionTokens}|${totalTokens}|${responseTime}`, 
          "metrics"
        );
      };

      // Extract title from the first AI response if this is a new chat
      if (!autoTitleGenerated && messages.length <= 12) {
        // Only extract title from the first exchange
        try {
          // Get first 6-10 words for the title
          const contentText = responseContent.replace(/[*#`]/g, ''); // Remove markdown symbols
          const words = contentText.split(/\s+/);
          let title = words.slice(0, 8).join(' ').trim();
          
          // Add ellipsis if we truncated
          if (words.length > 8) {
            title += '...';
          }
          
          // Limit title length
          if (title.length > 60) {
            title = title.substring(0, 57) + '...';
          }
          
          // Mark as generated so we don't do it again for this chat
          setAutoTitleGenerated(true);
          
          // Call parent function to update the title
          if (typeof onUpdateChatTitle === 'function') {
            onUpdateChatTitle(title);
          }
          
          // Log the action
          addTerminalLog(`Auto-generated chat title: "${title}"`, "info");
        } catch (error) {
          console.error("Failed to generate chat title:", error);
        }
      }
    } catch (error) {
      // Enhanced error handling
      setIsLoading(false);
      setIsStreaming(false);
      // Determine if it's a network error (API not found)
      const errorMessage = error.name === 'TypeError' && error.message.includes('fetch') 
        ? 'API endpoint not found. Please check your connection or server status.'
        : `Error: ${error.message || 'Failed to generate response'}`;
      
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastIndex = updatedMessages.length - 1;
        
        if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant' && updatedMessages[lastIndex].streaming) {
          updatedMessages[lastIndex] = {
            role: 'system',
            content: errorMessage,
            timestamp: new Date().toISOString(),
            isError: true // Add flag to style error messages differently
          };
        } else {
          // Add a new system message with the error
          updatedMessages.push({
            role: 'system',
            content: errorMessage,
            timestamp: new Date().toISOString(),
            isError: true
          });
        }
        
        return updatedMessages;
      });
      
      addTerminalLog(errorMessage, "error");
    }
  };
  useEffect(() => {
    if (messages.length === 0) {
      setAutoTitleGenerated(false);
    }
  }, [messages]);
  

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
              className={`flex mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-3xl rounded-lg shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800' 
                  : msg.role === 'system' && msg.isError
                    ? 'bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800'
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
              } p-3 relative group hover:shadow-md transition-shadow duration-200`}>
                {/* Message header with model info */}
                <div className="flex items-center justify-between mb-2 text-xs border-b pb-2 dark:border-gray-700 border-gray-200">
                  <div className="flex items-center">
                    <span className={`font-medium pr-12 ${
                      msg.role === 'user' 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : msg.role === 'system' && msg.isError
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {msg.role === 'user' ? 'You' : 
                       msg.role === 'assistant' ? (msg.model || currentModel) : 
                       'System'}
                    </span>
                  </div>
                  
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                
                {/* Message content with markdown */}
                <div className="markdown-content prose dark:prose-invert prose-sm max-w-none">
                  {msg.role === 'assistant' && isStreaming && index === messages.length - 1 ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }} />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  )}
                  {msg.role === 'assistant' && isStreaming && index === messages.length - 1 && (
                    <span className="animate-pulse ml-1">▌</span>
                  )}
                {((isLoading && !isStreaming) && msg.role === 'assistant' && index === messages.length - 1  ) && (
                  <div className="flex items-center justify-center space-x-2 my-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                )}
                </div>
                
                {/* Message footer with metadata */}
                {msg.timestamp && (
                  <div className={`flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 ${(msg.role === 'system' || msg.role === 'user' ||msg.isError) ? 'border-0  mt-0 pt-0' : ' mt-3 pt-2 border-t dark:border-gray-700 border-gray-200 '}`}>
                    <div>
                      {msg.isEdited && (
                        <span className="italic">edited</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {msg.role === 'assistant' && msg.tokens && (
                        <span title="Number of tokens in this response">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {msg.tokens.completion} tokens
                        </span>
                      )}
                      
                      {msg.role === 'assistant' && msg.responseTime && (
                        <span title="Response time">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {(msg.responseTime / 1000).toFixed(1)}s
                        </span>
                      )}
                      
                      {/* Copy button - only for assistant messages */}
                      {msg.role === 'assistant' && (
                        <button 
                          onClick={() => copyToClipboard(msg.content, index)}
                          className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Copy to clipboard"
                        >
                          {copiedMessageId === index ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
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