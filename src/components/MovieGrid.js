import React from 'react';
import MovieCard from './MovieCard';
import './MovieGrid.css';

const MovieGrid = ({ movies }) => {
  // Filter out movies that have no download files
  const moviesWithDownloads = movies.filter(movie => {
    if (!movie.downloadOptions) return false;
    
    // Check if there are any files in any quality option
    const totalFiles = Object.values(movie.downloadOptions)
      .reduce((total, files) => total + (files ? files.length : 0), 0);
    
    return totalFiles > 0;
  });

  return (
    <div className="movie-grid">
      <div className="movies-container">
        {moviesWithDownloads.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
};

export default MovieGrid; 