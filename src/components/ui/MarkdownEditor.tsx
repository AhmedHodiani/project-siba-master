import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
  preview?: 'edit' | 'preview' | 'live';
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing with **Markdown** support...",
  disabled = false,
  height = 200,
  preview = 'edit',
}) => {
  const [showPreview, setShowPreview] = useState(false);

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
          <div className="markdown-editor-preview">
            {value ? (
              <MarkdownRenderer style={{ padding: '16px' }} content={value} />
            ) : (
              <div style={{ color: '#888', padding: '16px' }}>Nothing to preview...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;