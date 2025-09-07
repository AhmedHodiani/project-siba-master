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
  // Make viewBox responsive to actual screen dimensions and zoom level
  const viewBoxWidth = width / viewport.zoom;
  const viewBoxHeight = height / viewport.zoom;
  const viewBoxX = viewport.x - viewBoxWidth / 2;
  const viewBoxY = viewport.y - viewBoxHeight / 2;

  // Calculate infinite grid using mathematical tiling approach
  const gridSpacing = 40; // Grid cell size
  
  // Calculate actual screen coverage in world coordinates with generous buffer
  const screenWorldWidth = width / viewport.zoom;
  const screenWorldHeight = height / viewport.zoom;
  const buffer = Math.max(screenWorldWidth, screenWorldHeight); // Larger buffer to ensure full coverage
  
  // Calculate which grid lines we need to draw within the visible area + buffer
  const startX = Math.floor((viewport.x - screenWorldWidth/2 - buffer) / gridSpacing) * gridSpacing;
  const endX = Math.ceil((viewport.x + screenWorldWidth/2 + buffer) / gridSpacing) * gridSpacing;
  const startY = Math.floor((viewport.y - screenWorldHeight/2 - buffer) / gridSpacing) * gridSpacing;
  const endY = Math.ceil((viewport.y + screenWorldHeight/2 + buffer) / gridSpacing) * gridSpacing;

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

  // Handle wheel zoom with mouse position tracking
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!svgRef.current) return;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor));
    
    // Get mouse position relative to SVG
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert mouse position to world coordinates BEFORE zoom
    const worldX = viewport.x + (mouseX - width / 2) / viewport.zoom;
    const worldY = viewport.y + (mouseY - height / 2) / viewport.zoom;
    
    // Calculate new viewport position to keep world point under mouse
    const newViewportX = worldX - (mouseX - width / 2) / newZoom;
    const newViewportY = worldY - (mouseY - height / 2) / newZoom;

    setViewport({
      x: newViewportX,
      y: newViewportY,
      zoom: newZoom
    });
  }, [viewport.zoom, viewport.x, viewport.y, width, height]);

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
      // Simple conversion: screen pixels to world coordinates
      const scaleFactorX = viewBoxWidth / width;
      const scaleFactorY = viewBoxHeight / height;
      setViewport(prev => ({
        ...prev,
        x: prev.x - dragOffset.x * scaleFactorX,
        y: prev.y - dragOffset.y * scaleFactorY
      }));
    }
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, dragOffset, viewBoxWidth, viewBoxHeight, width, height]);

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
          // Simple conversion: screen pixels to world coordinates
          const scaleFactorX = viewBoxWidth / width;
          const scaleFactorY = viewBoxHeight / height;
          setViewport(prev => ({
            ...prev,
            x: prev.x - dragOffset.x * scaleFactorX,
            y: prev.y - dragOffset.y * scaleFactorY
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
  }, [isDragging, dragStart, dragOffset, viewport.zoom, viewBoxWidth, viewBoxHeight, width, height]);

  // Calculate current transform for real-time visual feedback during drag
  const currentTransform = isDragging 
    ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
    : '';

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
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
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
          width={viewBoxWidth}
          height={viewBoxHeight}
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
          x={viewBoxX + viewBoxWidth - 30}
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
