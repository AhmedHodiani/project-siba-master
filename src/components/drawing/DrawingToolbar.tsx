import React from 'react';
import { ToolType } from '../../lib/types/drawing';
import './DrawingToolbar.css';

interface DrawingToolbarProps {
  selectedTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  selectedTool,
  onToolSelect
}) => {
  const tools: { type: ToolType; label: string; icon: string; shortcut?: string }[] = [
    { type: 'select', label: 'Select', icon: '↖', shortcut: 'ESC' },
    { type: 'freehand', label: 'Freehand', icon: '✏️', shortcut: 'F' },
    { type: 'flashcard', label: 'Flashcard', icon: '📇' },
    { type: 'translation', label: 'Translation', icon: '🌐' },
    { type: 'sticky-note', label: 'Sticky Note', icon: '📝', shortcut: 'S' },
    { type: 'image', label: 'Image', icon: '🖼️', shortcut: 'I' }
  ];

  return (
    <div className="drawing-toolbar">
      <div className="toolbar-title">Drawing Tools</div>
      <div className="toolbar-tools">
        {tools.map(tool => (
          <button
            key={tool.type}
            className={`tool-button ${selectedTool === tool.type ? 'active' : ''}`}
            onClick={() => onToolSelect(tool.type)}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
            {tool.shortcut && (
              <span className="tool-shortcut">{tool.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
