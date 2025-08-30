import React from 'react';
import { MovieRecord } from '@/lib/types/database';
import { Button } from '../ui/Button';
import pocketBaseService from '@/lib/services/pocketbase';
import './MovieCard.css';

interface MovieCardProps {
  movie: MovieRecord;
  onPlay: (movie: MovieRecord) => void;
  onEdit?: (movie: MovieRecord) => void;
  onDelete?: (movie: MovieRecord) => void;
  isValidated?: boolean;
  fileValidation?: {
    mp4Exists: boolean;
    srtExists: boolean;
  };
}

export function MovieCard({ 
  movie, 
  onPlay, 
  onEdit, 
  onDelete, 
  fileValidation 
}: MovieCardProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProgressPercentage = () => {
    if (!movie.duration || movie.duration === 0) return 0;
    return Math.min((movie.last_position / movie.duration) * 100, 100);
  };

  const hasFileIssues = fileValidation && (!fileValidation.mp4Exists || !fileValidation.srtExists);

  return (
    <div className={`movie-card ${hasFileIssues ? 'file-error' : ''}`}>
      <div className="movie-card-header">
        <h3 className="movie-title" title={movie.title}>
          {movie.title}
        </h3>
        <div className="movie-card-actions">
          {onEdit && (
            <Button
              onClick={() => onEdit(movie)}
              variant="secondary"
              size="small"
              className="edit-btn"
            >
              ⚙
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(movie)}
              variant="danger"
              size="small"
              className="delete-btn"
            >
              ×
            </Button>
          )}
        </div>
      </div>

      {movie.thumbnail && (
        <div className="movie-thumbnail">
          <img 
            src={pocketBaseService.getFileUrl('movies', movie.id, movie.thumbnail)}
            alt={`${movie.title} thumbnail`}
            className="thumbnail-image"
          />
        </div>
      )}

      <div className="movie-info">
        <div className="movie-meta">
          <span className="duration">{formatDuration(movie.duration)}</span>
          <span className="date-added">{formatDate(movie.date_added)}</span>
          {movie.srt_path && <span className="has-subtitles" />}
        </div>

        {movie.duration && movie.last_position > 0 && (
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <span className="progress-text">
              {Math.round(getProgressPercentage())}% watched
            </span>
          </div>
        )}

        {hasFileIssues && (
          <div className="file-status">
            {!fileValidation.mp4Exists && (
              <span className="file-error">Video file not found</span>
            )}
            {!fileValidation.srtExists && (
              <span className="file-error">Subtitle file not found</span>
            )}
          </div>
        )}
      </div>

      <div className="movie-card-footer">
        <Button
          onClick={() => onPlay(movie)}
          variant="primary"
          className="play-btn"
          disabled={hasFileIssues}
        >
          {movie.last_position > 0 ? 'Resume' : 'Play'}
        </Button>
      </div>
    </div>
  );
}