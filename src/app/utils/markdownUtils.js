/**
 * Simple function to convert markdown to HTML
 * This version prevents raw HTML injection by escaping HTML in non-code parts.
 * For production, consider using a robust markdown library.
 */
export function renderMarkdown(text) {
  if (!text) return '';

  // Helper function to escape HTML characters
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  try {
    // Extract code blocks and replace them with a placeholder
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const codeBlocks = [];
    text = text.replace(codeBlockRegex, (match, p1) => {
      codeBlocks.push(p1);
      return "%%CODEBLOCK%%";
    });

    // Escape HTML in the non-code part of the text
    let escapedText = escapeHtml(text);

    // Process markdown on the escaped text
    let html = escapedText
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Inline code
      .replace(/`(.*?)`/gim, "<code>$1</code>")
      // Lists
      .replace(/^\* (.*$)/gim, "<ul><li>$1</li></ul>")
      .replace(/^- (.*$)/gim, "<ul><li>$1</li></ul>")
      .replace(/<\/ul><ul>/gim, "")
      // Paragraphs
      .replace(/\n\s*\n/gim, "</p><p>")
      // Line breaks
      .replace(/\n/gim, "<br>");

    // Reinsert code blocks (escape their content for safety)
    let codeBlockIndex = 0;
    html = html.replace(/%%CODEBLOCK%%/g, () => {
      const codeContent = codeBlocks[codeBlockIndex++];
      return `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
    });

    // Wrap output in <p> tags if it doesn't start with a header or paragraph
    if (!html.startsWith("<h") && !html.startsWith("<p")) {
      html = `<p>${html}</p>`;
    }

    return html;
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return text; // Return the original text if there's an error
  }
}

