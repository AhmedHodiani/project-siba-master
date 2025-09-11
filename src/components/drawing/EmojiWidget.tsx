import React, { useState } from 'react';
import { EmojiObject } from '../../lib/types/drawing';
import './EmojiWidget.css';

interface EmojiWidgetProps {
  emoji: EmojiObject;
  isSelected: boolean;
  zoom: number;
  onUpdate: (id: string, updates: Partial<EmojiObject>) => void;
  onSelect: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, id: string) => void;
  onStartDrag?: (e: React.MouseEvent, id: string) => void;
}

type ResizeHandle = 'se' | 's' | 'e' | null;

export const EmojiWidget: React.FC<EmojiWidgetProps> = ({
  emoji,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = emoji.width;
    const startHeight = emoji.height;
    
    const handleResizeMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (handle === 'se') {
        newWidth = Math.max(20, startWidth + deltaX);
        newHeight = Math.max(20, startHeight + deltaY);
      } else if (handle === 's') {
        newHeight = Math.max(20, startHeight + deltaY);
      } else if (handle === 'e') {
        newWidth = Math.max(20, startWidth + deltaX);
      }

      onUpdate(emoji.id, {
        width: newWidth,
        height: newHeight
      });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      return;
    }
    
    if (!isResizing) {
      onSelect(emoji.id);
      
      if (onStartDrag) {
        onStartDrag(e, emoji.id);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      return;
    }
    
    if (!isResizing) {
      e.stopPropagation();
      onSelect(emoji.id);
      // Left click shows the emoji picker (properties panel)
      // The selection will trigger the properties panel in DrawingCanvas
    }
  };

  const handleContextMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, emoji.id);
  };

  // Calculate font size based on widget dimensions
  const fontSize = Math.min(emoji.width * 0.8, emoji.height * 0.8);

  return (
    <div
      className={`emoji-widget ${isSelected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        width: `${emoji.width}px`,
        height: `${emoji.height}px`,
        zIndex: emoji.zIndex
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={handleContextMenuClick}
    >
      <div className="emoji-content">
        <span
          className="emoji-display"
          style={{
            fontSize: `${fontSize}px`
          }}
        >
          {emoji.emoji}
        </span>
      </div>

      {/* Resize handles when selected */}
      {isSelected && (
        <>
          <div 
            className="resize-handle resize-handle-se" 
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          <div 
            className="resize-handle resize-handle-s" 
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div 
            className="resize-handle resize-handle-e" 
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  );
};
