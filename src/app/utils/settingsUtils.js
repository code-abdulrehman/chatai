/**
 * Save settings to localStorage
 */
export function saveSettings(settings) {
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && value !== null) {
        localStorage.setItem(key, value);
      }
    }
    
    // Also save the whole settings object as JSON for easier retrieval
    localStorage.setItem('settings', JSON.stringify(settings));
    
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Get all settings from localStorage
 */
export function getSettings() {
  try {
    // Try to get the complete settings object first
    const settingsJson = localStorage.getItem('settings');
    if (settingsJson) {
      try {
        return JSON.parse(settingsJson);
      } catch (e) {
        console.error("Failed to parse settings JSON:", e);
      }
    }
    
    // Fallback to individual settings
    return {
      apiKey: localStorage.getItem('apiKey'),
      systemMessage: localStorage.getItem('systemMessage') || 'You are a helpful assistant.',
      model: localStorage.getItem('model') || 'gpt-3.5-turbo',
      temperature: parseFloat(localStorage.getItem('temperature') || '0.7'),
      maxTokens: parseInt(localStorage.getItem('maxTokens') || '1024', 10),
      customApiUrl: localStorage.getItem('customApiUrl') || '',
      customModelName: localStorage.getItem('customModelName') || ''
    };
  } catch (error) {
    console.error("Error retrieving settings:", error);
    return {
      systemMessage: 'You are a helpful assistant.',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1024
    };
  }
} 