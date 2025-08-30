import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { SubtitleCue } from '@/renderer/utils/subtitleParser';
import { Button, SubtitleSettings } from '../ui';
import { MovieRecord } from '@/lib/types/database';
import pocketBaseService from '@/lib/services/pocketbase';
import './VideoPlayer.css';

interface VideoPlayerProps {
  movie: MovieRecord;
  // Subtitle props from parent
  currentSubtitle: SubtitleCue | null;
  subtitleSize: number;
  subtitlePosition: 'onscreen' | 'below';
  subtitleDelay: number;
  subtitlesLoaded: boolean;
  onTimeUpdate: (time: number) => void;
  // Subtitle navigation
  onPreviousSubtitle: () => void;
  onNextSubtitle: () => void;
  // Subtitle settings
  onDelayChange: (delay: number) => void;
  onSizeChange: (size: number) => void;
  onPositionChange: (position: 'onscreen' | 'below') => void;
}

export interface VideoPlayerRef {
  getCurrentPosition: () => number;
  saveCurrentPosition: () => Promise<void>;
  seekTo: (time: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ 
    movie, 
    currentSubtitle, 
    subtitleSize, 
    subtitlePosition,
    subtitleDelay,
    subtitlesLoaded,
    onTimeUpdate,
    onPreviousSubtitle,
    onNextSubtitle,
    onDelayChange,
    onSizeChange,
    onPositionChange
  }, ref) => {
    const [url, setUrl] = useState('');
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const togglePlay = useCallback(() => {
      if (videoRef.current) {
        if (playing) {
          videoRef.current.pause();
        } else {
          videoRef.current.play();
        }
        setPlaying(!playing);
      }
    }, [playing]);

    const handleTimeUpdate = useCallback(() => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        onTimeUpdate(time); // Notify parent of time changes
      }
    }, [onTimeUpdate]);    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
      }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const time = parseFloat(e.target.value);
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const vol = parseFloat(e.target.value);
      setVolume(vol);
      if (videoRef.current) {
        videoRef.current.volume = vol;
      }
    };

    const toggleMute = () => {
      if (videoRef.current) {
        videoRef.current.muted = !muted;
        setMuted(!muted);
      }
    };

    const toggleFullscreen = () => {
      if (!fullscreen) {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen();
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      // Don't immediately set state - let the fullscreenchange event handle it
    };

    const toggleSubtitleSettings = () => {
      setShowSubtitleSettings(!showSubtitleSettings);
    };

    // Handle controls visibility
    const showControlsHandler = useCallback(() => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000); // Hide after 3 seconds of inactivity
      controlsTimeoutRef.current = timeout;
    }, []);

    const hideControlsHandler = useCallback(() => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      setShowControls(false);
    }, []);

    const handleMouseMove = useCallback(() => {
      showControlsHandler();
    }, [showControlsHandler]);

    const handleMouseLeave = useCallback(() => {
      hideControlsHandler();
    }, [hideControlsHandler]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!videoRef.current) return;

        switch (e.key) {
          case 'ArrowLeft': {
            e.preventDefault();
            const newTimeBackward = Math.max(
              0,
              videoRef.current.currentTime - 2,
            );
            videoRef.current.currentTime = newTimeBackward;
            setCurrentTime(newTimeBackward);
            break;
          }
          case 'ArrowRight': {
            e.preventDefault();
            const newTimeForward = Math.min(
              duration,
              videoRef.current.currentTime + 2,
            );
            videoRef.current.currentTime = newTimeForward;
            setCurrentTime(newTimeForward);
            break;
          }
          case ' ': {
            e.preventDefault();
            togglePlay();
            break;
          }
          case '1': {
            e.preventDefault();
            onPreviousSubtitle();
            break;
          }
          case '2': {
            e.preventDefault();
            onNextSubtitle();
            break;
          }
          default:
            break;
        }
      },
      [duration, togglePlay, onPreviousSubtitle, onNextSubtitle],
    );

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        getCurrentPosition: () => {
          return videoRef.current?.currentTime || 0;
        },
        saveCurrentPosition: async () => {
          if (videoRef.current) {
            const position = videoRef.current.currentTime;
            try {
              await pocketBaseService.updateLastPosition(movie.id, position);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('Error saving position:', error);
              throw error;
            }
          }
        },
        seekTo: (time: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
          }
        },
      }),
      [movie.id],
    );

    // Initialize video player with movie data
    useEffect(() => {
      if (movie) {
        setUrl(`file://${movie.mp4_path}`);

        // Set initial position if resuming
        if (movie.last_position > 0 && videoRef.current) {
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = movie.last_position;
              setCurrentTime(movie.last_position);
            }
          }, 1000);
        }
      }
    }, [movie]);

    useEffect(() => {
      const handleFullscreenChange = () => {
        setFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () =>
        document.removeEventListener(
          'fullscreenchange',
          handleFullscreenChange,
        );
    }, []);

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [handleKeyDown]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="video-player-container">
        <div
          ref={containerRef}
          className={`player-wrapper ${fullscreen ? 'fullscreen' : ''}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <video
            ref={videoRef}
            src={url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="video-element"
            playsInline
          />

          {/* Subtitle display */}
          {currentSubtitle && subtitlePosition === 'onscreen' && (
            <div
              className="subtitle-display"
              style={{ fontSize: `${subtitleSize}px` }}
            >
              {currentSubtitle.text}
            </div>
          )}

          <div className={`custom-controls ${showControls ? 'visible' : ''}`}>
            <div className="progress-container">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="progress-slider"
              />
            </div>

            <div className="controls-row">
              <div className="left-controls">
                <Button
                  onClick={(e) => {
                    e?.stopPropagation();
                    togglePlay();
                  }}
                  variant="primary"
                  className="control-btn play-btn"
                >
                  {playing ? 'PAUSE' : 'PLAY'}
                </Button>
                <span className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="right-controls">
                <Button
                  onClick={(e) => {
                    e?.stopPropagation();
                    toggleMute();
                  }}
                  variant="primary"
                  className="control-btn mute-btn"
                >
                  {muted ? 'UNMUTE' : 'MUTE'}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
                <span className="volume-display">
                  {Math.round(volume * 100)}%
                </span>
                {subtitlesLoaded && (
                  <Button
                    onClick={(e) => {
                      e?.stopPropagation();
                      toggleSubtitleSettings();
                    }}
                    variant="primary"
                    className="control-btn subtitle-settings-btn"
                  >
                    SUB
                  </Button>
                )}
                <Button
                  onClick={(e) => {
                    e?.stopPropagation();
                    toggleFullscreen();
                  }}
                  variant="primary"
                  className="control-btn fullscreen-btn"
                >
                  {fullscreen ? 'EXIT' : 'FULL'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Below video subtitle display */}
        {currentSubtitle && subtitlePosition === 'below' && (
          <div
            className="subtitle-display-below"
            style={{ fontSize: `${subtitleSize}px` }}
          >
            {currentSubtitle.text}
          </div>
        )}

        <SubtitleSettings
          isOpen={showSubtitleSettings}
          onClose={() => setShowSubtitleSettings(false)}
          subtitleDelay={subtitleDelay}
          onDelayChange={onDelayChange}
          subtitleSize={subtitleSize}
          onSizeChange={onSizeChange}
          subtitlePosition={subtitlePosition}
          onPositionChange={onPositionChange}
          subtitlesLoaded={subtitlesLoaded}
        />
      </div>
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
