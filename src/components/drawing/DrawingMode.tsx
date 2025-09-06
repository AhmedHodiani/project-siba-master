import React, { useRef, useEffect, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';
import './DrawingMode.css';

interface DrawingModeProps {
  movieId?: string;
}

export const DrawingMode: React.FC<DrawingModeProps> = ({ movieId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <div className="drawing-mode">
      <div className="drawing-mode-header">
        <h3>🎨 Drawing Studio</h3>
        <div className="drawing-mode-info">
          <span>Drag to pan • Scroll to zoom • Origin at center (0,0)</span>
        </div>
      </div>
      
      <div className="drawing-mode-content" ref={containerRef}>
        <DrawingCanvas width={dimensions.width} height={dimensions.height} />
      </div>
    </div>
  );
};

export default DrawingMode;
