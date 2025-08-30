import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../../../components/video/VideoPlayer';
import GoldenLayoutWrapper from '../../../components/layout/GoldenLayoutWrapper';
import { Button, TranslationModal } from '../../../components/ui';
import { MovieRecord } from '../../../lib/types/database';
import {
  SubtitleCue,
  parseSRT,
  getCurrentSubtitle,
} from '../../utils/subtitleParser';
import pocketBaseService from '../../../lib/services/pocketbase';
import "./MovieDetails.css"

export const MovieDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoPlayerRef = useRef<any>(null);
  const [movie, setMovie] = useState<MovieRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Subtitle state
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleCue | null>(
    null,
  );
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [subtitleSize, setSubtitleSize] = useState(24);
  const [subtitlePosition, setSubtitlePosition] = useState<'onscreen' | 'below'>('below');
  const [currentTime, setCurrentTime] = useState(0);

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationText, setTranslationText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);

  // Auto-select subtitle text when it changes
  useEffect(() => {
    if (currentSubtitle && subtitlePosition === 'below') {
      setTranslationText(currentSubtitle.text);
    }
  }, [currentSubtitle, subtitlePosition]);

  // Memoize the Golden Layout config to prevent recreating it on every render
  // This must be called before any conditional returns to follow React hooks rules
  const goldenLayoutConfig = React.useMemo(
    () => ({
      content: [
        {
          type: 'row',
          content: [
            {
              type: 'column',
              width: 80,
              content: [
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'video-player' },
                  title: 'Video Player',
                  height: 50,
                },
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'ai-chat' },
                  title: 'AI Chat',
                },
              ],
            },
            {
              type: 'component',
              componentType: 'react-component',
              componentState: { componentId: 'subtitles-and-translations' },
              title: 'Subtitles & Translations',
            },
          ],
        },
      ],
    }),
    [],
  ); // Empty dependency array - config should never change

  // Load movie data
  useEffect(() => {
    const loadMovie = async () => {
      if (!id) return;

      try {
        const movieData = await pocketBaseService.getMovie(id);
        setMovie(movieData);
        setSubtitleDelay(movieData.srt_delay);
      } catch (error) {
        console.error('Failed to load movie:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [id]);

  // Load subtitles when movie changes
  useEffect(() => {
    if (movie?.srt_path) {
      window.electron
        .readSubtitleFile(movie.srt_path)
        .then((content) => {
          if (content) {
            const parsedSubtitles = parseSRT(content);
            setSubtitles(parsedSubtitles);
          }
        })
        .catch((error) => console.error('Error loading subtitles:', error));
    } else {
      setSubtitles([]);
    }
  }, [movie]);

  // Update current subtitle based on time
  useEffect(() => {
    const subtitle = getCurrentSubtitle(subtitles, currentTime, subtitleDelay);
    setCurrentSubtitle(subtitle);
  }, [subtitles, currentTime, subtitleDelay]);

  // Debounced effect to save subtitle delay to database
  useEffect(() => {
    if (!movie) return;

    const timeoutId = setTimeout(async () => {
      if (subtitleDelay !== movie.srt_delay) {
        try {
          await pocketBaseService.updateMovie(movie.id, {
            srt_delay: subtitleDelay,
          });
        } catch (error) {
          console.error('Error saving subtitle delay:', error);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [subtitleDelay, movie]);

  // Subtitle control functions
  const handleSubtitleDelayChange = useCallback((delay: number) => {
    setSubtitleDelay(delay);
  }, []);

  const handleSubtitleSizeChange = useCallback((size: number) => {
    setSubtitleSize(size);
  }, []);

  const handleSubtitlePositionChange = useCallback(
    (position: 'onscreen' | 'below') => {
      setSubtitlePosition(position);
    },
    [],
  );

  const seekToPreviousSubtitle = useCallback(() => {
    if (!videoPlayerRef.current || subtitles.length === 0) return;

    const adjustedCurrentTime = currentTime + subtitleDelay;
    const previousSubtitles = subtitles.filter(
      (sub) => sub.startTime < adjustedCurrentTime - 0.5,
    );

    if (previousSubtitles.length > 0) {
      const previousSubtitle = previousSubtitles[previousSubtitles.length - 1];
      const seekTime = previousSubtitle.startTime - subtitleDelay;
      videoPlayerRef.current.seekTo(seekTime);
    } else if (subtitles.length > 0) {
      const seekTime = subtitles[0].startTime - subtitleDelay;
      videoPlayerRef.current.seekTo(seekTime);
    }
  }, [subtitles, subtitleDelay, currentTime]);

  const seekToNextSubtitle = useCallback(() => {
    if (!videoPlayerRef.current || subtitles.length === 0) return;

    const adjustedCurrentTime = currentTime + subtitleDelay;
    const nextSubtitle = subtitles.find(
      (sub) => sub.startTime > adjustedCurrentTime + 0.5,
    );

    if (nextSubtitle) {
      const seekTime = nextSubtitle.startTime - subtitleDelay;
      videoPlayerRef.current.seekTo(seekTime);
    } else if (subtitles.length > 0) {
      const lastSubtitle = subtitles[subtitles.length - 1];
      const seekTime = lastSubtitle.startTime - subtitleDelay;
      videoPlayerRef.current.seekTo(seekTime);
    }
  }, [subtitles, subtitleDelay, currentTime]);

  // Handle time updates from video player
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Detect fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle translate button click - show modal in fullscreen, inline otherwise
  const handleTranslateClick = useCallback(() => {
    if (isFullscreen && currentSubtitle) {
      setShowTranslationModal(true);
    } else {
      setShowTranslation(!showTranslation);
    }
  }, [isFullscreen, currentSubtitle, showTranslation]);

  const handleBack = async () => {
    // Save current position before navigating back
    if (videoPlayerRef.current) {
      try {
        await videoPlayerRef.current.saveCurrentPosition();
      } catch (error) {
        console.warn('Failed to save position on back navigation:', error);
      }
    }
    navigate('/');
  };

  if (!id) {
    return <div>Movie not found</div>;
  }

  if (loading) {
    return <div>Loading movie...</div>;
  }

  if (!movie) {
    return <div>Movie not found</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '10px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
        }}
      >
        <Button onClick={handleBack} variant="secondary" size="small">
          ← Back to Movies
        </Button>
      </div>
      <div style={{ flex: 1 }}>
        <GoldenLayoutWrapper config={goldenLayoutConfig}>
          <div id="video-player">
            <VideoPlayer
              ref={videoPlayerRef}
              movie={movie}
              currentSubtitle={currentSubtitle}
              subtitleSize={subtitleSize}
              subtitlePosition={subtitlePosition}
              subtitleDelay={subtitleDelay}
              subtitlesLoaded={subtitles.length > 0}
              onTimeUpdate={handleTimeUpdate}
              onPreviousSubtitle={seekToPreviousSubtitle}
              onNextSubtitle={seekToNextSubtitle}
              onDelayChange={handleSubtitleDelayChange}
              onSizeChange={handleSubtitleSizeChange}
              onPositionChange={handleSubtitlePositionChange}
              onOpenTranslation={() => setShowTranslationModal(true)}
            />
          </div>
          <div
            id="subtitles-and-translations"
            style={{
              backgroundColor: '#151414ff',
              padding: '16px',
              color: '#e0e0e0',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: '0', fontSize: '16px' }}>
                Subtitles & Translations
              </h3>
              <Button
                onClick={handleTranslateClick}
                variant="primary"
                size="small"
                className={showTranslation ? 'translation-active' : ''}
              >
                {showTranslation ? 'Hide Translation' : 'Show Translation'}
              </Button>
            </div>

            {/* Current Subtitle Display */}
            {subtitlePosition === 'below' && currentSubtitle && (
              <div style={{ marginBottom: '16px', position: 'relative', zIndex: 30 }}>
                <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>Current Subtitle:</div>
                <div
                  style={{
                    fontSize: `${subtitleSize}px`,
                    lineHeight: '1.4',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: '12px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    userSelect: 'text',
                    cursor: 'text',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)';
                  }}
                >
                  {currentSubtitle.text}
                </div>
              </div>
            )}

            {/* Translation Panel */}
            {showTranslation && currentSubtitle && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', marginTop: '-80px' }}>
                <div id='overlay' />
                <div id='overlay2' />
                <iframe
                  src={`https://www.bing.com/translator/?from=auto&to=en&text=${encodeURIComponent(translationText || currentSubtitle.text)}`}
                  style={{
                    width: '125%',
                    height: '1000px',
                    overflow: 'hidden',
                    border: '1px solid #444',
                    backgroundColor: '#fff',
                    transform: 'scale(0.8)',
                    transformOrigin: '0 0',
                  }}
                  title="Translation"
                />
              </div>
            )}

            {/* No subtitle message */}
            {subtitlePosition === 'below' && !currentSubtitle && (
              <div
                style={{
                  textAlign: 'center',
                  color: '#888',
                  fontStyle: 'italic',
                  padding: '12px',
                }}
              >
                No subtitle at current time
              </div>
            )}

            {/* Info message when subtitles are onscreen */}
            {subtitlePosition === 'onscreen' && (
              <div
                style={{
                  textAlign: 'center',
                  color: '#888',
                  fontStyle: 'italic',
                  padding: '12px',
                }}
              >
                Subtitles are displayed on video. Change position to "Below Video" in subtitle settings to show here.
              </div>
            )}
          </div>
          <div id="ai-chat" style={{ backgroundColor: '#181818ff' }}>
            <span style={{ color: '#888', padding: '16px', display: 'block' }}>
              coming soon...
            </span>
          </div>
        </GoldenLayoutWrapper>
      </div>

      {/* Translation Modal for fullscreen mode */}
      <TranslationModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
        selectedText={currentSubtitle?.text || ''}
      />
    </div>
  );
};
