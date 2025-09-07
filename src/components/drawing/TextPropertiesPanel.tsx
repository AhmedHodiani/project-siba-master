import React from 'react';
import { TextObject } from '../../lib/types/drawing';
import './TextPropertiesPanel.css';

interface TextPropertiesPanelProps {
  object: TextObject;
  onUpdate: (objectId: string, updates: Partial<TextObject>) => void;
}

export const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({
  object,
  onUpdate
}) => {
  const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64];
  const fontFamilies = [
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'Times New Roman, serif',
    'Georgia, serif',
    'Courier New, monospace',
    'Monaco, monospace',
    'Verdana, sans-serif',
    'Trebuchet MS, sans-serif'
  ];

  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff8000', '#8000ff', '#0080ff', '#80ff00', '#ff0080', '#00ff80'
  ];

  return (
    <div className="text-properties-panel">
      <div className="panel-title">Text Properties</div>
      
      {/* Font Size */}
      <div className="property-group">
        <label>Font Size</label>
        <select
          value={object.fontSize}
          onChange={(e) => onUpdate(object.id, { fontSize: parseInt(e.target.value) })}
        >
          {fontSizes.map(size => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
        <input
          type="range"
          min="8"
          max="72"
          value={object.fontSize}
          onChange={(e) => onUpdate(object.id, { fontSize: parseInt(e.target.value) })}
          className="font-size-slider"
        />
      </div>

      {/* Font Family */}
      <div className="property-group">
        <label>Font Family</label>
        <select
          value={object.fontFamily}
          onChange={(e) => onUpdate(object.id, { fontFamily: e.target.value })}
        >
          {fontFamilies.map(font => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font.split(',')[0]}
            </option>
          ))}
        </select>
      </div>

      {/* Text Color */}
      <div className="property-group">
        <label>Text Color</label>
        <div className="color-grid">
          {colors.map(color => (
            <button
              key={color}
              className={`color-swatch ${object.style.fill === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onUpdate(object.id, { 
                style: { ...object.style, fill: color } 
              })}
              title={color}
            />
          ))}
        </div>
        <input
          type="color"
          value={object.style.fill || '#000000'}
          onChange={(e) => onUpdate(object.id, { 
            style: { ...object.style, fill: e.target.value } 
          })}
          className="color-picker"
        />
      </div>

      {/* Text Outline */}
      <div className="property-group">
        <label>
          <input
            type="checkbox"
            checked={!!object.style.stroke && object.style.stroke !== 'none'}
            onChange={(e) => onUpdate(object.id, { 
              style: { 
                ...object.style, 
                stroke: e.target.checked ? '#000000' : 'none',
                strokeWidth: e.target.checked ? 1 : 0
              } 
            })}
          />
          Text Outline
        </label>
        {object.style.stroke && object.style.stroke !== 'none' && (
          <>
            <input
              type="color"
              value={object.style.stroke}
              onChange={(e) => onUpdate(object.id, { 
                style: { ...object.style, stroke: e.target.value } 
              })}
              className="color-picker"
            />
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={object.style.strokeWidth || 1}
              onChange={(e) => onUpdate(object.id, { 
                style: { ...object.style, strokeWidth: parseFloat(e.target.value) } 
              })}
            />
          </>
        )}
      </div>

      {/* Opacity */}
      <div className="property-group">
        <label>Opacity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={object.style.opacity || 1}
          onChange={(e) => onUpdate(object.id, { 
            style: { ...object.style, opacity: parseFloat(e.target.value) } 
          })}
        />
        <span>{Math.round((object.style.opacity || 1) * 100)}%</span>
      </div>
    </div>
  );
};
