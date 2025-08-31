// Database record types for PocketBase collections

export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
}

export interface MovieRecord extends BaseRecord {
  title: string;
  mp4_path: string;
  srt_path?: string;
  srt_delay: number;
  last_position: number;
  duration?: number;
  date_added: string;
  last_accessed: string;
  thumbnail?: string; // Base64 encoded image or file path
}

// Type for creating new movies (without auto-generated fields)
export interface CreateMovieData {
  title: string;
  mp4_path: string;
  srt_path?: string;
  duration?: number;
  thumbnail?: string;
  // Note: srt_delay and last_position are automatically set to 0 on creation
}

// Type for updating movies (all fields optional except id)
export interface UpdateMovieData {
  title?: string;
  mp4_path?: string;
  srt_path?: string;
  srt_delay?: number;
  last_position?: number;
  duration?: number;
}

// FSRS State enum values (matching ts-fsrs)
export type FSRSState = 'New' | 'Learning' | 'Review' | 'Relearning';

// FSRS Rating enum values (matching ts-fsrs)
export type FSRSRating = 'Manual' | 'Again' | 'Hard' | 'Good' | 'Easy';

export interface FlashcardRecord extends BaseRecord {
  movie_id: string;           // Foreign key to movies
  subtitle_text: string;      // Original subtitle text
  free_space?: string;        // TinyMCE rich content (HTML)
  start_time: number;         // Subtitle timing for context (seconds)
  end_time: number;           // Subtitle timing for context (seconds)
  
  // FSRS fields
  due: string;               // ISO date string
  stability: number;         // A measure of how well the information is retained
  difficulty: number;        // Reflects the inherent difficulty of the card content (1-10)
  elapsed_days: number;      // Days since the card was last reviewed
  scheduled_days: number;    // The interval of time in days between this review and the next one
  reps: number;              // Total number of times the card has been reviewed
  lapses: number;            // Times the card was forgotten or remembered incorrectly
  learning_steps: number;    // Keeps track of the current step during the (re)learning stages
  state: FSRSState;          // The current state of the card
  last_review?: string;      // The most recent review date, if applicable (ISO date string)
}

export interface ReviewLogRecord extends BaseRecord {
  flashcard_id: string;      // Foreign key to flashcards
  rating: FSRSRating;        // Rating of the review (Again, Hard, Good, Easy)
  state: FSRSState;          // State of the review (New, Learning, Review, Relearning)
  due: string;               // Date of the last scheduling (ISO date string)
  stability: number;         // Stability of the card before the review
  difficulty: number;        // Difficulty of the card before the review (1-10)
  elapsed_days: number;      // Number of days elapsed since the last review
  last_elapsed_days: number; // Number of days between the last two reviews
  scheduled_days: number;    // Number of days until the next review
  learning_steps: number;    // Keeps track of the current step during the (re)learning stages
  review_time: string;       // Date of the review (ISO date string)
}

// Type for creating new flashcards (without auto-generated fields)
export interface CreateFlashcardData {
  movie_id: string;
  subtitle_text: string;
  free_space?: string;
  start_time: number;
  end_time: number;
  // FSRS fields will be auto-generated when creating a new card
}

// Type for updating flashcards (all fields optional except id)
export interface UpdateFlashcardData {
  subtitle_text?: string;
  free_space?: string;
  start_time?: number;
  end_time?: number;
  // FSRS fields updated through review process
  due?: string;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  lapses?: number;
  learning_steps?: number;
  state?: FSRSState;
  last_review?: string;
}

// Type for creating review logs
export interface CreateReviewLogData {
  flashcard_id: string;
  rating: FSRSRating;
  state: FSRSState;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  review_time: string;
}

// Collection names constants
export const COLLECTIONS = {
  MOVIES: 'movies',
  FLASHCARDS: 'flashcards',
  REVIEW_LOGS: 'review_logs',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];