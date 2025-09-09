import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import DrawingCanvas from './DrawingCanvas';
import { Canvas, CanvasState, canvasToRecord, recordToCanvas, drawingObjectToRecord, recordToDrawingObject, DrawingObject } from '../../lib/types/drawing';
import pocketBaseService from '../../lib/services/pocketbase';
import type { MovieCanvasRecord, CanvasObjectRecord } from '../../lib/types/database';
import './DrawingMode.css';

interface DrawingModeProps {
  movieId: string; // Make movieId required since we need it for database operations
}

interface DrawingModeRef {
  saveCurrentViewport: () => Promise<boolean>;
}

export const DrawingMode = React.forwardRef<DrawingModeRef, DrawingModeProps>(({ movieId }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<any>(null); // Add ref for DrawingCanvas
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [canvasState, setCanvasState] = useState<CanvasState>({
    canvases: [],
    activeCanvasId: null
  });
  
  // UI state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCanvasTitle, setNewCanvasTitle] = useState('');
  
  // Save status state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingViewport, setIsSavingViewport] = useState(false);
  const [isSavingObject, setIsSavingObject] = useState(false);
  
  // Load canvases from database when component mounts or movieId changes
  useEffect(() => {
    const loadCanvases = async () => {
      if (!movieId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Load canvases for this movie
        const canvasRecords = await pocketBaseService.getMovieCanvases(movieId);
        
        if (canvasRecords.length === 0) {
          // Create a default canvas if none exist
          const defaultCanvasData = {
            title: 'Canvas 1',
            movie_id: movieId,
            viewport_x: 0,
            viewport_y: 0,
            viewport_zoom: 1,
            object_count: 0,
          };
          
          const newCanvas = await pocketBaseService.createCanvas(defaultCanvasData);
          const uiCanvas = recordToCanvas(newCanvas, []);
          
          setCanvasState({
            canvases: [uiCanvas],
            activeCanvasId: uiCanvas.id
          });
        } else {
          // Convert database records to UI canvases
          const uiCanvases: Canvas[] = [];
          
          for (const canvasRecord of canvasRecords) {
            // Load objects for each canvas
            const objectRecords = await pocketBaseService.getCanvasObjects(canvasRecord.id);
            console.log('Loading canvas:', canvasRecord.title, 'with', objectRecords.length, 'objects');
            console.log('Object records:', objectRecords);
            
            const uiObjects = objectRecords.map((record, index) => {
              try {
                const obj = recordToDrawingObject(record);
                console.log(`Converted object ${index}:`, obj);
                return obj;
              } catch (error) {
                console.error(`Failed to convert object ${index}:`, error, record);
                return null;
              }
            }).filter(obj => obj !== null) as DrawingObject[];
            
            console.log('Final UI objects for canvas:', uiObjects);
            
            const uiCanvas = recordToCanvas(canvasRecord, uiObjects);
            uiCanvases.push(uiCanvas);
          }
          
          setCanvasState({
            canvases: uiCanvases,
            activeCanvasId: uiCanvases[0]?.id || null
          });
          console.log('Set canvas state with canvases:', uiCanvases);
          console.log('Active canvas ID set to:', uiCanvases[0]?.id);
          if (uiCanvases[0]) {
            console.log('Active canvas objects:', uiCanvases[0].objects);
          }
        }
        
      } catch (error) {
        console.error('Error loading canvases:', error);
        setError('Failed to load canvases. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCanvases();
  }, [movieId]);

  // Save viewport when component unmounts or movieId changes
  useEffect(() => {
    return () => {
      // Save viewport on cleanup - use a more immediate approach
      if (canvasState.activeCanvasId && drawingCanvasRef.current) {
        console.log('Component unmounting, saving viewport immediately');
        
        // Get current viewport immediately
        const currentViewport = drawingCanvasRef.current.getCurrentState()?.viewport;
        if (currentViewport) {
          // Use a synchronous approach for immediate save
          const savePromise = pocketBaseService.updateCanvas(canvasState.activeCanvasId, {
            viewport_x: currentViewport.x,
            viewport_y: currentViewport.y,
            viewport_zoom: currentViewport.zoom,
          });
          
          // Don't await - let it complete in background
          savePromise.catch(error => {
            console.error('Failed to save viewport on unmount:', error);
          });
        }
      }
    };
  }, [canvasState.activeCanvasId]);

  // Save viewport when page is about to unload or becomes hidden
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (canvasState.activeCanvasId && drawingCanvasRef.current) {
        console.log('Page unloading, saving viewport');
        
        const currentViewport = drawingCanvasRef.current.getCurrentState()?.viewport;
        if (currentViewport) {
          // For unload events, just trigger a quick save without waiting
          // The browser will terminate the process anyway, so we can't rely on promises
          const savePromise = pocketBaseService.updateCanvas(canvasState.activeCanvasId, {
            viewport_x: currentViewport.x,
            viewport_y: currentViewport.y,
            viewport_zoom: currentViewport.zoom,
          });
          
          // Let it complete in background
          savePromise.catch(error => {
            console.error('Failed to save viewport on unload:', error);
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && canvasState.activeCanvasId) {
        console.log('Tab hidden, saving viewport');
        saveCurrentViewport();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [canvasState.activeCanvasId]);

  // Canvas management functions (updated for database)
  const createCanvas = async (title: string) => {
    if (!movieId) return;

    try {
      setError(null);
      
      const canvasData = {
        title,
        movie_id: movieId,
        viewport_x: 0,
        viewport_y: 0,
        viewport_zoom: 1,
        object_count: 0,
      };

      const newCanvasRecord = await pocketBaseService.createCanvas(canvasData);
      const newCanvas = recordToCanvas(newCanvasRecord, []);

      setCanvasState(prev => ({
        canvases: [...prev.canvases, newCanvas],
        activeCanvasId: newCanvas.id
      }));

    } catch (error) {
      console.error('Error creating canvas:', error);
      setError('Failed to create canvas. Please try again.');
    }
  };

  const selectCanvas = async (canvasId: string) => {
    // Save current viewport before switching
    if (canvasState.activeCanvasId && canvasState.activeCanvasId !== canvasId) {
      console.log('Saving viewport before switching canvas');
      await saveCurrentViewport();
    }

    setCanvasState(prev => ({
      ...prev,
      activeCanvasId: canvasId
    }));
  };

  const renameCanvas = async (canvasId: string, newTitle: string) => {
    try {
      setError(null);
      
      // Update in database
      await pocketBaseService.updateCanvas(canvasId, { title: newTitle });
      
      // Update local state
      setCanvasState(prev => ({
        ...prev,
        canvases: prev.canvases.map(canvas =>
          canvas.id === canvasId
            ? { ...canvas, title: newTitle, lastModified: new Date() }
            : canvas
        )
      }));

    } catch (error) {
      console.error('Error renaming canvas:', error);
      setError('Failed to rename canvas. Please try again.');
    }
  };

  const deleteCanvas = async (canvasId: string) => {
    if (canvasState.canvases.length <= 1) {
      setError('Cannot delete the last canvas');
      return;
    }

    try {
      setError(null);
      
      // Delete from database (this also deletes all objects)
      await pocketBaseService.deleteCanvas(canvasId);
      
      // Update local state
      const remainingCanvases = canvasState.canvases.filter(c => c.id !== canvasId);
      const newActiveId = canvasId === canvasState.activeCanvasId 
        ? remainingCanvases[0].id 
        : canvasState.activeCanvasId;

      setCanvasState({
        canvases: remainingCanvases,
        activeCanvasId: newActiveId
      });

    } catch (error) {
      console.error('Error deleting canvas:', error);
      setError('Failed to delete canvas. Please try again.');
    }
  };

  const getCurrentCanvas = (): Canvas | null => {
    return canvasState.canvases.find(c => c.id === canvasState.activeCanvasId) || null;
  };

  // Save current viewport to database
  const saveCurrentViewport = async (): Promise<boolean> => {
    if (!canvasState.activeCanvasId || isSavingViewport) {
      return false;
    }

    // Get current viewport from DrawingCanvas
    const currentViewport = drawingCanvasRef.current?.getCurrentState()?.viewport;
    if (!currentViewport) {
      console.log('No viewport to save');
      return false;
    }

    setIsSavingViewport(true);
    setError(null);

    try {
      console.log('Saving viewport for canvas:', canvasState.activeCanvasId, currentViewport);
      
      // Update only viewport fields in database
      await pocketBaseService.updateCanvas(canvasState.activeCanvasId, {
        viewport_x: currentViewport.x,
        viewport_y: currentViewport.y,
        viewport_zoom: currentViewport.zoom,
      });

      // Update local state to match
      setCanvasState(prev => ({
        ...prev,
        canvases: prev.canvases.map(canvas =>
          canvas.id === canvasState.activeCanvasId
            ? { 
                ...canvas, 
                viewport: currentViewport,
                lastModified: new Date() 
              }
            : canvas
        )
      }));

      console.log('Viewport saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving viewport:', error);
      setError('Failed to save viewport position');
      return false;
    } finally {
      setIsSavingViewport(false);
    }
  };

  // Object CRUD operations
  const handleObjectCreated = async (object: DrawingObject): Promise<void> => {
    if (!canvasState.activeCanvasId) return;

    setIsSavingObject(true);
    try {
      console.log('Creating object in database:', object.id, object.type);
      
      const objectData = drawingObjectToRecord(object, canvasState.activeCanvasId);
      await pocketBaseService.createCanvasObject(objectData);
      
      // Update local state to include the new object
      setCanvasState(prev => ({
        ...prev,
        canvases: prev.canvases.map(canvas =>
          canvas.id === canvasState.activeCanvasId
            ? { 
                ...canvas, 
                objects: canvas.objects.some(obj => obj.id === object.id) 
                  ? canvas.objects // Object already exists in state
                  : [...canvas.objects, object], // Add if not exists
                lastModified: new Date() 
              }
            : canvas
        )
      }));
      
      console.log('Object created successfully:', object.id);
    } catch (error) {
      console.error('Failed to create object:', error);
      throw error; // Re-throw so the canvas can handle it
    } finally {
      setIsSavingObject(false);
    }
  };

  const handleObjectUpdated = async (objectId: string, updates: Partial<DrawingObject>): Promise<void> => {
    if (!canvasState.activeCanvasId) return;

    try {
      console.log('Updating object in database:', objectId, updates);
      
      // Get the current object from local state
      const currentCanvas = getCurrentCanvas();
      const currentObject = currentCanvas?.objects.find(obj => obj.id === objectId);
      if (!currentObject) {
        console.warn('Object not found for update:', objectId);
        return;
      }

      // Merge updates with current object
      const updatedObject = { ...currentObject, ...updates } as DrawingObject;
      const objectData = drawingObjectToRecord(updatedObject, canvasState.activeCanvasId);
      
      // For now, update all fields (we can optimize later to only send changed fields)
      await pocketBaseService.updateCanvasObject(objectId, {
        x: objectData.x,
        y: objectData.y,
        object_data: objectData.object_data
      });
      
      // Update local state
      setCanvasState(prev => ({
        ...prev,
        canvases: prev.canvases.map(canvas =>
          canvas.id === canvasState.activeCanvasId
            ? { 
                ...canvas, 
                objects: canvas.objects.map(obj =>
                  obj.id === objectId ? updatedObject : obj
                ),
                lastModified: new Date() 
              }
            : canvas
        )
      }));
      
      console.log('Object updated successfully:', objectId);
    } catch (error) {
      console.error('Failed to update object:', error);
      throw error;
    }
  };

  const handleObjectDeleted = async (objectId: string): Promise<void> => {
    try {
      console.log('Deleting object from database:', objectId);
      
      await pocketBaseService.deleteCanvasObject(objectId);
      
      // Update local state to remove the object
      setCanvasState(prev => ({
        ...prev,
        canvases: prev.canvases.map(canvas =>
          canvas.id === canvasState.activeCanvasId
            ? { 
                ...canvas, 
                objects: canvas.objects.filter(obj => obj.id !== objectId),
                lastModified: new Date() 
              }
            : canvas
        )
      }));
      
      console.log('Object deleted successfully:', objectId);
    } catch (error) {
      console.error('Failed to delete object:', error);
      throw error;
    }
  };

  // Dropdown handlers
  const handleCreateCanvas = () => {
    if (newCanvasTitle.trim()) {
      createCanvas(newCanvasTitle.trim());
      setNewCanvasTitle('');
      setIsCreating(false);
      setIsDropdownOpen(false);
    }
  };

  const handleRenameCanvas = (canvasId: string) => {
    if (editingTitle.trim()) {
      renameCanvas(canvasId, editingTitle.trim());
      setEditingCanvasId(null);
      setEditingTitle('');
    }
  };

  const startEdit = (canvas: Canvas) => {
    setEditingCanvasId(canvas.id);
    setEditingTitle(canvas.title);
  };

  const handleCanvasSelect = async (canvasId: string) => {
    await selectCanvas(canvasId);
    setIsDropdownOpen(false);
  };

  const handleDeleteCanvas = (canvasId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (canvasState.canvases.length > 1) {
      deleteCanvas(canvasId);
    }
  };

  // Expose save method to parent component
  useImperativeHandle(ref, () => ({
    saveCurrentViewport: saveCurrentViewport
  }), [saveCurrentViewport]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setEditingCanvasId(null);
        setIsCreating(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newDimensions = {
          width: rect.width,
          height: rect.height
        };
        
        // Only update if dimensions actually changed
        setDimensions(prev => {
          if (prev.width !== newDimensions.width || prev.height !== newDimensions.height) {
            console.log('Dimensions updated:', newDimensions);
            return newDimensions;
          }
          return prev;
        });
      }
    };

    // Initial update
    updateDimensions();
    
    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    
    // Use ResizeObserver for more reliable dimension tracking
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }
    
    // Also update dimensions when canvas state changes (container might become visible)
    const timeoutId = setTimeout(updateDimensions, 100);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      clearTimeout(timeoutId);
    };
  }, [canvasState.activeCanvasId]); // Re-run when active canvas changes

  // Loading state
  if (isLoading) {
    return (
      <div className="drawing-mode loading">
        <div className="loading-message">
          <p>Loading canvases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="drawing-mode">
      <div className="drawing-mode-header">
        <div className="canvas-dropdown" ref={dropdownRef}>
          <button 
            className="canvas-dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="canvas-title">
              {getCurrentCanvas()?.title || 'My Drawing Canvas'}
            </span>
            <span className="canvas-count">
              {canvasState.canvases.length} canvas{canvasState.canvases.length !== 1 ? 'es' : ''}
            </span>
            <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼▼</span>
          </button>

          {isDropdownOpen && (
            <div className="canvas-dropdown-menu">
              <button 
                className="new-canvas-btn"
                onClick={() => {
                  setIsCreating(true);
                  setNewCanvasTitle('');
                }}
              >
                + New Canvas
              </button>

              <div className="canvas-list">
                {isCreating && (
                  <div className="canvas-row new-canvas">
                    <input
                      type="text"
                      className="canvas-input"
                      placeholder="Canvas name..."
                      value={newCanvasTitle}
                      onChange={(e) => setNewCanvasTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateCanvas();
                        if (e.key === 'Escape') setIsCreating(false);
                      }}
                      autoFocus
                    />
                    <button className="save-btn" onClick={handleCreateCanvas}>Save</button>
                    <button className="cancel-btn" onClick={() => setIsCreating(false)}>Cancel</button>
                  </div>
                )}

                {canvasState.canvases.map((canvas) => (
                  <div 
                    key={canvas.id}
                    className={`canvas-row ${canvas.id === getCurrentCanvas()?.id ? 'active' : ''}`}
                    onClick={() => !editingCanvasId ? handleCanvasSelect(canvas.id) : undefined}
                  >
                    {editingCanvasId === canvas.id ? (
                      <>
                        <input
                          type="text"
                          className="canvas-input"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameCanvas(canvas.id);
                            if (e.key === 'Escape') setEditingCanvasId(null);
                          }}
                          onBlur={() => handleRenameCanvas(canvas.id)}
                          autoFocus
                        />
                        <button className="save-btn" onClick={() => handleRenameCanvas(canvas.id)}>Save</button>
                        <button className="cancel-btn" onClick={() => setEditingCanvasId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div className="canvas-details">
                          <div className="canvas-name">{canvas.title}</div>
                        </div>
                        <button 
                          className="edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(canvas);
                          }}
                          title="Rename"
                        >
                          Edit
                        </button>
                        {canvasState.canvases.length > 1 && (
                          <button 
                            className="delete-btn"
                            onClick={(e) => handleDeleteCanvas(canvas.id, e)}
                            title="Delete"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {canvasState.canvases.length === 0 && (
                <div className="empty-message">
                  <p>No canvases yet</p>
                  <button 
                    className="create-first-btn"
                    onClick={() => setIsCreating(true)}
                  >
                    Create your first canvas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="drawing-mode-info">
          <span>Drag to pan • Scroll to zoom • Origin at center (0,0)</span>
          {isSavingViewport && (
            <span className="save-status saving">
              • Saving viewport...
            </span>
          )}
          {isSavingObject && (
            <span className="save-status saving">
              • Saving object...
            </span>
          )}
        </div>
      </div>
      
      <div className="drawing-mode-content" ref={containerRef}>
        <DrawingCanvas 
          ref={drawingCanvasRef}
          width={dimensions.width} 
          height={dimensions.height}
          movieId={movieId}
          currentCanvas={getCurrentCanvas()}
          onObjectCreated={handleObjectCreated}
          onObjectUpdated={handleObjectUpdated}
          onObjectDeleted={handleObjectDeleted}
        />
      </div>
    </div>
  );
});

export default DrawingMode;
