"use client"

import { useState, useEffect } from 'react';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import ConversationSidebar from './components/ConversationSidebar';
import SettingsModal from './components/SettingsModal';
import Terminal from './components/Terminal';
import "./globals.css";

function Page() {
  // Use null as initial state for windowWidth to avoid hydration mismatch
  const [windowWidth, setWindowWidth] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  
  // Client-side initialization - prevents hydration mismatches
  useEffect(() => {
    setIsMounted(true);
    setWindowWidth(window.innerWidth);
    
    // Window resize handler
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Load conversations from localStorage - moved to useEffect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConversations = localStorage.getItem('chatConversations');
      if (savedConversations) {
        try {
          const parsedConversations = JSON.parse(savedConversations);
          setConversations(parsedConversations);
          
          // If there are conversations and no active one, set the first one as active
          if (parsedConversations.length > 0 && !activeConversationId && !isTemporaryChat) {
            setActiveConversationId(parsedConversations[0].id);
            setChatMessages(parsedConversations[0].messages);
          }
        } catch (error) {
          console.error("Error parsing saved conversations:", error);
        }
      }
    }
  }, [isMounted]);

  // Save conversations to localStorage when they change
  useEffect(() => {
    if (isMounted && conversations.length > 0) {
      localStorage.setItem('chatConversations', JSON.stringify(conversations));
    }
  }, [conversations, isMounted]);

  // Update active conversation when messages change
  useEffect(() => {
    if (!isMounted || isTemporaryChat || !activeConversationId) return;
    
    const updatedConversations = conversations.map(conversation => {
      if (conversation.id === activeConversationId) {
        return {
          ...conversation,
          messages: chatMessages,
          lastUpdated: new Date().toISOString()
        };
      }
      return conversation;
    });
    
    if (JSON.stringify(updatedConversations) !== JSON.stringify(conversations)) {
      setConversations(updatedConversations);
    }
  }, [chatMessages, activeConversationId, isMounted]);

  const toggleSettingsModal = () => {
    setIsSettingsModalOpen(!isSettingsModalOpen);
  };

  const startNewConversation = () => {
    if (isTemporaryChat) {
      // End temporary chat mode first
      setIsTemporaryChat(false);
    }
    
    const newConversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setChatMessages([]);
    
    addTerminalLog("Started new conversation");
  };

  const selectConversation = (conversationId) => {
    if (isTemporaryChat) {
      // End temporary chat mode
      setIsTemporaryChat(false);
    }
    
    const selectedConversation = conversations.find(conv => conv.id === conversationId);
    if (selectedConversation) {
      setActiveConversationId(conversationId);
      setChatMessages(selectedConversation.messages);
      
      addTerminalLog(`Switched to conversation: ${selectedConversation.title}`);
    }
  };

  const startTemporaryChat = () => {
    setIsTemporaryChat(true);
    setActiveConversationId(null);
    setChatMessages([]);
    
    addTerminalLog("Started temporary chat (not saved)");
  };

  const endTemporaryChat = () => {
    setIsTemporaryChat(false);
    
    if (conversations.length > 0) {
      // Return to the last active conversation
      setActiveConversationId(conversations[0].id);
      setChatMessages(conversations[0].messages);
    } else {
      // Start a new conversation if none exists
      startNewConversation();
    }
    
    addTerminalLog("Ended temporary chat mode");
  };

  const deleteConversation = (conversationId) => {
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.filter(conv => conv.id !== conversationId);
      
      // If the deleted conversation was active, set a new active conversation
      if (conversationId === activeConversationId) {
        if (updatedConversations.length > 0) {
          setActiveConversationId(updatedConversations[0].id);
          setChatMessages(updatedConversations[0].messages);
        } else {
          setActiveConversationId(null);
          setChatMessages([]);
          setIsTemporaryChat(true);
        }
      }
      
      return updatedConversations;
    });
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const toggleTerminal = () => {
    setTerminalOpen(prev => !prev);
  };

  const addTerminalLog = (content, type = "message") => {
    setTerminalLogs(prev => [...prev, {
      content,
      type,
      timestamp: new Date().toISOString()
    }]);
  };

  // Add initial terminal logs
  useEffect(() => {
    if (!isMounted) return;
    
    // Clear any existing logs and start fresh
    setTerminalLogs([{
      content: "System initialized. Ready for input.",
      type: "message",
      timestamp: new Date().toISOString()
    }]);
    
    // Wait 1 second and add another log
    const timer1 = setTimeout(() => {
      addTerminalLog("AI models loaded successfully.", "message");
    }, 1000);
    
    // Wait 2 seconds and add another log
    const timer2 = setTimeout(() => {
      addTerminalLog("Connected to API servers.", "message");
    }, 2000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isMounted]);

  // Don't render anything server-side or until client is mounted
  if (!isMounted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white text-gray-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className={`transition-[width] duration-300 ${sidebarOpen ? 'tranblue-x-0' : '-tranblue-x-full'} ${isTemporaryChat ? 'opacity-50 pointer-events-none' : ''}`}>
            <ConversationSidebar 
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={selectConversation}
              onNewConversation={startNewConversation}
              onDeleteConversation={deleteConversation}
              isTemporaryChat={isTemporaryChat}
            />
          </div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden transition-[width] duration-300  dark:bg-gray-900 dark:text-white text-gray-900 bg-white">
          <Header 
            onOpenSettings={toggleSettingsModal} 
            onTemporaryChat={startTemporaryChat}
            onEndTemporaryChat={endTemporaryChat}
            onNewConversation={startNewConversation}
            isTemporaryChat={isTemporaryChat}
            onToggleSidebar={toggleSidebar}
            onToggleTerminal={toggleTerminal}
            isMobile={windowWidth < 768}
          />
          <div className="flex-grow overflow-hidden p-4 dark:bg-gray-900 dark:text-white text-gray-900 bg-white">
            <ChatInterface 
              messages={chatMessages}
              setMessages={setChatMessages}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              isTemporaryChat={isTemporaryChat}
              addTerminalLog={addTerminalLog}
              terminalOpen={terminalOpen}
            />
          </div>
        </div>
      </div>
      
      {/* Terminal Panel */}
      <Terminal 
        logs={terminalLogs}
        isOpen={terminalOpen}
        setIsOpen={setTerminalOpen}
      />
      
      {isSettingsModalOpen && <SettingsModal onClose={toggleSettingsModal} />}
    </div>
  );
}

export default Page;