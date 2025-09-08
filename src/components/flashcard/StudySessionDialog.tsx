import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { FlashcardRecord } from '../../lib/types/database';
import './StudySessionDialog.css';

interface StudySessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: FlashcardRecord[];
  onStartSession: (selectedCards: FlashcardRecord[], sessionConfig: SessionConfig) => void;
}

interface SessionConfig {
  cardCount: number;
  groupType: string;
  groupName: string;
  sessionType?: 'standard' | 'mastery';
  masteryThreshold?: {
    minStability: number;
    requiredState: 'Review' | 'any';
    maxDifficulty?: number;
  };
}

interface CardGroup {
  id: string;
  name: string;
  description: string;
  cards: FlashcardRecord[];
  color: string;
  priority: number;
}

export const StudySessionDialog: React.FC<StudySessionDialogProps> = ({
  isOpen,
  onClose,
  flashcards,
  onStartSession,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [cardCount, setCardCount] = useState(20);
  const [sessionType, setSessionType] = useState<'standard' | 'mastery'>('standard');
  const [masteryStability, setMasteryStability] = useState(21); // 3 weeks default

  // Mastery checking function
  const isCardMastered = (card: FlashcardRecord): boolean => {
    return card.state === 'Review' && card.stability >= masteryStability;
  };

  // Group flashcards by different criteria
  const cardGroups: CardGroup[] = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Group by due status (highest priority)
    const overdue = flashcards.filter(card => new Date(card.due) < today);
    const dueToday = flashcards.filter(card => {
      const dueDate = new Date(card.due);
      return dueDate >= today && dueDate < tomorrow;
    });
    const dueSoon = flashcards.filter(card => {
      const dueDate = new Date(card.due);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return dueDate >= tomorrow && dueDate < nextWeek;
    });

    // Group by FSRS state
    const newCards = flashcards.filter(card => card.state === 'New');
    const learningCards = flashcards.filter(card => card.state === 'Learning');
    const reviewCards = flashcards.filter(card => card.state === 'Review');
    const relearningCards = flashcards.filter(card => card.state === 'Relearning');

    // Group by difficulty (based on FSRS difficulty score)
    const easyCards = flashcards.filter(card => card.difficulty < 4);
    const mediumCards = flashcards.filter(card => card.difficulty >= 4 && card.difficulty < 7);
    const hardCards = flashcards.filter(card => card.difficulty >= 7);

    // Mastery-specific groups
    const masteredCards = flashcards.filter(card => isCardMastered(card));
    const unmasteredCards = flashcards.filter(card => !isCardMastered(card));
    const closeToMastery = flashcards.filter(card => 
      !isCardMastered(card) && 
      card.state === 'Review' && 
      card.stability >= (masteryStability * 0.7) // 70% of mastery threshold
    );

    const groups: CardGroup[] = [
      // Due status groups (highest priority)
      // {
      //   id: 'overdue',
      //   name: `📅 Overdue (${overdue.length})`,
      //   description: 'Cards that should have been reviewed already',
      //   cards: overdue,
      //   color: '#dc3545',
      //   priority: 1,
      // },
      // {
      //   id: 'due-today',
      //   name: `⏰ Due Today (${dueToday.length})`,
      //   description: 'Cards scheduled for review today',
      //   cards: dueToday,
      //   color: '#ffc107',
      //   priority: 2,
      // },
      // {
      //   id: 'due-soon',
      //   name: `📆 Due Soon (${dueSoon.length})`,
      //   description: 'Cards due within the next week',
      //   cards: dueSoon,
      //   color: '#17a2b8',
      //   priority: 3,
      // },

      // Mastery-specific groups (shown when mastery session is selected)
      ...(sessionType === 'mastery' ? [
        {
          id: 'unmastered',
          name: `🎯 Unmastered (${unmasteredCards.length})`,
          description: `Cards below mastery threshold (${masteryStability}d stability)`,
          cards: unmasteredCards,
          color: '#e83e8c',
          priority: 3.1,
        },
        {
          id: 'close-to-mastery',
          name: `🔥 Close to Mastery (${closeToMastery.length})`,
          description: `Review cards approaching mastery threshold`,
          cards: closeToMastery,
          color: '#fd7e14',
          priority: 3.2,
        },
      ] : []),
      
      // State groups
      {
        id: 'new',
        name: `🆕 New Cards (${newCards.length})`,
        description: 'Fresh cards you haven\'t studied yet',
        cards: newCards,
        color: '#007acc',
        priority: 4,
      },
      {
        id: 'learning',
        name: `📚 Learning (${learningCards.length})`,
        description: 'Cards you\'re currently learning',
        cards: learningCards,
        color: '#fd7e14',
        priority: 5,
      },
      // {
      //   id: 'relearning',
      //   name: `🔄 Relearning (${relearningCards.length})`,
      //   description: 'Cards you need to relearn',
      //   cards: relearningCards,
      //   color: '#e83e8c',
      //   priority: 6,
      // },
      {
        id: 'review',
        name: `✅ Review (${reviewCards.length})`,
        description: 'Cards in regular review rotation',
        cards: reviewCards,
        color: '#28a745',
        priority: 7,
      },

      // Mastery status (for standard sessions)
      // ...(sessionType === 'standard' ? [
      //   {
      //     id: 'mastered',
      //     name: `🏆 Mastered (${masteredCards.length})`,
      //     description: `Cards that have reached mastery (${masteryStability}d+ stability)`,
      //     cards: masteredCards,
      //     color: '#28a745',
      //     priority: 7.5,
      //   },
      // ] : []),
      
      // Difficulty groups
      {
        id: 'hard',
        name: `🔥 Hard Cards (${hardCards.length})`,
        description: 'Most challenging cards (difficulty 7+)',
        cards: hardCards,
        color: '#dc3545',
        priority: 8,
      },
      // {
      //   id: 'medium',
      //   name: `⚖️ Medium Cards (${mediumCards.length})`,
      //   description: 'Moderately difficult cards (difficulty 4-7)',
      //   cards: mediumCards,
      //   color: '#ffc107',
      //   priority: 9,
      // },
      // {
      //   id: 'easy',
      //   name: `😊 Easy Cards (${easyCards.length})`,
      //   description: 'Less challenging cards (difficulty < 4)',
      //   cards: easyCards,
      //   color: '#28a745',
      //   priority: 10,
      // },
      
      // All cards option
      {
        id: 'all',
        name: `📚 All Cards (${flashcards.length})`,
        description: 'Study all available flashcards',
        cards: flashcards,
        color: '#6c757d',
        priority: 11,
      },
    ].filter(group => group.cards.length > 0); // Only show groups with cards

    return groups.sort((a, b) => a.priority - b.priority);
  }, [flashcards, sessionType, masteryStability, isCardMastered]);

  // Auto-select the highest priority group with cards
  useEffect(() => {
    if (cardGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(cardGroups[0].id);
    }
  }, [cardGroups, selectedGroupId]);

  const selectedGroup = cardGroups.find(group => group.id === selectedGroupId);
  const maxCards = selectedGroup ? selectedGroup.cards.length : 0;

  const handleStartSession = () => {
    if (!selectedGroup) return;

    // For mastery sessions, don't shuffle - maintain priority order
    // For standard sessions, shuffle for variety
    const orderedCards = sessionType === 'mastery' 
      ? [...selectedGroup.cards] 
      : [...selectedGroup.cards].sort(() => Math.random() - 0.5);
      
    const sessionCards = orderedCards.slice(0, Math.min(cardCount, maxCards));

    const sessionConfig: SessionConfig = {
      cardCount: sessionCards.length,
      groupType: selectedGroup.id,
      groupName: selectedGroup.name,
      sessionType,
      ...(sessionType === 'mastery' && {
        masteryThreshold: {
          minStability: masteryStability,
          requiredState: 'any', // Allow any state to be considered for mastery
        },
      }),
    };

    onStartSession(sessionCards, sessionConfig);
  };

  if (!isOpen) return null;

  return (
    <div className="study-session-dialog-overlay">
      <div className="study-session-dialog">
        <div className="study-session-dialog-header">
          <h2>🎯 Start Study Session</h2>
          <button className="close-button" onClick={onClose} title="Close Dialog">
            ×
          </button>
        </div>

        <div className="study-session-dialog-content">
          {/* Session Type Selection */}
          <div className="section">
            <h3>🎯 Session Type</h3>
            <div className="session-type-selection">
              <div 
                className={`session-type ${sessionType === 'standard' ? 'selected' : ''}`}
                onClick={() => setSessionType('standard')}
              >
                <div className="session-type-header">
                  <span className="session-type-name">📚 Standard Session</span>
                  <div className="session-type-indicator" />
                </div>
                <div className="session-type-description">
                  Review a fixed number of cards, then finish
                </div>
              </div>
              
              <div 
                className={`session-type ${sessionType === 'mastery' ? 'selected' : ''}`}
                onClick={() => setSessionType('mastery')}
              >
                <div className="session-type-header">
                  <span className="session-type-name">🏆 Mastery Session</span>
                  <div className="session-type-indicator" />
                </div>
                <div className="session-type-description">
                  Continue until all cards reach mastery threshold
                </div>
              </div>
            </div>

            {/* Mastery Threshold Configuration */}
            {sessionType === 'mastery' && (
              <div className="mastery-config">
                <label htmlFor="mastery-stability">
                  <strong>Mastery Threshold:</strong> {masteryStability} days stability
                </label>
                <input
                  id="mastery-stability"
                  type="range"
                  min="7"
                  max="91"
                  step="7"
                  value={masteryStability}
                  onChange={(e) => setMasteryStability(Number(e.target.value))}
                  style={{
                    '--progress': `${((masteryStability - 7) / (91 - 7)) * 100}%`
                  } as React.CSSProperties}
                />
                <div className="threshold-labels">
                  <span>7d (Beginner)</span>
                  <span>28d (Intermediate)</span>
                  <span>63d (Advanced)</span>
                  <span>91d (Expert)</span>
                </div>
              </div>
            )}
          </div>

          {/* Group Selection */}
          <div className="section">
            <h3>📋 Select Card Group</h3>
            <div className="card-groups">
              {cardGroups.map((group) => (
                <div
                  key={group.id}
                  className={`card-group ${selectedGroupId === group.id ? 'selected' : ''}`}
                  onClick={() => setSelectedGroupId(group.id)}
                  style={{ borderColor: group.color }}
                >
                  <div className="card-group-header">
                    <span className="card-group-name">{group.name}</span>
                    <div 
                      className="card-group-indicator"
                      style={{ backgroundColor: group.color }}
                    />
                  </div>
                  <div className="card-group-description">{group.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Card Count Selection */}
          <div className="section">
            <h3>🎲 Number of Cards</h3>
            <div className="card-count-section">
              <div className="card-count-input">
                <input
                  type="number"
                  min="1"
                  max={maxCards}
                  value={cardCount}
                  onChange={(e) => setCardCount(Math.min(Number(e.target.value), maxCards))}
                />
                <span className="card-count-max">/ {maxCards} available</span>
              </div>
              
              <div className="quick-counts">
                {[5, 10, 20, 50].filter(count => count <= maxCards).map(count => (
                  <button
                    key={count}
                    className={`quick-count ${cardCount === count ? 'active' : ''}`}
                    onClick={() => setCardCount(count)}
                  >
                    {count}
                  </button>
                ))}
                {maxCards > 0 && (
                  <button
                    className={`quick-count ${cardCount === maxCards ? 'active' : ''}`}
                    onClick={() => setCardCount(maxCards)}
                  >
                    All ({maxCards})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Session Preview */}
          {selectedGroup && (
            <div className="section session-preview">
              <h3>👀 Session Preview</h3>
              <div className="preview-card">
                <div className="preview-info">
                  <div className="preview-line">
                    <span className="preview-label">Type:</span>
                    <span>{sessionType === 'mastery' ? '🏆 Mastery Session' : '📚 Standard Session'}</span>
                  </div>
                  <div className="preview-line">
                    <span className="preview-label">Group:</span>
                    <span style={{ color: selectedGroup.color }}>{selectedGroup.name}</span>
                  </div>
                  <div className="preview-line">
                    <span className="preview-label">Cards:</span>
                    <span>
                      {sessionType === 'mastery' 
                        ? `Up to ${Math.min(cardCount, maxCards)} cards (until mastery)`
                        : `${Math.min(cardCount, maxCards)} cards`
                      }
                    </span>
                  </div>
                  {sessionType === 'mastery' && (
                    <div className="preview-line">
                      <span className="preview-label">Mastery:</span>
                      <span>{masteryStability}d stability + Review state</span>
                    </div>
                  )}
                  <div className="preview-line">
                    <span className="preview-label">Est. Time:</span>
                    <span>
                      {sessionType === 'mastery' 
                        ? `${Math.ceil(Math.min(cardCount, maxCards) * 1)} - ${Math.ceil(Math.min(cardCount, maxCards) * 3)} min`
                        : `${Math.ceil(Math.min(cardCount, maxCards) * 0.5)} - ${Math.ceil(Math.min(cardCount, maxCards) * 1)} min`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="study-session-dialog-footer">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button 
            onClick={handleStartSession}
            variant="primary"
            disabled={!selectedGroup || maxCards === 0}
          >
            {sessionType === 'mastery' ? '🏆 Start Mastery Session' : '🚀 Start Session'}
          </Button>
        </div>
      </div>
    </div>
  );
};