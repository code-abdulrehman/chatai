"use client"

import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({
    model: 'claude-3-7-sonnet',
    customModelName: '',
    temperature: 0.7,
    maxTokens: 1000,
    apiKey: '',
    systemMessage: ''
  });
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Common system message templates
  const systemMessageTemplates = [
    { name: "Default Assistant", 
      text: "You are a helpful, harmless, and honest AI assistant." },
    { name: "Helpful Expert", 
      text: "You are an expert assistant with deep knowledge in various fields. Provide detailed, accurate, and helpful responses." },
    { name: "Creative Writer", 
      text: "You are a creative assistant skilled in writing, storytelling, and generating imaginative content." },
    { name: "Technical Consultant", 
      text: "You are a technical consultant with expertise in programming, software development, and computer science." },
    { name: "Educational Tutor", 
      text: "You are an educational tutor focused on explaining concepts clearly and helping users learn new subjects." },
    { name: "Business Advisor", 
      text: "You are a business advisor with experience in strategy, management, marketing, and finance." }
  ];

  useEffect(() => {
    setIsMounted(true);
    
    // Check for dark mode
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    }
    
    // Load settings from localStorage on component mount
    const savedSettings = localStorage.getItem('aiApiSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({
          ...parsedSettings,
          systemMessage: parsedSettings.systemMessage || ''
        });
      } catch (error) {
        console.error("Error parsing saved settings:", error);
      }
    }
    
    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDarkNow = document.documentElement.classList.contains('dark');
          setIsDarkMode(isDarkNow);
        }
      });
    });
    
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
    }
  }, []);

  // Don't render anything server-side to prevent hydration issues
  if (!isMounted) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle numeric values
    if (type === 'number' || type === 'range') {
      setSettings({
        ...settings,
        [name]: parseFloat(value)
      });
    } else {
      setSettings({
        ...settings,
        [name]: value
      });
    }
  };

  const applySystemTemplate = (template) => {
    setSettings({
      ...settings,
      systemMessage: template
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save settings to localStorage
    localStorage.setItem('aiApiSettings', JSON.stringify(settings));
    onClose();
    
    // Force page reload to apply settings
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Settings</h2>
            <button 
              onClick={onClose}
              className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  AI Model
                </label>
                <select
                  name="model"
                  value={settings.model}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="custom">Custom</option>
                </select>
                
                {settings.model === 'custom' && (
                  <input
                    type="text"
                    name="customModelName"
                    value={settings.customModelName}
                    onChange={handleChange}
                    placeholder="Enter custom model name"
                    className={`w-full p-2 mt-2 border rounded-md ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                )}
              </div>
              
              {/* System Message */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  System Message
                </label>
                <div className="mb-2">
                  <textarea
                    name="systemMessage"
                    value={settings.systemMessage}
                    onChange={handleChange}
                    placeholder="Set a custom system message to control how the AI responds"
                    rows={4}
                    className={`w-full p-2 border rounded-md ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                {/* System message templates */}
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">
                    Quick Templates
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {systemMessageTemplates.map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applySystemTemplate(template.text)}
                        className={`px-2 py-1 text-xs rounded ${
                          isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }`}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Temperature */}
              <div>
                <div className="flex justify-between">
                  <label className="block text-sm font-medium">
                    Temperature: {settings.temperature.toFixed(1)}
                  </label>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {settings.temperature < 0.3 ? 'More focused' : 
                     settings.temperature > 0.7 ? 'More creative' : 'Balanced'}
                  </span>
                </div>
                <input
                  type="range"
                  name="temperature"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={handleChange}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer mt-2 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                />
              </div>
              
              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Response Length: {settings.maxTokens} tokens
                </label>
                <input
                  type="range"
                  name="maxTokens"
                  min="100"
                  max="4000"
                  step="100"
                  value={settings.maxTokens}
                  onChange={handleChange}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                />
                <div className={`flex justify-between mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span>Shorter</span>
                  <span>Longer</span>
                </div>
              </div>
              
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  API Key (Optional)
                </label>
                <input
                  type="password"
                  name="apiKey"
                  value={settings.apiKey}
                  onChange={handleChange}
                  placeholder="Enter your API key"
                  className={`w-full p-2 border rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  For demo purposes, the API key is not required. In a production app, this would be needed.
                </p>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-md ${
                  isDarkMode 
                    ? 'border border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
