import React, { useState, useEffect, useCallback } from 'react';
import { VideoPlayer } from '@/components/ui';
import { MovieRecord } from '@/lib/types/database';

interface MovieDetailsProps {
  movie: MovieRecord;
}

export default function MovieDetails({ movie }: MovieDetailsProps) {
  return <VideoPlayer movie={movie} />;
}
