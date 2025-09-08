import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { FlashcardRecord } from '../../lib/types/database';
import './ViewFlashcardsDialog.css';

// Simple utility to strip markdown syntax for preview
const stripMarkdown = (markdown: string): string => {
  return markdown
    .replace(/[#*`_~\[\]()]/g, '') // Remove markdown symbols
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
};

interface ViewFlashcardsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: FlashcardRecord[];
  onEdit: (flashcard: FlashcardRecord) => void;
  onDelete: (id: string) => Promise<void>;
  onReview: (id: string, rating: 'Again' | 'Hard' | 'Good' | 'Easy') => Promise<void>;
  onResetFSRS: (id: string) => Promise<void>;
  onJumpToTime: (startTime: number) => void;
  loading?: boolean;
}

export const ViewFlashcardsDialog: React.FC<ViewFlashcardsDialogProps> = ({
  isOpen,
  onClose,
  flashcards,
  onEdit,
  onDelete,
  onReview,
  onResetFSRS,
  onJumpToTime,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created' | 'due' | 'reps'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort flashcards
  const filteredAndSortedCards = React.useMemo(() => {
    let filtered = flashcards;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.subtitle_text.toLowerCase().includes(query) ||
        (card.free_space && card.free_space.toLowerCase().includes(query))
      );
    }

    // Apply state filter
    if (stateFilter !== 'all') {
      filtered = filtered.filter(card => card.state === stateFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'created':
          aValue = new Date(a.created);
          bValue = new Date(b.created);
          break;
        case 'due':
          aValue = new Date(a.due);
          bValue = new Date(b.due);
          break;
        case 'reps':
          aValue = a.reps;
          bValue = b.reps;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [flashcards, searchQuery, stateFilter, sortBy, sortOrder]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'New': return '#4caf50';
      case 'Learning': return '#ff9800';
      case 'Review': return '#2196f3';
      case 'Relearning': return '#f44336';
      default: return '#666';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="view-flashcards-dialog-overlay">
      <div className="view-flashcards-dialog">
        <div className="dialog-header">
          <h2>Flashcards ({flashcards.length})</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          {/* Filters and Controls */}
          <div className="controls-section">
            <div className="search-section">
              <input
                type="text"
                placeholder="Search flashcards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-section">
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All States</option>
                <option value="New">New</option>
                <option value="Learning">Learning</option>
                <option value="Review">Review</option>
                <option value="Relearning">Relearning</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as typeof sortBy);
                  setSortOrder(order as typeof sortOrder);
                }}
                className="filter-select"
              >
                <option value="created-desc">Newest First</option>
                <option value="created-asc">Oldest First</option>
                <option value="due-asc">Due Soon</option>
                <option value="due-desc">Due Later</option>
                <option value="reps-desc">Most Reviewed</option>
                <option value="reps-asc">Least Reviewed</option>
              </select>
            </div>
          </div>

          {/* Flashcards Table */}
          <div className="flashcards-table-container">
            {loading ? (
              <div className="loading-state">Loading flashcards...</div>
            ) : filteredAndSortedCards.length === 0 ? (
              <div className="empty-state">
                {searchQuery || stateFilter !== 'all' 
                  ? 'No flashcards match your filters' 
                  : 'No flashcards created yet'
                }
              </div>
            ) : (
              <table className="flashcards-table">
                <thead>
                  <tr>
                    <th>Subtitle</th>
                    <th>State</th>
                    <th>Due</th>
                    <th>Reviews</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedCards.map((card) => (
                    <tr key={card.id}>
                      <td className="subtitle-cell">
                        <div className="subtitle-text">
                          {card.subtitle_text}
                        </div>
                        {card.free_space && (
                          <div className="free-space-preview">
                            {stripMarkdown(card.free_space).substring(0, 100)}
                            {stripMarkdown(card.free_space).length > 100 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <span 
                          className="state-badge"
                          style={{ backgroundColor: getStateColor(card.state) }}
                        >
                          {card.state}
                        </span>
                      </td>
                      <td className="due-cell">
                        <div className="due-date">
                          {formatDate(card.due)}
                        </div>
                        <div className="due-relative">
                          {getDaysUntilDue(card.due)}
                        </div>
                      </td>
                      <td className="stats-cell">
                        <div>Reviews: {card.reps}</div>
                        <div>Lapses: {card.lapses}</div>
                      </td>
                      <td className="time-cell">
                        <button
                          className="time-button"
                          onClick={() => onJumpToTime(card.start_time)}
                          title="Jump to this time in video"
                        >
                          {formatTime(card.start_time)} - {formatTime(card.end_time)}
                        </button>
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <Button
                            onClick={() => onEdit(card)}
                            variant="secondary"
                            size="small"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => onResetFSRS(card.id)}
                            variant="secondary"
                            size="small"
                          >
                            Reset FSRS
                          </Button>
                          <Button
                            onClick={() => onDelete(card.id)}
                            variant="danger"
                            size="small"
                          >
                            Delete
                          </Button>
                        </div>
                        
                        {/* Quick Review Buttons */}
                        <div className="review-buttons">
                          <button
                            className="review-btn review-btn--again"
                            onClick={() => onReview(card.id, 'Again')}
                            title="Again"
                          >
                            1
                          </button>
                          <button
                            className="review-btn review-btn--hard"
                            onClick={() => onReview(card.id, 'Hard')}
                            title="Hard"
                          >
                            2
                          </button>
                          <button
                            className="review-btn review-btn--good"
                            onClick={() => onReview(card.id, 'Good')}
                            title="Good"
                          >
                            3
                          </button>
                          <button
                            className="review-btn review-btn--easy"
                            onClick={() => onReview(card.id, 'Easy')}
                            title="Easy"
                          >
                            4
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dialog-footer">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};