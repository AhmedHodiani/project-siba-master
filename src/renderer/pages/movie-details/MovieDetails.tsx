import React from 'react';
import { VideoPlayer, Button } from '@/components/ui';
import { MovieRecord } from '@/lib/types/database';
import './MovieDetails.css';

interface MovieDetailsProps {
  movie: MovieRecord;
  onBack?: () => void;
}

export default function MovieDetails({ movie, onBack }: MovieDetailsProps) {
  return (
    <div className="movie-details">
      {onBack && (
        <div className="movie-details-header">
          <Button onClick={onBack} variant="secondary" className="back-btn">
            ← Back to Library
          </Button>
          <h1 className="movie-title">{movie.title}</h1>
        </div>
      )}
      <VideoPlayer movie={movie} />
    </div>
  );
}
