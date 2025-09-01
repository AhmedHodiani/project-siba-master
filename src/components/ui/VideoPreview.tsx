import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Button } from './Button';
import './VideoPreview.css';

interface VideoPreviewProps {
  moviePath: string;
  startTime: number;
  endTime: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  disabled?: boolean;
  className?: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  moviePath,
  startTime,
  endTime,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayStateChange,
  onJumpToStart,
  onJumpToEnd,
  disabled = false,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRepeating, setIsRepeating] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
  }, []);

  const playPreview = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
      onPlayStateChange(true);
    }
  }, [startTime, onPlayStateChange]);

  const pausePreview = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      onPlayStateChange(false);
    }
  }, [onPlayStateChange]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      onTimeUpdate(time);
      
      // Auto-pause or repeat when reaching end time
      if (time >= endTime) {
        if (isRepeating) {
          // Restart from beginning if repeating
          videoRef.current.currentTime = startTime;
          onTimeUpdate(startTime);
        } else {
          // Pause at end if not repeating
          pausePreview();
          videoRef.current.currentTime = endTime;
        }
      }
    }
  }, [endTime, startTime, onTimeUpdate, pausePreview, isRepeating]);

  const handleEnded = useCallback(() => {
    if (isRepeating) {
      // Restart from beginning if repeating
      if (videoRef.current) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play();
        onTimeUpdate(startTime);
      }
    } else {
      onPlayStateChange(false);
    }
  }, [onPlayStateChange, isRepeating, startTime, onTimeUpdate]);

  const toggleRepeat = useCallback(() => {
    setIsRepeating(prev => !prev);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      if (videoWidth && videoHeight) {
        const aspectRatio = videoWidth / videoHeight;
        setVideoAspectRatio(aspectRatio);
      }
    }
  }, []);

  // Update video time when currentTime prop changes
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <div className={`video-preview-component ${className}`}>
      <div className="video-container">
        <video
          ref={videoRef}
          src={`file://${moviePath}`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
          className="preview-video"
          style={videoAspectRatio ? { aspectRatio: videoAspectRatio.toString() } : undefined}
        />
        <div className="video-controls">
          <div className="playback-controls">
            {/* <Button
              type="button"
              onClick={onJumpToStart}
              variant="secondary"
              size="small"
              disabled={disabled}
            >
              <span className="button-icon">⏮</span> Start
            </Button> */}
            <Button
              type="button"
              onClick={isPlaying ? pausePreview : playPreview}
              variant="primary"
              size="small"
              disabled={disabled}
            >
              <span className="button-icon">{isPlaying ? '⏸' : '▶'}</span> {isPlaying ? 'Pause' : 'Play'}
            </Button>
            {/* <Button
              type="button"
              onClick={onJumpToEnd}
              variant="secondary"
              size="small"
              disabled={disabled}
            >
              <span className="button-icon">⏭</span> End
            </Button> */}
            <Button
              type="button"
              onClick={toggleRepeat}
              variant={isRepeating ? "primary" : "secondary"}
              size="small"
              disabled={disabled}
              className="repeat-button"
            >
              <span className="button-icon">Repeat</span> <span style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '2px 6px',
                marginLeft: '4px',
                fontSize: '0.9em',
              }}>
                {isRepeating ? 'On' : 'Off'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;