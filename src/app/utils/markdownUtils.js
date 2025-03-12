/**
 * Simple function to convert markdown to HTML
 * This is a basic implementation - for production,
 * consider using a proper markdown library like marked or remark
 */
export function renderMarkdown(text) {
  if (!text) return '';
  
  try {
    // Convert basic markdown elements to HTML
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Code blocks
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      
      // Lists
      .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
      
      // Fix for multiple lists
      .replace(/<\/ul><ul>/gim, '')
      
      // Paragraphs
      .replace(/\n\s*\n/gim, '</p><p>')
      
      // Line breaks
      .replace(/\n/gim, '<br>');
      
    // Wrap in paragraph tags if not already
    if (!html.startsWith('<h') && !html.startsWith('<p')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return text; // Return the original text if there's an error
  }
}
