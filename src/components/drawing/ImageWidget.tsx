import React, { useState, useRef } from 'react';
import { ImageObject } from '../../lib/types/drawing';
import './ImageWidget.css';

interface ImageWidgetProps {
  image: ImageObject;
  isSelected: boolean;
  zoom: number;
  onUpdate: (id: string, updates: Partial<ImageObject>) => void;
  onSelect: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, id: string) => void;
  onStartDrag?: (e: React.MouseEvent, id: string) => void;
  getImageUrl?: (fileName: string) => string;
}

type ResizeHandle = 'se' | 's' | 'e' | null;

export const ImageWidget: React.FC<ImageWidgetProps> = ({
  image,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag,
  getImageUrl,
}) => {
  const [isCropping, setIsCropping] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);

  const imageRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCropping(!isCropping);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if this is a resize handle click
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      return; // Let resize handles handle their own events
    }
    
    if (!isCropping && !isResizing) {
      // Select the image first
      onSelect(image.id);
      
      // If we have a drag handler, prepare for dragging
      if (onStartDrag) {
        onStartDrag(e, image.id);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Check if this is a resize handle click
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      return; // Let resize handles handle their own events
    }
    
    if (!isCropping && !isResizing) {
      e.stopPropagation();
      onSelect(image.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, image.id);
  };

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = image.width;
    const startHeight = image.height;
    
    // Store the final dimensions in the closure
    let finalWidth = startWidth;
    let finalHeight = startHeight;
    
    const handleResizeMove = (moveEvent: MouseEvent) => {
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

      // Update the image dimensions immediately (like sticky note does)
      onUpdate(image.id, {
        width: newWidth,
        height: newHeight
      });
    };

    const handleResizeEnd = () => {
      // Clean up resize state (no need to call onUpdate again, it's already updated)
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Get image URL from PocketBase
  const imageUrl = image.fileName && getImageUrl ? getImageUrl(image.fileName) : '';

  return (
    <div
      className={`image-widget ${isSelected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        width: `${image.width}px`,
        height: `${image.height}px`,
        boxShadow: isSelected ? '0 0 10px rgba(0, 122, 204, 0.5)' : '2px 2px 8px rgba(0, 0, 0, 0.2)',
        zIndex: image.zIndex
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Image content */}
      <div 
        className="image-content"
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Resize handles when selected */}
      {isSelected && !isCropping && (
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

export default ImageWidget;
