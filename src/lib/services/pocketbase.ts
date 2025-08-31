import type PocketBase from 'pocketbase' with { 'resolution-mode': 'import' };
import { 
  MovieRecord, 
  CreateMovieData, 
  UpdateMovieData,
  FlashcardRecord,
  CreateFlashcardData,
  UpdateFlashcardData,
  ReviewLogRecord,
  CreateReviewLogData,
  COLLECTIONS 
} from '../types/database';

class PocketBaseService {
  private pb: PocketBase | null = null;
  
  constructor(private url: string = 'http://127.0.0.1:8090') {}

  async getPocketBase(): Promise<PocketBase> {
    if (!this.pb) {
      const { default: PocketBase } = await import('pocketbase');
      this.pb = new PocketBase('http://127.0.0.1:8090');
    }
    return this.pb;
  }

  // Helper function to get file URL
  getFileUrl(collectionId: string, recordId: string, filename: string): string {
    return `http://127.0.0.1:8090/api/files/${collectionId}/${recordId}/${filename}`;
  }

  // Movie CRUD operations
  async createMovie(data: CreateMovieData): Promise<MovieRecord> {
    const pb = await this.getPocketBase();
    
    const createData: any = {
      ...data,
      srt_delay: 0,
      last_position: 0,
    };

    // Convert base64 thumbnail to File if provided
    if (data.thumbnail && data.thumbnail.startsWith('data:image/')) {
      try {
        // Convert base64 to blob
        const response = await fetch(data.thumbnail);
        const blob = await response.blob();
        
        // Create File object
        const thumbnailFile = new File([blob], `thumbnail_${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        
        createData.thumbnail = thumbnailFile;
      } catch (error) {
        console.warn('Failed to convert thumbnail to file:', error);
        // Remove thumbnail if conversion fails
        delete createData.thumbnail;
      }
    }
    
    // Remove undefined values to avoid validation issues
    Object.keys(createData).forEach(key => {
      if (createData[key] === undefined) {
        delete createData[key];
      }
    });
    
    try {
      return await pb.collection('movies').create<MovieRecord>(createData);
    } catch (error: any) {
      console.error('PocketBase create error:', error);
      console.error('Data sent:', createData);
      throw error;
    }
  }

  async getMovies(options?: {
    sort?: string;
    filter?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: MovieRecord[]; totalItems: number; totalPages: number }> {
    const pb = await this.getPocketBase();
    const { sort = '-date_added', filter = '', page = 1, perPage = 50 } = options || {};
    
    const result = await pb.collection(COLLECTIONS.MOVIES).getList<MovieRecord>(
      page,
      perPage,
      {
        sort,
        filter,
      }
    );
    
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  async getMovie(id: string): Promise<MovieRecord> {
    const pb = await this.getPocketBase();
    return pb.collection(COLLECTIONS.MOVIES).getOne<MovieRecord>(id);
  }

  async updateMovie(id: string, data: UpdateMovieData): Promise<MovieRecord> {
    const pb = await this.getPocketBase();
    return pb.collection(COLLECTIONS.MOVIES).update<MovieRecord>(id, data);
  }

  async deleteMovie(id: string): Promise<boolean> {
    const pb = await this.getPocketBase();
    return pb.collection(COLLECTIONS.MOVIES).delete(id);
  }

  async updateLastAccessed(id: string): Promise<MovieRecord> {
    return this.updateMovie(id, {});
  }

  async updateLastPosition(id: string, position: number): Promise<MovieRecord> {
    return this.updateMovie(id, { last_position: position });
  }

  async searchMovies(query: string): Promise<MovieRecord[]> {
    const result = await this.getMovies({
      filter: `title ~ "${query}"`,
      sort: '-last_accessed',
    });
    
    return result.items;
  }

  // File validation utility
  async validateMovieFiles(movie: MovieRecord): Promise<{ mp4Exists: boolean; srtExists: boolean }> {
    try {
      // Check if files exist using Electron's file system access
      const mp4Exists = await window.electron.fileExists(movie.mp4_path);
      const srtExists = movie.srt_path ? await window.electron.fileExists(movie.srt_path) : true;
      
      return { mp4Exists, srtExists };
    } catch (error) {
      console.error('Error validating movie files:', error);
      return { mp4Exists: false, srtExists: false };
    }
  }

  // Get recently accessed movies
  async getRecentMovies(limit: number = 10): Promise<MovieRecord[]> {
    const result = await this.getMovies({
      sort: '-last_accessed',
      perPage: limit,
    });
    
    return result.items;
  }

  // Get movies by title similarity
  async getMovieByPath(path: string): Promise<MovieRecord | null> {
    try {
      const result = await this.getMovies({
        filter: `mp4_path = "${path}"`,
        perPage: 1,
      });
      
      return result.items[0] || null;
    } catch (error) {
      console.error('Error finding movie by path:', error);
      return null;
    }
  }

  // ===== FLASHCARD OPERATIONS =====

  // Create a new flashcard from subtitle
  async createFlashcard(data: CreateFlashcardData): Promise<FlashcardRecord> {
    const pb = await this.getPocketBase();
    
    // Import ts-fsrs dynamically to avoid CommonJS/ESM issues
    const { createEmptyCard } = await import('ts-fsrs');
    
    // Create FSRS card with initial values
    const fsrsCard = createEmptyCard(new Date());
    
    const createData = {
      ...data,
      // FSRS initial values
      due: fsrsCard.due.toISOString(),
      stability: fsrsCard.stability,
      difficulty: fsrsCard.difficulty,
      elapsed_days: fsrsCard.elapsed_days,
      scheduled_days: fsrsCard.scheduled_days,
      reps: fsrsCard.reps,
      lapses: fsrsCard.lapses,
      learning_steps: fsrsCard.learning_steps,
      state: 'New' as const,
      last_review: undefined,
    };
    
    try {
      return await pb.collection(COLLECTIONS.FLASHCARDS).create<FlashcardRecord>(createData);
    } catch (error: any) {
      console.error('PocketBase flashcard create error:', error);
      throw error;
    }
  }

  // Get all flashcards for a movie
  async getFlashcards(movieId: string, options?: {
    sort?: string;
    filter?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: FlashcardRecord[]; totalItems: number; totalPages: number }> {
    const pb = await this.getPocketBase();
    const { sort = '-created', filter = '', page = 1, perPage = 50 } = options || {};
    
    const movieFilter = `movie_id = "${movieId}"`;
    const combinedFilter = filter ? `${movieFilter} && ${filter}` : movieFilter;
    
    const result = await pb.collection(COLLECTIONS.FLASHCARDS).getList<FlashcardRecord>(
      page,
      perPage,
      {
        sort,
        filter: combinedFilter,
        expand: 'movie_id', // Expand movie data if needed
      }
    );
    
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  // Get all flashcards across all movies
  async getAllFlashcards(options?: {
    sort?: string;
    filter?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: FlashcardRecord[]; totalItems: number; totalPages: number }> {
    const pb = await this.getPocketBase();
    const { sort = '-created', filter = '', page = 1, perPage = 100 } = options || {};
    
    const result = await pb.collection(COLLECTIONS.FLASHCARDS).getList<FlashcardRecord>(
      page,
      perPage,
      {
        sort,
        filter,
        expand: 'movie_id', // Expand movie data
      }
    );
    
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  // Get flashcards due for review
  async getDueFlashcards(options?: {
    sort?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: FlashcardRecord[]; totalItems: number; totalPages: number }> {
    const pb = await this.getPocketBase();
    const { sort = 'due', page = 1, perPage = 50 } = options || {};
    
    const now = new Date().toISOString();
    const filter = `due <= "${now}"`;
    
    const result = await pb.collection(COLLECTIONS.FLASHCARDS).getList<FlashcardRecord>(
      page,
      perPage,
      {
        sort,
        filter,
        expand: 'movie_id',
      }
    );
    
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  // Get single flashcard
  async getFlashcard(id: string): Promise<FlashcardRecord> {
    const pb = await this.getPocketBase();
    return pb.collection(COLLECTIONS.FLASHCARDS).getOne<FlashcardRecord>(id, {
      expand: 'movie_id',
    });
  }

  // Update flashcard
  async updateFlashcard(id: string, data: UpdateFlashcardData): Promise<FlashcardRecord> {
    const pb = await this.getPocketBase();
    return pb.collection(COLLECTIONS.FLASHCARDS).update<FlashcardRecord>(id, data);
  }

  // Delete flashcard
  async deleteFlashcard(id: string): Promise<boolean> {
    const pb = await this.getPocketBase();
    return pb.collection(COLLECTIONS.FLASHCARDS).delete(id);
  }

  // Review a flashcard using FSRS algorithm
  async reviewFlashcard(id: string, rating: 'Again' | 'Hard' | 'Good' | 'Easy'): Promise<FlashcardRecord> {
    const pb = await this.getPocketBase();
    
    // Import ts-fsrs dynamically
    const { fsrs, generatorParameters, Rating } = await import('ts-fsrs');
    
    // Get current flashcard
    const flashcard = await this.getFlashcard(id);
    
    // Convert flashcard to FSRS Card format
    const fsrsCard = {
      due: new Date(flashcard.due),
      stability: flashcard.stability,
      difficulty: flashcard.difficulty,
      elapsed_days: flashcard.elapsed_days,
      scheduled_days: flashcard.scheduled_days,
      reps: flashcard.reps,
      lapses: flashcard.lapses,
      learning_steps: flashcard.learning_steps,
      state: ['New', 'Learning', 'Review', 'Relearning'].indexOf(flashcard.state) as 0 | 1 | 2 | 3,
      last_review: flashcard.last_review ? new Date(flashcard.last_review) : undefined,
    };
    
    // Process review with FSRS
    const f = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: true }));
    const now = new Date();
    
    // Convert string rating to FSRS Rating enum (excluding Manual)
    const ratingMap = {
      'Again': Rating.Again,
      'Hard': Rating.Hard,
      'Good': Rating.Good,
      'Easy': Rating.Easy,
    } as const;
    
    const result = f.next(fsrsCard, now, ratingMap[rating]);
    
    const updatedCard = result.card;
    const reviewLog = result.log;
    
    // Update flashcard with new FSRS values
    const updateData: UpdateFlashcardData = {
      due: updatedCard.due.toISOString(),
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      elapsed_days: updatedCard.elapsed_days,
      scheduled_days: updatedCard.scheduled_days,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      learning_steps: updatedCard.learning_steps,
      state: ['New', 'Learning', 'Review', 'Relearning'][updatedCard.state] as FlashcardRecord['state'],
      last_review: updatedCard.last_review?.toISOString(),
    };
    
    // Create review log
    const logData: CreateReviewLogData = {
      flashcard_id: id,
      rating: rating,
      state: ['New', 'Learning', 'Review', 'Relearning'][reviewLog.state] as ReviewLogRecord['state'],
      due: reviewLog.due.toISOString(),
      stability: reviewLog.stability,
      difficulty: reviewLog.difficulty,
      elapsed_days: reviewLog.elapsed_days,
      last_elapsed_days: reviewLog.last_elapsed_days,
      scheduled_days: reviewLog.scheduled_days,
      learning_steps: reviewLog.learning_steps,
      review_time: reviewLog.review.toISOString(),
    };
    
    // Save both flashcard update and review log
    const [updatedFlashcard] = await Promise.all([
      this.updateFlashcard(id, updateData),
      this.createReviewLog(logData),
    ]);
    
    return updatedFlashcard;
  }

  // ===== REVIEW LOG OPERATIONS =====

  // Create review log
  async createReviewLog(data: CreateReviewLogData): Promise<ReviewLogRecord> {
    const pb = await this.getPocketBase();
    return pb.collection(COLLECTIONS.REVIEW_LOGS).create<ReviewLogRecord>(data);
  }

  // Get review logs for a flashcard
  async getReviewLogs(flashcardId: string, options?: {
    sort?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: ReviewLogRecord[]; totalItems: number; totalPages: number }> {
    const pb = await this.getPocketBase();
    const { sort = '-review_time', page = 1, perPage = 50 } = options || {};
    
    const filter = `flashcard_id = "${flashcardId}"`;
    
    const result = await pb.collection(COLLECTIONS.REVIEW_LOGS).getList<ReviewLogRecord>(
      page,
      perPage,
      {
        sort,
        filter,
      }
    );
    
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  // Get study statistics
  async getStudyStats(movieId?: string): Promise<{
    totalCards: number;
    dueCards: number;
    reviewedToday: number;
    newCards: number;
    learningCards: number;
    reviewCards: number;
    relearningCards: number;
  }> {
    const pb = await this.getPocketBase();
    
    // Build filter for movie if specified
    const movieFilter = movieId ? `movie_id = "${movieId}"` : '';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const now = new Date().toISOString();
    
    // Get all flashcards (filtered by movie if specified)
    const allCards = await pb.collection(COLLECTIONS.FLASHCARDS).getFullList<FlashcardRecord>({
      filter: movieFilter,
    });
    
    // Get today's reviews
    const todayReviews = await pb.collection(COLLECTIONS.REVIEW_LOGS).getFullList<ReviewLogRecord>({
      filter: `review_time >= "${today}T00:00:00.000Z"`,
    });
    
    // Calculate stats
    const stats = {
      totalCards: allCards.length,
      dueCards: allCards.filter(card => new Date(card.due) <= new Date(now)).length,
      reviewedToday: new Set(todayReviews.map(log => log.flashcard_id)).size, // Unique cards reviewed today
      newCards: allCards.filter(card => card.state === 'New').length,
      learningCards: allCards.filter(card => card.state === 'Learning').length,
      reviewCards: allCards.filter(card => card.state === 'Review').length,
      relearningCards: allCards.filter(card => card.state === 'Relearning').length,
    };
    
    return stats;
  }
}

// Create singleton instance
export const pocketBaseService = new PocketBaseService();
export default pocketBaseService;