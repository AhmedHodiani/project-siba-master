import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../../../components/video/VideoPlayer';
import GoldenLayoutWrapper from '../../../components/layout/GoldenLayoutWrapper';
import MovieInfo from '../../../components/movie/MovieInfo';
import SubtitlePanel from '../../../components/subtitle/SubtitlePanel';
import { Button } from '../../../components/ui';
import { MovieRecord } from '../../../lib/types/database';
import pocketBaseService from '../../../lib/services/pocketbase';

export const MovieDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoPlayerRef = useRef<any>(null);
  const [movie, setMovie] = useState<MovieRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMovie = async () => {
      if (!id) return;
      
      try {
        const movieData = await pocketBaseService.getMovie(id);
        setMovie(movieData);
      } catch (error) {
        console.error('Failed to load movie:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [id]);

  const handleBack = async () => {
    // Save current position before navigating back
    if (videoPlayerRef.current) {
      try {
        await videoPlayerRef.current.saveCurrentPosition();
      } catch (error) {
        console.warn('Failed to save position on back navigation:', error);
      }
    }
    navigate('/');
  };

  if (!id) {
    return <div>Movie not found</div>;
  }

  if (loading) {
    return <div>Loading movie...</div>;
  }

  if (!movie) {
    return <div>Movie not found</div>;
  }

  const goldenLayoutConfig = {
    content: [
      {
        type: 'row',
        content: [
          {
            type: 'column',
            width: 80,
            content: [
              {
                type: 'component',
                componentType: 'react-component',
                componentState: { componentId: 'video-player' },
                title: 'Video Player',
                height: 50,
              },
              {
                type: 'component',
                componentType: 'react-component',
                componentState: { componentId: 'subtitles-and-translations' },
                title: 'Subtitles & Translations',
              },
            ],
          },
          {
            type: 'component',
            componentType: 'react-component',
            componentState: { componentId: 'movie-info' },
            title: 'Movie Info',
          },
        ],
      },
    ],
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
        <Button onClick={handleBack} variant="secondary" size="small">
          ← Back to Movies
        </Button>
      </div>
      <div style={{ flex: 1 }}>
        <GoldenLayoutWrapper config={goldenLayoutConfig}>
          <div id="video-player">
            <VideoPlayer ref={videoPlayerRef} movie={movie} />
          </div>
          <div id="subtitles-and-translations" style={{ backgroundColor: '#151414ff' }}>
          </div>
          <div id="movie-info" style={{ backgroundColor: '#181818ff' }}>
          </div>
        </GoldenLayoutWrapper>
      </div>
    </div>
  );
};
