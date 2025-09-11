import React, { useState, useEffect } from 'react';
import { FlashcardRecord } from '../../lib/types/database';
import { Button } from '../ui/Button';
import pocketBaseService from '../../lib/services/pocketbase';
import './FlashcardPickerDialog.css';

interface FlashcardPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFlashcard: (flashcard: FlashcardRecord) => void;
  movieId: string;
}

export const FlashcardPickerDialog: React.FC<FlashcardPickerDialogProps> = ({
  isOpen,
  onClose,
  onSelectFlashcard,
  movieId
}) => {
  const [flashcards, setFlashcards] = useState<FlashcardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFlashcard, setSelectedFlashcard] = useState<FlashcardRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Format time in mm:ss
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Load flashcards when dialog opens
  useEffect(() => {
    if (isOpen && movieId) {
      loadFlashcards();
    }
  }, [isOpen, movieId]);

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const result = await pocketBaseService.getFlashcards(movieId);
      setFlashcards(result.items);
    } catch (error) {
      console.error('Error loading flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFlashcard = () => {
    if (selectedFlashcard) {
      onSelectFlashcard(selectedFlashcard);
      onClose();
    }
  };

  const getStateLabel = (state: number | string): string => {
    const numState = typeof state === 'string' ? parseInt(state, 10) : state;
    const stateLabels = { 0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning' };
    return stateLabels[numState as keyof typeof stateLabels] || `${state}`;
  };

  const getDueStatus = (due: string): { label: string; color: string } => {
    const dueDate = new Date(due);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d overdue`, color: '#dc3545' };
    }
    if (diffDays === 0) {
      return { label: 'Due today', color: '#ffc107' };
    }
    if (diffDays === 1) {
      return { label: 'Due tomorrow', color: '#28a745' };
    }
    return { label: `Due in ${diffDays}d`, color: '#6c757d' };
  };

  // Filter flashcards based on search query
  const filteredFlashcards = flashcards.filter(flashcard => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search in subtitle text
    const subtitle = flashcard.subtitle_text?.toLowerCase() || '';
    if (subtitle.includes(query)) return true;
    
    // Search in timing (formatted as mm:ss)
    const startTime = formatTime(flashcard.start_time);
    const endTime = formatTime(flashcard.end_time);
    if (startTime.includes(query) || endTime.includes(query)) return true;
    
    // Search in state
    const state = getStateLabel(flashcard.state).toLowerCase();
    if (state.includes(query)) return true;
    
    // Search in due status
    const dueStatus = getDueStatus(flashcard.due);
    if (dueStatus.label.toLowerCase().includes(query)) return true;
    
    return false;
  });

  // Helper function to highlight search matches in text
  const highlightSearchMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) {
      return <span>{text}</span>;
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <span key={index} className="search-highlight-text">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Clear search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedFlashcard(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="flashcard-picker-overlay">
      <div className="flashcard-picker-dialog">
        <div className="flashcard-picker-header">
          <div className="flashcard-picker-header-content">
            <h3>Select a Flashcard to Add</h3>
            <div className="flashcard-search-container">
              <input
                type="text"
                placeholder="Search flashcards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flashcard-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="flashcard-search-clear"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <Button onClick={onClose} variant="secondary" size="small">
            ✕
          </Button>
        </div>

        <div className="flashcard-picker-content">
          {loading ? (
            <div className="flashcard-picker-loading">
              Loading flashcards...
            </div>
          ) : flashcards.length === 0 ? (
            <div className="flashcard-picker-empty">
              <p>No flashcards found for this movie.</p>
              <p>Create some flashcards in Movie Study mode first!</p>
            </div>
          ) : filteredFlashcards.length === 0 ? (
            <div className="flashcard-picker-empty">
              <p>No flashcards match your search: "{searchQuery}"</p>
              <p>Try a different search term or clear the search.</p>
            </div>
          ) : (
            <div className="flashcard-picker-list">
              <div className="flashcard-picker-results-info">
                Showing {filteredFlashcards.length} of {flashcards.length} flashcards
                {searchQuery && <span className="search-highlight"> for "{searchQuery}"</span>}
              </div>
              {filteredFlashcards.map((flashcard) => {
                const dueStatus = getDueStatus(flashcard.due);
                const isSelected = selectedFlashcard?.id === flashcard.id;
                
                return (
                  <div
                    key={flashcard.id}
                    className={`flashcard-picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedFlashcard(flashcard)}
                  >
                    <div className="flashcard-content">
                      <div className="flashcard-subtitle">
                        "{highlightSearchMatch(flashcard.subtitle_text || '', searchQuery)}"
                      </div>
                      
                      <div className="flashcard-metadata">
                        <div className="flashcard-timing">
                          {formatTime(flashcard.start_time)} - {formatTime(flashcard.end_time)}
                          <span className="duration">
                            ({(flashcard.end_time - flashcard.start_time).toFixed(1)}s)
                          </span>
                        </div>
                        
                        <div className="flashcard-stats">
                          <span className="state">
                            {getStateLabel(flashcard.state)}
                          </span>
                          <span 
                            className="due" 
                            style={{ color: dueStatus.color }}
                          >
                            {dueStatus.label}
                          </span>
                          <span className="difficulty">
                            Difficulty: {Number(flashcard.difficulty).toFixed(1)}
                          </span>
                          <span className="stability">
                            Stability: {Number(flashcard.stability).toFixed(1)}d
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flashcard-picker-footer">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button 
            onClick={handleSelectFlashcard}
            variant="primary"
            disabled={!selectedFlashcard}
          >
            Add to Canvas
          </Button>
        </div>
      </div>
    </div>
  );
};
