import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import MovieGrid from './components/MovieGrid';
import Header from './components/Header';
import SearchModal from './components/SearchModal';
import TorrentHealthOverview from './components/TorrentHealthOverview';
// import RedisDataAnalyzer from './components/RedisDataAnalyzer';

function App() {
  const [activeTab, setActiveTab] = useState('Movies');
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // Search-related state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchInfo, setSearchInfo] = useState(null);

  // Simplified initial load
  useEffect(() => {
    console.log('Initial load effect triggered for tab:', activeTab);
    if (!isSearchMode) {
      if (activeTab === 'Movies') {
        fetchMovies(1);
      } else if (activeTab === 'TV Shows') {
        fetchTvShows(1);
      }
    }
  }, [activeTab]); // Only depend on activeTab

  // Clear search mode when tab changes
  useEffect(() => {
    console.log('Tab change effect triggered:', activeTab, 'isSearchMode:', isSearchMode);
    if (isSearchMode) {
      setIsSearchMode(false);
      setSearchInfo(null);
    }
  }, [activeTab]); // Only depend on activeTab

  const fetchMovies = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching movies for page ${page}`);
      
      // Fetch from backend API with pagination
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const response = await axios.get(`${apiBaseUrl}/movies?page=${page}&limit=20`);
      
      if (response.data.movies) {
        setMovies(response.data.movies);
        setPagination({
          ...response.data.pagination,
          totalItems: response.data.pagination.totalMovies,
          itemsPerPage: response.data.pagination.moviesPerPage
        });
        console.log(`Loaded ${response.data.movies.length} movies for page ${page}`);
      } else {
        // Handle old API format (fallback)
        setMovies(response.data);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: response.data.length,
          itemsPerPage: 20,
          hasNextPage: false,
          hasPrevPage: false
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching movies from API:', err);
      setError('Failed to connect to movie database');
      toast.error('❌ Failed to connect to movie database. Please check your connection.', {
        autoClose: 5000,
      });
      setLoading(false);
    }
  }, []);

  const fetchTvShows = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching TV shows for page ${page}`);
      
      // Fetch from backend API with pagination
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const response = await axios.get(`${apiBaseUrl}/tvshows?page=${page}&limit=20`);
      
      if (response.data.tvShows) {
        setTvShows(response.data.tvShows);
        setPagination({
          ...response.data.pagination,
          totalItems: response.data.pagination.totalTVShows,
          itemsPerPage: response.data.pagination.tvShowsPerPage
        });
        console.log(`Loaded ${response.data.tvShows.length} TV shows for page ${page}`);
      } else {
        // Handle old API format (fallback)
        setTvShows(response.data);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: response.data.length,
          itemsPerPage: 20,
          hasNextPage: false,
          hasPrevPage: false
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching TV shows from API:', err);
      setError('Failed to connect to TV show database');
      toast.error('❌ Failed to connect to TV show database. Please check your connection.', {
        autoClose: 5000,
      });
      setLoading(false);
    }
  }, []);

  const fetchContent = useCallback(async (page = 1) => {
    if (activeTab === 'Movies') {
      await fetchMovies(page);
    } else if (activeTab === 'TV Shows') {
      await fetchTvShows(page);
    }
  }, [activeTab, fetchMovies, fetchTvShows]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchContent(newPage);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Show toast for page navigation (only if not first page load)
      if (pagination.currentPage !== newPage) {
        toast.info(`📄 Loading ${activeTab.toLowerCase()} page ${newPage}...`, {
          autoClose: 2000,
        });
      }
    }
  };

  // Handle search modal open
  const handleSearchClick = () => {
    setIsSearchModalOpen(true);
  };

  // Handle search modal close
  const handleSearchModalClose = () => {
    setIsSearchModalOpen(false);
  };

  // Handle search results application
  const handleSearchResults = (results, searchPagination, searchData) => {
    if (activeTab === 'Movies') {
      setMovies(results);
    } else {
      setTvShows(results);
    }
    
    setPagination({
      ...searchPagination,
      totalItems: activeTab === 'Movies' ? searchPagination.totalMovies : searchPagination.totalTVShows,
      itemsPerPage: activeTab === 'Movies' ? searchPagination.moviesPerPage : searchPagination.tvShowsPerPage
    });
    
    setSearchInfo(searchData);
    setIsSearchMode(true);
    setLoading(false);
    setError(null);
    
    // Show success toast
    toast.success(`🔍 Found ${results.length} ${activeTab.toLowerCase()} matching "${searchData.query}"`, {
      autoClose: 3000,
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear search and return to normal browsing
  const clearSearch = () => {
    setIsSearchMode(false);
    setSearchInfo(null);
    fetchContent(1);
    toast.info(`🔄 Cleared search, showing all ${activeTab.toLowerCase()}`, {
      autoClose: 2000,
    });
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination">
        <div className="pagination-info">
          Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} {activeTab.toLowerCase()}
        </div>
        
        <div className="pagination-controls">
          <button 
            className="page-btn"
            onClick={() => handlePageChange(1)}
            disabled={!pagination.hasPrevPage}
          >
            First
          </button>
          
          <button 
            className="page-btn"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </button>
          
          {pageNumbers.map(pageNum => (
            <button
              key={pageNum}
              className={`page-btn ${pageNum === pagination.currentPage ? 'active' : ''}`}
              onClick={() => handlePageChange(pageNum)}
            >
              {pageNum}
            </button>
          ))}
          
          <button 
            className="page-btn"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </button>
          
          <button 
            className="page-btn"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={!pagination.hasNextPage}
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSearchClick={handleSearchClick}
      />
      
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={handleSearchModalClose}
        activeTab={activeTab}
        onSearchResults={handleSearchResults}
      />
      
      <main className="main-content">
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading {activeTab.toLowerCase()}... {pagination.currentPage > 1 && `(Page ${pagination.currentPage})`}</p>
          </div>
        )}
        
        {error && <div className="error-notice">{error}</div>}
        
        {!loading && ((activeTab === 'Movies' && movies.length > 0) || (activeTab === 'TV Shows' && tvShows.length > 0)) && (
          <>
            <div className="movies-header">
              <h2>
                {isSearchMode ? '🔍 Search Results' : `${activeTab === 'Movies' ? 'Movie' : 'TV Show'} Collection`}
              </h2>
              <div className="header-info">
                {isSearchMode && searchInfo && (
                  <div className="search-status">
                    <span className="search-query">"{searchInfo.query}"</span>
                    <button className="clear-search" onClick={clearSearch} title="Clear search">
                      ✕ Clear Search
                    </button>
                  </div>
                )}
                {pagination.totalItems > 0 && (
                  <span className="total-count">
                    {pagination.totalItems} {activeTab.toLowerCase()} {isSearchMode ? 'found' : 'available'}
                  </span>
                )}
              </div>
            </div>
            
            <TorrentHealthOverview />
            
            {/* <RedisDataAnalyzer /> */}
            
            <MovieGrid movies={activeTab === 'Movies' ? movies : tvShows} />
            {renderPagination()}
          </>
        )}
        
        {!loading && ((activeTab === 'Movies' && movies.length === 0) || (activeTab === 'TV Shows' && tvShows.length === 0)) && (
          <div className="no-movies">
            <p>No {activeTab.toLowerCase()} found. Please check your Redis connection.</p>
          </div>
        )}
      </main>
      
      {/* Toast Container for notifications */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}

export default App; 