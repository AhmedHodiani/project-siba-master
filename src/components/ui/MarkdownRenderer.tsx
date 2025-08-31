import React from 'react';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string | undefined | null;
  className?: string;
  style?: React.CSSProperties;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  style = {},
}) => {
  // Simple markdown parser that doesn't rely on external libraries
  const parseMarkdown = (content: string | undefined | null): string => {
    if (!content || typeof content !== 'string') {
      return '';
    }

    try {
      let html = content
        // Escape HTML first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        
        // Code blocks (must come before inline code)
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        
        // Inline code (backticks and quotes)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/"([^"]+)"/g, '<code>$1</code>')
        
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        
        // Blockquotes
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        
        // Lists - handle multiple items properly
        .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>(\n|<br>)*)+/gs, (match) => `<ul>${match.replace(/<br>/g, '')}</ul>`)
        
        // Line breaks
        .replace(/\n/g, '<br>');

      return html;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      // Fallback to simple line breaks
      return content.replace(/\n/g, '<br>');
    }
  };

  return (
    <div 
      className={`markdown-renderer ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ 
        __html: parseMarkdown(content)
      }}
    />
  );
};

export default MarkdownRenderer;