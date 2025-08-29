import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function VideoPlayerUI() {
  const [url, setUrl] = useState('https://dafftube.org/wp-content/uploads/2014/01/Sample_1280x720_mp4.mp4');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
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

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
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
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
              <button onClick={togglePlay} className="control-btn play-btn">
                {playing ? 'PAUSE' : 'PLAY'}
              </button>
              <span className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <div className="right-controls">
              <button onClick={toggleMute} className="control-btn mute-btn">
                {muted ? 'UNMUTE' : 'MUTE'}
              </button>
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
              <button onClick={toggleFullscreen} className="control-btn fullscreen-btn">
                {fullscreen ? 'EXIT' : 'FULL'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="url-input">
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="Enter video URL..."
          className="url-field"
        />
        <button
          type="button"
          onClick={handleLoadVideoFile}
          className="load-file-btn"
        >
          Load Video File
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return <VideoPlayerUI />;
}
