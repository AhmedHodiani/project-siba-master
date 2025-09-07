import React, { useState, useEffect, useRef } from 'react';
import { TextObject } from '../../lib/types/drawing';

interface TextEditorProps {
  object: TextObject;
  viewport: { x: number; y: number; zoom: number };
  onUpdate: (objectId: string, updates: Partial<TextObject>) => void;
  onFinish: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  object,
  viewport,
  onUpdate,
  onFinish
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(object.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      
      // Focus and select after a short delay
      setTimeout(() => {
        textarea.focus();
        textarea.select();
      }, 10);
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
  };

  const handleSubmit = () => {
    const newText = editText.trim();
    if (newText && newText !== object.text) {
      onUpdate(object.id, { text: newText });
    }
    setIsEditing(false);
    onFinish();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter adds a new line
      setEditText(prev => prev + '\n');
    } else if (e.key === 'Escape') {
      setEditText(object.text);
      setIsEditing(false);
      onFinish();
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  // Calculate screen position for overlay - simplified approach
  const canvasElement = document.querySelector('.drawing-canvas') as SVGElement;
  
  if (isEditing && canvasElement) {
    const canvasRect = canvasElement.getBoundingClientRect();
    const screenX = (object.x - viewport.x) * viewport.zoom + canvasRect.left;
    const screenY = (object.y - viewport.y) * viewport.zoom + canvasRect.top;

    return (
      <>
        {/* Invisible placeholder to maintain SVG structure */}
        <text
          x={object.x}
          y={object.y}
          fontSize={object.fontSize}
          fontFamily={object.fontFamily}
          fill="transparent"
          style={{ pointerEvents: 'none' }}
        >
          {object.text}
        </text>
        
        {/* Editing overlay */}
        <foreignObject
          x={object.x - 10}
          y={object.y - object.fontSize}
          width={Math.max(200, object.text.length * object.fontSize * 0.6)}
          height={Math.max(object.fontSize * 2, editText.split('\n').length * object.fontSize * 1.4)}
        >
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{
              fontSize: `${object.fontSize}px`,
              fontFamily: object.fontFamily,
              color: object.style.fill || '#000000',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '2px solid #007acc',
              borderRadius: '4px',
              padding: '2px 6px',
              outline: 'none',
              width: '100%',
              height: '100%',
              resize: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
          />
        </foreignObject>
      </>
    );
  }

  return (
    <g>
      {object.text.split('\n').map((line, index) => (
        <text
          key={index}
          x={object.x}
          y={object.y + (index * object.fontSize * 1.2)}
          fontSize={object.fontSize}
          fontFamily={object.fontFamily}
          fill={object.style.fill}
          stroke={object.style.stroke}
          strokeWidth={object.style.strokeWidth}
          opacity={object.style.opacity}
          cursor="text"
          onDoubleClick={handleDoubleClick}
          style={{
            userSelect: 'none',
            cursor: 'text'
          }}
        >
          {line}
        </text>
      ))}
    </g>
  );
};
