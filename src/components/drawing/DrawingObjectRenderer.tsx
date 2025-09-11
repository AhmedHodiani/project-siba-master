import React from 'react';
import { DrawingObject, FlashcardObject, TranslationObject, FreehandObject, StickyNoteObject, ImageObject, ToolType } from '../../lib/types/drawing';
import { FlashcardWidget } from './FlashcardWidget';
import { TranslationWidget } from './TranslationWidget';
import { StickyNoteWidget } from './StickyNoteWidget';
import { ImageWidget } from './ImageWidget';

interface DrawingObjectRendererProps {
  object: DrawingObject;
  viewport?: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
  onSelect?: (id: string) => void;
  onUpdate?: (objectId: string, updates: Partial<DrawingObject>) => void;
  onStartDrag?: (objectId: string, startPoint: { x: number; y: number }) => void;
  onContextMenu?: (event: React.MouseEvent, objectId: string) => void;
  isDragging?: boolean;
  draggedObjectId?: string | null;
  currentTool?: ToolType;
  getImageUrl?: (fileName: string) => string;
}

export const DrawingObjectRenderer: React.FC<DrawingObjectRendererProps> = ({
  object,
  viewport,
  canvasSize,
  onSelect,
  onUpdate,
  onStartDrag,
  onContextMenu,
  isDragging = false,
  draggedObjectId,
  currentTool,
  getImageUrl
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Don't handle selection on right-clicks - let context menu handle it
    if (e.button === 2) {
      return;
    }
    
    e.stopPropagation();
    
    // Only select the object if it's not already selected
    // This preserves multi-selection during drag operations
    if (!object.selected && onSelect) {
      onSelect(object.id);
    }
  };

  const baseProps = {
    onClick: handleClick,
    style: {
      cursor: 'pointer',
      ...object.style
    } as any // Allow SVG filter property
  };

  // Add selection highlight
  if (object.selected) {
    baseProps.style.stroke = '#007acc';
    baseProps.style.strokeWidth = (object.style.strokeWidth || 2) + 1;
    baseProps.style.filter = 'drop-shadow(0 0 5px rgba(0, 122, 204, 0.5))';
  }

  switch (object.type) {
    case 'flashcard':
      const flashcardObj = object as FlashcardObject;
      
      return (
        <foreignObject
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          style={{
            cursor: object.selected ? 'move' : 'pointer',
            overflow: 'visible',
            pointerEvents: currentTool === 'freehand' ? 'none' : 'all'
          }}
          onClick={handleClick}
        >
          <FlashcardWidget
            flashcardId={flashcardObj.flashcardId}
            objectId={object.id}
            x={0}
            y={0}
            width={object.width}
            height={object.height}
            selected={object.selected}
            onSelect={() => {}} // Handled by foreignObject
            scale={1} // foreignObject already handles SVG scaling
            isDragging={isDragging && draggedObjectId === object.id}
            onContextMenu={onContextMenu}
            onStartDrag={onStartDrag}
            viewport={viewport}
            canvasSize={canvasSize}
          />
        </foreignObject>
      );

    case 'translation':
      const translationObj = object as TranslationObject;
      
      const handleTextChange = (text: string) => {
        if (onUpdate) {
          onUpdate(object.id, { text } as Partial<DrawingObject>);
        }
      };

      const handleLanguageChange = (sourceLanguage: string, targetLanguage: string) => {
        if (onUpdate) {
          onUpdate(object.id, { sourceLanguage, targetLanguage } as Partial<DrawingObject>);
        }
      };
      
      return (
        <foreignObject
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          style={{
            cursor: object.selected ? 'move' : 'pointer',
            overflow: 'visible',
            pointerEvents: currentTool === 'freehand' ? 'none' : 'all'
          }}
          onClick={handleClick}
        >
          <TranslationWidget
            object={translationObj}
            isSelected={object.selected}
            isDragging={isDragging && draggedObjectId === object.id}
            onTextChange={handleTextChange}
            onLanguageChange={handleLanguageChange}
            onContextMenu={onContextMenu}
            onStartDrag={onStartDrag}
            viewport={viewport}
            canvasSize={canvasSize}
          />
        </foreignObject>
      );

    case 'freehand':
      const freehandObj = object as FreehandObject;
      
      // Create SVG path from points
      if (freehandObj.points.length < 2) {
        return null; // Need at least 2 points to draw
      }
      
      const pathData = freehandObj.points.reduce((path, point, index) => {
        if (index === 0) {
          return `M ${point.x} ${point.y}`;
        } else {
          return `${path} L ${point.x} ${point.y}`;
        }
      }, '');

      return (
        <path
          d={pathData}
          {...baseProps}
          style={{
            ...baseProps.style,
            fill: 'none', // Ensure freehand is never filled
          }}
        />
      );

    case 'sticky-note':
      const stickyNoteObj = object as StickyNoteObject;
      
      const handleStickyNoteUpdate = (id: string, updates: Partial<StickyNoteObject>) => {
        if (onUpdate) {
          onUpdate(id, updates as Partial<DrawingObject>);
        }
      };
      
      return (
        <foreignObject
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          style={{
            cursor: object.selected ? 'move' : 'pointer',
            overflow: 'visible',
            pointerEvents: currentTool === 'freehand' ? 'none' : 'all'
          }}
          onClick={handleClick}
        >
          <StickyNoteWidget
            note={stickyNoteObj}
            isSelected={object.selected}
            zoom={viewport?.zoom || 1}
            onUpdate={handleStickyNoteUpdate}
            onSelect={() => {}} // Handled by foreignObject
            onContextMenu={onContextMenu || (() => {})}
            onStartDrag={(e, id) => {
              if (onStartDrag && viewport && canvasSize) {
                // Get the mouse position relative to the canvas
                const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
                if (rect) {
                  const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                  // Convert to world coordinates using proper viewport transformation
                  const worldPoint = {
                    x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
                    y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
                  };
                  
                  onStartDrag(id, worldPoint);
                }
              }
            }}
          />
        </foreignObject>
      );

    case 'image':
      const imageObj = object as ImageObject;
      
      const handleImageUpdate = (id: string, updates: Partial<ImageObject>) => {
        if (onUpdate) {
          onUpdate(id, updates as Partial<DrawingObject>);
        }
      };
      
      return (
        <foreignObject
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          style={{
            cursor: object.selected ? 'move' : 'pointer',
            overflow: 'visible',
            pointerEvents: currentTool === 'freehand' ? 'none' : 'all'
          }}
          onClick={handleClick}
        >
          <ImageWidget
            image={imageObj}
            isSelected={object.selected}
            zoom={viewport?.zoom || 1}
            onUpdate={handleImageUpdate}
            onSelect={() => {}} // Handled by foreignObject
            onContextMenu={onContextMenu || (() => {})}
            onStartDrag={(e, id) => {
              if (onStartDrag && viewport && canvasSize) {
                // Get the mouse position relative to the canvas
                const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
                if (rect) {
                  const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                  // Convert to world coordinates using proper viewport transformation
                  const worldPoint = {
                    x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
                    y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
                  };
                  
                  onStartDrag(id, worldPoint);
                }
              }
            }}
            getImageUrl={getImageUrl}
          />
        </foreignObject>
      );

    default:
      return null;
  }
};
