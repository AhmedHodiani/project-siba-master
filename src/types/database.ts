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

// Collection names constants
export const COLLECTIONS = {
  MOVIES: 'movies',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];