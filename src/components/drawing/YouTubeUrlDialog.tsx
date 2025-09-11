import React, { useState } from 'react';
import { Button } from '../ui';
import './YouTubeUrlDialog.css';

interface YouTubeUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  initialUrl?: string;
}

// Helper function to extract YouTube video ID from URL
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export const YouTubeUrlDialog: React.FC<YouTubeUrlDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialUrl = ''
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    const videoId = extractYouTubeVideoId(url.trim());
    if (!videoId) {
      setError('Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)');
      return;
    }

    setError('');
    onConfirm(url.trim());
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="youtube-url-dialog-overlay">
      <div className="youtube-url-dialog">
        <div className="youtube-url-dialog-header">
          <h3>Add YouTube Video</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="youtube-url-dialog-content">
          <label htmlFor="youtube-url">YouTube URL:</label>
          <input
            id="youtube-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(''); // Clear error when user types
            }}
            onKeyDown={handleKeyPress}
            placeholder="https://youtube.com/watch?v=..."
            className={error ? 'error' : ''}
            autoFocus
          />
          {error && <div className="error-message">{error}</div>}
          
          <div className="help-text">
            Supported formats:
            <ul>
              <li>https://youtube.com/watch?v=VIDEO_ID</li>
              <li>https://youtu.be/VIDEO_ID</li>
              <li>https://youtube.com/embed/VIDEO_ID</li>
            </ul>
          </div>
        </div>
        
        <div className="youtube-url-dialog-footer">
          <Button onClick={onClose} variant="secondary" size="small">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary" size="small">
            Add Video
          </Button>
        </div>
      </div>
    </div>
  );
};
