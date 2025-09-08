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
  StudySessionDialog,
  AiChatPanel,
  VideoPreview,
  MarkdownEditor,
  DrawingMode
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

  // Helper function to format time in hh:mm:ss
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

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
  const [showStudySessionDialog, setShowStudySessionDialog] = useState(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

  // Study session state
  const [studySession, setStudySession] = useState<{
    cards: FlashcardRecord[];
    currentIndex: number;
    config: {
      cardCount: number;
      groupType: string;
      groupName: string;
      sessionType?: 'standard' | 'mastery';
      masteryThreshold?: {
        minStability: number;
        requiredState: 'Review' | 'any';
        maxDifficulty?: number;
      };
    };
    startTime: Date;
    reviewedCards: { id: string; rating: string; timestamp: Date }[];
    masteredCards?: string[]; // IDs of cards that have reached mastery
    activeQueue?: FlashcardRecord[]; // Cards still being studied
    learningQueue?: { card: FlashcardRecord; nextReview: Date }[]; // Cards in learning steps
  } | null>(null);

  // AI chat state
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);

  // Study mode state
  const [studyMode, setStudyMode] = useState<'movie' | 'flashcard' | 'drawing'>('movie');

    // Video preview state for flashcard study
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);

  // Notes editing state
  const [notesContent, setNotesContent] = useState('');
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);

  // Repeat state
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatingSubtitle, setRepeatingSubtitle] = useState<SubtitleCue | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Computed value to check if any dialog is open, chat input is focused, or in flashcard study mode
  const isAnyDialogOpen = showTranslationModal || showAddFlashcardDialog || showViewFlashcardsDialog || showStudySessionDialog;
  const shouldDisableKeyboardShortcuts = isAnyDialogOpen || isChatInputFocused || studyMode === 'flashcard';

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
  const movieLayoutConfig = React.useMemo(
    () => ({
      settings: {
        showPopoutIcon: false, // Disable popout feature in Electron
        showMaximiseIcon: true,
        showCloseIcon: true,
      },
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
                  type: 'row',
                  content: [
                    {
                      type: 'column',
                      width: 70,
                      content: [
                        
                            {
                              type: 'component',
                              componentType: 'react-component',
                              componentState: { componentId: 'subtitles' },
                              title: 'Subtitles',
                              height: 20,
                            },
                            {
                              type: 'component',
                              componentType: 'react-component',
                              componentState: { componentId: 'flash-card-actions' },
                              title: 'Flash Card Actions',
                              height: 20,
                            },
                      ]
                    },
                    {
                      type: 'column',
                      width: 70,
                      content: [
                            {
                              type: 'component',
                              componentType: 'react-component',
                              componentState: { componentId: 'translations' },
                              title: 'Translations',
                              height: 60,
                            },
                      ]
                    }
                  ]
                }
              ],
            },
            {
              type: 'column',
              width: 30,
              content: [
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'ai-chat' },
                  title: 'AI Chat',
                },


              ],
            },

        
          ],
        },
      ],
    }),
    [],
  ); // Empty dependency array - config should never change

  const flashcardLayoutConfig = React.useMemo(
    () => ({
      settings: {
        showPopoutIcon: false, // Disable popout feature in Electron
        showMaximiseIcon: true,
        showCloseIcon: true,
      },
      content: [
        {
          type: 'row',
          content: [
            {
              type: 'column',
              width: 25,
              content: [
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'flashcard-notes' },
                  title: 'Notes',
                  height: 60,
                },
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'translations' },
                  title: 'Translations',
                  height: 40,
                },
              ],
            },
            {
              type: 'column',
              width: 35,
              content: [
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'flashcard-study' },
                  title: 'Flashcard Study',
                },
              ],
            },
            {
              type: 'column',
              width: 20,
              content: [
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'ai-chat' },
                  title: 'AI Chat',
                  height: 75,
                },
                {
                  type: 'component',
                  componentType: 'react-component',
                  componentState: { componentId: 'movie-info' },
                  title: 'Movie Info',
                  height: 25
                },
              ],
            },
          ],
        },
      ],
    }),
    [],
  ); // Empty dependency array - config should never change

  const activeLayoutConfig = studyMode === 'movie' ? movieLayoutConfig : flashcardLayoutConfig;

  // Computed values for current context (movie vs flashcard study)
  const currentContextSubtitle = React.useMemo(() => {
    if (studyMode === 'flashcard') {
      // Only use study session cards when session is active
      const activeCard = studySession?.cards?.[studySession.currentIndex];
      return activeCard?.subtitle_text || '';
    }
    return currentSubtitle?.text || '';
  }, [studyMode, currentSubtitle, studySession]);

  const currentContextTranslationText = React.useMemo(() => {
    if (studyMode === 'flashcard') {
      // Only use study session cards when session is active
      const activeCard = studySession?.cards?.[studySession.currentIndex];
      return activeCard?.subtitle_text || '';
    }
    return translationText || currentSubtitle?.text || '';
  }, [studyMode, translationText, currentSubtitle, studySession]);

  const shouldShowTranslation = React.useMemo(() => {
    if (studyMode === 'flashcard') {
      // Only show translation when we have an active study session with cards
      return !!studySession?.cards?.[studySession.currentIndex];
    }
    return showTranslation && !!currentSubtitle;
  }, [studyMode, showTranslation, currentSubtitle, studySession]);

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
    // When repeating, always show the locked subtitle instead of calculating from time
    if (isRepeating && repeatingSubtitle) {
      setCurrentSubtitle(repeatingSubtitle);
    } else {
      const subtitle = getCurrentSubtitle(subtitles, currentTime, subtitleDelay);
      setCurrentSubtitle(subtitle);
    }
  }, [subtitles, currentTime, subtitleDelay, isRepeating, repeatingSubtitle]);

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

  // Cleanup repeat timeout on unmount
  useEffect(() => {
    return () => {
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
    };
  }, []);

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
    
    // Handle subtitle repetition
    if (isRepeating && repeatingSubtitle && videoPlayerRef.current) {
      const adjustedTime = time + subtitleDelay;
      
      // If we've gone past the end of the repeating subtitle, seek back to the start
      if (adjustedTime >= repeatingSubtitle.endTime - 0.1) { // Small buffer to prevent infinite seeking
        const seekTime = repeatingSubtitle.startTime - subtitleDelay;
        videoPlayerRef.current.seekTo(seekTime);
      }
      // If we're before the start of the repeating subtitle, seek to the start
      else if (adjustedTime < repeatingSubtitle.startTime) {
        const seekTime = repeatingSubtitle.startTime - subtitleDelay;
        videoPlayerRef.current.seekTo(seekTime);
      }
    }
  }, [isRepeating, repeatingSubtitle, subtitleDelay]);

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

  const handleResetFlashcardFSRS = useCallback(async (id: string) => {
    try {
      // Show confirmation dialog
      const confirmed = window.confirm(
        'Are you sure you want to reset the FSRS metrics for this flashcard?\n\n' +
        'This will:\n' +
        '• Reset the card to "New" state\n' +
        '• Clear all review statistics (reps, lapses, etc.)\n' +
        '• Reset difficulty and stability to initial values\n' +
        '• Set due date to now\n\n' +
        'This action cannot be undone!'
      );
      
      if (!confirmed) return;
      
      await pocketBaseService.resetFlashcardFSRS(id);
      await loadFlashcards(); // Reload flashcards to show updated state
      
      // Show success message
      alert('✅ FSRS metrics have been reset successfully!\n\nThe flashcard is now in "New" state and ready for fresh learning.');
    } catch (error) {
      console.error('Error resetting FSRS metrics:', error);
      alert('❌ Failed to reset FSRS metrics. Please try again.');
      throw error;
    }
  }, [loadFlashcards]);

  // Mastery checking logic
  const isCardMastered = useCallback((card: FlashcardRecord, threshold?: { minStability: number; requiredState: 'Review' | 'any'; maxDifficulty?: number }) => {
    if (!threshold) {
      // Default mastery criteria: Review state + 21 days stability
      return card.state === 'Review' && card.stability >= 21;
    }

    const meetsState = threshold.requiredState === 'any' || card.state === threshold.requiredState;
    const meetsStability = card.stability >= threshold.minStability;
    const meetsDifficulty = !threshold.maxDifficulty || card.difficulty <= threshold.maxDifficulty;

    return meetsState && meetsStability && meetsDifficulty;
  }, []);

  // Get next card for mastery session
  const getNextMasteryCard = useCallback((updatedMasteredCards?: string[]) => {
    if (!studySession || studySession.config.sessionType !== 'mastery') return null;

    const { cards, masteredCards = [], config, currentIndex } = studySession;
    if (!cards || cards.length === 0) return null;

    // Use provided updated list or current session list
    const currentMastered = updatedMasteredCards || masteredCards;

    // Start searching from the next card after current
    const startIndex = (currentIndex + 1) % cards.length;
    
    // First, try to find an unmastered card starting from the next position
    for (let i = 0; i < cards.length; i++) {
      const index = (startIndex + i) % cards.length;
      const card = cards[index];
      
      if (!currentMastered.includes(card.id) && !isCardMastered(card, config.masteryThreshold)) {
        return { card, index };
      }
    }

    return null;
  }, [studySession, isCardMastered]);

  // Study session navigation helper
  const advanceToNextCard = useCallback(async (newReviewedCards?: { id: string; rating: string; timestamp: Date }[]) => {
    if (!studySession) return;
    
    const reviewedCards = newReviewedCards || studySession.reviewedCards;
    
    // Handle mastery sessions differently
    if (studySession.config.sessionType === 'mastery') {
      // Reload current card to get updated FSRS values
      const currentCard = studySession.cards[studySession.currentIndex];
      if (!currentCard) return;
      
      try {
        const updatedCard = await pocketBaseService.getFlashcard(currentCard.id);
        
        // Update the card in our session data
        const updatedCards = [...studySession.cards];
        updatedCards[studySession.currentIndex] = updatedCard;
        
        // Check if this card is now mastered
        const isNowMastered = isCardMastered(updatedCard, studySession.config.masteryThreshold);
        const masteredCards = [...(studySession.masteredCards || [])];
        
        if (isNowMastered && !masteredCards.includes(updatedCard.id)) {
          masteredCards.push(updatedCard.id);
        }
        
        // Find next unmastered card
        const nextCard = getNextMasteryCard(masteredCards);
        
        if (!nextCard) {
          // All cards mastered! Session complete
          const sessionDuration = Date.now() - studySession.startTime.getTime();
          const totalCards = studySession.cards.length;
          const masteredCount = masteredCards.length;
          
          alert(
            `🎉 Mastery Session Complete!\n\n` +
            `🏆 Achievement Unlocked: Card Master!\n\n` +
            `📊 Session Stats:\n` +
            `• Cards mastered: ${masteredCount}/${totalCards}\n` +
            `• Time spent: ${Math.round(sessionDuration / 60000)} minutes\n` +
            `• Average per card: ${Math.round((sessionDuration / 1000) / totalCards)}s\n\n` +
            `🎯 Ratings Distribution:\n` +
            `• Again: ${reviewedCards.filter(r => r.rating === 'Again').length}\n` +
            `• Hard: ${reviewedCards.filter(r => r.rating === 'Hard').length}\n` +
            `• Good: ${reviewedCards.filter(r => r.rating === 'Good').length}\n` +
            `• Easy: ${reviewedCards.filter(r => r.rating === 'Easy').length}\n\n` +
            `🧠 All cards now have strong memory consolidation!`
          );
          
          setStudySession(null);
          return;
        }
        
        // Update the session with the new state and move to next card
        const updatedSession = {
          ...studySession,
          cards: updatedCards,
          currentIndex: nextCard.index,
          reviewedCards,
          masteredCards,
        };
        
        // Log for debugging
        console.log('Mastery session advancing:', {
          currentCardId: currentCard.id,
          nextCardId: nextCard.card.id,
          nextIndex: nextCard.index,
          masteredCount: masteredCards.length,
          totalCards: updatedCards.length,
          isCurrentMastered: isNowMastered
        });
        
        setStudySession(updatedSession);
        
        // Update video preview
        if (nextCard.card) {
          setPreviewTime(nextCard.card.start_time);
        }
        
      } catch (error) {
        console.error('Failed to reload card for mastery check:', error);
        // Fall back to standard behavior
      }
      
      return;
    }
    
    // Standard session logic (unchanged)
    const nextIndex = studySession.currentIndex + 1;
    
    if (nextIndex >= studySession.cards.length) {
      // Session completed - show stats and reset
      const sessionDuration = Date.now() - studySession.startTime.getTime();
      const avgTimePerCard = sessionDuration / studySession.cards.length;
      
      alert(
        `🎉 Study Session Complete!\n\n` +
        `📊 Session Stats:\n` +
        `• Cards reviewed: ${studySession.cards.length}\n` +
        `• Time spent: ${Math.round(sessionDuration / 60000)} minutes\n` +
        `• Average per card: ${Math.round(avgTimePerCard / 1000)}s\n\n` +
        `🎯 Ratings:\n` +
        `• Again: ${reviewedCards.filter(r => r.rating === 'Again').length}\n` +
        `• Hard: ${reviewedCards.filter(r => r.rating === 'Hard').length}\n` +
        `• Good: ${reviewedCards.filter(r => r.rating === 'Good').length}\n` +
        `• Easy: ${reviewedCards.filter(r => r.rating === 'Easy').length}\n` +
        `• Skipped: ${studySession.cards.length - reviewedCards.length}`
      );
      
      setStudySession(null);
    } else {
      // Move to next card and auto-jump video preview to new card's start time
      const nextCard = studySession.cards[nextIndex];
      setStudySession({
        ...studySession,
        currentIndex: nextIndex,
        reviewedCards,
      });
      
      // Automatically jump the video preview to the next card's start time
      if (nextCard) {
        setPreviewTime(nextCard.start_time);
      }
    }
  }, [studySession, isCardMastered, getNextMasteryCard]);

  const handleReviewFlashcard = useCallback(async (id: string, rating: 'Again' | 'Hard' | 'Good' | 'Easy') => {
    try {
      await pocketBaseService.reviewFlashcard(id, rating);
      
      // If in study session, track the review and advance to next card
      if (studySession) {
        const reviewedCard = { id, rating, timestamp: new Date() };
        const newReviewedCards = [...studySession.reviewedCards, reviewedCard];
        advanceToNextCard(newReviewedCards);
      }
      
      await loadFlashcards(); // Reload flashcards to show updated state
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
      throw error;
    }
  }, [loadFlashcards, studySession, advanceToNextCard]);

  // Study session handlers
  const handleStartStudySession = useCallback((selectedCards: FlashcardRecord[], sessionConfig: any) => {
    const isMasterySession = sessionConfig.sessionType === 'mastery';
    
    // For mastery sessions, find the first unmastered card
    let startIndex = 0;
    if (isMasterySession) {
      const threshold = sessionConfig.masteryThreshold;
      for (let i = 0; i < selectedCards.length; i++) {
        if (!isCardMastered(selectedCards[i], threshold)) {
          startIndex = i;
          break;
        }
      }
    }
    
    // Initialize mastery tracking for mastery sessions
    const initialMasteredCards = isMasterySession 
      ? selectedCards.filter(card => 
          isCardMastered(card, sessionConfig.masteryThreshold)
        ).map(card => card.id)
      : [];

    setStudySession({
      cards: selectedCards,
      currentIndex: startIndex,
      config: sessionConfig,
      startTime: new Date(),
      reviewedCards: [],
      ...(isMasterySession && {
        masteredCards: initialMasteredCards,
        activeQueue: selectedCards,
        learningQueue: [],
      }),
    });
    
    // Set initial preview time
    if (selectedCards[startIndex]) {
      setPreviewTime(selectedCards[startIndex].start_time);
    }
    
    setShowStudySessionDialog(false);
  }, [isCardMastered]);

  const handleSkipFlashcard = useCallback(() => {
    advanceToNextCard();
  }, [advanceToNextCard]);

  const handleEndStudySession = useCallback(() => {
    setStudySession(null);
  }, []);

  const handleJumpToTime = useCallback((startTime: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(startTime);
    }
  }, []);

  // Video preview handlers
  const handlePreviewTimeUpdate = useCallback((time: number) => {
    setPreviewTime(time);
  }, []);

  const handlePreviewPlayStateChange = useCallback((playing: boolean) => {
    setPreviewPlaying(playing);
  }, []);

  const handlePreviewJumpToStart = useCallback(() => {
    // Only work with active study session cards
    const activeCard = studySession?.cards?.[studySession.currentIndex];
    if (activeCard) {
      setPreviewTime(activeCard.start_time);
    }
  }, [studySession]);

  const handlePreviewJumpToEnd = useCallback(() => {
    // Only work with active study session cards
    const activeCard = studySession?.cards?.[studySession.currentIndex];
    if (activeCard) {
      setPreviewTime(activeCard.end_time);
    }
  }, [studySession]);

  // Notes editing handlers
  const handleNotesChange = useCallback((value: string) => {
    setNotesContent(value);
    // Check if content has changed from original - only for active study session
    const activeCard = studySession?.cards?.[studySession.currentIndex];
    const originalContent = activeCard?.free_space || '';
    setHasUnsavedNotes(value !== originalContent);
  }, [studySession]);

  const handleSaveNotes = useCallback(async () => {
    // Only save notes for active study session cards
    const activeCard = studySession?.cards?.[studySession.currentIndex];
    if (!activeCard) return;
    
    try {
      // Update the flashcard with new notes
      await pocketBaseService.updateFlashcard(activeCard.id, {
        free_space: notesContent.trim() || undefined
      });
      
      // Update the study session cards array to keep it in sync
      const updatedCards = [...studySession.cards];
      updatedCards[studySession.currentIndex] = {
        ...updatedCards[studySession.currentIndex],
        free_space: notesContent.trim() || undefined
      };
      setStudySession({
        ...studySession,
        cards: updatedCards
      });
      
      await loadFlashcards(); // Reload to get updated data
      setHasUnsavedNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }, [notesContent, loadFlashcards, studySession]);

  // Update notes content when current flashcard changes
  useEffect(() => {
    // Only load notes content when there's an active study session
    const activeCard = studySession?.cards?.[studySession.currentIndex];
    if (activeCard?.free_space) {
      setNotesContent(activeCard.free_space);
    } else {
      setNotesContent('');
    }
    setHasUnsavedNotes(false); // Reset unsaved state when flashcard changes
  }, [studySession]);

  const toggleRepeat = useCallback(() => {
    const newRepeating = !isRepeating;
    setIsRepeating(newRepeating);
    
    if (newRepeating && currentSubtitle) {
      // Lock onto the current subtitle when repeat is enabled
      setRepeatingSubtitle(currentSubtitle);
      // Seek to the start of this subtitle immediately
      if (videoPlayerRef.current) {
        const seekTime = currentSubtitle.startTime - subtitleDelay;
        videoPlayerRef.current.seekTo(seekTime);
      }
    } else {
      // Clear the locked subtitle when repeat is disabled
      setRepeatingSubtitle(null);
    }
  }, [isRepeating, currentSubtitle, subtitleDelay]);

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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button onClick={handleBack} variant="secondary" size="small">
          ← Back to Movies
        </Button>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => setStudyMode('movie')} 
            variant={studyMode === 'movie' ? 'danger' : 'secondary'} 
            size="small"
          >
            Movie Study
          </Button>
          <Button 
            onClick={() => setStudyMode('flashcard')} 
            variant={studyMode === 'flashcard' ? 'danger' : 'secondary'} 
            size="small"
          >
            Flashcard Study
          </Button>
          <Button 
            onClick={() => setStudyMode('drawing')} 
            variant={studyMode === 'drawing' ? 'danger' : 'secondary'} 
            size="small"
          >
            Drawing
          </Button>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {studyMode === 'drawing' ? (
          <DrawingMode movieId={movie?.id} />
        ) : (
          <GoldenLayoutWrapper key={studyMode} config={activeLayoutConfig}>
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
            id="subtitles"
            style={{
              backgroundColor: '#2d2611ff',
              padding: '16px',
              color: '#e0e0e0',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
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

            {/* Repeat Button */}
            {subtitles.length > 0 && currentSubtitle && (
              <div style={{ marginBottom: '16px' }}>
                <Button
                  onClick={toggleRepeat}
                  variant={isRepeating ? "primary" : "secondary"}
                  size="small"
                >
                  <span>Repeat</span>
                  <span style={{
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
          <div id="translations" style={{ backgroundColor: '#181818ff' }}>
            <IframeTranslationWidget
              text={currentContextTranslationText}
              sourceLanguage="de"
              targetLanguage="en"
              isVisible={shouldShowTranslation}
            />

            {/* No subtitle message */}
            {studyMode === 'movie' && subtitlePosition === 'below' && !currentSubtitle && (
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
            
            {/* No flashcard message */}
            {studyMode === 'flashcard' && !studySession && (
              <div
                style={{
                  textAlign: 'center',
                  color: '#888',
                  fontStyle: 'italic',
                  padding: '12px',
                }}
              >
                Start a study session to view translations
              </div>
            )}
          </div>
          <div id="ai-chat" style={{ backgroundColor: '#181818ff', height: '100%' }}>
            <AiChatPanel 
              currentSubtitle={currentContextSubtitle}
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
          
          {/* Flashcard Study Mode Components */}
          <div id="flashcard-study" style={{ backgroundColor: '#251f0dff', padding: '0px', height: '100%' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              color: '#e0e0e0'
            }}>
              {flashcards.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  color: '#888'
                }}>
                  <h3>No flashcards created yet</h3>
                  <p>Switch to Movie Study mode and create some flashcards first!</p>
                  <Button onClick={() => setStudyMode('movie')} variant="primary">
                    Go to Movie Study
                  </Button>
                </div>
              ) : studySession ? (
                // Study session active
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Session Header */}
                  <div style={{ 
                    backgroundColor: '#2d2611ff', 
                    padding: '16px', 
                    borderBottom: '1px solid #444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#888' }}>
                        {studySession.config.groupName}
                        {studySession.config.sessionType === 'mastery' && ' - Mastery Session'}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        Card {studySession.currentIndex + 1} of {studySession.cards.length}
                      </div>
                      {studySession.config.sessionType === 'mastery' && (
                        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                          {(() => {
                            const totalCards = studySession.cards.length;
                            const masteredCards = studySession.masteredCards || [];
                            const masteredCount = masteredCards.length;
                            return `Mastered: ${masteredCount}/${totalCards} (${Math.round((masteredCount/totalCards)*100)}%)`;
                          })()}
                        </div>
                      )}
                    </div>
                    <Button onClick={handleEndStudySession} variant="secondary" size="small">
                      End Session
                    </Button>
                  </div>

                  {/* Current Card */}
                  <div style={{ 
                    borderRadius: '8px',
                    flex: 1,
                    margin: '16px'
                  }}>
                    <p style={{ fontSize: '18px', lineHeight: '1.5', marginBottom: '15px' }}>
                      "{studySession?.cards?.[studySession.currentIndex]?.subtitle_text || 'Loading...'}"
                    </p>
                    {studySession?.cards?.[studySession.currentIndex] && movie && (
                      <div style={{ marginBottom: '15px' }}>
                        <VideoPreview
                          moviePath={movie.mp4_path}
                          startTime={studySession.cards[studySession.currentIndex].start_time}
                          endTime={studySession.cards[studySession.currentIndex].end_time}
                          currentTime={previewTime}
                          isPlaying={previewPlaying}
                          onTimeUpdate={handlePreviewTimeUpdate}
                          onPlayStateChange={handlePreviewPlayStateChange}
                          onJumpToStart={handlePreviewJumpToStart}
                          onJumpToEnd={handlePreviewJumpToEnd}
                        />
                        
                        {/* Card Metadata */}
                        <div style={{ 
                          marginTop: '12px', 
                          padding: '12px', 
                          backgroundColor: 'rgba(0,0,0,0.3)', 
                          borderRadius: '6px',
                          opacity: 0.5,
                          border: '1px solid #444',
                          fontSize: '13px',
                          color: '#ccc'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <strong>State:</strong> {(() => {
                                const rawState = studySession.cards[studySession.currentIndex].state;
                                const state = parseInt(String(rawState), 10);
                                const stateLabels = { 0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning' };
                                if (isNaN(state)) return `${rawState}`;
                                return `${state}`;
                              })()}
                            </div>
                            <div>
                              <strong>Due:</strong> {(() => {
                                const due = new Date(studySession.cards[studySession.currentIndex].due);
                                const now = new Date();
                                const diffMs = due.getTime() - now.getTime();
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
                                if (diffDays === 0) return 'Today';
                                if (diffDays === 1) return 'Tomorrow';
                                return `${diffDays}d`;
                              })()}
                            </div>
                            <div>
                              <strong>Difficulty:</strong> {Number(studySession.cards[studySession.currentIndex].difficulty).toFixed(1)}
                            </div>
                            <div>
                              <strong>Stability:</strong> {Number(studySession.cards[studySession.currentIndex].stability).toFixed(1)}d
                            </div>
                            <div>
                              <strong>Reps:</strong> {studySession.cards[studySession.currentIndex].reps}
                            </div>
                            <div>
                              <strong>Lapses:</strong> {studySession.cards[studySession.currentIndex].lapses}
                            </div>
                          </div>
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #555' }}>
                            <strong>Time:</strong> {formatTime(studySession.cards[studySession.currentIndex].start_time)} - {formatTime(studySession.cards[studySession.currentIndex].end_time)}
                            <span style={{ marginLeft: '12px' }}>
                              <strong>Duration:</strong> {(studySession.cards[studySession.currentIndex].end_time - studySession.cards[studySession.currentIndex].start_time).toFixed(1)}s
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Review Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    padding: '20px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <Button 
                      onClick={async () => {
                        try {
                          const currentCard = studySession?.cards?.[studySession.currentIndex];
                          if (currentCard) await handleReviewFlashcard(currentCard.id, 'Again');
                        } catch (error) {
                          console.error('Error rating card Again:', error);
                          alert('Error rating card. Please try again.');
                        }
                      }}
                      variant="secondary"
                    >
                      Again
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          const currentCard = studySession?.cards?.[studySession.currentIndex];
                          if (currentCard) await handleReviewFlashcard(currentCard.id, 'Hard');
                        } catch (error) {
                          console.error('Error rating card Hard:', error);
                          alert('Error rating card. Please try again.');
                        }
                      }}
                      variant="secondary"
                    >
                      Hard
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          const currentCard = studySession?.cards?.[studySession.currentIndex];
                          if (currentCard) await handleReviewFlashcard(currentCard.id, 'Good');
                        } catch (error) {
                          console.error('Error rating card Good:', error);
                          alert('Error rating card. Please try again.');
                        }
                      }}
                      variant="primary"
                    >
                      Good
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          const currentCard = studySession?.cards?.[studySession.currentIndex];
                          if (currentCard) await handleReviewFlashcard(currentCard.id, 'Easy');
                        } catch (error) {
                          console.error('Error rating card Easy:', error);
                          alert('Error rating card. Please try again.');
                        }
                      }}
                      variant="primary"
                    >
                      Easy
                    </Button>
                    <Button 
                      onClick={handleSkipFlashcard}
                      variant="secondary"
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              ) : (
                // Session starter only
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  padding: '40px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    backgroundColor: '#2d2611ff', 
                    padding: '40px', 
                    borderRadius: '12px',
                    maxWidth: '400px'
                  }}>
                    <h2 style={{ margin: '0 0 16px 0', color: '#f0f0f0' }}>Ready to Study?</h2>
                    <p style={{ margin: '0 0 24px 0', color: '#888', fontSize: '16px', lineHeight: '1.5' }}>
                      Start a focused study session with customized card groups and progress tracking
                    </p>
                    <Button onClick={() => setShowStudySessionDialog(true)} variant="primary" size="large">
                      🚀 Start Study Session
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div id="movie-info" style={{ backgroundColor: '#190518ff', padding: '12px', height: '100%' }}>
            <div style={{ color: '#e0e0e0', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 2-column grid layout */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '8px', 
                marginBottom: '12px',
                flex: 1
              }}>
                <div style={{ textAlign: 'center', border: '1px solid #444', borderRadius: '4px', padding: '8px'   }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>
                    Total Cards
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#007acc' }}>
                    {flashcards.length}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', border: '1px solid #444', borderRadius: '4px', padding: '8px'   }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>
                    Due Now
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffc107' }}>
                    {flashcards.filter(card => new Date(card.due) <= new Date()).length}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', border: '1px solid #444', borderRadius: '4px', padding: '8px'   }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>
                    Progress
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#28a745' }}>
                    {flashcards.filter(card => Number(card.state) !== 0).length}/{flashcards.length}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', border: '1px solid #444', borderRadius: '4px', padding: '8px'   }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>
                    Movie
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#e0e0e0', 
                    wordBreak: 'break-word',
                    lineHeight: '1.2',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {movie?.title || 'Unknown Movie'}
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => setShowViewFlashcardsDialog(true)}
                variant="primary"
                size="small"
              >
                View All Cards
              </Button>
            </div>
          </div>
          
          <div id="flashcard-notes" style={{ backgroundColor: '#181818ff', height: '100%' }}>
            <div style={{ color: '#e0e0e0', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {hasUnsavedNotes && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    zIndex: 20,
                  }}>
                    <Button onClick={handleSaveNotes} variant="primary" size="small">
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
              
              {(() => {
                const activeCard = studySession?.cards?.[studySession.currentIndex];
                return activeCard ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, width: '100%', height: '100%' }}>
                      <MarkdownEditor
                        value={notesContent}
                        onChange={handleNotesChange}
                        placeholder="Add your translation, notes, grammar explanations, or any other helpful information using **Markdown** formatting..."
                        disabled={false}
                        fullHeight={true}
                        preview="preview"
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    textAlign: 'center',
                    color: '#888',
                    fontStyle: 'italic'
                  }}>
                    Start a study session to view and edit notes
                  </div>
                );
              })()}
            </div>
          </div>
        </GoldenLayoutWrapper>
        )}
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
          onResetFSRS={handleResetFlashcardFSRS}
          onJumpToTime={handleJumpToTime}
          loading={flashcardsLoading}
        />
      )}

      {/* Study Session Dialog */}
      {showStudySessionDialog && (
        <StudySessionDialog
          isOpen={showStudySessionDialog}
          onClose={() => setShowStudySessionDialog(false)}
          flashcards={flashcards}
          onStartSession={handleStartStudySession}
        />
      )}
    </div>
  );
};
