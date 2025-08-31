/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
/* eslint-disable import/no-named-as-default */
/* eslint-disable import/prefer-default-export */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MovieRecord } from '@/lib/types/database';
import { MovieCard } from '@/components/movie/MovieCard';
import { AddMovieDialog } from '@/components/movie/AddMovieDialog';
import { Button } from '@/components/ui/Button';
import pocketBaseService from '@/lib/services/pocketbase';
import './HomeScreen.css';

export function HomeScreen() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [fileValidations, setFileValidations] = useState<
    Record<string, { mp4Exists: boolean; srtExists: boolean }>
  >({});

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
      const validations: Record<
        string,
        { mp4Exists: boolean; srtExists: boolean }
      > = {};
      await Promise.all(
        result.items.map(async (movie) => {
          const validation = await pocketBaseService.validateMovieFiles(movie);
          validations[movie.id] = validation;
        }),
      );
      setFileValidations(validations);
    } catch (err) {
      console.error('Error loading movies:', err);
      setError('Failed to load movies. Make sure PocketBase is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle movie added through dialog
  const handleMovieAdded = useCallback(() => {
    setShowAddDialog(false);
    loadMovies();
  }, [loadMovies]);

  // Play movie
  const handlePlayMovie = useCallback(
    async (movie: MovieRecord) => {
      try {
        // Update last accessed
        await pocketBaseService.updateLastAccessed(movie.id);
        navigate(`/movie/${movie.id}`);
      } catch (err) {
        console.error('Error updating movie access:', err);
        // Still play the movie even if update fails
        navigate(`/movie/${movie.id}`);
      }
    },
    [navigate],
  );

  // Delete movie
  const handleDeleteMovie = useCallback(
    async (movie: MovieRecord) => {
      if (
        !confirm(
          `Are you sure you want to remove "${movie.title}" from your library?`,
        )
      ) {
        return;
      }

      try {
        await pocketBaseService.deleteMovie(movie.id);
        loadMovies();
      } catch (err) {
        console.error('Error deleting movie:', err);
        alert('Failed to delete movie. Please try again.');
      }
    },
    [loadMovies],
  );

  // Load movies on component mount
  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const filteredMovies = movies.filter((movie) =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="home-screen">
      <div className="home-header">
        <div
          className="header-controls"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <h1 className="home-title">Movie Library</h1>
          <Button
            onClick={() => setShowAddDialog(true)}
            variant="primary"
            className="add-movie-btn"
          >
            Add Movie
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
                <Button
                  onClick={() => setShowAddDialog(true)}
                  variant="primary"
                >
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

      {showAddDialog && (
        <AddMovieDialog
          onClose={() => setShowAddDialog(false)}
          onMovieAdded={handleMovieAdded}
        />
      )}
    </div>
  );
}
