import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { DrawingObject, ToolType, Point, DrawingState, Canvas } from '../../lib/types/drawing';
import { FlashcardRecord } from '../../lib/types/database';
import { DrawingUtils } from '../../lib/services/drawing';
import { DrawingToolbar } from './DrawingToolbar';
import { DrawingObjectRenderer } from './DrawingObjectRenderer';
import { SelectionHandles } from './SelectionHandles';
import { FlashcardPickerDialog } from './FlashcardPickerDialog';
import { ContextMenu } from './ContextMenu';
import { BrushPropertiesPanel } from './BrushPropertiesPanel';
import { StickyNotePropertiesPanel } from './StickyNotePropertiesPanel';
import { ConfirmDialog } from '../ui/ConfirmDialog';
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
  currentCanvas: Canvas | null;
  onObjectCreated?: (object: DrawingObject) => Promise<void>;
  onObjectUpdated?: (objectId: string, updates: Partial<DrawingObject>) => Promise<void>;
  onObjectDeleted?: (objectId: string) => Promise<void>;
}

export const DrawingCanvas = forwardRef<any, DrawingCanvasProps>(({ 
  width, 
  height, 
  movieId, 
  currentCanvas,
  onObjectCreated,
  onObjectUpdated,
  onObjectDeleted
}, ref) => {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Use refs to track loading state and prevent circular updates
  const isLoadingCanvas = useRef(false);
  const lastLoadedCanvasId = useRef<string | null>(null);
  
  const [drawingState, setDrawingState] = useState<DrawingState>({
    objects: [],
    selectedObjectIds: [],
    selectedTool: 'select'
  });
  
  // Ref to always get the latest drawing state
  const drawingStateRef = useRef(drawingState);
  drawingStateRef.current = drawingState;

  // Load canvas data when currentCanvas changes
  useEffect(() => {
    if (currentCanvas && currentCanvas.id !== lastLoadedCanvasId.current) {
      console.log('DrawingCanvas: Loading canvas', currentCanvas.id, 'with', currentCanvas.objects?.length, 'objects');
      
      isLoadingCanvas.current = true;
      lastLoadedCanvasId.current = currentCanvas.id;
      
      const newObjects = currentCanvas.objects || [];
      console.log('DrawingCanvas: Setting objects to:', newObjects.length);
      
      setDrawingState(prev => ({
        ...prev,
        objects: newObjects,
        selectedObjectIds: [] // Clear selection when switching canvas
      }));
      
      // Always reset viewport to ensure clean state
      const newViewport = currentCanvas.viewport || { x: 0, y: 0, zoom: 1 };
      setViewport(newViewport);
      
      // Allow updates after a short delay
      setTimeout(() => {
        isLoadingCanvas.current = false;
      }, 100);
    }
  }, [currentCanvas?.id]);

  useImperativeHandle(ref, () => ({
    getCurrentState: () => ({
      objects: drawingState.objects,
      viewport: viewport,
      selectedObjectIds: drawingState.selectedObjectIds
    }),
  }), [drawingState.objects, viewport, drawingState.selectedObjectIds]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [objectDragStart, setObjectDragStart] = useState<Point | null>(null);
  const [objectOriginalPosition, setObjectOriginalPosition] = useState<Point | null>(null);
  const [selectedObjectsOriginalPositions, setSelectedObjectsOriginalPositions] = useState<Map<string, Point>>(new Map());
  const [selectedObjectsOriginalPoints, setSelectedObjectsOriginalPoints] = useState<Map<string, Point[]>>(new Map());
  const [showFlashcardPicker, setShowFlashcardPicker] = useState(false);
  const [flashcardPlacementPoint, setFlashcardPlacementPoint] = useState<Point | null>(null);
  const [currentFreehandId, setCurrentFreehandId] = useState<string | null>(null);
  
  // Brush properties state
  const [brushProperties, setBrushProperties] = useState({
    strokeColor: '#FFFFFF',
    strokeWidth: 5,
    opacity: 1
  });
  
  // Sticky note properties state
  const [stickyNoteProperties, setStickyNoteProperties] = useState({
    paperColor: '#ffd700',
    fontColor: '#333333',
    fontSize: 16
  });
  
  // Straight line drawing state
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [straightLineStart, setStraightLineStart] = useState<Point | null>(null); // Start point for straight line mode

  // Rectangle selection state
  const [isRectangleSelecting, setIsRectangleSelecting] = useState(false);
  const [rectangleStart, setRectangleStart] = useState<Point | null>(null);
  const [rectangleEnd, setRectangleEnd] = useState<Point | null>(null);

  // Keyboard event handling for Ctrl key
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    objectId: string;
    objectType: string;
  } | null>(null);
  
  // Confirmation dialog state
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    objectsToDelete: string[];
  }>({
    isOpen: false,
    objectsToDelete: []
  });
  
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
  const handleWheel = useCallback((e: WheelEvent) => {
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

  // Register wheel event with non-passive listener
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Close context menu on any click
    setContextMenu(null);
    
    if (e.button === 2) {
      // Right click - this will be handled by onContextMenu event
      return;
    }
    
    if (e.button === 0) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });

      // Check tool first - drawing tools take priority over object interaction
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
        
        // Save to database immediately
        if (onObjectCreated) {
          onObjectCreated(newObject).catch(error => {
            console.error('Failed to save translation object:', error);
            // Optionally remove from state if save failed
          });
        }
        
      } else if (drawingState.selectedTool === 'sticky-note') {
        // Create sticky note immediately on click
        const newObject = DrawingUtils.createObject({
          type: 'sticky-note',
          startPoint: worldPoint
        }) as any; // Cast to access sticky note properties

        // Apply current sticky note properties
        newObject.paperColor = stickyNoteProperties.paperColor;
        newObject.fontColor = stickyNoteProperties.fontColor;
        newObject.fontSize = stickyNoteProperties.fontSize;
        newObject.style = {
          ...newObject.style,
          fill: stickyNoteProperties.paperColor
        };

        setDrawingState(prev => ({
          ...prev,
          objects: [...prev.objects, newObject],
          selectedTool: 'select', // Switch back to select tool
          selectedObjectIds: [newObject.id] // Select the new object
        }));
        
        // Save to database immediately
        if (onObjectCreated) {
          onObjectCreated(newObject).catch(error => {
            console.error('Failed to save sticky note object:', error);
          });
        }
        
      } else if (drawingState.selectedTool === 'freehand') {
        // Start freehand drawing immediately - ignore object interactions
        const newObject = DrawingUtils.createObject({
          type: 'freehand',
          startPoint: worldPoint
        });

        console.log('Created new freehand object:', {
          id: newObject.id,
          type: newObject.type,
          points: (newObject as any).points,
          startPoint: worldPoint
        });

        // Apply current brush properties
        newObject.style = {
          ...newObject.style,
          stroke: brushProperties.strokeColor,
          strokeWidth: brushProperties.strokeWidth,
          opacity: brushProperties.opacity
        };

        // If Ctrl is pressed, set up straight line mode
        if (isCtrlPressed) {
          setStraightLineStart(worldPoint);
        }

        setDrawingState(prev => ({
          ...prev,
          objects: [...prev.objects, newObject]
        }));
        
        setCurrentFreehandId(newObject.id);
        setIsDrawing(true);
        setDrawStart(worldPoint);
      } else if (drawingState.selectedTool === 'select') {
        // Only handle object selection/dragging when in select mode
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
      } else if (drawingState.selectedTool === 'flashcard') {
        // Handle flashcard placement
        setFlashcardPlacementPoint(worldPoint);
        setShowFlashcardPicker(true);
      }
    }
  }, [drawingState.selectedTool, drawingState.objects, viewport, width, height, brushProperties]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent browser context menu
    console.log('Main handleContextMenu called');
    
    // Only allow interactions in select mode
    if (drawingState.selectedTool !== 'select') {
      return;
    }
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });

    // Check if there's an object under the cursor
    const hitObject = drawingState.objects
      .slice()
      .reverse() // Check top objects first
      .find(obj => DrawingUtils.isPointInObject(worldPoint, obj));

    if (hitObject) {
      // Right-clicked on an object - show context menu
      console.log('Right-clicked on object:', hitObject.id);
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
      // Right-clicked on empty space - start rectangle selection
      console.log('Right-clicked on empty space - starting rectangle selection');
      setIsRectangleSelecting(true);
      setRectangleStart(worldPoint);
      setRectangleEnd(worldPoint);
      setContextMenu(null); // Close any existing context menu
    }
  }, [drawingState.selectedTool, drawingState.objects, viewport, width, height]);

  // Handle object context menu (called from individual widgets)
  const handleObjectContextMenu = useCallback((e: React.MouseEvent, objectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Object handleContextMenu called for:', objectId);
    
    // Find the object
    const obj = drawingState.objects.find(o => o.id === objectId);
    if (!obj) return;
    
    // Only change selection if the object is not already selected
    // This preserves multi-selection when right-clicking on already selected objects
    if (!obj.selected) {
      setDrawingState(prev => ({
        ...prev,
        selectedObjectIds: [objectId],
        objects: prev.objects.map(o => ({
          ...o,
          selected: o.id === objectId
        }))
      }));
    }

    // Show context menu at mouse coordinates
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      objectId: objectId,
      objectType: obj.type
    });
  }, [drawingState.objects]);

  // Handle mouse move - update drag offset, preview drawing, or move objects
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isRectangleSelecting && rectangleStart) {
      // Update rectangle selection end point
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });
      setRectangleEnd(worldPoint);
    } else if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setDragOffset({ x: deltaX, y: deltaY });
    } else if (isDrawing && currentFreehandId && drawingState.selectedTool === 'freehand') {
      // Add point to current freehand path
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });

      if (isCtrlPressed && straightLineStart) {
        // Straight line mode: Replace entire object with just start and current point
        setDrawingState(prev => ({
          ...prev,
          objects: prev.objects.map(obj => {
            if (obj.id === currentFreehandId && obj.type === 'freehand') {
              const freehandObj = obj as any;
              console.log('Straight line mode - points:', [straightLineStart, worldPoint]);
              return {
                ...freehandObj,
                points: [straightLineStart, worldPoint] // Only 2 points: start and current
              };
            }
            return obj;
          })
        }));
      } else if (!isCtrlPressed) {
        // Normal freehand mode: Add points continuously
        setDrawingState(prev => ({
          ...prev,
          objects: prev.objects.map(obj => {
            if (obj.id === currentFreehandId && obj.type === 'freehand') {
              const freehandObj = obj as any;
              const newPoints = [...freehandObj.points, worldPoint];
              return {
                ...freehandObj,
                points: newPoints
              };
            }
            return obj;
          })
        }));
      }
    }
    // Drawing preview could be handled here in the future
  }, [isRectangleSelecting, rectangleStart, viewport, width, height, isDragging, dragStart, isDrawing, currentFreehandId, drawingState.selectedTool, isCtrlPressed, straightLineStart]);

  // Handle mouse up - commit drag movement, create object, or finish object drag
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isRectangleSelecting && rectangleStart && rectangleEnd) {
      // Complete rectangle selection
      const minX = Math.min(rectangleStart.x, rectangleEnd.x);
      const maxX = Math.max(rectangleStart.x, rectangleEnd.x);
      const minY = Math.min(rectangleStart.y, rectangleEnd.y);
      const maxY = Math.max(rectangleStart.y, rectangleEnd.y);

      // Check if this was just a click (no drag) or an actual rectangle selection
      const isClick = Math.abs(rectangleEnd.x - rectangleStart.x) < 5 && Math.abs(rectangleEnd.y - rectangleStart.y) < 5;
      
      if (isClick) {
        // Just a right-click, clear selection
        setDrawingState(prev => ({
          ...prev,
          selectedObjectIds: [],
          objects: prev.objects.map(obj => ({
            ...obj,
            selected: false
          }))
        }));
      } else {
        // Find all objects that intersect with the rectangle
        const selectedObjects = drawingState.objects.filter(obj => {
          return DrawingUtils.isObjectInRectangle(obj, minX, minY, maxX, maxY);
        });

        // Update selection state
        const selectedIds = selectedObjects.map(obj => obj.id);
        setDrawingState(prev => ({
          ...prev,
          selectedObjectIds: selectedIds,
          objects: prev.objects.map(obj => ({
            ...obj,
            selected: selectedIds.includes(obj.id)
          }))
        }));
      }

      // Reset rectangle selection state
      setIsRectangleSelecting(false);
      setRectangleStart(null);
      setRectangleEnd(null);
    } else if (isDragging) {
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
    } else if (isDrawing && drawStart) {
      if (drawingState.selectedTool === 'freehand' && currentFreehandId) {
        // Finish freehand drawing - save to database
        // Use ref to get the latest state with all accumulated points
        const completedObject = drawingStateRef.current.objects.find(obj => obj.id === currentFreehandId);
        console.log('Finishing freehand drawing. Completed object:', {
          id: completedObject?.id,
          type: completedObject?.type,
          points: completedObject?.type === 'freehand' ? (completedObject as any).points : 'N/A',
          pointCount: completedObject?.type === 'freehand' ? (completedObject as any).points?.length : 'N/A'
        });
        
        if (completedObject && onObjectCreated) {
          onObjectCreated(completedObject).catch(error => {
            console.error('Failed to save freehand object:', error);
          });
        }
        
        setCurrentFreehandId(null);
        setIsDrawing(false);
        setDrawStart(null);
        // Reset straight line state
        setStraightLineStart(null);
      }
      // Remove creation logic for other drawing tools since they're no longer supported
    }
  }, [isRectangleSelecting, rectangleStart, rectangleEnd, drawingState.objects, isDragging, isDrawing, drawStart, dragOffset, viewBoxWidth, viewBoxHeight, width, height, viewport, drawingState.selectedTool, currentFreehandId]);

  // Global mouse events
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is editing text (input, textarea, or contenteditable)
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      // ESC key - switch to select tool (always, even when editing text)
      if (e.key === 'Escape') {
        e.preventDefault();
        console.log('ESC KEY: Switching to select tool');
        setDrawingState(prev => ({
          ...prev,
          selectedTool: 'select'
        }));
        
        // Also clear any ongoing drawing or selection operations
        setIsDrawing(false);
        setCurrentFreehandId(null);
        setDrawStart(null);
        setStraightLineStart(null);
        setIsRectangleSelecting(false);
        setRectangleStart(null);
        setRectangleEnd(null);
        setContextMenu(null);
        return;
      }

      // Tool shortcuts (only when not editing text)
      if (!isEditingText) {
        // F key - switch to freehand tool
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          console.log('F KEY: Switching to freehand tool');
          setDrawingState(prev => ({
            ...prev,
            selectedTool: 'freehand'
          }));
          return;
        }

        // S key - switch to sticky-note tool
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          console.log('S KEY: Switching to sticky-note tool');
          setDrawingState(prev => ({
            ...prev,
            selectedTool: 'sticky-note'
          }));
          return;
        }
      }

      // Only allow Delete key (not Backspace) and only when not editing text
      if (e.key === 'Delete') {
        if (!isEditingText && drawingState.selectedObjectIds.length > 0) {
          e.preventDefault();
          console.log('DELETE KEY: Showing confirmation for objects', drawingState.selectedObjectIds);
          
          // Show confirmation dialog for selected objects
          setConfirmDelete({
            isOpen: true,
            objectsToDelete: [...drawingState.selectedObjectIds]
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingState.selectedObjectIds, onObjectDeleted]);

  // Ctrl key detection for straight line drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Control' || e.ctrlKey) && !isCtrlPressed) {
        setIsCtrlPressed(true);
        
        // If currently drawing, switch to straight line mode
        if (isDrawing && currentFreehandId) {
          const currentObj = drawingState.objects.find(obj => obj.id === currentFreehandId);
          if (currentObj && currentObj.type === 'freehand') {
            const freehandObj = currentObj as any;
            // Remember the start point (first point of the current drawing)
            if (freehandObj.points.length > 0) {
              setStraightLineStart(freehandObj.points[0]);
            }
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || !e.ctrlKey) {
        setIsCtrlPressed(false);
        setStraightLineStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isCtrlPressed, isDrawing, currentFreehandId, drawingState.objects]);

  useEffect(() => {
    // Only handle canvas panning events here, object dragging is handled in handleObjectDragStart
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setDragOffset({ x: deltaX, y: deltaY });
      };

      const handleGlobalMouseUp = () => {
        console.log('Canvas pan ended');
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
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, dragOffset, viewBoxWidth, viewBoxHeight, width, height, viewport]);

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

    // Save both objects to database immediately
    if (onObjectCreated) {
      Promise.all([
        onObjectCreated(newFlashcardObject),
        onObjectCreated(newTranslationObject)
      ]).catch(error => {
        console.error('Failed to save flashcard objects:', error);
      });
    }

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
          
          // Only freehand and translation objects support any kind of resizing/moving
          // For now, just return the object unchanged for other types
          return obj;
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
    console.log('=== DRAG START ===', { objectId, startPoint });
    const draggedObject = drawingState.objects.find(obj => obj.id === objectId);
    if (!draggedObject) {
      console.error('Could not find object to drag:', objectId);
      return;
    }

    // If the clicked object is not selected, select it first
    const isObjectSelected = drawingState.selectedObjectIds.includes(objectId);
    let objectsToMove = drawingState.selectedObjectIds;
    
    if (!isObjectSelected) {
      // Select the clicked object and deselect others
      objectsToMove = [objectId];
      setDrawingState(prev => ({
        ...prev,
        selectedObjectIds: [objectId],
        objects: prev.objects.map(obj => ({
          ...obj,
          selected: obj.id === objectId
        }))
      }));
    }

    // Store original positions for all objects that will be moved
    const originalPositions = new Map<string, Point>();
    const originalPoints = new Map<string, Point[]>();
    drawingState.objects.forEach(obj => {
      if (objectsToMove.includes(obj.id)) {
        originalPositions.set(obj.id, { x: obj.x, y: obj.y });
        if (obj.type === 'freehand') {
          const freehandObj = obj as any;
          originalPoints.set(obj.id, [...(freehandObj.points || [])]);
        }
      }
    });

    console.log('Setting drag state for objects:', objectsToMove);
    setIsDraggingObject(true);
    setDraggedObjectId(objectId); // Keep track of which object was clicked
    setObjectDragStart(startPoint);
    setSelectedObjectsOriginalPositions(originalPositions);
    setSelectedObjectsOriginalPoints(originalPoints);
    console.log('Drag state set - isDraggingObject: true, moving objects:', objectsToMove.length);
    
    // Set up global mouse events immediately using direct event listeners
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPoint = DrawingUtils.screenToWorld(screenPoint, viewport, { width, height });
      
      // Calculate total delta from original start position
      const totalDeltaX = worldPoint.x - startPoint.x;
      const totalDeltaY = worldPoint.y - startPoint.y;

      // Move all selected objects by the same delta
      setDrawingState(prev => ({
        ...prev,
        objects: prev.objects.map(obj => {
          if (objectsToMove.includes(obj.id)) {
            const originalPos = originalPositions.get(obj.id);
            if (originalPos) {
              if (obj.type === 'freehand') {
                // For freehand objects, move all points by the delta from their original positions
                const originalPointsArray = originalPoints.get(obj.id);
                if (originalPointsArray) {
                  return {
                    ...obj,
                    x: originalPos.x + totalDeltaX,
                    y: originalPos.y + totalDeltaY,
                    points: originalPointsArray.map((point: Point) => ({
                      x: point.x + totalDeltaX,
                      y: point.y + totalDeltaY
                    }))
                  };
                }
              } else {
                // For regular objects, just move x, y
                return { ...obj, x: originalPos.x + totalDeltaX, y: originalPos.y + totalDeltaY };
              }
            }
          }
          return obj;
        })
      }));
    };

    const handleGlobalMouseUp = () => {
      console.log('=== GLOBAL MOUSE UP EVENT ===');
      console.log('Saving positions for objects:', objectsToMove);
      
      // Save positions to database for all moved objects
      if (onObjectUpdated) {
        objectsToMove.forEach(objId => {
          const currentObject = drawingStateRef.current.objects.find(obj => obj.id === objId);
          if (currentObject) {
            console.log('Saving position:', { id: objId, x: currentObject.x, y: currentObject.y });
            
            if (currentObject.type === 'freehand') {
              // For freehand objects, save both position and updated points
              const freehandObj = currentObject as any;
              onObjectUpdated(objId, {
                x: currentObject.x,
                y: currentObject.y,
                points: freehandObj.points
              }).catch(error => {
                console.error('Failed to save freehand object:', error);
              });
            } else {
              // For regular objects, just save position
              onObjectUpdated(objId, {
                x: currentObject.x,
                y: currentObject.y
              }).catch(error => {
                console.error('Failed to save object position:', error);
              });
            }
          }
        });
      }
      
      // Clean up drag state
      setIsDraggingObject(false);
      setDraggedObjectId(null);
      setObjectDragStart(null);
      setSelectedObjectsOriginalPositions(new Map());
      setSelectedObjectsOriginalPoints(new Map());
      
      // Remove event listeners
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    // Add event listeners
    console.log('Adding global event listeners for drag');
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [drawingState.objects, drawingState.selectedObjectIds, viewport, width, height, onObjectUpdated]);

  // Handle context menu close
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Confirm delete function
  const confirmDeleteObjects = useCallback(async () => {
    console.log('CONFIRMING DELETE: Deleting objects', confirmDelete.objectsToDelete);
    
    // Delete all objects from state
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => !confirmDelete.objectsToDelete.includes(obj.id)),
      selectedObjectIds: []
    }));
    
    // Close confirmation dialog
    setConfirmDelete({ isOpen: false, objectsToDelete: [] });
    
    // Close context menu
    setContextMenu(null);
    
    // Delete from database immediately
    if (onObjectDeleted) {
      confirmDelete.objectsToDelete.forEach(objectId => {
        onObjectDeleted(objectId).catch(error => {
          console.error('Failed to delete object from database:', error);
        });
      });
    }
  }, [confirmDelete.objectsToDelete, onObjectDeleted]);

  // Handle object delete
  const handleDeleteObject = useCallback(() => {
    if (!contextMenu) return;
    
    const contextObjectId = contextMenu.objectId;
    
    // Determine which objects to delete: if the right-clicked object is selected,
    // delete all selected objects; otherwise, delete just the right-clicked object
    let objectsToDelete: string[];
    if (drawingState.selectedObjectIds.includes(contextObjectId)) {
      // Right-clicked object is part of selection - delete all selected objects
      objectsToDelete = [...drawingState.selectedObjectIds];
    } else {
      // Right-clicked object is not selected - delete just this object
      objectsToDelete = [contextObjectId];
    }
    
    // Show confirmation dialog
    setConfirmDelete({
      isOpen: true,
      objectsToDelete
    });
    
    setContextMenu(null);
  }, [contextMenu, drawingState.selectedObjectIds]);

  // Handle confirmed deletion
  const handleConfirmDelete = useCallback(() => {
    const { objectsToDelete } = confirmDelete;
    
    if (objectsToDelete.length === 0) return;
    
    // Remove objects from state
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => !objectsToDelete.includes(obj.id)),
      selectedObjectIds: prev.selectedObjectIds.filter(id => !objectsToDelete.includes(id))
    }));
    
    // Delete from database
    if (onObjectDeleted) {
      objectsToDelete.forEach(objectId => {
        onObjectDeleted(objectId).catch(error => {
          console.error('Failed to delete object from database:', error);
        });
      });
    }
    
    // Close confirmation dialog
    setConfirmDelete({ isOpen: false, objectsToDelete: [] });
  }, [confirmDelete, onObjectDeleted]);

  // Handle cancel deletion
  const handleCancelDelete = useCallback(() => {
    setConfirmDelete({ isOpen: false, objectsToDelete: [] });
  }, []);

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
    
    // Save to database immediately
    if (onObjectUpdated) {
      onObjectUpdated(objectId, updates).catch(error => {
        console.error('Failed to update object in database:', error);
      });
    }
  }, [onObjectUpdated]);

  // Brush properties handlers
  const handleStrokeColorChange = useCallback((color: string) => {
    setBrushProperties(prev => ({ ...prev, strokeColor: color }));
  }, []);

  const handleStrokeWidthChange = useCallback((width: number) => {
    setBrushProperties(prev => ({ ...prev, strokeWidth: width }));
  }, []);

  const handleOpacityChange = useCallback((opacity: number) => {
    setBrushProperties(prev => ({ ...prev, opacity }));
  }, []);

  // Sticky note properties handlers
  const handlePaperColorChange = useCallback((color: string) => {
    setStickyNoteProperties(prev => ({ ...prev, paperColor: color }));
    // Update selected sticky notes
    setDrawingState(prev => {
      const updatedObjects = prev.objects.map(obj => {
        if (obj.selected && obj.type === 'sticky-note') {
          const updatedObj = { ...obj, paperColor: color, style: { ...obj.style, fill: color } };
          // Save to database immediately
          if (onObjectUpdated) {
            onObjectUpdated(obj.id, { paperColor: color, style: { ...obj.style, fill: color } }).catch(error => {
              console.error('Failed to save sticky note paper color:', error);
            });
          }
          return updatedObj;
        }
        return obj;
      });
      
      return {
        ...prev,
        objects: updatedObjects
      };
    });
  }, [onObjectUpdated]);

  const handleFontColorChange = useCallback((color: string) => {
    setStickyNoteProperties(prev => ({ ...prev, fontColor: color }));
    // Update selected sticky notes
    setDrawingState(prev => {
      const updatedObjects = prev.objects.map(obj => {
        if (obj.selected && obj.type === 'sticky-note') {
          const updatedObj = { ...obj, fontColor: color };
          // Save to database immediately
          if (onObjectUpdated) {
            onObjectUpdated(obj.id, { fontColor: color }).catch(error => {
              console.error('Failed to save sticky note font color:', error);
            });
          }
          return updatedObj;
        }
        return obj;
      });
      
      return {
        ...prev,
        objects: updatedObjects
      };
    });
  }, [onObjectUpdated]);

  const handleFontSizeChange = useCallback((size: number) => {
    setStickyNoteProperties(prev => ({ ...prev, fontSize: size }));
    // Update selected sticky notes
    setDrawingState(prev => {
      const updatedObjects = prev.objects.map(obj => {
        if (obj.selected && obj.type === 'sticky-note') {
          const updatedObj = { ...obj, fontSize: size };
          // Save to database immediately
          if (onObjectUpdated) {
            onObjectUpdated(obj.id, { fontSize: size }).catch(error => {
              console.error('Failed to save sticky note font size:', error);
            });
          }
          return updatedObj;
        }
        return obj;
      });
      
      return {
        ...prev,
        objects: updatedObjects
      };
    });
  }, [onObjectUpdated]);

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

      {/* Brush Properties Panel - show when freehand tool is selected */}
      {drawingState.selectedTool === 'freehand' && (
        <div className="brush-properties-container">
          <BrushPropertiesPanel
            strokeColor={brushProperties.strokeColor}
            strokeWidth={brushProperties.strokeWidth}
            opacity={brushProperties.opacity}
            onStrokeColorChange={handleStrokeColorChange}
            onStrokeWidthChange={handleStrokeWidthChange}
            onOpacityChange={handleOpacityChange}
          />
        </div>
      )}

      {/* Sticky Note Properties Panel - show when sticky note tool is selected or a sticky note is selected */}
      {(drawingState.selectedTool === 'sticky-note' || 
        drawingState.objects.some(obj => obj.selected && obj.type === 'sticky-note')) && (
        <div className="sticky-note-properties-container">
          <StickyNotePropertiesPanel
            paperColor={stickyNoteProperties.paperColor}
            fontColor={stickyNoteProperties.fontColor}
            fontSize={stickyNoteProperties.fontSize}
            onPaperColorChange={handlePaperColorChange}
            onFontColorChange={handleFontColorChange}
            onFontSizeChange={handleFontSizeChange}
          />
        </div>
      )}

      {/* Canvas Info Overlay */}
      <div className="canvas-info">
        <div>Zoom: {Math.round(viewport.zoom * 100)}%</div>
        <div>Position: ({Math.round(viewport.x)}, {Math.round(viewport.y)})</div>
        <div>Tool: {drawingState.selectedTool}</div>
        <div>Objects: {drawingState.objects.length}</div>
        <div>Selected: {drawingState.selectedObjectIds.length}</div>
        {/* {isDragging && <div>Panning...</div>} */}
        {/* {isDraggingObject && <div>Moving {drawingState.selectedObjectIds.length} object(s)...</div>} */}
        {/* {isDrawing && <div>Drawing...</div>} */}
        {/* {isRectangleSelecting && <div>Selecting...</div>} */}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="drawing-canvas"
        width={width}
        height={height}
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{
          cursor: isRectangleSelecting ? 'crosshair' :
                  isDraggingObject ? 'grabbing' :
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
            onContextMenu={handleObjectContextMenu}
            isDragging={isDraggingObject}
            draggedObjectId={draggedObjectId}
            currentTool={drawingState.selectedTool}
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

        {/* Rectangle selection visual */}
        {isRectangleSelecting && rectangleStart && rectangleEnd && (
          <rect
            x={Math.min(rectangleStart.x, rectangleEnd.x)}
            y={Math.min(rectangleStart.y, rectangleEnd.y)}
            width={Math.abs(rectangleEnd.x - rectangleStart.x)}
            height={Math.abs(rectangleEnd.y - rectangleStart.y)}
            fill="rgba(0, 122, 204, 0.2)"
            stroke="#007acc"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${confirmDelete.objectsToDelete.length === 1 ? 'this object' : `these ${confirmDelete.objectsToDelete.length} objects`}?`}
        details={confirmDelete.objectsToDelete.map(objectId => {
          const obj = drawingState.objects.find(o => o.id === objectId);
          if (obj?.type === 'sticky-note') {
            const objData = obj as any;
            return `Sticky Note: "${objData.text || 'Untitled'}"`;
          } else if (obj?.type === 'freehand') {
            const objData = obj as any;
            return `Freehand Drawing (${objData.points?.length || 0} points)`;
          } else if (obj?.type === 'flashcard') {
            return `Flashcard`;
          } else if (obj?.type === 'translation') {
            return `Translation`;
          }
          return `Object: ${objectId}`;
        })}
        onConfirm={confirmDeleteObjects}
        onCancel={() => setConfirmDelete({ isOpen: false, objectsToDelete: [] })}
        variant="danger"
      />
    </div>
  );
});

export default DrawingCanvas;
