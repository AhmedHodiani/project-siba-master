import React from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
} from 'react-router-dom';
import './App.css';
import { MovieRecord } from '@/lib/types/database';
import { HomeScreen } from '@/renderer/pages/home/HomeScreen';
import MovieDetails from './pages/movie-details/MovieDetails';
import pocketBaseService from '@/lib/services/pocketbase';

function HomeScreenWrapper() {
  const navigate = useNavigate();

  const handlePlayMovie = (movie: MovieRecord) => {
    navigate(`/movie/${movie.id}`);
  };

  return <HomeScreen onPlayMovie={handlePlayMovie} />;
}

function MovieDetailsWrapper() {
  const { movieId } = useParams<{ movieId: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = React.useState<MovieRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handleBack = () => {
    navigate('/');
  };

  React.useEffect(() => {
    if (!movieId) {
      setError('No movie ID provided');
      setLoading(false);
      return;
    }

    const loadMovie = async () => {
      try {
        const movieData = await pocketBaseService.getMovie(movieId);
        setMovie(movieData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading movie:', err);
        setError('Failed to load movie');
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [movieId]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Loading movie...</p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="error-state">
        <p className="error-message">{error || 'Movie not found'}</p>
        <button type="button" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    );
  }

  return <MovieDetails movie={movie} onBack={handleBack} />;
}

export default function App() {
  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/" element={<HomeScreenWrapper />} />
          <Route path="/movie/:movieId" element={<MovieDetailsWrapper />} />
        </Routes>
      </Router>
    </div>
  );
}
