import React, { useRef, useEffect, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';
import { Canvas, CanvasState } from '../../lib/types/drawing';
import './DrawingMode.css';

interface DrawingModeProps {
  movieId?: string;
}

export const DrawingMode: React.FC<DrawingModeProps> = ({ movieId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [canvasState, setCanvasState] = useState<CanvasState>({
    canvases: [],
    activeCanvasId: null
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCanvasTitle, setNewCanvasTitle] = useState('');

  // Initialize with a default canvas
  useEffect(() => {
    if (canvasState.canvases.length === 0) {
      const defaultCanvas: Canvas = {
        id: 'default-' + Date.now(),
        title: 'My Drawing Canvas',
        createdAt: new Date(),
        lastModified: new Date(),
        objects: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      };
      setCanvasState({
        canvases: [defaultCanvas],
        activeCanvasId: defaultCanvas.id
      });
    }
  }, []);

  // Canvas management functions
  const createCanvas = (title: string) => {
    const newCanvas: Canvas = {
      id: 'canvas-' + Date.now(),
      title,
      createdAt: new Date(),
      lastModified: new Date(),
      objects: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    };

    setCanvasState(prev => ({
      canvases: [...prev.canvases, newCanvas],
      activeCanvasId: newCanvas.id
    }));
  };

  const selectCanvas = (canvasId: string) => {
    setCanvasState(prev => ({
      ...prev,
      activeCanvasId: canvasId
    }));
  };

  const renameCanvas = (canvasId: string, newTitle: string) => {
    setCanvasState(prev => ({
      ...prev,
      canvases: prev.canvases.map(canvas =>
        canvas.id === canvasId
          ? { ...canvas, title: newTitle, lastModified: new Date() }
          : canvas
      )
    }));
  };

  const deleteCanvas = (canvasId: string) => {
    if (canvasState.canvases.length <= 1) return;

    const remainingCanvases = canvasState.canvases.filter(c => c.id !== canvasId);
    const newActiveId = canvasId === canvasState.activeCanvasId 
      ? remainingCanvases[0].id 
      : canvasState.activeCanvasId;

    setCanvasState({
      canvases: remainingCanvases,
      activeCanvasId: newActiveId
    });
  };

  const getCurrentCanvas = (): Canvas | null => {
    return canvasState.canvases.find(c => c.id === canvasState.activeCanvasId) || null;
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

  const handleCanvasSelect = (canvasId: string) => {
    selectCanvas(canvasId);
    setIsDropdownOpen(false);
  };

  const handleDeleteCanvas = (canvasId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (canvasState.canvases.length > 1) {
      deleteCanvas(canvasId);
    }
  };

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
        </div>
      </div>
      
      <div className="drawing-mode-content" ref={containerRef}>
        <DrawingCanvas 
          width={dimensions.width} 
          height={dimensions.height}
          movieId={movieId}
        />
      </div>
    </div>
  );
};

export default DrawingMode;
