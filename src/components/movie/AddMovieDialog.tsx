import React, { useState, useCallback } from 'react';
import { CreateMovieData } from '@/lib/types/database';
import { Button } from '../ui/Button';
import pocketBaseService from '@/lib/services/pocketbase';
import './AddMovieDialog.css';

interface AddMovieDialogProps {
  onClose: () => void;
  onMovieAdded: () => void;
}

interface VideoFrameData {
  frames: string[];
  duration: number;
}

export function AddMovieDialog({
  onClose,
  onMovieAdded,
}: AddMovieDialogProps) {
  const [step, setStep] = useState<
    'select-video' | 'select-subtitle' | 'select-thumbnail' | 'confirm'
  >('select-video');
  const [videoPath, setVideoPath] = useState<string>('');
  const [subtitlePath, setSubtitlePath] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [frames, setFrames] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const resetDialog = useCallback(() => {
    setStep('select-video');
    setVideoPath('');
    setSubtitlePath('');
    setTitle('');
    setFrames([]);
    setSelectedThumbnail('');
    setDuration(0);
    setLoading(false);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    resetDialog();
    onClose();
  }, [resetDialog, onClose]);

  const handleSelectVideo = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const filePath = await window.electron.openVideoFile();
      if (!filePath) {
        setLoading(false);
        return;
      }

      setVideoPath(filePath);

      // Extract filename as default title
      const filename = filePath.split('/').pop() || 'Unknown Movie';
      const titleWithoutExt = filename.replace(/\.[^/.]+$/, '');
      setTitle(titleWithoutExt);

      // Extract video frames for thumbnail selection
      const frameData = (await window.electron.extractVideoFrames(
        filePath,
        10,
      )) as VideoFrameData;
      setFrames(frameData.frames);
      setDuration(frameData.duration);

      if (frameData.frames.length > 0) {
        setSelectedThumbnail(frameData.frames[0]); // Default to first frame
      }

      setStep('select-subtitle');
    } catch (err) {
      setError('Failed to process video file. Please try again.');
      console.error('Error selecting video:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectSubtitle = useCallback(
    async (skipSubtitle: boolean = false) => {
      try {
        if (!skipSubtitle) {
          const filePath = await window.electron.openSubtitleFile();
          if (filePath) {
            setSubtitlePath(filePath);
          }
        }
        setStep('select-thumbnail');
      } catch (err) {
        setError('Failed to select subtitle file.');
        console.error('Error selecting subtitle:', err);
      }
    },
    [],
  );

  const handleSelectThumbnail = useCallback((thumbnail: string) => {
    setSelectedThumbnail(thumbnail);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const movieData: CreateMovieData = {
        title,
        mp4_path: videoPath,
        srt_path: subtitlePath || undefined,
        duration,
        thumbnail: selectedThumbnail,
      };

      await pocketBaseService.createMovie(movieData);
      onMovieAdded();
      handleClose();
    } catch (err) {
      setError('Failed to add movie. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    title,
    videoPath,
    subtitlePath,
    duration,
    selectedThumbnail,
    onMovieAdded,
    handleClose,
  ]);

  return (
    <div className="add-movie-dialog-overlay">
      <div className="add-movie-dialog">
        <div className="dialog-header">
          <h2>Add New Movie</h2>
          <Button
            onClick={handleClose}
            variant="secondary"
            size="small"
            className="close-btn"
          >
            ✕
          </Button>
        </div>

        <div className="dialog-content">
          {error && <div className="error-message">{error}</div>}

          {step === 'select-video' && (
            <div className="step-content">
              <div className="step-icon">🎬</div>
              <h3>Select Video File</h3>
              <p>Choose the movie file you want to add to your library.</p>
              <Button
                onClick={handleSelectVideo}
                variant="primary"
                size="large"
                disabled={loading}
                className="action-btn"
              >
                {loading ? 'Processing...' : 'Choose Video File'}
              </Button>
            </div>
          )}

          {step === 'select-subtitle' && (
            <div className="step-content">
              <div className="step-icon">💬</div>
              <h3>Add Subtitles</h3>
              <div className="step-actions">
                <Button
                  onClick={() => handleSelectSubtitle(false)}
                  variant="primary"
                  className="action-btn"
                >
                  Choose Subtitle File
                </Button>
              </div>
            </div>
          )}

          {step === 'select-thumbnail' && (
            <div className="step-content">
              <div className="step-icon">🖼️</div>
              <h3>Choose Thumbnail</h3>
              <p>Select a frame from the movie to use as the thumbnail:</p>

              <div className="movie-info">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Movie title"
                  className="title-input"
                />
              </div>

              {frames.length > 0 ? (
                <div className="thumbnail-grid">
                  {frames.map((frame, index) => (
                    <div
                      key={index}
                      className={`thumbnail-option ${selectedThumbnail === frame ? 'selected' : ''}`}
                      onClick={() => handleSelectThumbnail(frame)}
                    >
                      <img src={frame} alt={`Frame ${index + 1}`} />
                      <div className="thumbnail-overlay">
                        {selectedThumbnail === frame && <span>✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-frames">
                  <p>
                    No thumbnail frames available. The movie will be added
                    without a thumbnail.
                  </p>
                </div>
              )}

              <div className="step-actions">
                <Button
                  onClick={() => setStep('select-subtitle')}
                  variant="secondary"
                  className="action-btn"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  variant="primary"
                  disabled={!title.trim() || loading}
                  className="action-btn"
                >
                  {loading ? 'Adding Movie...' : 'Add Movie'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <div className="step-indicator">
            <div className={`step ${step === 'select-video' ? 'active' : ''}`}>
              1
            </div>
            <div
              className={`step ${step === 'select-subtitle' ? 'active' : ''}`}
            >
              2
            </div>
            <div
              className={`step ${step === 'select-thumbnail' ? 'active' : ''}`}
            >
              3
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
