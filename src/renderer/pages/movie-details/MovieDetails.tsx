/* eslint-disable consistent-return */
/* eslint-disable promise/always-return */
/* eslint-disable import/no-named-as-default */
/* eslint-disable import/prefer-default-export */
/* eslint-disable react/function-component-definition */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer, { VideoPlayerRef } from '../../../components/video/VideoPlayer';
import GoldenLayoutWrapper from '../../../components/layout/GoldenLayoutWrapper';
import { 
  Button, 
  TranslationModal, 
  IframeTranslationWidget,
  AddFlashcardDialog,
  ViewFlashcardsDialog,
  AiChatPanel
} from '../../../components/ui';
import { MovieRecord, FlashcardRecord } from '../../../lib/types/database';
import {
  SubtitleCue,
  parseSRT,
  getCurrentSubtitle,
} from '../../utils/subtitleParser';
import pocketBaseService from '../../../lib/services/pocketbase';
import './MovieDetails.css';

export const MovieDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const [movie, setMovie] = useState<MovieRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Subtitle state
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleCue | null>(
    null,
  );
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [subtitleSize, setSubtitleSize] = useState(24);
  const [subtitlePosition, setSubtitlePosition] = useState<
    'onscreen' | 'below'
  >('below');
  const [currentTime, setCurrentTime] = useState(0);

  // Translation state
  const [showTranslation, setShowTranslation] = useState(true);
  const [translationText, setTranslationText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);

  // Flashcard state
  const [flashcards, setFlashcards] = useState<FlashcardRecord[]>([]);
  const [showAddFlashcardDialog, setShowAddFlashcardDialog] = useState(false);
  const [showViewFlashcardsDialog, setShowViewFlashcardsDialog] = useState(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

  // AI chat state
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);

  // Computed value to check if any dialog is open or chat input is focused
  const isAnyDialogOpen = showTranslationModal || showAddFlashcardDialog || showViewFlashcardsDialog;
  const shouldDisableKeyboardShortcuts = isAnyDialogOpen || isChatInputFocused;

  // Handle pausing video when dialogs open
  useEffect(() => {
    if (isAnyDialogOpen && videoPlayerRef.current) {
      videoPlayerRef.current.pause();
    }
  }, [isAnyDialogOpen]);

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
              width: 70,
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
              type: 'column',
              width: 30,
              content: [
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'subtitles-and-translations' },
                  title: 'Subtitles & Translations',
                  height: 80,
                },
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'flash-card-actions' },
                  title: 'Flash Card Actions',
                  height: 20,
                },
              ],
            },

        
          ],
        },
      ],
    }),
    [],
  ); // Empty dependency array - config should never change

  // Load movie data
  const loadMovie = useCallback(async () => {
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
  }, [id]);

  // Flashcard functions
  const loadFlashcards = useCallback(async () => {
    if (!movie) return;
    
    setFlashcardsLoading(true);
    try {
      const result = await pocketBaseService.getFlashcards(movie.id);
      setFlashcards(result.items);
    } catch (error) {
      console.error('Error loading flashcards:', error);
    } finally {
      setFlashcardsLoading(false);
    }
  }, [movie]);

  // Load movie on component mount
  useEffect(() => {
    loadMovie();
  }, [loadMovie]);

  // Load flashcards when movie changes
  useEffect(() => {
    if (movie) {
      loadFlashcards();
    }
  }, [movie, loadFlashcards]);  // Load subtitles when movie changes
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

  const handleAddFlashcard = useCallback(() => {
    if (!currentSubtitle) {
      alert('No subtitle is currently active. Please wait for a subtitle to appear or seek to a point with subtitles.');
      return;
    }
    setShowAddFlashcardDialog(true);
  }, [currentSubtitle]);

  const handleCreateFlashcard = useCallback(async (data: any) => {
    try {
      await pocketBaseService.createFlashcard(data);
      await loadFlashcards(); // Reload flashcards
    } catch (error) {
      console.error('Error creating flashcard:', error);
      throw error;
    }
  }, [loadFlashcards]);

  const handleEditFlashcard = useCallback((flashcard: FlashcardRecord) => {
    // TODO: Implement edit functionality
    console.log('Edit flashcard:', flashcard);
  }, []);

  const handleDeleteFlashcard = useCallback(async (id: string) => {
    try {
      await pocketBaseService.deleteFlashcard(id);
      await loadFlashcards(); // Reload flashcards
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      throw error;
    }
  }, [loadFlashcards]);

  const handleReviewFlashcard = useCallback(async (id: string, rating: 'Again' | 'Hard' | 'Good' | 'Easy') => {
    try {
      await pocketBaseService.reviewFlashcard(id, rating);
      await loadFlashcards(); // Reload flashcards to show updated state
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
      throw error;
    }
  }, [loadFlashcards]);

  const handleJumpToTime = useCallback((startTime: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(startTime);
    }
  }, []);

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
              disableKeyboardShortcuts={shouldDisableKeyboardShortcuts}
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
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
              <div
                style={{
                  marginBottom: '16px',
                  position: 'relative',
                  zIndex: 30,
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: '#aaa',
                    marginBottom: '8px',
                  }}
                >
                  Current Subtitle:
                </div>
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
            <IframeTranslationWidget
              text={translationText || currentSubtitle?.text || ''}
              sourceLanguage="de"
              targetLanguage="en"
              isVisible={showTranslation && !!currentSubtitle}
            />

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
                Subtitles are displayed on video. Change position to "Below
                Video" in subtitle settings to show here.
              </div>
            )}
          </div>
          <div id="ai-chat" style={{ backgroundColor: '#181818ff', height: '100%' }}>
            <AiChatPanel 
              currentSubtitle={currentSubtitle?.text}
              onSelectTranslation={(translation) => {
                setTranslationText(translation);
                setShowTranslationModal(true);
              }}
              onInputFocusChange={setIsChatInputFocused}
            />
          </div>
          <div id="flash-card-actions" style={{ backgroundColor: '#181818ff' }}>
            <div style={{ padding: '16px' }}>
              <span style={{ color: '#888', display: 'block', marginBottom: '8px' }}>
                Create flash cards from subtitles and review them with free spaced repetition scheduling (FSRS) algorithms.
              </span>
              <Button onClick={handleAddFlashcard}>Add Flash Card</Button>
              <Button onClick={() => setShowViewFlashcardsDialog(true)}>View all Flash Cards</Button>
            </div>
          </div>
        </GoldenLayoutWrapper>
      </div>

      {/* Translation Modal for fullscreen mode */}
      <TranslationModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
        selectedText={currentSubtitle?.text || ''}
      />

      {/* Add Flashcard Dialog */}
      {showAddFlashcardDialog && currentSubtitle && movie && (
        <AddFlashcardDialog
          isOpen={showAddFlashcardDialog}
          onClose={() => setShowAddFlashcardDialog(false)}
          onAdd={handleCreateFlashcard}
          movieId={movie.id}
          subtitleText={currentSubtitle.text}
          startTime={currentSubtitle.startTime - subtitleDelay}
          endTime={currentSubtitle.endTime - subtitleDelay}
          moviePath={movie.mp4_path}
          onJumpToTime={handleJumpToTime}
        />
      )}

      {/* View Flashcards Dialog */}
      {showViewFlashcardsDialog && (
        <ViewFlashcardsDialog
          isOpen={showViewFlashcardsDialog}
          onClose={() => setShowViewFlashcardsDialog(false)}
          flashcards={flashcards}
          onEdit={handleEditFlashcard}
          onDelete={handleDeleteFlashcard}
          onReview={handleReviewFlashcard}
          onJumpToTime={handleJumpToTime}
          loading={flashcardsLoading}
        />
      )}
    </div>
  );
};
