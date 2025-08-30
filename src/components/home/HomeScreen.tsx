import React, { useState, useEffect, useCallback } from 'react';
import { MovieRecord, CreateMovieData } from '../../types/database';
import { MovieCard } from '../movie/MovieCard';
import { Button } from '../ui/Button';
import pocketBaseService from '../../services/pocketbase';
import './HomeScreen.css';

interface HomeScreenProps {
  onPlayMovie: (movie: MovieRecord) => void;
  onClose: () => void;
}

export function HomeScreen({ onPlayMovie, onClose }: HomeScreenProps) {
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileValidations, setFileValidations] = useState<Record<string, { mp4Exists: boolean; srtExists: boolean }>>({});

  // Load movies from PocketBase
  const loadMovies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await pocketBaseService.getMovies({
        sort: '-last_accessed',
      });
      
      setMovies(result.items);
      
      // Validate file existence for all movies
      const validations: Record<string, { mp4Exists: boolean; srtExists: boolean }> = {};
      await Promise.all(
        result.items.map(async (movie) => {
          const validation = await pocketBaseService.validateMovieFiles(movie);
          validations[movie.id] = validation;
        })
      );
      setFileValidations(validations);
      
    } catch (err) {
      console.error('Error loading movies:', err);
      setError('Failed to load movies. Make sure PocketBase is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search movies
  const searchMovies = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadMovies();
      return;
    }

    try {
      setLoading(true);
      const searchResults = await pocketBaseService.searchMovies(query);
      setMovies(searchResults);
    } catch (err) {
      console.error('Error searching movies:', err);
      setError('Failed to search movies.');
    } finally {
      setLoading(false);
    }
  }, [loadMovies]);

  // Add new movie
  const handleAddMovie = useCallback(async () => {
    try {
      // Open video file dialog
      const videoPath = await window.electron.openVideoFile();
      if (!videoPath) return;

      // Check if movie already exists
      const existingMovie = await pocketBaseService.getMovieByPath(videoPath);
      if (existingMovie) {
        alert('This movie is already in your library.');
        return;
      }

      // Extract title from filename
      const filename = videoPath.split('/').pop() || 'Unknown Movie';
      const title = filename.replace(/\.[^/.]+$/, ''); // Remove extension

      // Optionally ask for subtitle file
      const shouldAddSubtitle = confirm('Would you like to add a subtitle file?');
      let subtitlePath: string | undefined;
      
      if (shouldAddSubtitle) {
        subtitlePath = await window.electron.openSubtitleFile();
      }

      // Create movie data
      const movieData: CreateMovieData = {
        title,
        mp4_path: videoPath,
        srt_path: subtitlePath,
        srt_delay: 0,
        last_position: 0,
      };

      // Save to database
      await pocketBaseService.createMovie(movieData);
      
      // Reload movies
      loadMovies();
      
    } catch (err) {
      console.error('Error adding movie:', err);
      alert('Failed to add movie. Please try again.');
    }
  }, [loadMovies]);

  // Play movie
  const handlePlayMovie = useCallback(async (movie: MovieRecord) => {
    try {
      // Update last accessed
      await pocketBaseService.updateLastAccessed(movie.id);
      onPlayMovie(movie);
    } catch (err) {
      console.error('Error updating movie access:', err);
      // Still play the movie even if update fails
      onPlayMovie(movie);
    }
  }, [onPlayMovie]);

  // Delete movie
  const handleDeleteMovie = useCallback(async (movie: MovieRecord) => {
    if (!confirm(`Are you sure you want to remove "${movie.title}" from your library?`)) {
      return;
    }

    try {
      await pocketBaseService.deleteMovie(movie.id);
      loadMovies();
    } catch (err) {
      console.error('Error deleting movie:', err);
      alert('Failed to delete movie. Please try again.');
    }
  }, [loadMovies]);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchMovies(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchMovies]);

  // Load movies on component mount
  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="home-screen">
      <div className="home-header">
        <div className="header-top">
          <h1 className="home-title">Movie Library</h1>
          <Button
            onClick={onClose}
            variant="secondary"
            size="small"
            className="close-btn"
          >
            ✕
          </Button>
        </div>
        
        <div className="header-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          
          <Button
            onClick={handleAddMovie}
            variant="primary"
            className="add-movie-btn"
          >
            ➕ Add Movie
          </Button>
        </div>
      </div>

      <div className="home-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading movies...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <Button onClick={loadMovies} variant="secondary">
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && filteredMovies.length === 0 && (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <p>No movies found matching "{searchQuery}"</p>
                <Button onClick={() => setSearchQuery('')} variant="secondary">
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <p>No movies in your library yet.</p>
                <Button onClick={handleAddMovie} variant="primary">
                  Add Your First Movie
                </Button>
              </>
            )}
          </div>
        )}

        {!loading && !error && filteredMovies.length > 0 && (
          <div className="movies-grid">
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onPlay={handlePlayMovie}
                onDelete={handleDeleteMovie}
                fileValidation={fileValidations[movie.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}