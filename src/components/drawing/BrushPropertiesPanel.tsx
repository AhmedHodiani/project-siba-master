import React from 'react';
import './BrushPropertiesPanel.css';

interface BrushPropertiesPanelProps {
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  onStrokeColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
}

export const BrushPropertiesPanel: React.FC<BrushPropertiesPanelProps> = ({
  strokeColor,
  strokeWidth,
  opacity,
  onStrokeColorChange,
  onStrokeWidthChange,
  onOpacityChange,
}) => {
  const predefinedColors = [
    '#FFFFFF', // White - excellent for dark backgrounds
    '#FFD700', // Gold/Yellow - bright and visible
    '#FF6B6B', // Coral Red - softer than pure red
    '#4ECDC4', // Turquoise - calming and visible
    '#45B7D1', // Sky Blue - professional
    '#96CEB4', // Mint Green - easy on eyes
    '#FECA57', // Orange - warm and vibrant
    '#FF9FF3', // Pink - creative and fun
    '#54A0FF', // Bright Blue - clear visibility
    '#5F27CD', // Purple - rich and deep
    '#00D2D3', // Cyan - modern and fresh
    '#FF9F43', // Peach - warm and friendly
    '#C44569', // Rose - elegant
    '#A3CB38', // Lime Green - energetic
    '#FD79A8', // Hot Pink - bold
    '#FDCB6E'  // Light Orange - warm tone
  ];

  const strokeWidths = [1, 2, 3, 4, 5, 8, 10, 12, 15, 20];

  return (
    <div className="brush-properties-panel">
      <div className="panel-header">
        <h3>Brush Properties</h3>
      </div>
      
      <div className="property-section">
        <label className="property-label">Color</label>
        <div className="color-picker-section">
          <div className="color-presets">
            {predefinedColors.map((color) => (
              <button
                key={color}
                className={`color-preset ${strokeColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onStrokeColorChange(color)}
                title={color}
              />
            ))}
          </div>
          <div className="custom-color-section">
            <label htmlFor="custom-stroke-color">Custom:</label>
            <input
              id="custom-stroke-color"
              type="color"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
              className="color-input"
            />
          </div>
        </div>
      </div>

      <div className="property-section">
        <div className="opacity-section">
          <label htmlFor="opacity-slider">Thickness:</label>
          <input
            type="range"
            min="1"
            max="50"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
            className="thickness-slider"
          />

          <span className="opacity-value">{strokeWidth}px</span>
        </div>

        <br />
        <div className="opacity-section">
          <label htmlFor="opacity-slider">Opacity:</label>
          <input
            id="opacity-slider"
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            className="opacity-slider"
          />
          <span className="opacity-value">{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      <div className="brush-preview">
        <label className="property-label">Preview</label>
        <svg width="100%" height="40" className="preview-canvas">
          <line
            x1="20"
            y1="20"
            x2="90%"
            y2="20"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default BrushPropertiesPanel;
