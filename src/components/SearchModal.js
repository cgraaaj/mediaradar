import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DownloadModal from './DownloadModal';
import './SearchModal.css';

const SearchModal = ({ isOpen, onClose, activeTab, onSearchResults }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [searchInfo, setSearchInfo] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Search function without debounce
  const performSearch = useCallback(async (searchQuery, page = 1) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPrevPage: false
      });
      setSearchInfo(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const endpoint = activeTab === 'Movies' ? 'movies' : 'tvshows';
      const response = await axios.get(
        `${apiBaseUrl}/${endpoint}/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`
      );

      const results = activeTab === 'Movies' ? response.data.movies : response.data.tvShows;
      setSearchResults(results);
      
      if (activeTab === 'Movies') {
        setPagination({
          ...response.data.pagination,
          totalItems: response.data.pagination.totalMovies,
          itemsPerPage: response.data.pagination.moviesPerPage
        });
      } else {
        setPagination({
          ...response.data.pagination,
          totalItems: response.data.pagination.totalTVShows,
          itemsPerPage: response.data.pagination.tvShowsPerPage
        });
      }
      
      setSearchInfo(response.data.search);
      console.log(`🔍 Search completed: Found ${results.length} results for "${searchQuery}"`);
      
    } catch (err) {
      console.error('Search error:', err);
      setError(`Failed to search ${activeTab.toLowerCase()}`);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchQuery, page = 1) => {
      performSearch(searchQuery, page);
    }, 500),
    [performSearch]
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery, 1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (query.trim() && newPage >= 1 && newPage <= pagination.totalPages) {
      debouncedSearch(query, newPage);
    }
  };

  // Handle download button click
  const handleDownloadClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!item.downloadOptions || Object.keys(item.downloadOptions).length === 0) {
      toast.error('❌ No download options available for this item');
      return;
    }

    setSelectedMovie(item);
    setIsDownloadModalOpen(true);
  };

  // Handle download modal close
  const handleDownloadModalClose = () => {
    setIsDownloadModalOpen(false);
    setSelectedMovie(null);
  };

  // Handle download action from modal
  const handleDownloadAction = (movie, file) => {
    // This matches the behavior from the main MovieCard component
    console.log('Download action:', movie.title, file.filename);
  };

  // Apply search results to main view
  const applySearchResults = () => {
    onSearchResults(searchResults, pagination, searchInfo);
    onClose();
  };

  // Clear search and close
  const clearAndClose = () => {
    setQuery('');
    setSearchResults([]);
    setSearchInfo(null);
    onClose();
  };

  // Reset when modal opens/closes or tab changes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSearchResults([]);
      setSearchInfo(null);
      setError(null);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <>
      <div className="search-modal-overlay" onClick={clearAndClose}>
        <div className="search-modal" onClick={(e) => e.stopPropagation()}>
          <div className="search-modal-header">
            <h3>🔍 Search {activeTab}</h3>
            <button className="close-btn" onClick={clearAndClose}>✕</button>
          </div>
        
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder={`Search ${activeTab.toLowerCase()} by title, language, genre...`}
            className="search-input"
            autoFocus
          />
          {loading && <div className="search-loading">🔄</div>}
        </div>

        {error && (
          <div className="search-error">
            ❌ {error}
          </div>
        )}

        {searchInfo && (
          <div className="search-info">
            <span>Found {searchInfo.totalFound} results for "{searchInfo.query}"</span>
          </div>
        )}

        <div className="search-results">
          {searchResults.length > 0 ? (
            <>
              <div className="search-results-grid">
                {searchResults.map((item, index) => (
                  <div key={index} className="search-result-item">
                    <div className="search-result-poster-container">
                      <img 
                        src={item.poster} 
                        alt={item.title}
                        className="search-result-poster"
                        onError={(e) => {
                          e.target.src = activeTab === 'Movies' 
                            ? 'https://via.placeholder.com/150x225/2a2a2a/ffffff?text=🎬'
                            : 'https://via.placeholder.com/150x225/2a2a2a/ffffff?text=📺';
                        }}
                      />
                      
                      {/* Download overlay */}
                      <div className="search-result-overlay">
                        {item.totalFiles > 0 && (
                          <button 
                            className="search-download-btn"
                            onClick={(e) => handleDownloadClick(e, item)}
                            title={`Download ${item.title}`}
                          >
                            ⬇️ Download {item.totalFiles > 1 && `(${item.totalFiles})`}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="search-result-info">
                      <h4>{item.title}</h4>
                      <p>{item.year}</p>
                      <p className="search-result-files">{item.totalFiles} files</p>
                    </div>
                  </div>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="search-pagination">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="pagination-btn"
                  >
                    ◀ Previous
                  </button>
                  
                  <span className="pagination-info">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="pagination-btn"
                  >
                    Next ▶
                  </button>
                </div>
              )}

              <div className="search-actions">
                <button className="apply-search-btn" onClick={applySearchResults}>
                  ✅ Apply Search Results
                </button>
                <button className="clear-search-btn" onClick={clearAndClose}>
                  🔄 Clear & Close
                </button>
              </div>
            </>
          ) : query.trim() && !loading && (
            <div className="no-search-results">
              <p>No {activeTab.toLowerCase()} found matching "{query}"</p>
              <p>Try a different search term or check spelling</p>
            </div>
          )}

          {!query.trim() && !loading && (
            <div className="search-placeholder">
              <p>🔍 Start typing to search {activeTab.toLowerCase()}...</p>
              <p>Search by title, genre, language, or filename</p>
            </div>
          )}
        </div>
      </div>
    </div>
      
    {/* Download Modal */}
    {selectedMovie && (
      <DownloadModal
        movie={selectedMovie}
        isOpen={isDownloadModalOpen}
        onClose={handleDownloadModalClose}
        onDownload={handleDownloadAction}
      />
    )}
    </>
  );
};

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default SearchModal; 