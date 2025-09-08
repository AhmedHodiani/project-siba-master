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
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#008000', '#800000', '#808080', '#C0C0C0', '#808000'
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
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => onStrokeColorChange(e.target.value)}
            className="color-input"
          />
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
        </div>
      </div>

      <div className="property-section">
        <label className="property-label">Thickness</label>
        <div className="thickness-section">
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
            className="thickness-slider"
          />
          <div className="thickness-value">{strokeWidth}px</div>
          <div className="thickness-presets">
            {strokeWidths.map((width) => (
              <button
                key={width}
                className={`thickness-preset ${strokeWidth === width ? 'active' : ''}`}
                onClick={() => onStrokeWidthChange(width)}
              >
                <div 
                  className="thickness-preview"
                  style={{ 
                    width: `${Math.min(width * 2, 20)}px`,
                    height: `${Math.min(width, 8)}px`,
                    backgroundColor: strokeColor
                  }}
                />
                {width}px
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="property-section">
        <label className="property-label">Opacity</label>
        <div className="opacity-section">
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            className="opacity-slider"
          />
          <div className="opacity-value">{Math.round(opacity * 100)}%</div>
        </div>
      </div>

      <div className="brush-preview">
        <label className="property-label">Preview</label>
        <svg width="100%" height="40" className="preview-canvas">
          <line
            x1="10"
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
