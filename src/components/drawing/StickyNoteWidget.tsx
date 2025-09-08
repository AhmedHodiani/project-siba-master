import React, { useState, useRef, useEffect } from 'react';
import { StickyNoteObject } from '../../lib/types/drawing';
import './StickyNoteWidget.css';

interface StickyNoteWidgetProps {
  note: StickyNoteObject;
  isSelected: boolean;
  zoom: number;
  onUpdate: (id: string, updates: Partial<StickyNoteObject>) => void;
  onSelect: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, objectId: string) => void;
}

export const StickyNoteWidget: React.FC<StickyNoteWidgetProps> = ({
  note,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(note.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, note.id);
  };

  return (
    <div
      className={`sticky-note-widget ${isSelected ? 'selected' : ''}`}
      style={{
        transform: `translate(${note.x}px, ${note.y}px)`,
        width: `${note.width}px`,
        height: `${note.height}px`,
        backgroundColor: note.paperColor,
        borderColor: isSelected ? '#007acc' : '#ddd',
        boxShadow: isSelected ? '0 0 10px rgba(0, 122, 204, 0.5)' : '2px 2px 8px rgba(0, 0, 0, 0.2)',
        zIndex: note.zIndex
      }}
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
            <div className="resize-handle resize-handle-se" />
            <div className="resize-handle resize-handle-s" />
            <div className="resize-handle resize-handle-e" />
          </>
        )}
      </div>
    </div>
  );
};
