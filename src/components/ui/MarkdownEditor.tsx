import React, { useState } from 'react';
// import MDEditor from '@uiw/react-md-editor';
// import '@uiw/react-md-editor/markdown-editor.css';
// import '@uiw/react-markdown-preview/markdown.css';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
  preview?: 'edit' | 'preview' | 'live';
}

// Temporary fallback component while we fix the MDEditor import
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing with **Markdown** support...",
  disabled = false,
  height = 200,
  preview = 'edit',
}) => {
  const [showPreview, setShowPreview] = useState(false);

  // Simple markdown to HTML converter for preview
  const markdownToHtml = (markdown: string) => {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className={`markdown-editor-wrapper ${disabled ? 'disabled' : ''}`}>
      {/* Tabs */}
      <div className="markdown-tabs">
        <button
          type="button"
          className={!showPreview ? 'active' : ''}
          onClick={() => setShowPreview(false)}
          disabled={disabled}
        >
          ✏️ Edit
        </button>
        <button
          type="button"
          className={showPreview ? 'active' : ''}
          onClick={() => setShowPreview(true)}
          disabled={disabled}
        >
          👁️ Preview
        </button>
      </div>

      {/* Content */}
      <div className="markdown-content" style={{ height }}>
        {!showPreview ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="markdown-textarea"
            style={{
              height: '100%',
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: '#f0f0f0',
              fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
              fontSize: '14px',
              lineHeight: '1.6',
              padding: '16px',
              resize: 'none',
              outline: 'none',
            }}
          />
        ) : (
          <div
            className="markdown-preview"
            style={{
              height: '100%',
              padding: '16px',
              overflow: 'auto',
              color: '#f0f0f0',
              fontSize: '14px',
              lineHeight: '1.6',
            }}
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(value) || '<em style="color: #888;">Nothing to preview...</em>'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;