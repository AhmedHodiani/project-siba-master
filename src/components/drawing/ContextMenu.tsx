import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  isVisible: boolean;
  onClose: () => void;
  onDelete: () => void;
  objectType?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isVisible,
  onClose,
  onDelete,
  objectType = 'object'
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  // Get user-friendly object type name
  const getObjectTypeName = (type: string) => {
    switch (type) {
      case 'flashcard': return 'Flashcard';
      case 'rectangle': return 'Rectangle';
      case 'circle': return 'Circle';
      case 'line': return 'Line';
      case 'text': return 'Text';
      case 'freehand': return 'Freehand Drawing';
      case 'translation': return 'Translation Widget';
      default: return 'Object';
    }
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="context-menu-item" onClick={handleDelete}>
        <span className="context-menu-icon">🗑️</span>
        <span>Delete {getObjectTypeName(objectType)}</span>
      </div>
    </div>
  );
};
