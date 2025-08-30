import type PocketBase from 'pocketbase';
import { 
  MovieRecord, 
  CreateMovieData, 
  UpdateMovieData, 
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
}

// Create singleton instance
export const pocketBaseService = new PocketBaseService();
export default pocketBaseService;