import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { HomeScreen } from '@/renderer/pages/home/HomeScreen';
import { MovieDetails } from './pages/movie-details/MovieDetails';

export default function App() {
  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
        </Routes>
      </Router>
    </div>
  );
}
