import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import './DownloadModal.css';

const DownloadModal = ({ movie, isOpen, onClose, onDownload }) => {
  const [isBackdropActive, setIsBackdropActive] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [showDetails, setShowDetails] = useState(false);



  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Reset details state when modal opens
      setShowDetails(false);
      
      // Delay backdrop click activation to prevent immediate closing
      const timer = setTimeout(() => {
        setIsBackdropActive(true);
      }, 100);

      // Add escape key listener
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    } else {
      setIsBackdropActive(false);
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  // Memoize available qualities to prevent unnecessary recalculations
  const availableQualities = useMemo(() => {
    if (!movie.downloadOptions) {
      return [];
    }
    
    const filtered = Object.entries(movie.downloadOptions)
      .filter(([quality, files]) => files && files.length > 0)
      .sort(([a], [b]) => {
        const qualityOrder = { '4k': 4, '1080p': 3, '720p': 2, '480p': 1, 'others': 0 };
        return (qualityOrder[b] || 0) - (qualityOrder[a] || 0);
      });
      
    return filtered;
  }, [movie.downloadOptions, movie?.title]);

  const totalFiles = useMemo(() => {
    if (!movie.downloadOptions) return 0;
    return Object.values(movie.downloadOptions)
      .reduce((total, files) => total + (files ? files.length : 0), 0);
  }, [movie.downloadOptions]);

  // Set default active tab when modal opens and reset when closed
  useEffect(() => {
    if (isOpen && availableQualities.length > 0) {
      const firstQuality = availableQualities[0][0];
      
      // Only set if activeTab is empty or not in available qualities
      if (!activeTab || !availableQualities.some(([quality]) => quality === activeTab)) {
        setActiveTab(firstQuality);
      }
    } else if (!isOpen) {
      setActiveTab(''); // Reset tab when modal closes
    }
  }, [isOpen, availableQualities, activeTab]); // Proper dependency array

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    // Only close if clicking directly on the backdrop, not on any child elements
    // And only if backdrop clicking is active (prevents immediate closing)
    if (isBackdropActive && e.target === e.currentTarget && e.target.classList.contains('modal-backdrop')) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const handleDownloadClick = (e, href, filename) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (href && href !== '#') {
        window.open(href, '_blank');
        toast.success(`🎬 Opening download for "${filename}"`);
      }
      
      if (onDownload) {
        onDownload(filename);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('❌ Failed to open download link');
    }
  };

  const handleWebhookClick = async (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const payload = {
        movie: {
          title: movie.title,
          year: movie.year,
          imdbRating: movie.imdbRating,
          tmdbRating: movie.tmdbRating
        },
        file: {
          filename: file.filename,
          originalFilename: file.originalFilename,
          size: file.size,
          href: file.href,
          language: file.language,
          releaseYear: file.releaseYear
        }
      };

      const response = await fetch('https://n8n.cgraaaj.in/webhook/submit-torrent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('Successfully sent to webhook');
        toast.success(`🚀 Movie "${movie.title}" requested successfully!`, {
          autoClose: 4000,
        });
      } else {
        console.error('Webhook request failed:', response.status);
        toast.error(`❌ Failed to request movie. Server responded with status: ${response.status}`, {
          autoClose: 5000,
        });
      }
    } catch (error) {
      console.error('Webhook error:', error);
      toast.error('❌ Network error: Unable to send movie request', {
        autoClose: 5000,
      });
    }
  };

  const handleMagnetClick = (e, magnetLink, filename) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      toast.success(`🧲 Opening magnet link for "${filename}"`);
      if (magnetLink) {
        // Open magnet link in new window
        navigator.clipboard.writeText(magnetLink)
        setTimeout(() => {
          window.open(magnetLink, '_blank');
        }, 3000);
      } else {
        toast.error('❌ No magnet link available for this file');
      }
    } catch (error) {
      console.error('Magnet link error:', error);
      toast.error('❌ Failed to open magnet link');
    }
  };

  const modalContent = (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">{movie.title}</h2>
            <span className="modal-subtitle">
              {movie.year} • {totalFiles} file{totalFiles !== 1 ? 's' : ''} available
            </span>
          </div>
          <button 
            className="modal-close-btn" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Movie Details Section */}
        <div className="modal-movie-details">
          {movie.poster && (
            <div className="modal-backdrop-image">
              <img src={movie.poster} alt={`${movie.title} backdrop`} />
            </div>
          )}
          
          <div className="modal-details">
            <h4 
              className="collapsible-header"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span>📝 Show Details</span>
              <span className={`arrow ${showDetails ? 'expanded' : ''}`}>▼</span>
            </h4>
            {showDetails && (
              <div className="modal-details-content">
                <div className="modal-info-grid">
                  <div className="modal-basic-info">
                    {movie.tagline && (
                      <p className="modal-tagline">"{movie.tagline}"</p>
                    )}
                    
                    <div className="modal-meta-row">
                      {movie.genre && <span className="modal-genre">🎭 {movie.genre}</span>}
                      {movie.runtime && <span className="modal-runtime">⏱️ {movie.runtime}</span>}
                      {movie.language && movie.language !== 'N/A' && (
                        <span className="modal-lang">🗣️ {movie.language.split(',')[0]}</span>
                      )}
                    </div>

                    {movie.director && (
                      <p className="modal-director">
                        <strong>Director:</strong> {movie.director}
                      </p>
                    )}

                    {movie.downloadLanguages && movie.downloadLanguages.available.length > 0 && (
                      <p className="modal-download-languages">
                        <strong>Audio Languages:</strong> {movie.downloadLanguages.available.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="modal-metadata">
                    {movie.country && movie.country !== 'N/A' && (
                      <div className="modal-metadata-item">
                        <strong>Country:</strong> {movie.country}
                      </div>
                    )}
                    {movie.releaseDate && (
                      <div className="modal-metadata-item">
                        <strong>Release:</strong> {new Date(movie.releaseDate).toLocaleDateString()}
                      </div>
                    )}
                    {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                      <div className="modal-metadata-item">
                        <strong>IMDb:</strong> ⭐ {movie.imdbRating}
                      </div>
                    )}
                    {movie.tmdbRating && (
                      <div className="modal-metadata-item">
                        <strong>TMDB:</strong> 🌟 {movie.tmdbRating}
                      </div>
                    )}
                  </div>
                </div>

                {movie.plot && (
                  <div className="modal-plot">
                    <h5>Plot:</h5>
                    <p>{movie.plot}</p>
                  </div>
                )}
                {movie.actors && (
                  <div className="modal-cast">
                    <h5>Cast:</h5>
                    <p>{movie.actors}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Download Section with Tabs */}
        <div className="modal-downloads-section">
          <h3 className="modal-downloads-title">Download Options</h3>
          
          {availableQualities.length > 0 ? (
            <>
              {/* Quality Tabs */}
              <div className="modal-quality-tabs">
                {availableQualities.map(([quality, files]) => (
                  <button
                    key={quality}
                    className={`modal-tab ${activeTab === quality ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveTab(quality);
                    }}
                  >
                    {quality.toUpperCase()}
                    <span className="modal-tab-count">({files.length})</span>
                  </button>
                ))}
              </div>

              {/* Active Tab Content */}
              <div className="modal-tab-content">
                {activeTab && (
                  <div className="modal-active-tab-content">
                    <div className="modal-tab-header">
                      <h4 className="modal-tab-quality">{activeTab.toUpperCase()}</h4>
                      <span className="modal-tab-file-count">
                        {availableQualities.find(([quality]) => quality === activeTab)?.[1]?.length || 0} files available
                      </span>
                    </div>
                    
                    <div className="modal-files-grid">
                      {(() => {
                        const filteredQualities = availableQualities.filter(([quality]) => quality === activeTab);
                        
                        if (filteredQualities.length === 0) {
                          return <div style={{padding: '20px', textAlign: 'center', color: '#999'}}>No files found for {activeTab}</div>;
                        }
                        
                        return filteredQualities.map(([quality, files]) => {
                          return files.map((file, index) => (
                            <div key={`${quality}-${index}`} className="modal-download-item">
                              <div className="modal-file-info">
                                <div className="modal-filename-container">
                                  <span 
                                    className="modal-filename" 
                                    title={`${file.originalFilename ? 'Original: ' + file.originalFilename + '\n' : ''}${file.sizeSource ? 'Size from: ' + file.sizeSource.replace('_', ' ') : ''}`}
                                  >
                                    {file.filename}
                                  </span>
                                </div>
                                
                                <div className="modal-file-metadata">
                                  <span 
                                    className="modal-file-size" 
                                    title={`${file.sizeSource === 'redis_metadata' ? 'Size from Redis metadata' : 'Size extracted from filename'}`}
                                  >
                                    📁 {file.size}
                                    {file.sizeSource === 'redis_metadata' && <span className="modal-size-verified">✓</span>}
                                  </span>
                                  
                                  {file.language && (
                                    <span className="modal-file-language" title={`Audio Language: ${file.language}`}>
                                      🗣️ {file.language}
                                    </span>
                                  )}
                                  
                                  {file.releaseYear && (
                                    <span className="modal-file-year" title={`Release Year: ${file.releaseYear}`}>
                                      📅 {file.releaseYear}
                                    </span>
                                  )}
                                </div>

                                {/* Torrent Health Info */}
                                {/* {file.torrentMetadata && (
                                  <div className="modal-torrent-metadata">
                                    <div className="modal-torrent-health">
                                      <span 
                                        className="modal-health-indicator"
                                        style={{ 
                                          backgroundColor: file.torrentMetadata.health?.color || '#4caf50',
                                          color: 'white',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '11px'
                                        }}
                                        title={`Health: ${file.torrentMetadata.health?.status || 'Good'}`}
                                      >
                                        {file.torrentMetadata.health?.status || 'GOOD'}
                                      </span>
                                    </div>
                                    
                                    <div className="modal-torrent-stats">
                                      <span className="modal-seeders" title="Seeders">
                                        🌱 {file.torrentMetadata.seeders || 0}
                                      </span>
                                      <span className="modal-leechers" title="Leechers">
                                        📥 {file.torrentMetadata.leechers || 0}
                                      </span>
                                      <span className="modal-ratio" title="Seed/Leech Ratio">
                                        📊 {file.torrentMetadata.ratio || '0.00'}
                                      </span>
                                    </div>
                                    
                                    {file.torrentMetadata.estimatedSpeed && (
                                      <div className="modal-download-stats">
                                        <span className="modal-speed" title="Estimated Download Speed">
                                          ⚡ {file.torrentMetadata.estimatedSpeed}
                                        </span>
                                        {file.torrentMetadata.completed && (
                                          <span className="modal-completed" title="Completed Downloads">
                                            ✅ {file.torrentMetadata.completed}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )} */}
                              </div>
                              
                              <div className="modal-download-buttons">
                                <div className="modal-download-grid">
                                  <button
                                    className="modal-download-file-btn"
                                    onClick={(e) => handleDownloadClick(e, file.href, file.filename)}
                                    title={`Download ${file.filename}`}
                                  >
                                    ⬇️ Download
                                  </button>
                                  
                                  {file.magnetLink && (
                                    <button
                                      className="modal-magnet-btn"
                                      onClick={(e) => handleMagnetClick(e, file.magnetLink, file.filename)}
                                      title={`Open magnet link for ${file.filename}`}
                                    >
                                      🧲
                                    </button>
                                  )}
                                </div>
                                
                                <button
                                  className="modal-webhook-btn"
                                  onClick={(e) => handleWebhookClick(e, file)}
                                  title={`Send ${file.filename} to webhook`}
                                >
                                  🚀 Request movie
                                </button>
                              </div>
                            </div>
                          ));
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="modal-no-downloads">
              <p>No download options available for this movie.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render the modal using a portal to isolate it from the card's DOM tree
  return createPortal(modalContent, document.body);
};

export default DownloadModal; 