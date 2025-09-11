import React, { useState, useRef, useEffect } from 'react';
import { YouTubeVideoObject } from '../../lib/types/drawing';
import './YouTubeVideoWidget.css';

interface YouTubeVideoWidgetProps {
  video: YouTubeVideoObject;
  isSelected: boolean;
  zoom: number;
  onUpdate: (id: string, updates: Partial<YouTubeVideoObject>) => void;
  onSelect: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, id: string) => void;
  onStartDrag?: (e: React.MouseEvent, id: string) => void;
}

type ResizeHandle = 'se' | 's' | 'e' | null;

// Function to extract YouTube video ID from URL
const extractYouTubeId = (url: string): string => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return '';
};

export const YouTubeVideoWidget: React.FC<YouTubeVideoWidgetProps> = ({
  video,
  isSelected,
  zoom,
  onUpdate,
  onSelect,
  onContextMenu,
  onStartDrag
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(video.videoUrl);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditUrl(video.videoUrl);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditUrl(e.target.value);
  };

  const handleUrlBlur = () => {
    setIsEditing(false);
    if (editUrl !== video.videoUrl) {
      const videoId = extractYouTubeId(editUrl);
      onUpdate(video.id, { 
        videoUrl: editUrl,
        videoId: videoId,
        title: videoId ? `Video ${videoId}` : 'Invalid URL'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlBlur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditUrl(video.videoUrl);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('YouTube widget mousedown, target:', e.target);
    // Check if this is a resize handle click
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      console.log('Resize handle detected in YouTube widget');
      return; // Let resize handles handle their own events
    }
    
    if (!isEditing && !isResizing) {
      // Select the video first
      onSelect(video.id);
      
      // If we have a drag handler, prepare for dragging
      if (onStartDrag) {
        onStartDrag(e, video.id);
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = video.width;
    const startHeight = video.height;
    
    setResizeStart({ x: startX, y: startY, width: startWidth, height: startHeight });

    const handleResizeMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (handle === 'se') {
        newWidth = startWidth + deltaX;
        newHeight = startHeight + deltaY;
      } else if (handle === 's') {
        newHeight = startHeight + deltaY;
      } else if (handle === 'e') {
        newWidth = startWidth + deltaX;
      }
      
      // Maintain aspect ratio for YouTube videos (16:9)
      if (handle === 'se') {
        const aspectRatio = 16 / 9;
        newHeight = newWidth / aspectRatio;
      }
      
      // Minimum size constraints (accounting for 20px header)
      newWidth = Math.max(280, newWidth);  // Minimum width for YouTube player
      newHeight = Math.max(178, newHeight); // Minimum height (158 + 20px header)
      
      // CRITICAL: Call onUpdate immediately for real-time visual feedback
      onUpdate(video.id, { width: newWidth, height: newHeight });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleContextMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, video.id);
  };

  return (
    <div 
      className={`youtube-video-widget ${isSelected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{ 
        width: `${video.width}px`, 
        height: `${video.height}px`,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenuClick}
    >
      {/* Red header bar for dragging */}
      <div className="video-header" onDoubleClick={handleDoubleClick}>
        <div className="header-grip"></div>
      </div>
      
      <div className="video-content">
        {isEditing ? (
          <div className="url-input-container">
            <input
              ref={inputRef}
              type="text"
              value={editUrl}
              onChange={handleUrlChange}
              onBlur={handleUrlBlur}
              onKeyDown={handleKeyPress}
              placeholder="Paste YouTube URL here..."
              className="url-input"
            />
          </div>
        ) : video.videoId ? (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${video.videoId}`}
            title={video.title || 'YouTube video player'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="placeholder">
            <div className="youtube-icon">📺</div>
            <p>Double-click header to add YouTube URL</p>
          </div>
        )}
      </div>
      
      {isSelected && (
        <>
          <div 
            className="resize-handle resize-handle-se" 
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          <div 
            className="resize-handle resize-handle-s" 
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div 
            className="resize-handle resize-handle-e" 
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  );
};
