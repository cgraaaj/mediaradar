import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import MovieGrid from './components/MovieGrid';
import Header from './components/Header';
import SearchModal from './components/SearchModal';
import TorrentHealthOverview from './components/TorrentHealthOverview';
import PopcornPal from './components/PopcornPal';
import {
  useMoviesQuery,
  useTvShowsQuery,
} from './hooks/useMediaQueries';

// Section title + tier badge copy are both driven off the selected tier.
// The grid is now a single surface — no more "Top Releases" / "Recently
// Added" slicing, since the Catalog dropdown already lets users pick
// between the latest (hot) and the full catalog (cold).
const TIER_COPY = {
  hot:    { title: '⚡ Latest Releases',  badge: '⚡ Hot' },
  cold:   { title: '🎬 All {kind}',        badge: '🧊 Full Catalog' },
  warm:   { title: '🌡️ Combined Catalog', badge: '🌡️ Union' },
  legacy: { title: '🗄️ Catalog',          badge: '🗄️ Legacy' },
};

function formatTitle(tier, activeTab) {
  const kind = activeTab === 'Movies' ? 'Movies' : 'TV Shows';
  const template = (TIER_COPY[tier] || TIER_COPY.cold).title;
  return template.replace('{kind}', kind);
}

// Small presentational helper: renders the tier badge + tooltip.
function TierBadge({ meta }) {
  if (!meta?.tier) return null;
  const { tier, cacheKey, cacheMetadata } = meta;
  const lastUpdated = cacheMetadata?.lastUpdated
    ? ' · updated ' + new Date(cacheMetadata.lastUpdated).toLocaleString()
    : '';
  const label = (TIER_COPY[tier] || TIER_COPY.legacy).badge;
  return (
    <span
      className={`tier-badge tier-${tier}`}
      title={`Served from ${cacheKey || 'cache'}${lastUpdated}`}
    >
      {label}
    </span>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('Movies');

  // Paginated-grid page number. Owned locally; queries key off it.
  const [page, setPage] = useState(1);

  // Filter state.
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  // Default source = 1tamilmv to match backend default and land users on
  // the "latest catalog" view they expect. Users can switch to 'all' or
  // any other source via the Header dropdown — only the *initial* render
  // is biased.
  const [selectedSource, setSelectedSource] = useState('1tamilmv');
  // 'cold' = full 7-day catalog (default), 'hot' = fresh pool only,
  // 'warm' = app-side union of hot ∪ cold (HSM middle band).
  const [selectedTier, setSelectedTier] = useState('cold');

  // Search UI state.
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchInfo, setSearchInfo] = useState(null);

  // Reset page to 1 whenever any filter changes. Kept intentionally small —
  // no data-fetching side-effects here; the queries below react to `page`
  // and the filter state automatically.
  useEffect(() => { setPage(1); }, [selectedLanguage, selectedSource, selectedTier, activeTab]);

  // Reset search mode when tab changes.
  useEffect(() => {
    if (isSearchMode) {
      setIsSearchMode(false);
      setSearchInfo(null);
      setSearchResults(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // -- Queries ---------------------------------------------------------------
  // TanStack Query owns the data lifecycle here. No manual useEffect + fetch
  // dance, no ref-stability foot-guns: the query key IS the cache key.

  const moviesQuery = useMoviesQuery({
    page,
    language: selectedLanguage,
    source: selectedSource,
    tier: selectedTier,
    enabled: activeTab === 'Movies' && !isSearchMode,
  });

  const tvShowsQuery = useTvShowsQuery({
    page,
    source: selectedSource,
    tier: selectedTier,
    enabled: activeTab === 'TV Shows' && !isSearchMode,
  });

  // -- Derived view data -----------------------------------------------------

  // Pick the active grid query (movies vs tvshows) for the main grid.
  const activeQuery = activeTab === 'Movies' ? moviesQuery : tvShowsQuery;

  const items = useMemo(() => {
    if (isSearchMode) return searchResults || [];
    if (activeTab === 'Movies') return moviesQuery.data?.movies || [];
    if (activeTab === 'TV Shows') return tvShowsQuery.data?.tvShows || [];
    return [];
  }, [isSearchMode, searchResults, activeTab, moviesQuery.data, tvShowsQuery.data]);

  const pagination = useMemo(() => {
    if (isSearchMode && searchInfo?.pagination) return searchInfo.pagination;
    const raw = activeQuery.data?.pagination;
    if (!raw) return { currentPage: page, totalPages: 1, totalItems: 0, itemsPerPage: 20, hasNextPage: false, hasPrevPage: false };
    return {
      ...raw,
      totalItems: raw.totalItems ?? raw.totalMovies ?? raw.totalTVShows ?? 0,
      itemsPerPage: raw.itemsPerPage ?? raw.moviesPerPage ?? raw.tvShowsPerPage ?? 20,
    };
  }, [isSearchMode, searchInfo, activeQuery.data, page]);

  // Tier metadata for the UI badges (tier / cacheKey / cacheMetadata).
  const tierMeta = activeQuery.data?.metadata || null;

  // Show the spinner only on the first load. Subsequent page flips keep the
  // old grid visible (thanks to `keepPreviousData`) while the new page
  // arrives — way better UX than blanking out.
  const isInitialLoading = activeQuery.isPending && !isSearchMode;
  const isBackgroundFetching = activeQuery.isFetching && !activeQuery.isPending;
  const error = activeQuery.error ? (activeQuery.error.message || 'Failed to load data') : null;

  // Toast once per error (rate-limited via a simple ref-less approach: key on
  // the error message string so dedupe is natural when many renders happen).
  useEffect(() => {
    if (error) {
      toast.error(`❌ ${error}`, { autoClose: 5000, toastId: `err:${error}` });
    }
  }, [error]);

  // -- Handlers --------------------------------------------------------------

  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pagination.currentPage !== newPage) {
      toast.info(`📄 Loading ${activeTab.toLowerCase()} page ${newPage}...`, { autoClose: 2000, toastId: `page:${newPage}` });
    }
  }, [pagination.totalPages, pagination.currentPage, activeTab]);

  const handleSearchClick = () => setIsSearchModalOpen(true);
  const handleSearchModalClose = () => setIsSearchModalOpen(false);

  const handleSearchResults = (results, searchPagination, searchData) => {
    setSearchResults(results);
    setSearchInfo({
      ...searchData,
      pagination: {
        ...searchPagination,
        totalItems: activeTab === 'Movies' ? searchPagination.totalMovies : searchPagination.totalTVShows,
        itemsPerPage: activeTab === 'Movies' ? searchPagination.moviesPerPage : searchPagination.tvShowsPerPage,
      },
    });
    setIsSearchMode(true);
    toast.success(`🔍 Found ${results.length} ${activeTab.toLowerCase()} matching "${searchData.query}"`, { autoClose: 3000 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    setIsSearchMode(false);
    setSearchInfo(null);
    setSearchResults(null);
    setPage(1);
    toast.info(`🔄 Cleared search, showing all ${activeTab.toLowerCase()}`, { autoClose: 2000 });
  };

  // -- Pagination render -----------------------------------------------------
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

    return (
      <div className="pagination">
        <div className="pagination-info">
          Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} {activeTab.toLowerCase()}
          {isBackgroundFetching && <span className="pagination-refresh" title="Refreshing..."> · ↻</span>}
        </div>
        <div className="pagination-controls">
          <button className="page-btn" onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage}>First</button>
          <button className="page-btn" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}>Previous</button>
          {pageNumbers.map(pn => (
            <button key={pn} className={`page-btn ${pn === pagination.currentPage ? 'active' : ''}`} onClick={() => handlePageChange(pn)}>{pn}</button>
          ))}
          <button className="page-btn" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>Next</button>
          <button className="page-btn" onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage}>Last</button>
        </div>
      </div>
    );
  };

  // -- Render ----------------------------------------------------------------
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
        {isInitialLoading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading {activeTab.toLowerCase()}...</p>
          </div>
        )}

        {error && <div className="error-notice">{error}</div>}

        {!isInitialLoading && items.length > 0 && (activeTab === 'Movies' || activeTab === 'TV Shows') && (
          <>
            <div className="movies-header">
              <div className="movies-header-title">
                <h2>
                  {isSearchMode
                    ? '🔍 Search Results'
                    : formatTitle(tierMeta?.tier || selectedTier, activeTab)}
                </h2>
                {!isSearchMode && <TierBadge meta={tierMeta} />}
              </div>
              <div className="header-info">
                {isSearchMode && searchInfo && (
                  <div className="search-status">
                    <span className="search-query">"{searchInfo.query}"</span>
                    <button className="clear-search" onClick={clearSearch} title="Clear search">✕ Clear Search</button>
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

            <MovieGrid movies={items} />
            {renderPagination()}
          </>
        )}

        {!isInitialLoading && items.length === 0 && (activeTab === 'Movies' || activeTab === 'TV Shows') && (
          <div className="no-movies">
            <p>No {activeTab.toLowerCase()} found. Please check your Redis connection.</p>
          </div>
        )}

        {activeTab === 'PopcornPal' && <PopcornPal />}
      </main>

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
