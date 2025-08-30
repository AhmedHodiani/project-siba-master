import React from 'react';
import './SubtitleSettings.css';
import { Button } from './Button';

interface SubtitleSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  subtitleDelay: number;
  onDelayChange: (delay: number) => void;
  subtitleSize: number;
  onSizeChange: (size: number) => void;
  subtitlePosition: 'onscreen' | 'below';
  onPositionChange: (position: 'onscreen' | 'below') => void;
  subtitlesLoaded: boolean;
}

export function SubtitleSettings({
  isOpen,
  onClose,
  subtitleDelay,
  onDelayChange,
  subtitleSize,
  onSizeChange,
  subtitlePosition,
  onPositionChange,
  subtitlesLoaded,
}: SubtitleSettingsProps) {
  if (!isOpen) return null;

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const delay = parseFloat(e.target.value);
    onDelayChange(delay);
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    onSizeChange(size);
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPositionChange(e.target.value as 'onscreen' | 'below');
  };

  const adjustDelay = (amount: number) => {
    onDelayChange(subtitleDelay + amount);
  };

  const resetDelay = () => {
    onDelayChange(0);
  };

  return (
    <div className="subtitle-settings-overlay">
      <div className="subtitle-settings-popup">
        <div className="subtitle-settings-header">
          <h3>Subtitle Settings</h3>
          <Button
            onClick={onClose}
            variant="primary"
            size="small"
            className="close-btn"
          >
            ✕
          </Button>
        </div>
        
        <div className="subtitle-settings-content">
          {!subtitlesLoaded ? (
            <div className="no-subtitles-message">
              <p>No subtitles loaded. Please load a subtitle file first.</p>
            </div>
          ) : (
            <>
              <div className="setting-group">
                <label className="setting-label">
                  Subtitle Delay (seconds)
                </label>
                <div className="delay-controls">
                  <Button
                    onClick={() => adjustDelay(-1)}
                    variant="primary"
                    size="small"
                    className="delay-btn"
                  >
                    -1s
                  </Button>
                  <Button
                    onClick={() => adjustDelay(-0.5)}
                    variant="primary"
                    size="small"
                    className="delay-btn"
                  >
                    -0.5s
                  </Button>
                  <Button
                    onClick={() => adjustDelay(-0.1)}
                    variant="primary"
                    size="small"
                    className="delay-btn"
                  >
                    -0.1s
                  </Button>
                  <input
                    type="number"
                    value={subtitleDelay.toFixed(1)}
                    onChange={handleDelayChange}
                    step="0.1"
                    min="-10"
                    max="10"
                    className="delay-input"
                  />
                  <Button
                    onClick={() => adjustDelay(0.1)}
                    variant="primary"
                    size="small"
                    className="delay-btn"
                  >
                    +0.1s
                  </Button>
                  <Button
                    onClick={() => adjustDelay(0.5)}
                    variant="primary"
                    size="small"
                    className="delay-btn"
                  >
                    +0.5s
                  </Button>
                  <Button
                    onClick={() => adjustDelay(1)}
                    variant="primary"
                    size="small"
                    className="delay-btn"
                  >
                    +1s
                  </Button>
                </div>
                
                <div className="delay-slider-container">
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={subtitleDelay}
                    onChange={handleDelayChange}
                    className="delay-slider"
                  />
                  <div className="delay-range-labels">
                    <span>-5s</span>
                    <span>0s</span>
                    <span>+5s</span>
                  </div>
                </div>
                
                <Button
                  onClick={resetDelay}
                  variant="secondary"
                  size="small"
                  className="reset-btn"
                >
                  Reset to 0
                </Button>
              </div>
              
              <div className="setting-group">
                <label className="setting-label" htmlFor="subtitle-size">
                  Subtitle Size
                </label>
                <div className="size-controls">
                  <input
                    id="subtitle-size"
                    type="range"
                    min="12"
                    max="32"
                    step="2"
                    value={subtitleSize}
                    onChange={handleSizeChange}
                    className="size-slider"
                  />
                  <span className="size-display">{subtitleSize}px</span>
                </div>
              </div>
              
              <div className="setting-group">
                <label className="setting-label" htmlFor="subtitle-position">
                  Subtitle Position
                </label>
                <select
                  id="subtitle-position"
                  value={subtitlePosition}
                  onChange={handlePositionChange}
                  className="position-select"
                >
                  <option value="onscreen">On Screen (Over Video)</option>
                  <option value="below">Below Video</option>
                </select>
              </div>
              
              <div className="setting-info">
                <p className="info-text">
                  Adjust the subtitle timing to sync with the video.
                  Positive values delay subtitles, negative values advance them.
                </p>
                <p className="info-text keyboard-shortcuts">
                  <strong>Keyboard shortcuts:</strong> Press "1" to go to previous subtitle, "2" to go to next subtitle
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}