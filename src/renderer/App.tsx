import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import {
  SubtitleCue,
  parseSRT,
  getCurrentSubtitle,
} from './utils/subtitleParser';
import { Button, SubtitleSettings } from '../components/ui';

function VideoPlayerUI() {
  const [url, setUrl] = useState("file:///home/z3ban/Downloads/how.to.train.your.dragon.(2010).ger.2cd.(12095245)/Drachenzaehmen.Leicht.Gemacht1.2010.1080P.Bluray.mp4");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleCue | null>(null);
  const [subtitleDelay, setSubtitleDelay] = useState(24);
  const [subtitleSize, setSubtitleSize] = useState(18);
  const [subtitlePosition, setSubtitlePosition] = useState<'onscreen' | 'below'>('onscreen');
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value);

  const handleLoadVideoFile = async () => {
    try {
      const filePath = await window.electron.openVideoFile();
      if (filePath) {
        // Convert file path to file:// URL for video element
        const fileUrl = `file://${filePath}`;
        setUrl(fileUrl);
      }
    } catch (error) {
      console.error('Error loading video file:', error);
    }
  };

  const handleLoadSubtitleFile = async () => {
    try {
      const filePath = await window.electron.openSubtitleFile();
      if (filePath) {
        const content = await window.electron.readSubtitleFile(filePath);
        if (content) {
          const parsedSubtitles = parseSRT(content);
          setSubtitles(parsedSubtitles);
        }
      }
    } catch (error) {
      console.error('Error loading subtitle file:', error);
    }
  };

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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      // Update current subtitle based on video time with delay adjustment
      const subtitle = getCurrentSubtitle(subtitles, time, subtitleDelay);
      setCurrentSubtitle(subtitle);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setFullscreen(!fullscreen);
  };

  const toggleSubtitleSettings = () => {
    setShowSubtitleSettings(!showSubtitleSettings);
  };

  const handleSubtitleDelayChange = (delay: number) => {
    setSubtitleDelay(delay);
  };

  const handleSubtitleSizeChange = (size: number) => {
    setSubtitleSize(size);
  };

  const handleSubtitlePositionChange = (position: 'onscreen' | 'below') => {
    setSubtitlePosition(position);
  };

  const seekToPreviousSubtitle = useCallback(() => {
    if (!videoRef.current || subtitles.length === 0) return;
    
    const currentTime = videoRef.current.currentTime;
    // Find the previous subtitle - we need to find subtitles that would be displayed
    // at a time before the current video time (accounting for delay)
    const adjustedCurrentTime = currentTime + subtitleDelay;
    const previousSubtitles = subtitles.filter(sub => sub.startTime < adjustedCurrentTime - 0.5);
    
    if (previousSubtitles.length > 0) {
      // Get the last (most recent) previous subtitle
      const previousSubtitle = previousSubtitles[previousSubtitles.length - 1];
      // Seek to the video time where this subtitle should appear (subtract delay)
      const seekTime = previousSubtitle.startTime - subtitleDelay;
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    } else if (subtitles.length > 0) {
      // If no previous subtitle found, go to the first subtitle
      const seekTime = subtitles[0].startTime - subtitleDelay;
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  }, [subtitles, subtitleDelay]);

  const seekToNextSubtitle = useCallback(() => {
    if (!videoRef.current || subtitles.length === 0) return;
    
    const currentTime = videoRef.current.currentTime;
    // Find the next subtitle - we need to find subtitles that would be displayed
    // at a time after the current video time (accounting for delay)
    const adjustedCurrentTime = currentTime + subtitleDelay;
    const nextSubtitle = subtitles.find(sub => sub.startTime > adjustedCurrentTime + 0.5);
    
    if (nextSubtitle) {
      // Seek to the video time where this subtitle should appear (subtract delay)
      const seekTime = nextSubtitle.startTime - subtitleDelay;
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    } else if (subtitles.length > 0) {
      // If no next subtitle found, go to the last subtitle
      const lastSubtitle = subtitles[subtitles.length - 1];
      const seekTime = lastSubtitle.startTime - subtitleDelay;
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  }, [subtitles, subtitleDelay]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          const newTimeBackward = Math.max(0, videoRef.current.currentTime - 2);
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
          seekToPreviousSubtitle();
          break;
        }
        case '2': {
          e.preventDefault();
          seekToNextSubtitle();
          break;
        }
        default:
          break;
      }
    },
    [duration, togglePlay, seekToPreviousSubtitle, seekToNextSubtitle],
  );

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="video-player-container">
      <div ref={containerRef} className={`player-wrapper ${fullscreen ? 'fullscreen' : ''}`}>
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
        
        <div className="custom-controls">
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
              <Button onClick={togglePlay} variant="primary" className="control-btn play-btn">
                {playing ? 'PAUSE' : 'PLAY'}
              </Button>
              <span className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <div className="right-controls">
              <Button onClick={toggleMute} variant="primary" className="control-btn mute-btn">
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
              <span className="volume-display">{Math.round(volume * 100)}%</span>
              {subtitles.length > 0 && (
                <Button onClick={toggleSubtitleSettings} variant="primary" className="control-btn subtitle-settings-btn">
                  SUB
                </Button>
              )}
              <Button onClick={toggleFullscreen} variant="primary" className="control-btn fullscreen-btn">
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
      
      <div className="url-input">
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="Enter video URL..."
          className="url-field"
        />
        <Button
          onClick={handleLoadVideoFile}
          variant="secondary"
          size="large"
          className="load-file-btn"
        >
          Load Video File
        </Button>
        <Button
          onClick={handleLoadSubtitleFile}
          variant="secondary"
          className="load-file-btn"
        >
          Load Subtitle File
        </Button>
      </div>
      
      <SubtitleSettings
        isOpen={showSubtitleSettings}
        onClose={() => setShowSubtitleSettings(false)}
        subtitleDelay={subtitleDelay}
        onDelayChange={handleSubtitleDelayChange}
        subtitleSize={subtitleSize}
        onSizeChange={handleSubtitleSizeChange}
        subtitlePosition={subtitlePosition}
        onPositionChange={handleSubtitlePositionChange}
        subtitlesLoaded={subtitles.length > 0}
      />
    </div>
  );
}

export default function App() {
  return <VideoPlayerUI />;
}
