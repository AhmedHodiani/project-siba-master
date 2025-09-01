import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, MarkdownEditor, VideoPreview } from '../ui';
import { CreateFlashcardData } from '../../lib/types/database';
import { useOllama } from '../../hooks/useOllama';
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
  const [loading, setLoading] = useState(false);
  const [editedSubtitleText, setEditedSubtitleText] = useState(subtitleText);
  const [freeSpace, setFreeSpace] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Time adjustment state
  const [adjustedStartTime, setAdjustedStartTime] = useState(startTime);
  const [adjustedEndTime, setAdjustedEndTime] = useState(endTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);

  const { translateGerman } = useOllama();

  // Reset times when props change
  useEffect(() => {
    setAdjustedStartTime(startTime);
    setAdjustedEndTime(endTime);
    setCurrentTime(startTime);
  }, [startTime, endTime]);

  // Video control handlers for the VideoPreview component
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleJumpToStart = useCallback(() => {
    setCurrentTime(adjustedStartTime);
  }, [adjustedStartTime]);

  const handleJumpToEnd = useCallback(() => {
    setCurrentTime(adjustedEndTime);
  }, [adjustedEndTime]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
  }, []);

  // Time adjustment functions
  const adjustStartTime = useCallback((delta: number) => {
    const newTime = Math.max(0, adjustedStartTime + delta);
    if (newTime < adjustedEndTime) {
      setAdjustedStartTime(newTime);
      setCurrentTime(newTime);
    }
  }, [adjustedStartTime, adjustedEndTime]);

  const adjustEndTime = useCallback((delta: number) => {
    const newTime = Math.max(adjustedStartTime + 0.5, adjustedEndTime + delta);
    setAdjustedEndTime(newTime);
  }, [adjustedStartTime, adjustedEndTime]);

  const handleGenerateAIText = useCallback(async () => {
    if (!editedSubtitleText.trim()) {
      setError('Please enter subtitle text first');
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      const generatedText = await translateGerman(editedSubtitleText.trim());
      setFreeSpace(generatedText);
    } catch (err) {
      console.error('Error generating AI text:', err);
      setError('Failed to generate AI translation. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }, [editedSubtitleText, translateGerman]);

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
      setIsPlaying(false);
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
      setIsPlaying(false);
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
          <div className="dialog-layout">
            {/* Left Column */}
            <div className="left-column">
              {/* Video Preview Section */}
              <VideoPreview
                moviePath={moviePath}
                startTime={adjustedStartTime}
                endTime={adjustedEndTime}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={handlePlayStateChange}
                onJumpToStart={handleJumpToStart}
                onJumpToEnd={handleJumpToEnd}
                disabled={loading}
                className="video-preview-section"
              />

          {/* Time Adjustment Section */}
          <div className="time-adjustment-section">
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

          
        </div>

        {/* Right Column */}
        <div className="right-column">
          <div className="form-section">
            <div className="form-group markdown-editor-container">
              <Button
                variant='secondary'
                type="button"
                size='small'
                className="ai-generate-button"
                onClick={handleGenerateAIText}
                disabled={loading || aiLoading || !editedSubtitleText.trim()}
                title="Generate AI translation and notes"
              >
                {aiLoading ? '⏳' : 'AI'}
              </Button>
              <MarkdownEditor
                value={freeSpace}
                onChange={setFreeSpace}
                placeholder="Add your translation, notes, grammar explanations, or any other helpful information using **Markdown** formatting..."
                disabled={loading}
                height={450}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <textarea
                id="subtitle-text"
                style={{ fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace", fontSize: '16px', }} 
                value={editedSubtitleText}
                onChange={(e) => setEditedSubtitleText(e.target.value)}
                rows={3}
                placeholder="Edit the subtitle text if needed..."
                disabled={loading}
                required
              />
            </div>
          </div>
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