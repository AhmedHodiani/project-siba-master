import React from 'react';
import { DrawingObject, FlashcardObject, TranslationObject } from '../../lib/types/drawing';
import { TextEditor } from './TextEditor';
import { FlashcardWidget } from './FlashcardWidget';
import { TranslationWidget } from './TranslationWidget';

interface DrawingObjectRendererProps {
  object: DrawingObject;
  viewport?: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
  onSelect?: (id: string) => void;
  onUpdate?: (objectId: string, updates: Partial<DrawingObject>) => void;
  onStartDrag?: (objectId: string, startPoint: { x: number; y: number }) => void;
  isDragging?: boolean;
  draggedObjectId?: string | null;
}

export const DrawingObjectRenderer: React.FC<DrawingObjectRendererProps> = ({
  object,
  viewport,
  canvasSize,
  onSelect,
  onUpdate,
  onStartDrag,
  isDragging = false,
  draggedObjectId
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
    case 'rectangle':
      return (
        <rect
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          {...baseProps}
        />
      );

    case 'circle':
      return (
        <circle
          cx={object.x}
          cy={object.y}
          r={object.radius}
          {...baseProps}
        />
      );

    case 'line':
      return (
        <line
          x1={object.x}
          y1={object.y}
          x2={object.endX}
          y2={object.endY}
          {...baseProps}
        />
      );

    case 'text':
      if (viewport && onUpdate) {
        return (
          <TextEditor
            object={object}
            viewport={viewport}
            onUpdate={onUpdate}
            onFinish={() => {}}
          />
        );
      }
      return (
        <text
          x={object.x}
          y={object.y}
          fontSize={object.fontSize}
          fontFamily={object.fontFamily}
          {...baseProps}
        >
          {object.text}
        </text>
      );

    case 'flashcard':
      const flashcardObj = object as FlashcardObject;
      
      // Special handling for flashcard mouse events to enable dragging
      const handleFlashcardMouseDown = (e: React.MouseEvent) => {
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
            pointerEvents: 'all'
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
            pointerEvents: 'all'
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

    default:
      return null;
  }
};
