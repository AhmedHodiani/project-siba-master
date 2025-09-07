import React, { useState, useEffect } from 'react';
import { FlashcardRecord, MovieRecord } from '../../lib/types/database';
import { VideoPreview } from '../ui/VideoPreview';
import pocketBaseService from '../../lib/services/pocketbase';
import './FlashcardWidget.css';

interface FlashcardWidgetProps {
  flashcardId: string; // Changed from flashcard object to just ID
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  onSelect?: () => void;
  scale?: number; // For responsive scaling based on canvas zoom
  isDragging?: boolean; // Add dragging state
}

export const FlashcardWidget: React.FC<FlashcardWidgetProps> = ({
  flashcardId,
  x,
  y,
  width,
  height,
  selected = false,
  onSelect,
  scale = 1,
  isDragging = false
}) => {
  const [flashcard, setFlashcard] = useState<FlashcardRecord | null>(null);
  const [movie, setMovie] = useState<MovieRecord | null>(null);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load flashcard and movie data
  useEffect(() => {
    const loadData = async () => {
      try {
        // First load the flashcard
        const flashcardData = await pocketBaseService.getFlashcard(flashcardId);
        setFlashcard(flashcardData);
        setPreviewTime(flashcardData.start_time);
        
        // Then load the movie
        const movieData = await pocketBaseService.getMovie(flashcardData.movie_id);
        setMovie(movieData);
      } catch (error) {
        console.error('Error loading flashcard or movie:', error);
      } finally {
        setLoading(false);
      }
    };

    if (flashcardId) {
      loadData();
    }
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
    // Don't stop propagation - let canvas handle selection and dragging
    onSelect?.();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't stop propagation - let canvas handle dragging
    onSelect?.();
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
      >
        Error loading flashcard data
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
