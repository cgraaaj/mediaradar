import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import MovieGrid from './components/MovieGrid';
import Header from './components/Header';
import SearchModal from './components/SearchModal';
import TorrentHealthOverview from './components/TorrentHealthOverview';
import PopcornPal from './components/PopcornPal';
// import RedisDataAnalyzer from './components/RedisDataAnalyzer';

// Map a resolved tier to a short user-facing label + tooltip prefix.
// "latest" and "all" describe the *section* calling us; the function uses
// that context to pick the right verbiage for fallback cases.
function tierLabel(tier, context /* 'latest' | 'all' */) {
  if (tier === 'warm') return '🌡️ Union (hot ∪ cold)';
  if (tier === 'hot') return context === 'latest' ? '⚡ Latest' : '⚡ Hot fallback';
  if (tier === 'cold') return context === 'latest' ? '🧊 Cold fallback' : '🧊 Full Catalog';
  return '🗄️ Legacy';
}

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
  
  // Track the page being loaded (for displaying correct page number during loading)
  const [loadingPage, setLoadingPage] = useState(1);
  
  // Search-related state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchInfo, setSearchInfo] = useState(null);
  
  // Top releases and recently added state
  const [topReleases, setTopReleases] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [loadingSpecialSections, setLoadingSpecialSections] = useState(true);

  // Cache-tier metadata — where the content on screen is coming from
  //   "Latest" surfaces (Top Releases / Recently Added) -> media_radar_cache:hot
  //   "All" surfaces   (Movies / TV Shows grid)         -> media_radar_cache:cold
  const [latestTierMeta, setLatestTierMeta] = useState(null);
  const [allTierMeta, setAllTierMeta] = useState(null);
  
  // Language filter state
  const [selectedLanguage, setSelectedLanguage] = useState('all');

  // Source filter state (Redis cache ships with multiple sources: 1tamilmv, hdhub4u)
  const [selectedSource, setSelectedSource] = useState('all');

  // Catalog tier selection. 'cold' = full 7-day catalog (default),
  // 'hot' = fresh 3-hour pool only, 'warm' = app-side union of hot ∪ cold.
  const [selectedTier, setSelectedTier] = useState('cold');

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
      setLoadingPage(page);  // Set the page being loaded
      setLoading(true);
      setError(null);
      
      console.log(`Fetching movies for page ${page}`, selectedLanguage !== 'all' ? `with language: ${selectedLanguage}` : '', selectedSource !== 'all' ? `source: ${selectedSource}` : '');

      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (selectedLanguage && selectedLanguage !== 'all') params.set('language', selectedLanguage);
      if (selectedSource && selectedSource !== 'all') params.set('source', selectedSource);
      if (selectedTier && selectedTier !== 'cold') params.set('tier', selectedTier);
      const response = await axios.get(`${apiBaseUrl}/movies?${params.toString()}`);
      
      if (response.data.movies) {
        setMovies(response.data.movies);
        setPagination({
          ...response.data.pagination,
          totalItems: response.data.pagination.totalMovies,
          itemsPerPage: response.data.pagination.moviesPerPage
        });
        if (response.data.metadata) setAllTierMeta(response.data.metadata);
        console.log(`Loaded ${response.data.movies.length} movies for page ${page} (tier: ${response.data.metadata?.tier || 'n/a'})`);
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
  }, [selectedLanguage, selectedSource, selectedTier]);

  const fetchTvShows = useCallback(async (page = 1) => {
    try {
      setLoadingPage(page);  // Set the page being loaded
      setLoading(true);
      setError(null);
      
      console.log(`Fetching TV shows for page ${page}`, selectedSource !== 'all' ? `source: ${selectedSource}` : '');

      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (selectedSource && selectedSource !== 'all') params.set('source', selectedSource);
      if (selectedTier && selectedTier !== 'cold') params.set('tier', selectedTier);
      const response = await axios.get(`${apiBaseUrl}/tvshows?${params.toString()}`);
      
      if (response.data.tvShows) {
        setTvShows(response.data.tvShows);
        setPagination({
          ...response.data.pagination,
          totalItems: response.data.pagination.totalTVShows,
          itemsPerPage: response.data.pagination.tvShowsPerPage
        });
        if (response.data.metadata) setAllTierMeta(response.data.metadata);
        console.log(`Loaded ${response.data.tvShows.length} TV shows for page ${page} (tier: ${response.data.metadata?.tier || 'n/a'})`);
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
  }, [selectedSource, selectedTier]);

  // Fetch top releases (movies released this week)
  const fetchTopReleases = useCallback(async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const params = new URLSearchParams();
      if (selectedSource && selectedSource !== 'all') params.set('source', selectedSource);
      const url = params.toString()
        ? `${apiBaseUrl}/movies/top-releases?${params.toString()}`
        : `${apiBaseUrl}/movies/top-releases`;
      const response = await axios.get(url);
      
      if (response.data.movies) {
        setTopReleases(response.data.movies);
        if (response.data.metadata) setLatestTierMeta(response.data.metadata);
        console.log(`🔥 Loaded ${response.data.movies.length} top releases (tier: ${response.data.metadata?.tier || 'hot'})`);
      }
    } catch (err) {
      console.error('Error fetching top releases:', err);
      setTopReleases([]);
    }
  }, [selectedSource]);

  // Fetch recently added movies (backed by media_radar_cache:hot)
  const fetchRecentlyAdded = useCallback(async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const params = new URLSearchParams({ limit: '20' });
      if (selectedSource && selectedSource !== 'all') params.set('source', selectedSource);
      const response = await axios.get(`${apiBaseUrl}/movies/recently-added?${params.toString()}`);

      if (response.data.movies) {
        setRecentlyAdded(response.data.movies);
        if (response.data.metadata && !latestTierMeta) setLatestTierMeta(response.data.metadata);
        console.log(`📅 Loaded ${response.data.movies.length} recently added (tier: ${response.data.metadata?.tier || 'hot'})`);
      }
    } catch (err) {
      console.error('Error fetching recently added:', err);
      setRecentlyAdded([]);
    }
  }, [selectedSource, latestTierMeta]);

  // Fetch top releases + recently added when Movies tab is active and not in search mode
  // Both are sourced from media_radar_cache:hot (the "latest" tier).
  useEffect(() => {
    if (activeTab === 'Movies' && !isSearchMode) {
      setLoadingSpecialSections(true);
      Promise.all([fetchTopReleases(), fetchRecentlyAdded()])
        .finally(() => setLoadingSpecialSections(false));
    }
  }, [activeTab, isSearchMode, fetchTopReleases, fetchRecentlyAdded]);
  
  // Reload movies when language or source filter changes
  useEffect(() => {
    if (activeTab === 'Movies' && !isSearchMode) {
      fetchMovies(1);
    }
  }, [selectedLanguage, selectedSource, selectedTier, activeTab, isSearchMode, fetchMovies]);

  // Reload tv shows when source / tier filter changes
  useEffect(() => {
    if (activeTab === 'TV Shows' && !isSearchMode) {
      fetchTvShows(1);
    }
  }, [selectedSource, selectedTier, activeTab, isSearchMode, fetchTvShows]);

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
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        selectedTier={selectedTier}
        setSelectedTier={setSelectedTier}
      />
      
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={handleSearchModalClose}
        activeTab={activeTab}
        onSearchResults={handleSearchResults}
        selectedSource={selectedSource}
      />
      
      <main className="main-content">
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading {activeTab.toLowerCase()}... {loadingPage > 1 && `(Page ${loadingPage})`}</p>
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
            
            {/* Latest section (backed by media_radar_cache:hot) - Movies tab only */}
            {activeTab === 'Movies' && !isSearchMode && (
              <>
                {topReleases.length > 0 && (
                  <div className="special-section">
                    <div className="section-title-row">
                      <h3 className="section-title">🔥 Top Releases This Week</h3>
                      {latestTierMeta?.tier && (
                        <span className={`tier-badge tier-${latestTierMeta.tier}`}
                              title={`Served from ${latestTierMeta.cacheKey || 'cache'}${latestTierMeta.cacheMetadata?.lastUpdated ? ' · updated ' + new Date(latestTierMeta.cacheMetadata.lastUpdated).toLocaleString() : ''}`}>
                          {tierLabel(latestTierMeta.tier, 'latest')}
                        </span>
                      )}
                    </div>
                    <MovieGrid movies={topReleases} />
                  </div>
                )}

                {recentlyAdded.length > 0 && (
                  <div className="special-section">
                    <div className="section-title-row">
                      <h3 className="section-title">🆕 Recently Added</h3>
                      {latestTierMeta?.tier && (
                        <span className={`tier-badge tier-${latestTierMeta.tier}`}
                              title={`Served from ${latestTierMeta.cacheKey || 'cache'}`}>
                          {tierLabel(latestTierMeta.tier, 'latest')}
                        </span>
                      )}
                    </div>
                    <MovieGrid movies={recentlyAdded} />
                  </div>
                )}

                {(topReleases.length > 0 || recentlyAdded.length > 0) && (
                  <div className="section-divider">
                    <div className="section-title-row">
                      <h3 className="section-title">🎬 All Movies</h3>
                      {allTierMeta?.tier && (
                        <span className={`tier-badge tier-${allTierMeta.tier}`}
                              title={`Served from ${allTierMeta.cacheKey || 'cache'}${allTierMeta.cacheMetadata?.lastUpdated ? ' · updated ' + new Date(allTierMeta.cacheMetadata.lastUpdated).toLocaleString() : ''}`}>
                          {tierLabel(allTierMeta.tier, 'all')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* All TV Shows heading with tier badge */}
            {activeTab === 'TV Shows' && !isSearchMode && allTierMeta?.tier && (
              <div className="section-divider">
                <div className="section-title-row">
                  <h3 className="section-title">📺 All TV Shows</h3>
                  <span className={`tier-badge tier-${allTierMeta.tier}`}
                        title={`Served from ${allTierMeta.cacheKey || 'cache'}${allTierMeta.cacheMetadata?.lastUpdated ? ' · updated ' + new Date(allTierMeta.cacheMetadata.lastUpdated).toLocaleString() : ''}`}>
                    {tierLabel(allTierMeta.tier, 'all')}
                  </span>
                </div>
              </div>
            )}
            
            <MovieGrid movies={activeTab === 'Movies' ? movies : tvShows} />
            {renderPagination()}
          </>
        )}
        
        {!loading && ((activeTab === 'Movies' && movies.length === 0) || (activeTab === 'TV Shows' && tvShows.length === 0)) && (
          <div className="no-movies">
            <p>No {activeTab.toLowerCase()} found. Please check your Redis connection.</p>
          </div>
        )}

        {activeTab === 'PopcornPal' && (
          <PopcornPal />
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