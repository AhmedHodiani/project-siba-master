import React, { useState } from 'react';
import './App.css';
import { HomeScreen, VideoPlayer } from '../components/ui';
import { MovieRecord } from '../types/database';

type AppScreen = 'home' | 'video';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [selectedMovie, setSelectedMovie] = useState<MovieRecord | null>(null);

  const handlePlayMovie = (movie: MovieRecord) => {
    setSelectedMovie(movie);
    setCurrentScreen('video');
  };

  const handleBackToHome = () => {
    setSelectedMovie(null);
    setCurrentScreen('home');
  };

  return (
    <div className="app">
      {currentScreen === 'home' && (
        <HomeScreen
          onPlayMovie={handlePlayMovie}
          onClose={() => {}} // Not needed when HomeScreen is the main screen
        />
      )}
      
      {currentScreen === 'video' && selectedMovie && (
        <VideoPlayer
          movie={selectedMovie}
          onBackToHome={handleBackToHome}
        />
      )}
    </div>
  );
}
