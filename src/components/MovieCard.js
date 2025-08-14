import React, { useState, useRef } from 'react';
import './MovieCard.css';
import DownloadModal from './DownloadModal';

const MovieCard = ({ movie }) => {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const downloadClickRef = useRef(false);

  const handleCardClick = (e) => {
    // Check if download button was just clicked
    if (downloadClickRef.current) {
      downloadClickRef.current = false;
      return;
    }
    
    // Don't do anything if modal is open
    if (showDownloadModal) {
      return;
    }
    
    // Don't do anything if clicking on interactive elements
    if (e.target.closest('.download-btn, .modal-backdrop, .modal-content')) {
      return;
    }
    
    // Card click can be used for other interactions in the future
    // For now, it does nothing since details are in the modal
  };

  const handleDownloadClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark that download button was clicked
    downloadClickRef.current = true;
    
    // Reset the flag after a short delay
    setTimeout(() => {
      downloadClickRef.current = false;
    }, 500);
    
    if (movie.downloadOptions && Object.keys(movie.downloadOptions).length > 0) {
      setShowDownloadModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowDownloadModal(false);
  };



  const getAvailableQualities = () => {
    if (!movie.downloadOptions) return [];
    
    return Object.entries(movie.downloadOptions)
      .filter(([quality, files]) => files && files.length > 0)
      .sort(([a], [b]) => {
        const qualityOrder = { '1080p': 3, '720p': 2, 'others': 1 };
        return (qualityOrder[b] || 0) - (qualityOrder[a] || 0);
      });
  };

  const getTotalFilesCount = () => {
    if (!movie.downloadOptions) return 0;
    return Object.values(movie.downloadOptions)
      .reduce((total, files) => total + (files ? files.length : 0), 0);
  };

  const availableQualities = getAvailableQualities();
  const totalFiles = getTotalFilesCount();

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const getDefaultPoster = () => {
    const encodedTitle = encodeURIComponent(movie.title.substring(0, 15) + (movie.title.length > 15 ? '...' : ''));
    const emoji = movie.type === 'tvshow' ? '📺' : '🎬';
    return `https://via.placeholder.com/300x450/2a2a2a/ffffff?text=${encodedTitle}%0A${emoji}%0ANo+Poster+Available`;
  };



  return (
    <div className="movie-card" onClick={handleCardClick}>
      <div className="movie-poster">
        {imageLoading && !imageError && (
          <div className="image-loading">
            <div className="loading-spinner-small"></div>
          </div>
        )}
        
        <img 
          src={imageError ? getDefaultPoster() : movie.poster} 
          alt={movie.title}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{ display: imageLoading ? 'none' : 'block' }}
        />
        
        {/* Data source indicator */}
        {movie.dataSource === 'tmdb' && (
          <div className="source-badge tmdb">
            <span>🎬 TMDB</span>
          </div>
        )}
        {movie.dataSource === 'omdb' && (
          <div className="source-badge omdb">
            <span>📽️ IMDb</span>
          </div>
        )}
        
        {/* Ratings badges */}
        <div className="ratings-container">
          {movie.tmdbRating && (
            <div className="rating-badge tmdb-rating">
              <span>🌟 {movie.tmdbRating}</span>
            </div>
          )}
          {movie.imdbRating && movie.imdbRating !== 'N/A' && (
            <div className="rating-badge imdb-rating">
              <span>⭐ {movie.imdbRating}</span>
            </div>
          )}
        </div>
        
        <div className="movie-overlay">
          {totalFiles > 0 && (
            <button 
              className="download-btn"
              onClick={handleDownloadClick}
            >
              ⬇️ Download {totalFiles > 1 && `(${totalFiles})`}
            </button>
          )}
          

        </div>
      </div>
      
      <div className="movie-info">
        <h3 className="movie-title">{movie.title}</h3>
        
        {movie.tagline && (
          <p className="movie-tagline">"{movie.tagline}"</p>
        )}
        
        <div className="movie-meta">
          <span className="movie-year">{movie.year}</span>
          {movie.type === 'tvshow' && movie.seasons && (
            <span className="movie-seasons">• {movie.seasons} Season{movie.seasons !== 1 ? 's' : ''}</span>
          )}
          {movie.type === 'tvshow' && movie.episodes && (
            <span className="movie-episodes">• {movie.episodes} Episodes</span>
          )}
          {movie.runtime && movie.type !== 'tvshow' && <span className="movie-runtime">• {movie.runtime}</span>}
          {movie.language && movie.language !== 'N/A' && (
            <span className="movie-language">• {movie.language.split(',')[0].toUpperCase()}</span>
          )}
        </div>
        
        {movie.genre && <p className="movie-genre">{movie.genre}</p>}
        
        {totalFiles > 0 && (
          <p className="movie-files-count">
            {totalFiles} file{totalFiles > 1 ? 's' : ''} • {availableQualities.length} quality options
          </p>
        )}
      </div>
      
      {/* Download Modal - Rendered as Portal */}
      <DownloadModal
        movie={movie}
        isOpen={showDownloadModal}
        onClose={handleCloseModal}
        onDownload={(filename) => {
          setShowDownloadModal(false);
        }}
      />
    </div>
  );
};

export default MovieCard; 