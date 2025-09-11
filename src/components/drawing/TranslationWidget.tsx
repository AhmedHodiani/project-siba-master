import React, { useState } from 'react';
import { TranslationObject } from '../../lib/types/drawing';
import './TranslationWidget.css';

interface TranslationWidgetProps {
  object: TranslationObject;
  isSelected: boolean;
  isDragging: boolean;
  onTextChange?: (text: string) => void;
  onLanguageChange?: (sourceLanguage: string, targetLanguage: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  onStartDrag?: (objectId: string, startPoint: { x: number; y: number }) => void;
  viewport?: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
}

export const TranslationWidget: React.FC<TranslationWidgetProps> = ({
  object,
  isSelected,
  isDragging,
  onTextChange,
  onLanguageChange,
  onContextMenu,
  onStartDrag,
  viewport,
  canvasSize,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(object.text);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTextSubmit = () => {
    if (onTextChange) {
      onTextChange(tempText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setTempText(object.text);
      setIsEditing(false);
    }
  };

  const swapLanguages = () => {
    if (onLanguageChange) {
      onLanguageChange(object.targetLanguage, object.sourceLanguage);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left-clicks for dragging
    if (e.button !== 0) {
      return;
    }

    // Don't interfere with text editing
    if (isEditing) {
      return;
    }

    // Don't call any selection logic here - let the foreignObject's onClick handle selection
    // This prevents interference with multi-selection during drag operations

    // If we have a drag handler, prepare for dragging (like sticky note)
    if (onStartDrag && viewport && canvasSize) {
      // Get the mouse position relative to the canvas
      const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
      if (rect) {
        const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        // Convert to world coordinates
        const worldPoint = {
          x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
          y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
        };
        
        onStartDrag(object.id, worldPoint);
      }
    }
  };

  const translationUrl = object.text 
    ? `https://www.bing.com/translator/?from=${object.sourceLanguage}&to=${object.targetLanguage}&text=${encodeURIComponent(object.text)}`
    : `https://www.bing.com/translator/?from=${object.sourceLanguage}&to=${object.targetLanguage}`;

  return (
    <g>
      {/* eslint-disable-next-line react/jsx-pascal-case */}
      <foreignObject
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        className={`translation-widget ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      >
        <div 
          className="translation-widget-container"
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onContextMenu) {
              onContextMenu(e, object.id);
            }
          }}
        >
          <div className="translation-header" style={{ zIndex: 30, position: 'relative' }}>
            <div className="language-controls">
              <span className="language-code">{object.sourceLanguage.toUpperCase()}</span>
              <button 
                className="swap-button" 
                onClick={swapLanguages}
                title="Swap languages"
              >
                ⇄
              </button>
              <span className="language-code">{object.targetLanguage.toUpperCase()}</span>
            </div>
            
            <div className="text-input-section">
              {isEditing ? (
                <textarea
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  onBlur={handleTextSubmit}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter text to translate..."
                  className="text-input"
                  autoFocus
                />
              ) : (
                <div 
                  className="text-display"
                  onDoubleClick={handleDoubleClick}
                  title="Double-click to edit"
                >
                  {object.text || 'Double-click to add text...'}
                </div>
              )}
            </div>
          </div>

          {object.text && (
            <div className="translation-iframe-container" style={{ marginTop: '-5px' }}>
              <iframe
                src={translationUrl}
                className="translation-iframe"
                title="Translation"
                sandbox="allow-scripts allow-same-origin"
                style={{ pointerEvents: 'auto' }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onContextMenu) {
                    onContextMenu(e, object.id);
                  }
                }}
              />
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

export default TranslationWidget;
