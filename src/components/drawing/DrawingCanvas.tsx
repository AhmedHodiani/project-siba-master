import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DrawingObject, ToolType, Point, DrawingState, TextObject } from '../../lib/types/drawing';
import { FlashcardRecord } from '../../lib/types/database';
import { DrawingUtils } from '../../lib/services/drawing';
import { DrawingToolbar } from './DrawingToolbar';
import { DrawingObjectRenderer } from './DrawingObjectRenderer';
import { SelectionHandles } from './SelectionHandles';
import { TextPropertiesPanel } from './TextPropertiesPanel';
import { FlashcardPickerDialog } from './FlashcardPickerDialog';
import { ContextMenu } from './ContextMenu';
import './DrawingCanvas.css';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  movieId?: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ width, height, movieId }) => {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawingState, setDrawingState] = useState<DrawingState>({
    objects: [],
    selectedTool: 'select',
    selectedObjectIds: []
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [objectDragStart, setObjectDragStart] = useState<Point | null>(null);
  const [objectOriginalPosition, setObjectOriginalPosition] = useState<Point | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [showFlashcardPicker, setShowFlashcardPicker] = useState(false);
  const [flashcardPlacementPoint, setFlashcardPlacementPoint] = useState<Point | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    objectId: string;
    objectType: string;
  } | null>(null);
  
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
    // Close context menu on any click
    setContextMenu(null);
    
    if (e.button === 0) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });

      if (drawingState.selectedTool === 'select') {
        // Check if clicking on a selected object first
        const clickedObject = drawingState.objects.find(obj => 
          obj.selected && DrawingUtils.isPointInObject(worldPoint, obj)
        );

        if (clickedObject) {
          // Start object dragging
          handleObjectDragStart(clickedObject.id, worldPoint);
        } else {
          // Check if clicking on any object
          const hitObject = drawingState.objects
            .slice()
            .reverse() // Check top objects first
            .find(obj => DrawingUtils.isPointInObject(worldPoint, obj));

          if (hitObject) {
            // Select the object
            handleObjectSelect(hitObject.id);
          } else {
            // Clear selection and start canvas panning
            setDrawingState(prev => ({
              ...prev,
              selectedObjectIds: [],
              objects: prev.objects.map(obj => ({ ...obj, selected: false }))
            }));
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            setDragOffset({ x: 0, y: 0 });
          }
        }
      } else {
        // Handle drawing new objects
        if (drawingState.selectedTool === 'translation') {
          // Create translation widget immediately on click
          const newObject = DrawingUtils.createObject({
            type: 'translation',
            startPoint: worldPoint
          });

          setDrawingState(prev => ({
            ...prev,
            objects: [...prev.objects, newObject],
            selectedTool: 'select', // Switch back to select tool
            selectedObjectIds: [newObject.id] // Select the new object
          }));
        } else {
          setIsDrawing(true);
          setDrawStart(worldPoint);
        }
      }
    }
  }, [drawingState.selectedTool, drawingState.objects, viewport, width, height]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent browser context menu
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });

    // Find object under cursor
    const hitObject = drawingState.objects
      .slice()
      .reverse() // Check top objects first
      .find(obj => DrawingUtils.isPointInObject(worldPoint, obj));

    if (hitObject) {
      // Select the object if not already selected
      if (!hitObject.selected) {
        setDrawingState(prev => ({
          ...prev,
          selectedObjectIds: [hitObject.id],
          objects: prev.objects.map(obj => ({
            ...obj,
            selected: obj.id === hitObject.id
          }))
        }));
      }

      // Show context menu at screen coordinates
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        objectId: hitObject.id,
        objectType: hitObject.type
      });
    } else {
      // Close context menu if clicking on empty space
      setContextMenu(null);
    }
  }, [drawingState.objects, viewport, width, height]);

  // Handle mouse move - update drag offset, preview drawing, or move objects
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setDragOffset({ x: deltaX, y: deltaY });
    } else if (isDraggingObject && draggedObjectId && objectDragStart && objectOriginalPosition) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });
      
      // Calculate total delta from original start position
      const totalDeltaX = worldPoint.x - objectDragStart.x;
      const totalDeltaY = worldPoint.y - objectDragStart.y;

      setDrawingState(prev => ({
        ...prev,
        objects: prev.objects.map(obj => 
          obj.id === draggedObjectId 
            ? { ...obj, x: objectOriginalPosition.x + totalDeltaX, y: objectOriginalPosition.y + totalDeltaY }
            : obj
        )
      }));

      // Don't update objectDragStart - keep it fixed at the original drag start position
    }
    // Drawing preview could be handled here in the future
  }, [isDragging, isDraggingObject, draggedObjectId, objectDragStart, objectOriginalPosition, dragStart, viewport, width, height]);

  // Handle mouse up - commit drag movement, create object, or finish object drag
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      // Commit canvas pan
      const scaleFactorX = viewBoxWidth / width;
      const scaleFactorY = viewBoxHeight / height;
      setViewport(prev => ({
        ...prev,
        x: prev.x - dragOffset.x * scaleFactorX,
        y: prev.y - dragOffset.y * scaleFactorY
      }));
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
    } else if (isDraggingObject) {
      // Finish object dragging
      setIsDraggingObject(false);
      setDraggedObjectId(null);
      setObjectDragStart(null);
      setObjectOriginalPosition(null);
    } else if (isDrawing && drawStart) {
      // Create new drawing object
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });

      const newObject = DrawingUtils.createObject({
        type: drawingState.selectedTool as any,
        startPoint: drawStart,
        endPoint: worldPoint
      });

      setDrawingState(prev => ({
        ...prev,
        objects: [...prev.objects, newObject]
      }));

      setIsDrawing(false);
      setDrawStart(null);
    }
  }, [isDragging, isDraggingObject, isDrawing, drawStart, dragOffset, viewBoxWidth, viewBoxHeight, width, height, viewport, drawingState.selectedTool]);

  // Global mouse events
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (drawingState.selectedObjectIds.length > 0) {
          e.preventDefault();
          // Delete the first selected object
          const objectToDelete = drawingState.selectedObjectIds[0];
          setDrawingState(prev => ({
            ...prev,
            objects: prev.objects.filter(obj => obj.id !== objectToDelete),
            selectedObjectIds: prev.selectedObjectIds.filter(id => id !== objectToDelete)
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingState.selectedObjectIds]);

  useEffect(() => {
    if (isDragging || isDraggingObject) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const deltaX = e.clientX - dragStart.x;
          const deltaY = e.clientY - dragStart.y;
          setDragOffset({ x: deltaX, y: deltaY });
        } else if (isDraggingObject && draggedObjectId && objectDragStart && objectOriginalPosition) {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;

          const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });
          
          // Calculate total delta from original start position
          const totalDeltaX = worldPoint.x - objectDragStart.x;
          const totalDeltaY = worldPoint.y - objectDragStart.y;

          setDrawingState(prev => ({
            ...prev,
            objects: prev.objects.map(obj => 
              obj.id === draggedObjectId 
                ? { ...obj, x: objectOriginalPosition.x + totalDeltaX, y: objectOriginalPosition.y + totalDeltaY }
                : obj
            )
          }));

          // Don't update objectDragStart - keep it fixed at the original drag start position
        }
      };

      const handleGlobalMouseUp = () => {
        if (isDragging) {
          // Commit canvas pan
          const scaleFactorX = viewBoxWidth / width;
          const scaleFactorY = viewBoxHeight / height;
          setViewport(prev => ({
            ...prev,
            x: prev.x - dragOffset.x * scaleFactorX,
            y: prev.y - dragOffset.y * scaleFactorY
          }));
          setIsDragging(false);
          setDragOffset({ x: 0, y: 0 });
        } else if (isDraggingObject) {
          // Finish object dragging
          setIsDraggingObject(false);
          setDraggedObjectId(null);
          setObjectDragStart(null);
          setObjectOriginalPosition(null);
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, isDraggingObject, draggedObjectId, objectDragStart, objectOriginalPosition, dragStart, dragOffset, viewport.zoom, viewBoxWidth, viewBoxHeight, width, height, viewport]);

  // Handle tool selection
  const handleToolSelect = useCallback((tool: ToolType) => {
    if (tool === 'flashcard') {
      if (!movieId) {
        alert('No movie selected. Flashcards can only be added when a movie is loaded.');
        return;
      }
      // Don't change tool immediately, wait for flashcard selection
      setShowFlashcardPicker(true);
    } else if (tool === 'translation') {
      // For translation tool, create the widget immediately when clicked on canvas
      setDrawingState(prev => ({
        ...prev,
        selectedTool: tool,
        selectedObjectIds: [] // Clear selection when changing tools
      }));
    } else {
      setDrawingState(prev => ({
        ...prev,
        selectedTool: tool,
        selectedObjectIds: [] // Clear selection when changing tools
      }));
    }
  }, [movieId]);

  // Handle flashcard picker
  const handleFlashcardSelect = useCallback((flashcard: FlashcardRecord) => {
    // Create flashcard object at center of current view
    const centerX = viewport.x;
    const centerY = viewport.y;
    
    // Fixed size for all flashcards - larger for better display
    const FLASHCARD_WIDTH = 650;
    const FLASHCARD_HEIGHT = 560;

    const newFlashcardObject = DrawingUtils.createObject({
      type: 'flashcard',
      startPoint: { x: centerX - FLASHCARD_WIDTH / 2, y: centerY - FLASHCARD_HEIGHT / 2 }, // Center the flashcard
      flashcardId: flashcard.id
    });

    // Create translation widget next to the flashcard (to the right, same Y position)
    const TRANSLATION_WIDTH = 400;
    const TRANSLATION_HEIGHT = 300;
    const SPACING = 20; // Gap between flashcard and translation widget

    const newTranslationObject = DrawingUtils.createObject({
      type: 'translation',
      startPoint: { 
        x: centerX + FLASHCARD_WIDTH / 2 + SPACING, 
        y: centerY - FLASHCARD_HEIGHT / 2  // Same Y position as flashcard
      }
    });

    // Auto-populate the subtitle text into the translation widget
    if (flashcard.subtitle_text) {
      (newTranslationObject as any).text = flashcard.subtitle_text;
    }

    setDrawingState(prev => ({
      ...prev,
      selectedTool: 'select', // Switch back to select tool
      objects: [...prev.objects, newFlashcardObject, newTranslationObject]
    }));

    setShowFlashcardPicker(false);
  }, [viewport]);

  const handleFlashcardPickerClose = useCallback(() => {
    setShowFlashcardPicker(false);
  }, []);

  // Handle object selection
  const handleObjectSelect = useCallback((objectId: string) => {
    setDrawingState(prev => ({
      ...prev,
      selectedObjectIds: [objectId], // Single selection for now
      objects: prev.objects.map(obj => ({
        ...obj,
        selected: obj.id === objectId
      }))
    }));
  }, []);

  // Handle object resize
  const handleObjectResize = useCallback((objectId: string, newBounds: any) => {
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => {
        if (obj.id === objectId) {
          // Prevent resizing of flashcard objects - they have fixed size
          if (obj.type === 'flashcard') {
            return obj; // Return unchanged
          }
          
          switch (obj.type) {
            case 'rectangle':
              return { ...obj, x: newBounds.x, y: newBounds.y, width: newBounds.width, height: newBounds.height };
            case 'circle':
              return { ...obj, x: newBounds.x, y: newBounds.y, radius: newBounds.radius };
            case 'line':
              return { ...obj, x: newBounds.x, y: newBounds.y, endX: newBounds.endX, endY: newBounds.endY };
            case 'text':
              return { ...obj, x: newBounds.x, y: newBounds.y };
            default:
              return obj;
          }
        }
        return obj;
      })
    }));
  }, []);

  // Handle object move
  const handleObjectMove = useCallback((objectId: string, newPosition: Point) => {
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => 
        obj.id === objectId 
          ? { ...obj, x: newPosition.x, y: newPosition.y }
          : obj
      )
    }));
  }, []);

  // Handle object drag start
  const handleObjectDragStart = useCallback((objectId: string, startPoint: Point) => {
    const draggedObject = drawingState.objects.find(obj => obj.id === objectId);
    if (draggedObject) {
      setIsDraggingObject(true);
      setDraggedObjectId(objectId);
      setObjectDragStart(startPoint);
      setObjectOriginalPosition({ x: draggedObject.x, y: draggedObject.y });
    }
  }, [drawingState.objects]);

  // Handle context menu close
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle object delete
  const handleDeleteObject = useCallback(() => {
    if (!contextMenu) return;
    
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => obj.id !== contextMenu.objectId),
      selectedObjectIds: prev.selectedObjectIds.filter(id => id !== contextMenu.objectId)
    }));
    
    setContextMenu(null);
  }, [contextMenu]);

  // Handle object updates (for text editing and other modifications)
  const handleObjectUpdate = useCallback((objectId: string, updates: Partial<DrawingObject>) => {
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => 
        obj.id === objectId 
          ? { ...obj, ...updates } as DrawingObject
          : obj
      )
    }));
  }, []);

  // Handle text editing start/finish
  const handleTextEditStart = useCallback(() => {
    setIsEditingText(true);
  }, []);

  const handleTextEditFinish = useCallback(() => {
    setIsEditingText(false);
  }, []);

  // Calculate current transform for real-time visual feedback during drag
  const currentTransform = isDragging 
    ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
    : '';

  return (
    <div className="drawing-canvas-container">
      {/* Drawing Toolbar */}
      <DrawingToolbar
        selectedTool={drawingState.selectedTool}
        onToolSelect={handleToolSelect}
      />

      {/* Text Properties Panel - show when text object is selected */}
      {drawingState.objects.find(obj => obj.selected && obj.type === 'text') && (
        <TextPropertiesPanel
          object={drawingState.objects.find(obj => obj.selected && obj.type === 'text') as TextObject}
          onUpdate={handleObjectUpdate}
        />
      )}

      {/* Canvas Info Overlay */}
      <div className="canvas-info">
        <div>Zoom: {Math.round(viewport.zoom * 100)}%</div>
        <div>Position: ({Math.round(viewport.x)}, {Math.round(viewport.y)})</div>
        <div>Tool: {drawingState.selectedTool}</div>
        <div>Objects: {drawingState.objects.length}</div>
        {isDragging && <div>Panning...</div>}
        {isDraggingObject && <div>Moving object...</div>}
        {isDrawing && <div>Drawing...</div>}
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
        onContextMenu={handleContextMenu}
        style={{
          cursor: isDraggingObject ? 'grabbing' :
                  drawingState.selectedTool === 'select' 
                    ? (isDragging ? 'grabbing' : 'grab')
                    : 'crosshair',
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

        {/* Render drawing objects */}
        {DrawingUtils.sortByZIndex(drawingState.objects).map(obj => (
          <DrawingObjectRenderer
            key={obj.id}
            object={obj}
            viewport={viewport}
            canvasSize={{ width, height }}
            onSelect={handleObjectSelect}
            onUpdate={handleObjectUpdate}
            onStartDrag={handleObjectDragStart}
            isDragging={isDraggingObject}
            draggedObjectId={draggedObjectId}
          />
        ))}

        {/* Render selection handles for selected objects */}
        {drawingState.objects
          .filter(obj => obj.selected)
          .map(obj => (
            <SelectionHandles
              key={`handles-${obj.id}`}
              object={obj}
              viewport={viewport}
              onResize={handleObjectResize}
              onMove={handleObjectMove}
            />
          ))}
      </svg>

      {/* Flashcard Picker Dialog */}
      {showFlashcardPicker && movieId && (
        <FlashcardPickerDialog
          isOpen={showFlashcardPicker}
          onClose={handleFlashcardPickerClose}
          onSelectFlashcard={handleFlashcardSelect}
          movieId={movieId}
        />
      )}

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        isVisible={!!contextMenu}
        onClose={handleContextMenuClose}
        onDelete={handleDeleteObject}
        objectType={contextMenu?.objectType || 'object'}
      />
    </div>
  );
};

export default DrawingCanvas;
