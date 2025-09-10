/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
/* eslint-disable import/no-named-as-default */
/* eslint-disable import/prefer-default-export */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MovieRecord } from '@/lib/types/database';
import { MovieCard, StudyStats } from '@/components/movie/MovieCard';
import { AddMovieDialog } from '@/components/movie/AddMovieDialog';
import { Button, ConfirmDialog } from '@/components/ui';
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
  const [studyStats, setStudyStats] = useState<Record<string, StudyStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [movieToDelete, setMovieToDelete] = useState<MovieRecord | null>(null);
  const [deletionStats, setDeletionStats] = useState<{
    flashcardCount: number;
    reviewLogCount: number;
    flashcardsWithNotes: number;
  } | null>(null);
  const [loadingDeletionStats, setLoadingDeletionStats] = useState(false);

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

      // Load study statistics for all movies
      if (result.items.length > 0) {
        setLoadingStats(true);
        try {
          const movieIds = result.items.map(movie => movie.id);
          const stats = await pocketBaseService.getMultipleMovieStats(movieIds);
          setStudyStats(stats);
        } catch (statsErr) {
          console.error('Error loading study stats:', statsErr);
          // Don't fail the whole load if stats fail
          setStudyStats({});
        } finally {
          setLoadingStats(false);
        }
      } else {
        setStudyStats({});
      }
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
    // Clear stats before reloading to show loading state
    setStudyStats({});
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
      setMovieToDelete(movie);
      setLoadingDeletionStats(true);
      setShowDeleteConfirm(true);
      
      try {
        const stats = await pocketBaseService.getMovieDeletionStats(movie.id);
        setDeletionStats(stats);
      } catch (err) {
        console.error('Error getting deletion stats:', err);
        setDeletionStats({
          flashcardCount: 0,
          reviewLogCount: 0,
          flashcardsWithNotes: 0,
        });
      } finally {
        setLoadingDeletionStats(false);
      }
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!movieToDelete) return;

    try {
      await pocketBaseService.deleteMovie(movieToDelete.id);
      setShowDeleteConfirm(false);
      setMovieToDelete(null);
      setDeletionStats(null);
      // Clear stats for the deleted movie
      setStudyStats(prev => {
        const { [movieToDelete.id]: deleted, ...rest } = prev;
        return rest;
      });
      loadMovies();
    } catch (err) {
      console.error('Error deleting movie:', err);
      alert('Failed to delete movie. Please try again.');
    }
  }, [movieToDelete, loadMovies]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setMovieToDelete(null);
    setDeletionStats(null);
  }, []);

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
          <div>
            <h1
            className="home-title"
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: '"Liberation Mono", "Courier New", monospace',
            }}
            >
            project-siba
            </h1>
            <span
              className="home-subtitle"
              style={{
                fontSize: '16px',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.7)',
                fontFamily: '"Liberation Mono", "Courier New", monospace',
                letterSpacing: '0.5px',
              }}
            >
              German Movie Library & Language Learning App
            </span>
          </div>
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
                studyStats={studyStats[movie.id] || null}
                loading={loadingStats}
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

      {showDeleteConfirm && movieToDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete Movie"
          message={`Are you sure you want to permanently delete "${movieToDelete.title}" from your library?`}
          details={
            loadingDeletionStats
              ? ['Loading deletion details...']
              : deletionStats
              ? [
                  `Movie: "${movieToDelete.title}"`,
                  deletionStats.flashcardCount > 0 
                    ? `Flashcards: ${deletionStats.flashcardCount} ${deletionStats.flashcardCount === 1 ? 'card' : 'cards'}`
                    : 'No flashcards to delete',
                  ...(deletionStats.flashcardsWithNotes > 0 
                    ? [`Cards with notes: ${deletionStats.flashcardsWithNotes} ${deletionStats.flashcardsWithNotes === 1 ? 'card' : 'cards'}`]
                    : []
                  ),
                  deletionStats.reviewLogCount > 0
                    ? `Review history: ${deletionStats.reviewLogCount} ${deletionStats.reviewLogCount === 1 ? 'review' : 'reviews'}`
                    : 'No review history to delete',
                  ...(deletionStats.flashcardCount > 0 || deletionStats.reviewLogCount > 0
                    ? ['All associated data will be permanently lost']
                    : ['Only the movie entry will be removed']
                  ),
                ]
              : ['Error loading deletion details']
          }
          confirmText="Delete Permanently"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {/* Footer */}
      <div className="home-footer">
        <div className="footer-content">
          <span className="footer-item">project-siba v2.0.0</span>
          <span className="footer-separator">•</span>
          <span className="footer-item">Released: 10th of September 2025</span>
          <span className="footer-separator">•</span>
            <span className="footer-item">Built with 🤍 by Ahmed Hodiani</span>
        </div>
      </div>
    </div>
  );
}
