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

  if (!isOpen) return null;

  return (
    <div className="flashcard-picker-overlay">
      <div className="flashcard-picker-dialog">
        <div className="flashcard-picker-header">
          <h3>Select a Flashcard to Add</h3>
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
          ) : (
            <div className="flashcard-picker-list">
              {flashcards.map((flashcard) => {
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
                        "{flashcard.subtitle_text}"
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
