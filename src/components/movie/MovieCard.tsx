import React from 'react';
import { MovieRecord } from '@/lib/types/database';
import { Button } from '../ui/Button';
import pocketBaseService from '@/lib/services/pocketbase';
import './MovieCard.css';

export interface StudyStats {
  totalCards: number;
  dueCards: number;
  reviewedToday: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  relearningCards: number;
}

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
  studyStats?: StudyStats | null;
  loading?: boolean;
}

export function MovieCard({ 
  movie, 
  onPlay, 
  onEdit, 
  onDelete, 
  fileValidation,
  studyStats,
  loading = false
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

  const getStudyProgress = () => {
    if (!studyStats || studyStats.totalCards === 0) return 0;
    const reviewedCards = studyStats.totalCards - studyStats.newCards;
    return Math.round((reviewedCards / studyStats.totalCards) * 100);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  return (
    <div className={`movie-card ${hasFileIssues ? 'file-error' : ''}`} onClick={() => hasFileIssues ? undefined : onPlay(movie)}>
      <div className="movie-card-header">
        <h3 className="movie-title" title={movie.title}>
          {movie.title}
        </h3>
        <div className="movie-card-actions">
          {onEdit && (
            <Button
              onClick={(e) => {
                e?.stopPropagation();
                onEdit(movie);
              }}
              variant="secondary"
              size="small"
              className="edit-btn"
            >
              ⚙
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={(e) => {
                e?.stopPropagation();
                onDelete(movie);
              }}
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

        {/* Study Statistics */}
        {loading ? (
          <div className="study-stats loading">
            <div className="stats-header">
              <span className="stats-title">📚 Study Progress</span>
              <span className="loading-text">Loading...</span>
            </div>
          </div>
        ) : studyStats && studyStats.totalCards > 0 ? (
          <div className="study-stats">
            <div className="stats-header">
              <span className="stats-title">📚 Study Progress</span>
              <span className="study-progress">{getStudyProgress()}%</span>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{studyStats.totalCards}</span>
                <span className="stat-label">Cards</span>
              </div>
              <div className="stat-item due">
                <span className="stat-number">{studyStats.dueCards}</span>
                <span className="stat-label">Due</span>
              </div>
              <div className="stat-item reviewed">
                <span className="stat-number">{studyStats.reviewedToday}</span>
                <span className="stat-label">Today</span>
              </div>
            </div>
            <div className="stats-breakdown">
              <div className="breakdown-item new">
                <span className="breakdown-dot"></span>
                <span className="breakdown-text">New: {studyStats.newCards}</span>
              </div>
              <div className="breakdown-item learning">
                <span className="breakdown-dot"></span>
                <span className="breakdown-text">Learning: {studyStats.learningCards}</span>
              </div>
              <div className="breakdown-item review">
                <span className="breakdown-dot"></span>
                <span className="breakdown-text">Review: {studyStats.reviewCards}</span>
              </div>
              {studyStats.relearningCards > 0 && (
                <div className="breakdown-item relearning">
                  <span className="breakdown-dot"></span>
                  <span className="breakdown-text">Relearning: {studyStats.relearningCards}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="study-stats empty">
            <div className="stats-header">
              <span className="stats-title">📚 No flashcards yet</span>
            </div>
            <div className="empty-message">
              Start creating flashcards to track your learning progress
            </div>
          </div>
        )}

        {/* Access time info */}
        <div className="access-info">
          <span className="last-accessed">Last opened: {formatRelativeTime(movie.last_accessed)}</span>
        </div>

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
    </div>
  );
}