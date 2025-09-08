import React, { useState, useRef, useEffect } from 'react';
import { StickyNoteObject } from '../../lib/types/drawing';
import './StickyNoteWidget.css';

interface StickyNoteWidgetProps {
  note: StickyNoteObject;
  isSelected: boolean;
  zoom: number;
  onUpdate: (id: string, updates: Partial<StickyNoteObject>) => void;
  onSelect: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, id: string) => void;
  onStartDrag?: (e: React.MouseEvent, id: string) => void;
}

type ResizeHandle = 'se' | 's' | 'e' | null;

export const StickyNoteWidget: React.FC<StickyNoteWidgetProps> = ({
  note,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(note.text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (editText !== note.text) {
      onUpdate(note.id, { text: editText });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      setIsEditing(false);
      if (editText !== note.text) {
        onUpdate(note.id, { text: editText });
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(note.text);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('Widget mousedown, target:', e.target);
    // Check if this is a resize handle click
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      console.log('Resize handle detected in widget');
      return; // Let resize handles handle their own events
    }
    
    if (!isEditing && !isResizing) {
      // Select the note first
      onSelect(note.id);
      
      // If we have a drag handler, prepare for dragging
      if (onStartDrag) {
        onStartDrag(e, note.id);
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    console.log('=== RESIZE START ===', handle, e.target);
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = note.width;
    const startHeight = note.height;
    
    const handleResizeMove = (moveEvent: MouseEvent) => {
      console.log('Resize move', handle);
      
      // Calculate delta in screen coordinates, then adjust for zoom
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;

      let newWidth = startWidth;
      let newHeight = startHeight;

      // Calculate new dimensions based on handle
      if (handle === 'se') {
        newWidth = Math.max(100, startWidth + deltaX);
        newHeight = Math.max(100, startHeight + deltaY);
      } else if (handle === 's') {
        newHeight = Math.max(100, startHeight + deltaY);
      } else if (handle === 'e') {
        newWidth = Math.max(100, startWidth + deltaX);
      }

      // Update the note dimensions
      onUpdate(note.id, {
        width: newWidth,
        height: newHeight
      });
    };

    const handleResizeEnd = () => {
      console.log('Resize end');
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Check if this is a resize handle click
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      return; // Let resize handles handle their own events
    }
    
    if (!isEditing && !isResizing) {
      e.stopPropagation();
      onSelect(note.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, note.id);
  };

  return (
    <div
      className={`sticky-note-widget ${isSelected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        width: `${note.width}px`,
        height: `${note.height}px`,
        backgroundColor: note.paperColor,
        borderColor: isSelected ? '#007acc' : '#ddd',
        boxShadow: isSelected ? '0 0 10px rgba(0, 122, 204, 0.5)' : '2px 2px 8px rgba(0, 0, 0, 0.2)',
        zIndex: note.zIndex
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Sticky note paper effect */}
      <div className="sticky-note-paper">
        {/* Folded corner effect */}
        <div 
          className="sticky-note-corner"
          style={{ borderBottomColor: note.paperColor }}
        />
        
        {/* Text content */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="sticky-note-textarea"
            value={editText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            style={{
              color: note.fontColor,
              fontSize: `${note.fontSize}px`,
              backgroundColor: 'transparent',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
            placeholder="Type your note..."
          />
        ) : (
          <div
            className="sticky-note-text"
            style={{
              color: note.fontColor,
              fontSize: `${note.fontSize}px`,
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
          >
            {note.text || 'Double-click to edit'}
          </div>
        )}
        
        {/* Resize handles when selected */}
        {isSelected && !isEditing && (
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
    </div>
  );
};
