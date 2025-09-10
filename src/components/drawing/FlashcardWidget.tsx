import React, { useState, useEffect } from 'react';
import { FlashcardRecord, MovieRecord } from '../../lib/types/database';
import { VideoPreview } from '../ui/VideoPreview';
import pocketBaseService from '../../lib/services/pocketbase';
import './FlashcardWidget.css';

// Simple cache to prevent duplicate requests
const flashcardCache = new Map<string, FlashcardRecord>();
const movieCache = new Map<string, MovieRecord>();
const loadingStates = new Map<string, Promise<any>>();

interface FlashcardWidgetProps {
  flashcardId: string; // Database flashcard ID
  objectId: string; // Drawing object ID for context menu
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  onSelect?: () => void;
  scale?: number; // For responsive scaling based on canvas zoom
  isDragging?: boolean; // Add dragging state
  onContextMenu?: (e: React.MouseEvent, id: string) => void; // Add context menu support
  onStartDrag?: (objectId: string, startPoint: { x: number; y: number }) => void; // Add drag support
  viewport?: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
}

export const FlashcardWidget: React.FC<FlashcardWidgetProps> = ({
  flashcardId,
  objectId,
  x,
  y,
  width,
  height,
  selected = false,
  onSelect,
  scale = 1,
  isDragging = false,
  onContextMenu,
  onStartDrag,
  viewport,
  canvasSize
}) => {
  const [flashcard, setFlashcard] = useState<FlashcardRecord | null>(null);
  const [movie, setMovie] = useState<MovieRecord | null>(null);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load flashcard and movie data with caching
  useEffect(() => {
    const loadData = async () => {
      if (!flashcardId) {
        setError('No flashcard ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if we're already loading this flashcard
        const loadingKey = `flashcard-${flashcardId}`;
        if (loadingStates.has(loadingKey)) {
          await loadingStates.get(loadingKey);
        }

        // Check cache first
        let flashcardData = flashcardCache.get(flashcardId);
        
        if (!flashcardData) {
          // Create a loading promise and store it
          const loadingPromise = pocketBaseService.getFlashcard(flashcardId);
          loadingStates.set(loadingKey, loadingPromise);
          
          try {
            flashcardData = await loadingPromise;
            flashcardCache.set(flashcardId, flashcardData);
          } finally {
            loadingStates.delete(loadingKey);
          }
        }
        
        setFlashcard(flashcardData);
        setPreviewTime(flashcardData.start_time);
        
        // Then load the movie with caching
        const movieLoadingKey = `movie-${flashcardData.movie_id}`;
        if (loadingStates.has(movieLoadingKey)) {
          await loadingStates.get(movieLoadingKey);
        }

        let movieData = movieCache.get(flashcardData.movie_id);
        
        if (!movieData) {
          // Create a loading promise and store it
          const movieLoadingPromise = pocketBaseService.getMovie(flashcardData.movie_id);
          loadingStates.set(movieLoadingKey, movieLoadingPromise);
          
          try {
            movieData = await movieLoadingPromise;
            movieCache.set(flashcardData.movie_id, movieData);
          } finally {
            loadingStates.delete(movieLoadingKey);
          }
        }
        
        setMovie(movieData);
      } catch (error) {
        console.error('Error loading flashcard or movie:', error);
        setError(`Failed to load flashcard data: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [flashcardId]);

  // Format time helpers
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStateLabel = (state: number | string): string => {
    const numState = typeof state === 'string' ? parseInt(state, 10) : state;
    const stateLabels = { 0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning' };
    return stateLabels[numState as keyof typeof stateLabels] || `${state}`;
  };

  const getDueStatus = (due: string): { label: string; color: string } => {
    const dueDate = new Date(due);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d overdue`, color: '#dc3545' };
    }
    if (diffDays === 0) {
      return { label: 'Due today', color: '#ffc107' };
    }
    if (diffDays === 1) {
      return { label: 'Due tomorrow', color: '#28a745' };
    }
    return { label: `Due in ${diffDays}d`, color: '#6c757d' };
  };

  // Video preview handlers
  const handlePreviewTimeUpdate = (time: number) => {
    setPreviewTime(time);
  };

  const handlePreviewPlayStateChange = (playing: boolean) => {
    setPreviewPlaying(playing);
  };

  const handlePreviewJumpToStart = () => {
    if (flashcard) {
      setPreviewTime(flashcard.start_time);
    }
  };

  const handlePreviewJumpToEnd = () => {
    if (flashcard) {
      setPreviewTime(flashcard.end_time);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't stop propagation - let canvas handle selection
    // Only the foreignObject's onClick should handle selection to avoid conflicts
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left-clicks for dragging
    if (e.button !== 0) {
      return;
    }

    // Don't call onSelect here - let the foreignObject's onClick handle selection
    // This prevents interference with multi-selection during drag operations
    
    // If we have a drag handler, prepare for dragging (like sticky note)
    if (onStartDrag && viewport && canvasSize) {
      // Get the mouse position relative to the canvas
      const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
      if (rect) {
        const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        // Convert to world coordinates
        const worldPoint = {
          x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
          y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
        };
        
        onStartDrag(objectId, worldPoint);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu && objectId) {
      onContextMenu(e, objectId);
    }
  };

  if (loading) {
    return (
      <div 
        className="flashcard-widget loading"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          height
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        Loading flashcard...
      </div>
    );
  }

  if (!flashcard || !movie) {
    return (
      <div 
        className="flashcard-widget error"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          height
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        Error loading flashcard data: {error}
      </div>
    );
  }

  const dueStatus = getDueStatus(flashcard.due);

  return (
    <div 
      className={`flashcard-widget ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        transformOrigin: 'top left'
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {/* Header with title and status */}
      <div className="flashcard-widget-header">
        <div className="flashcard-timing">
          {formatTime(flashcard.start_time)} - {formatTime(flashcard.end_time)}
        </div>
        <div 
          className="flashcard-due"
          style={{ color: dueStatus.color }}
        >
          {dueStatus.label}
        </div>
        {selected && (
          <div 
            className="flashcard-mode"
            style={{ 
              fontSize: '9px', 
              color: '#007acc', 
              fontWeight: 'bold',
              marginLeft: 'auto',
              opacity: 0.8
            }}
          >
            {isDragging ? 'MOVING...' : 'MOVABLE'}
          </div>
        )}
      </div>

      {/* Subtitle text */}
      <div className="flashcard-subtitle">
        "{flashcard.subtitle_text}"
      </div>

      {/* Video preview */}
      <div className="flashcard-video">
        <VideoPreview
          moviePath={movie.mp4_path}
          startTime={flashcard.start_time}
          endTime={flashcard.end_time}
          currentTime={previewTime}
          isPlaying={previewPlaying}
          onTimeUpdate={handlePreviewTimeUpdate}
          onPlayStateChange={handlePreviewPlayStateChange}
          onJumpToStart={handlePreviewJumpToStart}
          onJumpToEnd={handlePreviewJumpToEnd}
          className="flashcard-video-element"
        />
      </div>

      {/* Metadata footer */}
      <div className="flashcard-widget-footer">
        <div className="flashcard-stats">
          <span className="state">{getStateLabel(flashcard.state)}</span>
          <span className="difficulty">D: {Number(flashcard.difficulty).toFixed(1)}</span>
          <span className="stability">S: {Number(flashcard.stability).toFixed(1)}d</span>
          <span className="reps">R: {flashcard.reps}</span>
        </div>
      </div>

      {/* Selection highlight */}
      {selected && <div className="flashcard-widget-selection" />}
    </div>
  );
};
