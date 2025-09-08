import React from 'react';
import { DrawingObject, FlashcardObject, TranslationObject, FreehandObject, StickyNoteObject, ToolType } from '../../lib/types/drawing';
import { FlashcardWidget } from './FlashcardWidget';
import { TranslationWidget } from './TranslationWidget';
import { StickyNoteWidget } from './StickyNoteWidget';

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
  currentTool
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
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
      
      // Special handling for flashcard mouse events to enable dragging
      const handleFlashcardMouseDown = (e: React.MouseEvent) => {
        // If freehand tool is active, don't intercept the event - let it bubble up for drawing
        if (currentTool === 'freehand') {
          return; // Don't stop propagation, let the canvas handle drawing
        }
        
        e.stopPropagation();
        e.preventDefault();
        
        // Select the object first
        if (onSelect) {
          onSelect(object.id);
        }
        
        // Get the mouse position relative to the canvas
        const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
        if (rect && viewport && canvasSize && onStartDrag) {
          const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          // Convert to world coordinates
          const worldPoint = {
            x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
            y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
          };
          
          // Start dragging
          onStartDrag(object.id, worldPoint);
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
          onMouseDown={handleFlashcardMouseDown}
          onClick={handleClick}
        >
          <FlashcardWidget
            flashcardId={flashcardObj.flashcardId}
            x={0}
            y={0}
            width={object.width}
            height={object.height}
            selected={object.selected}
            onSelect={() => {}} // Handled by foreignObject
            scale={1} // foreignObject already handles SVG scaling
            isDragging={isDragging && draggedObjectId === object.id}
          />
        </foreignObject>
      );

    case 'translation':
      const translationObj = object as TranslationObject;
      
      // Special handling for translation widget mouse events to enable dragging
      const handleTranslationMouseDown = (e: React.MouseEvent) => {
        // If freehand tool is active, don't intercept the event - let it bubble up for drawing
        if (currentTool === 'freehand') {
          return; // Don't stop propagation, let the canvas handle drawing
        }
        
        e.stopPropagation();
        e.preventDefault();
        
        // Select the object first
        if (onSelect) {
          onSelect(object.id);
        }
        
        // Get the mouse position relative to the canvas
        const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
        if (rect && viewport && canvasSize && onStartDrag) {
          const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          // Convert to world coordinates
          const worldPoint = {
            x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
            y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
          };
          
          // Start dragging
          onStartDrag(object.id, worldPoint);
        }
      };

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
          onMouseDown={handleTranslationMouseDown}
          onClick={handleClick}
        >
          <TranslationWidget
            object={translationObj}
            isSelected={object.selected}
            isDragging={isDragging && draggedObjectId === object.id}
            onTextChange={handleTextChange}
            onLanguageChange={handleLanguageChange}
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
      
      // Special handling for sticky note mouse events to enable dragging
      const handleStickyNoteMouseDown = (e: React.MouseEvent) => {
        console.log('Foreign object mousedown, target:', e.target);
        // Check if this is a resize handle click
        const target = e.target as HTMLElement;
        if (target.classList.contains('resize-handle')) {
          console.log('Resize handle detected, not interfering');
          // Don't stop propagation for resize handles
          return;
        }
        
        // If freehand tool is active, don't intercept the event - let it bubble up for drawing
        if (currentTool === 'freehand') {
          return; // Don't stop propagation, let the canvas handle drawing
        }
        
        e.stopPropagation();
        e.preventDefault();
        
        // Select the object first
        if (onSelect) {
          onSelect(object.id);
        }
        
        // Get the mouse position relative to the canvas
        const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
        if (rect && viewport && canvasSize && onStartDrag) {
          const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          // Convert to world coordinates
          const worldPoint = {
            x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
            y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
          };
          
          // Start dragging
          onStartDrag(object.id, worldPoint);
        }
      };

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

    default:
      return null;
  }
};
