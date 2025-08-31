import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { CreateFlashcardData } from '../../lib/types/database';
import './AddFlashcardDialog.css';

interface AddFlashcardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: CreateFlashcardData) => Promise<void>;
  movieId: string;
  subtitleText: string;
  startTime: number;
  endTime: number;
  moviePath: string; // Add movie file path for video preview
  onJumpToTime?: (time: number) => void; // Optional callback to sync with main player
}

export const AddFlashcardDialog: React.FC<AddFlashcardDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
  movieId,
  subtitleText,
  startTime,
  endTime,
  moviePath,
  onJumpToTime,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [editedSubtitleText, setEditedSubtitleText] = useState(subtitleText);
  const [freeSpace, setFreeSpace] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Time adjustment state
  const [adjustedStartTime, setAdjustedStartTime] = useState(startTime);
  const [adjustedEndTime, setAdjustedEndTime] = useState(endTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);

  // Reset times when props change
  useEffect(() => {
    setAdjustedStartTime(startTime);
    setAdjustedEndTime(endTime);
    setCurrentTime(startTime);
  }, [startTime, endTime]);

  // Video control functions
  const playPreview = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = adjustedStartTime;
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [adjustedStartTime]);

  const pausePreview = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      // Auto-pause when reaching end time
      if (time >= adjustedEndTime) {
        pausePreview();
        videoRef.current.currentTime = adjustedEndTime;
      }
    }
  }, [adjustedEndTime, pausePreview]);

  // Time adjustment functions
  const adjustStartTime = useCallback((delta: number) => {
    const newTime = Math.max(0, adjustedStartTime + delta);
    if (newTime < adjustedEndTime) {
      setAdjustedStartTime(newTime);
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
    }
  }, [adjustedStartTime, adjustedEndTime]);

  const adjustEndTime = useCallback((delta: number) => {
    const newTime = Math.max(adjustedStartTime + 0.5, adjustedEndTime + delta);
    setAdjustedEndTime(newTime);
  }, [adjustedStartTime, adjustedEndTime]);

  const jumpToStart = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = adjustedStartTime;
      setCurrentTime(adjustedStartTime);
    }
  }, [adjustedStartTime]);

  const jumpToEnd = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = adjustedEndTime;
      setCurrentTime(adjustedEndTime);
    }
  }, [adjustedEndTime]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editedSubtitleText.trim()) {
      setError('Subtitle text is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAdd({
        movie_id: movieId,
        subtitle_text: editedSubtitleText.trim(),
        free_space: freeSpace.trim() || undefined,
        start_time: adjustedStartTime,
        end_time: adjustedEndTime,
      });
      
      // Reset form and video state
      setEditedSubtitleText(subtitleText);
      setFreeSpace('');
      setAdjustedStartTime(startTime);
      setAdjustedEndTime(endTime);
      setCurrentTime(startTime);
      pausePreview();
      onClose();
    } catch (err) {
      console.error('Error adding flashcard:', err);
      setError('Failed to add flashcard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Reset form and video state
      setEditedSubtitleText(subtitleText);
      setFreeSpace('');
      setError(null);
      setAdjustedStartTime(startTime);
      setAdjustedEndTime(endTime);
      setCurrentTime(startTime);
      pausePreview();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-flashcard-dialog-overlay">
      <div className="add-flashcard-dialog">
        <div className="dialog-header">
          <h2>🎯 Create New Flashcard</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={loading}
            title="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          {/* Video Preview Section */}
          <div className="video-preview-section">
            <div className="section-header">
              <h3>📽️ Video Preview</h3>
              <div className="preview-time-display">
                {formatTime(currentTime)} / {formatTime(adjustedEndTime)}
              </div>
            </div>
            <div className="video-container">
              <video
                ref={videoRef}
                src={`file://${moviePath}`}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                className="preview-video"
              />
              <div className="video-controls">
                <div className="playback-controls">
                  <Button
                    type="button"
                    onClick={jumpToStart}
                    variant="secondary"
                    size="small"
                    disabled={loading}
                  >
                    <span className="button-icon">⏮</span> Start
                  </Button>
                  <Button
                    type="button"
                    onClick={isPlaying ? pausePreview : playPreview}
                    variant="primary"
                    size="small"
                    disabled={loading}
                  >
                    <span className="button-icon">{isPlaying ? '⏸' : '▶'}</span> {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  <Button
                    type="button"
                    onClick={jumpToEnd}
                    variant="secondary"
                    size="small"
                    disabled={loading}
                  >
                    <span className="button-icon">⏭</span> End
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Time Adjustment Section */}
          <div className="time-adjustment-section">
            <div className="section-header">
              <h3>⏰ Timing Adjustment</h3>
            </div>
            <div className="time-controls">
              <div className="time-control-row">
                <div className="time-control-group">
                  <div className="time-label">
                    <span className="time-icon">🎬</span>
                    <span>Start Time</span>
                    <span className="time-value">{formatTime(adjustedStartTime)}</span>
                  </div>
                  <div className="time-buttons">
                    <Button
                      type="button"
                      onClick={() => adjustStartTime(-1)}
                      variant="secondary"
                      size="small"
                      disabled={loading}
                    >
                      -1s
                    </Button>
                    <Button
                      type="button"
                      onClick={() => adjustStartTime(-0.5)}
                      variant="secondary"
                      size="small"
                      disabled={loading}
                    >
                      -0.5s
                    </Button>
                    <Button
                      type="button"
                      onClick={() => adjustStartTime(0.5)}
                      variant="secondary"
                      size="small"
                      disabled={loading}
                    >
                      +0.5s
                    </Button>
                    <Button
                      type="button"
                      onClick={() => adjustStartTime(1)}
                      variant="secondary"
                      size="small"
                      disabled={loading}
                    >
                      +1s
                    </Button>
                  </div>
                </div>

                <div className="time-control-group">
                  <div className="time-label">
                    <span className="time-icon">🏁</span>
                    <span>End Time</span>
                    <span className="time-value">{formatTime(adjustedEndTime)}</span>
                  </div>
                  <div className="time-buttons">
                    <Button
                      type="button"
                      onClick={() => adjustEndTime(-1)}
                      variant="secondary"
                      size="small"
                      disabled={loading}
                    >
                      -1s
                    </Button>
                    <Button
                      type="button"
                      onClick={() => adjustEndTime(-0.5)}
                      variant="secondary"
                      size="small"
                      disabled={loading}
                    >
                      -0.5s
                    </Button>
                    <Button
                      type="button"
                      onClick={() => adjustEndTime(0.5)}
                      variant="secondary"
                      size="small"
                      disabled={loading}
                    >
                      +0.5s
                    </Button>
                    <Button
                      type="button"
                      onClick={() => adjustEndTime(1)}
                      variant="secondary"
                      size="small"
                      disabled={loading}
                    >
                      +1s
                    </Button>
                  </div>
                </div>
              </div>

              <div className="duration-info">
                <span className="duration-label">Clip Duration:</span>
                <span className="duration-value">{formatTime(adjustedEndTime - adjustedStartTime)}</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label htmlFor="subtitle-text">
                <span className="label-icon">💬</span>
                Subtitle Text
              </label>
              <textarea
                id="subtitle-text"
                value={editedSubtitleText}
                onChange={(e) => setEditedSubtitleText(e.target.value)}
                rows={3}
                placeholder="Edit the subtitle text if needed..."
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="free-space">
                <span className="label-icon">📝</span>
                Notes & Translation
              </label>
              <textarea
                id="free-space"
                value={freeSpace}
                onChange={(e) => setFreeSpace(e.target.value)}
                rows={5}
                placeholder="Add your translation, notes, grammar explanations, or any other helpful information..."
                disabled={loading}
              />
              <small className="form-hint">
                💡 This will be upgraded to a rich text editor (TinyMCE) in a future update
              </small>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="dialog-actions">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={() => {}} // onClick is required by Button component but form submission handles the action
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Flashcard'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};