import React, { useState, useRef, useCallback, useEffect } from 'react';
import './DrawingCanvas.css';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface DrawingCanvasProps {
  width: number;
  height: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ width, height }) => {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate viewBox - center the canvas at (0,0)
  const baseViewBoxSize = 1000;
  const viewBoxSize = Math.max(baseViewBoxSize, baseViewBoxSize / viewport.zoom * 2);
  const viewBoxX = viewport.x - viewBoxSize / 2;
  const viewBoxY = viewport.y - viewBoxSize / 2;

  // Calculate infinite grid using mathematical tiling approach
  const gridSpacing = 40; // Grid cell size
  const buffer = viewBoxSize; // Buffer around visible area
  
  // Calculate which grid lines we need to draw within the visible area + buffer
  const startX = Math.floor((viewBoxX - buffer) / gridSpacing) * gridSpacing;
  const endX = Math.ceil((viewBoxX + viewBoxSize + buffer) / gridSpacing) * gridSpacing;
  const startY = Math.floor((viewBoxY - buffer) / gridSpacing) * gridSpacing;
  const endY = Math.ceil((viewBoxY + viewBoxSize + buffer) / gridSpacing) * gridSpacing;

  // Generate grid lines dynamically
  const gridLines = [];
  
  // Vertical lines
  for (let x = startX; x <= endX; x += gridSpacing) {
    gridLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={startY}
        x2={x}
        y2={endY}
        stroke="#333"
        strokeWidth="1"
      />
    );
  }
  
  // Horizontal lines
  for (let y = startY; y <= endY; y += gridSpacing) {
    gridLines.push(
      <line
        key={`h-${y}`}
        x1={startX}
        y1={y}
        x2={endX}
        y2={y}
        stroke="#333"
        strokeWidth="1"
      />
    );
  }

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor));

    setViewport(prev => ({
      ...prev,
      zoom: newZoom
    }));
  }, [viewport.zoom]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragOffset({ x: 0, y: 0 });
    }
  }, []);

  // Handle mouse move - only update drag offset, not viewport
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setDragOffset({ x: deltaX, y: deltaY });
  }, [isDragging, dragStart]);

  // Handle mouse up - commit drag movement to viewport
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Convert drag offset to viewport coordinates
      // When we drag canvas right (+dragOffset.x), we want to see content from the left (-viewport.x)
      const scaleFactor = viewBoxSize / (Math.min(width, height) * viewport.zoom);
      setViewport(prev => ({
        ...prev,
        x: prev.x - dragOffset.x * scaleFactor,
        y: prev.y - dragOffset.y * scaleFactor
      }));
    }
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, dragOffset, viewport.zoom, viewBoxSize, width, height]);

  // Global mouse events
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setDragOffset({ x: deltaX, y: deltaY });
      };

      const handleGlobalMouseUp = () => {
        if (isDragging) {
          // Convert drag offset to viewport coordinates
          // When we drag canvas right (+dragOffset.x), we want to see content from the left (-viewport.x)
          const scaleFactor = viewBoxSize / (Math.min(width, height) * viewport.zoom);
          setViewport(prev => ({
            ...prev,
            x: prev.x - dragOffset.x * scaleFactor,
            y: prev.y - dragOffset.y * scaleFactor
          }));
        }
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, dragOffset, viewport.zoom, viewBoxSize, width, height]);

  // Calculate current transform for visual feedback during drag
  const currentTransform = isDragging 
    ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${viewport.zoom})`
    : `scale(${viewport.zoom})`;

  return (
    <div className="drawing-canvas-container">
      {/* Canvas Info Overlay */}
      <div className="canvas-info">
        <div>Zoom: {Math.round(viewport.zoom * 100)}%</div>
        <div>Position: ({Math.round(viewport.x)}, {Math.round(viewport.y)})</div>
        {isDragging && <div>Dragging...</div>}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="drawing-canvas"
        width={width}
        height={height}
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxSize} ${viewBoxSize}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: currentTransform,
          transformOrigin: 'center'
        }}
      >
        {/* Grid background */}
        <rect
          x={viewBoxX}
          y={viewBoxY}
          width={viewBoxSize}
          height={viewBoxSize}
          fill="#1a1a1a"
        />

        {/* Dynamic infinite grid lines */}
        {gridLines}

        {/* X Axis - extend across current view */}
        <line
          x1={startX}
          y1={0}
          x2={endX}
          y2={0}
          stroke="#555"
          strokeWidth={2}
        />
        
        {/* Y Axis - extend across current view */}
        <line
          x1={0}
          y1={startY}
          x2={0}
          y2={endY}
          stroke="#555"
          strokeWidth={2}
        />

        {/* Origin indicator */}
        <circle
          cx={0}
          cy={0}
          r={6}
          fill="#007acc"
          opacity={0.8}
        />
        
        <text
          x={10}
          y={-10}
          fontSize={14}
          fill="#007acc"
          opacity={0.8}
        >
          (0,0)
        </text>

        {/* Axis labels */}
        <text
          x={viewBoxX + viewBoxSize - 30}
          y={-10}
          fontSize={12}
          fill="#555"
        >
          X
        </text>
        
        <text
          x={10}
          y={viewBoxY + 20}
          fontSize={12}
          fill="#555"
        >
          Y
        </text>
      </svg>
    </div>
  );
};

export default DrawingCanvas;
