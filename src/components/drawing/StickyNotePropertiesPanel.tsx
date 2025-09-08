import React from 'react';
import './StickyNotePropertiesPanel.css';

interface StickyNotePropertiesPanelProps {
  paperColor: string;
  fontColor: string;
  fontSize: number;
  onPaperColorChange: (color: string) => void;
  onFontColorChange: (color: string) => void;
  onFontSizeChange: (size: number) => void;
}

const PAPER_COLORS = [
  { name: 'Yellow', value: '#ffd700' },
  { name: 'Pink', value: '#ffb3d9' },
  { name: 'Blue', value: '#87ceeb' },
  { name: 'Green', value: '#98fb98' },
  { name: 'Orange', value: '#ffa500' },
  { name: 'Purple', value: '#dda0dd' },
  { name: 'Mint', value: '#98ffcc' },
  { name: 'Peach', value: '#ffcccb' }
];

const FONT_COLORS = [
  { name: 'Dark Gray', value: '#333333' },
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#0066cc' },
  { name: 'Red', value: '#cc0000' },
  { name: 'Green', value: '#006600' },
  { name: 'Purple', value: '#6600cc' },
  { name: 'Brown', value: '#8b4513' },
  { name: 'White', value: '#ffffff' }
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

export const StickyNotePropertiesPanel: React.FC<StickyNotePropertiesPanelProps> = ({
  paperColor,
  fontColor,
  fontSize,
  onPaperColorChange,
  onFontColorChange,
  onFontSizeChange
}) => {
  return (
    <div className="sticky-note-properties-panel">
      <h3>Sticky Note Properties</h3>
      
      {/* Paper Color Section */}
      <div className="property-section">
        <label>Paper Color</label>
        <div className="color-grid">
          {PAPER_COLORS.map((color) => (
            <button
              key={color.value}
              className={`color-button ${paperColor === color.value ? 'selected' : ''}`}
              style={{ backgroundColor: color.value }}
              onClick={() => onPaperColorChange(color.value)}
              title={color.name}
            />
          ))}
        </div>
        <div className="custom-color-section">
          <label htmlFor="custom-paper-color">Custom:</label>
          <input
            id="custom-paper-color"
            type="color"
            value={paperColor}
            onChange={(e) => onPaperColorChange(e.target.value)}
            className="color-picker"
          />
        </div>
      </div>

      {/* Font Color Section */}
      <div className="property-section">
        <label>Font Color</label>
        <div className="color-grid">
          {FONT_COLORS.map((color) => (
            <button
              key={color.value}
              className={`color-button ${fontColor === color.value ? 'selected' : ''}`}
              style={{ 
                backgroundColor: color.value,
                border: color.value === '#ffffff' ? '2px solid #ccc' : '2px solid transparent'
              }}
              onClick={() => onFontColorChange(color.value)}
              title={color.name}
            />
          ))}
        </div>
        <div className="custom-color-section">
          <label htmlFor="custom-font-color">Custom:</label>
          <input
            id="custom-font-color"
            type="color"
            value={fontColor}
            onChange={(e) => onFontColorChange(e.target.value)}
            className="color-picker"
          />
        </div>
      </div>

      {/* Font Size Section */}
      <div className="property-section">
        <label>Font Size</label>
        <div className="font-size-grid">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              className={`font-size-button ${fontSize === size ? 'selected' : ''}`}
              onClick={() => onFontSizeChange(size)}
            >
              {size}px
            </button>
          ))}
        </div>
        <div className="custom-size-section">
          <label htmlFor="custom-font-size">Custom:</label>
          <input
            id="custom-font-size"
            type="range"
            min="10"
            max="48"
            value={fontSize}
            onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
            className="size-slider"
          />
          <span className="size-display">{fontSize}px</span>
        </div>
      </div>
    </div>
  );
};
