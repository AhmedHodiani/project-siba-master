import React from 'react';
import { DrawingObject, Point } from '../../lib/types/drawing';
import { DrawingUtils } from '../../lib/services/drawing';

interface SelectionHandlesProps {
  object: DrawingObject;
  viewport: { x: number; y: number; zoom: number };
  onResize: (objectId: string, newBounds: { x: number; y: number; width?: number; height?: number; radius?: number }) => void;
  onMove: (objectId: string, newPosition: Point) => void;
}

export const SelectionHandles: React.FC<SelectionHandlesProps> = ({
  object,
  viewport,
  onResize,
  onMove
}) => {
  if (!object.selected) return null;

  const bounds = DrawingUtils.getBounds(object);
  const handleSize = 8 / viewport.zoom; // Scale handles with zoom
  const handleStroke = 2 / viewport.zoom;

  // Handle positions for different object types
  const getHandles = () => {
    switch (object.type) {
      case 'rectangle':
        return [
          // Corner handles
          { x: bounds.x, y: bounds.y, cursor: 'nw-resize', type: 'corner', position: 'tl' },
          { x: bounds.x + bounds.width, y: bounds.y, cursor: 'ne-resize', type: 'corner', position: 'tr' },
          { x: bounds.x, y: bounds.y + bounds.height, cursor: 'sw-resize', type: 'corner', position: 'bl' },
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'se-resize', type: 'corner', position: 'br' },
          // Edge handles
          { x: bounds.x + bounds.width / 2, y: bounds.y, cursor: 'n-resize', type: 'edge', position: 't' },
          { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, cursor: 's-resize', type: 'edge', position: 'b' },
          { x: bounds.x, y: bounds.y + bounds.height / 2, cursor: 'w-resize', type: 'edge', position: 'l' },
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, cursor: 'e-resize', type: 'edge', position: 'r' }
        ];

      case 'flashcard':
        // Flashcards are not resizable - only show move indicator
        return [];

      case 'circle':
        return [
          // Cardinal direction handles for circle
          { x: object.x, y: object.y - object.radius, cursor: 'n-resize', type: 'radius', position: 't' },
          { x: object.x, y: object.y + object.radius, cursor: 's-resize', type: 'radius', position: 'b' },
          { x: object.x - object.radius, y: object.y, cursor: 'w-resize', type: 'radius', position: 'l' },
          { x: object.x + object.radius, y: object.y, cursor: 'e-resize', type: 'radius', position: 'r' }
        ];

      case 'line':
        return [
          // Start and end points
          { x: object.x, y: object.y, cursor: 'move', type: 'point', position: 'start' },
          { x: object.endX, y: object.endY, cursor: 'move', type: 'point', position: 'end' }
        ];

      case 'text':
        return [
          // Corner handles for text bounds
          { x: bounds.x, y: bounds.y, cursor: 'nw-resize', type: 'corner', position: 'tl' },
          { x: bounds.x + bounds.width, y: bounds.y, cursor: 'ne-resize', type: 'corner', position: 'tr' },
          { x: bounds.x, y: bounds.y + bounds.height, cursor: 'sw-resize', type: 'corner', position: 'bl' },
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'se-resize', type: 'corner', position: 'br' }
        ];

      default:
        return [];
    }
  };

  const handles = getHandles();

  const handleMouseDown = (e: React.MouseEvent, handle: any) => {
    e.stopPropagation();
    
    // Start resize/move operation
    const startX = e.clientX;
    const startY = e.clientY;
    const originalBounds = { ...bounds };
    const originalObject = { ...object };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / viewport.zoom;
      const deltaY = (moveEvent.clientY - startY) / viewport.zoom;

      if (handle.type === 'corner') {
        handleCornerResize(handle.position, deltaX, deltaY, originalBounds, originalObject);
      } else if (handle.type === 'edge') {
        handleEdgeResize(handle.position, deltaX, deltaY, originalBounds, originalObject);
      } else if (handle.type === 'radius') {
        handleRadiusResize(handle.position, deltaX, deltaY, originalObject);
      } else if (handle.type === 'point') {
        handlePointMove(handle.position, deltaX, deltaY, originalObject);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCornerResize = (position: string, deltaX: number, deltaY: number, originalBounds: any, originalObject: any) => {
    if (originalObject.type === 'text') {
      // For text, resize by changing font size
      const diagonal = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const scaleFactor = position === 'br' ? 1 + diagonal / 100 : 1 - diagonal / 100;
      const newFontSize = Math.max(8, Math.min(72, originalObject.fontSize * scaleFactor));
      
      onResize(originalObject.id, { 
        x: originalObject.x, 
        y: originalObject.y, 
        fontSize: newFontSize 
      } as any);
      return;
    }

    let newX = originalBounds.x;
    let newY = originalBounds.y;
    let newWidth = originalBounds.width;
    let newHeight = originalBounds.height;

    switch (position) {
      case 'tl':
        newX = originalBounds.x + deltaX;
        newY = originalBounds.y + deltaY;
        newWidth = originalBounds.width - deltaX;
        newHeight = originalBounds.height - deltaY;
        break;
      case 'tr':
        newY = originalBounds.y + deltaY;
        newWidth = originalBounds.width + deltaX;
        newHeight = originalBounds.height - deltaY;
        break;
      case 'bl':
        newX = originalBounds.x + deltaX;
        newWidth = originalBounds.width - deltaX;
        newHeight = originalBounds.height + deltaY;
        break;
      case 'br':
        newWidth = originalBounds.width + deltaX;
        newHeight = originalBounds.height + deltaY;
        break;
    }

    // Minimum size constraints
    newWidth = Math.max(newWidth, 10);
    newHeight = Math.max(newHeight, 10);

    onResize(object.id, { x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const handleEdgeResize = (position: string, deltaX: number, deltaY: number, originalBounds: any, originalObject: any) => {
    let newX = originalBounds.x;
    let newY = originalBounds.y;
    let newWidth = originalBounds.width;
    let newHeight = originalBounds.height;

    switch (position) {
      case 't':
        newY = originalBounds.y + deltaY;
        newHeight = originalBounds.height - deltaY;
        break;
      case 'b':
        newHeight = originalBounds.height + deltaY;
        break;
      case 'l':
        newX = originalBounds.x + deltaX;
        newWidth = originalBounds.width - deltaX;
        break;
      case 'r':
        newWidth = originalBounds.width + deltaX;
        break;
    }

    // Minimum size constraints
    newWidth = Math.max(newWidth, 10);
    newHeight = Math.max(newHeight, 10);

    onResize(object.id, { x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const handleRadiusResize = (position: string, deltaX: number, deltaY: number, originalObject: any) => {
    const centerX = originalObject.x;
    const centerY = originalObject.y;
    
    let newRadius;
    switch (position) {
      case 't':
      case 'b':
        newRadius = Math.abs(deltaY) + originalObject.radius;
        break;
      case 'l':
      case 'r':
        newRadius = Math.abs(deltaX) + originalObject.radius;
        break;
      default:
        newRadius = originalObject.radius;
    }

    newRadius = Math.max(newRadius, 5); // Minimum radius
    onResize(object.id, { x: centerX, y: centerY, radius: newRadius });
  };

  const handlePointMove = (position: string, deltaX: number, deltaY: number, originalObject: any) => {
    if (position === 'start') {
      onMove(object.id, { x: originalObject.x + deltaX, y: originalObject.y + deltaY });
    } else if (position === 'end') {
      onResize(object.id, { 
        x: originalObject.x, 
        y: originalObject.y,
        endX: originalObject.endX + deltaX,
        endY: originalObject.endY + deltaY
      } as any);
    }
  };

  return (
    <g className="selection-handles">
      {/* Selection outline */}
      <rect
        x={bounds.x - handleStroke}
        y={bounds.y - handleStroke}
        width={bounds.width + handleStroke * 2}
        height={bounds.height + handleStroke * 2}
        fill="none"
        stroke="#007acc"
        strokeWidth={handleStroke}
        strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
        opacity={0.8}
      />

      {/* Special indicator for flashcard objects (movable but not resizable) */}
      {object.type === 'flashcard' && (
        <>
          {/* Move indicator at top-left */}
          <circle
            cx={bounds.x + 12 / viewport.zoom}
            cy={bounds.y + 12 / viewport.zoom}
            r={6 / viewport.zoom}
            fill="#007acc"
            stroke="#ffffff"
            strokeWidth={handleStroke / 2}
            opacity={0.9}
          />
          <text
            x={bounds.x + 12 / viewport.zoom}
            y={bounds.y + 16 / viewport.zoom}
            fontSize={8 / viewport.zoom}
            fill="#ffffff"
            textAnchor="middle"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            ✱
          </text>
          
          {/* "Fixed Size" label */}
          <text
            x={bounds.x + bounds.width / 2}
            y={bounds.y - 8 / viewport.zoom}
            fontSize={10 / viewport.zoom}
            fill="#007acc"
            textAnchor="middle"
            opacity={0.7}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            Click and Drag to Move
          </text>
        </>
      )}

      {/* Resize handles for other object types */}
      {object.type !== 'flashcard' && handles.map((handle, index) => (
        <rect
          key={index}
          x={handle.x - handleSize / 2}
          y={handle.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="#007acc"
          stroke="#ffffff"
          strokeWidth={handleStroke / 2}
          cursor={handle.cursor}
          onMouseDown={(e) => handleMouseDown(e, handle)}
          style={{ cursor: handle.cursor }}
        />
      ))}
    </g>
  );
};
