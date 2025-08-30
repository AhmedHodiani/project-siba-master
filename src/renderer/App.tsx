import React, { useState } from 'react';
import './App.css';
import { MovieRecord } from '@/lib/types/database';
import { HomeScreen } from '@/renderer/pages/home/HomeScreen';
import MovieDetails from './pages/movie-details/MovieDetails';

type AppScreen = 'home' | 'video';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [selectedMovie, setSelectedMovie] = useState<MovieRecord | null>(null);

  const handlePlayMovie = (movie: MovieRecord) => {
    setSelectedMovie(movie);
    setCurrentScreen('video');
  };

  return (
    <div className="app">
      {currentScreen === 'home' && <HomeScreen onPlayMovie={handlePlayMovie} />}

      {currentScreen === 'video' && selectedMovie && (
        <MovieDetails movie={selectedMovie} />
      )}
    </div>
  );
}
