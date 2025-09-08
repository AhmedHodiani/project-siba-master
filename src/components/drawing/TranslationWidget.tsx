import React, { useState } from 'react';
import { TranslationObject } from '../../lib/types/drawing';
import './TranslationWidget.css';

interface TranslationWidgetProps {
  object: TranslationObject;
  isSelected: boolean;
  isDragging: boolean;
  onTextChange?: (text: string) => void;
  onLanguageChange?: (sourceLanguage: string, targetLanguage: string) => void;
}

export const TranslationWidget: React.FC<TranslationWidgetProps> = ({
  object,
  isSelected,
  isDragging,
  onTextChange,
  onLanguageChange,
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

  const translationUrl = object.text 
    ? `https://www.bing.com/translator/?from=${object.sourceLanguage}&to=${object.targetLanguage}&text=${encodeURIComponent(object.text)}`
    : `https://www.bing.com/translator/?from=${object.sourceLanguage}&to=${object.targetLanguage}`;

  return (
    <g>
      <foreignObject
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        className={`translation-widget ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      >
        <div className="translation-widget-container">
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
              />
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

export default TranslationWidget;
