import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './DownloadModal.css';

// Extract info_hash from magnet link
const extractInfoHash = (magnetLink) => {
  if (!magnetLink) return null;
  try {
    const match = magnetLink.match(/btih:([a-fA-F0-9]{40})/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
};

// Calculate health status and color
const getHealthStatus = (seeders) => {
  if (seeders === 0 || seeders === undefined) return { status: 'DEAD', color: '#666', textColor: '#fff' };
  if (seeders < 5) return { status: 'POOR', color: '#ff4444', textColor: '#fff' };
  if (seeders < 20) return { status: 'FAIR', color: '#ffa500', textColor: '#000' };
  if (seeders < 50) return { status: 'GOOD', color: '#4caf50', textColor: '#fff' };
  return { status: 'EXCELLENT', color: '#00c853', textColor: '#fff' };
};

const DownloadModal = ({ movie, isOpen, onClose, onDownload }) => {
  const [isBackdropActive, setIsBackdropActive] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [torrentStats, setTorrentStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);
  // Per-row resolution state, keyed by intermediateUrl. Lets multiple rows
  // resolve in parallel without a single shared spinner.
  // Shape: { [intermediateUrl]: { status: 'pending'|'resolved'|'failed',
  //                                 finalUrl?, finalUrlHost?, error? } }
  const [resolveState, setResolveState] = useState({});



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

  // Fetch torrent stats when modal opens
  const fetchTorrentStats = useCallback(async () => {
    if (!movie?.downloadOptions) return;
    
    // Collect all info hashes from magnet links
    const infoHashes = [];
    Object.values(movie.downloadOptions).forEach(files => {
      if (Array.isArray(files)) {
        files.forEach(file => {
          const hash = extractInfoHash(file.magnetLink);
          if (hash) infoHashes.push(hash);
        });
      }
    });
    
    if (infoHashes.length === 0) return;
    
    setLoadingStats(true);
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${apiBaseUrl}/torrent-stats/bulk`, {
        infoHashes: [...new Set(infoHashes)] // Remove duplicates
      });
      
      if (response.data?.stats) {
        setTorrentStats(response.data.stats);
        console.log(`Loaded stats for ${Object.keys(response.data.stats).length} torrents`);
      }
    } catch (error) {
      console.error('Failed to fetch torrent stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [movie?.downloadOptions]);

  // Fetch stats when modal opens
  useEffect(() => {
    if (isOpen && movie?.downloadOptions) {
      fetchTorrentStats();
    } else {
      setTorrentStats({});
    }
  }, [isOpen, movie?.downloadOptions, fetchTorrentStats]);

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

  // Resolve an ad-gated / cpm-gated redirector URL to its final downloadable
  // URL via the backend (which proxies to cold-radar /resolve), then open the
  // final URL. On failure, falls back to opening the redirector URL with a
  // warning so the user still has a path forward (manual ad-walk).
  // NB: declared BEFORE the early-return below so hooks order stays stable
  // across renders (react-hooks/rules-of-hooks).
  const handleResolveAndOpen = useCallback(async (e, file) => {
    e.preventDefault();
    e.stopPropagation();

    const intermediate = file.intermediateUrl || file.originalUrl;
    if (!intermediate) {
      toast.error('❌ No redirector URL available for this row.');
      return;
    }

    // Optimistic: if a previous click already resolved this row, just reopen
    // the cached final URL.
    const prior = resolveState[intermediate];
    if (prior && prior.status === 'resolved' && prior.finalUrl) {
      window.open(prior.finalUrl, '_blank');
      toast.success(`🎬 Opening "${file.filename}"`);
      return;
    }

    // CRITICAL — Chrome popup-blocker workaround.
    //
    // Chrome (and most browsers) only allow window.open() to spawn a
    // tab when the call is SYNCHRONOUS inside a user-gesture handler.
    // Calling window.open() AFTER `await axios.post(...)` is async and
    // gets silently blocked — the user clicks "RESOLVE & OPEN", the
    // resolve succeeds, but no tab opens. We then fall through to the
    // fallback `window.open(intermediate)` which ALSO gets blocked, OR
    // (worse) the user thinks the click did nothing and clicks again
    // and lands on the ad page through some other route.
    //
    // The fix: open `about:blank` synchronously NOW (allowed because
    // we're inside the click handler), keep the popup ref, then mutate
    // its location once we have the resolved URL. If the resolve fails
    // we close the popup so we don't leave stray about:blank tabs.
    //
    // Note: pre-opening the popup also gives the user immediate visual
    // feedback that the click registered.
    const popupRef = window.open('about:blank', '_blank');
    if (!popupRef) {
      // Some users have window.open universally blocked (uBlock Origin
      // strict mode, mobile Safari, etc.). Surface a clear message; the
      // resolve still happens and the result is cached so the next
      // click can use the synchronous prior-result branch above.
      toast.warn('⚠️ Browser blocked popup. Allow popups for this site, then click again.');
    }
    const navigatePopup = (url) => {
      try {
        if (popupRef && !popupRef.closed) popupRef.location.href = url;
        else window.open(url, '_blank');
      } catch {
        window.open(url, '_blank');
      }
    };
    const closePopup = () => {
      try { if (popupRef && !popupRef.closed) popupRef.close(); } catch { /* ignore */ }
    };

    setResolveState((s) => ({ ...s, [intermediate]: { status: 'pending' } }));
    const toastId = toast.loading('🔗 Resolving final download URL...');

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const { data } = await axios.post(
        `${apiBaseUrl}/links/resolve`,
        { intermediateUrl: intermediate },
        { timeout: 20000 }
      );

      // Upstream-dead handling: the resolver detected an unrecoverable
      // deletion sentinel (e.g. hubdrive's "File not found"). The
      // intermediate URL is a confirmed dead-end — opening it would just
      // land the user on the same error page they already complained
      // about. Close the pre-opened popup, surface a clear message,
      // and mark this row 'expired' so subsequent clicks (and the row's
      // RESOLVE button) reflect the dead state instead of churning.
      //
      // Behind the scenes cold-radar is already (a) marking the row
      // expired in PG so the next /feed materialize hides it, and
      // (b) firing a background recrawl of the parent post URL to
      // discover live mirrors. So the catalog self-heals without any
      // further user action — they just need to come back later or try
      // a different quality NOW.
      if (data?.status === 'expired') {
        setResolveState((s) => ({
          ...s,
          [intermediate]: {
            status: 'expired',
            error: data.error || 'upstream_file_deleted',
          },
        }));
        closePopup();
        toast.update(toastId, {
          render: '🚫 This file is no longer available upstream. Try a different quality, or use "Request Movie".',
          type: 'error',
          isLoading: false,
          autoClose: 6000,
        });
        return;
      }

      // cold-radar's /resolve returns status='cached' when it answers from
      // its PG-backed cache (within maxAgeSeconds) and status='resolved'
      // when it walks the redirect chain fresh — both are success cases.
      // Treating only 'resolved' as success used to drop us into the
      // ad-page fallback on every cached response.
      if ((data?.status === 'resolved' || data?.status === 'cached') && data?.finalUrl) {
        setResolveState((s) => ({
          ...s,
          [intermediate]: {
            status: 'resolved',
            finalUrl: data.finalUrl,
            finalUrlHost: data.finalUrlHost || null,
            cached: !!data.cached,
            source: data.source || null,
          },
        }));
        navigatePopup(data.finalUrl);
        toast.update(toastId, {
          render: data.cached
            ? `🎬 Opening "${file.filename}" (cached resolution)`
            : `🎬 Opening "${file.filename}"`,
          type: 'success',
          isLoading: false,
          autoClose: 3000,
        });
        if (onDownload) onDownload(file.filename);
        return;
      }

      const reason = data?.error || data?.status || 'unknown';
      setResolveState((s) => ({
        ...s,
        [intermediate]: { status: 'failed', error: reason },
      }));
      navigatePopup(intermediate);
      toast.update(toastId, {
        render: `⚠️ Could not auto-resolve (${reason}); opening ad page.`,
        type: 'warning',
        isLoading: false,
        autoClose: 4500,
      });
    } catch (err) {
      const status = err.response?.status;
      const upstream = err.response?.data;
      console.error('Resolve error:', { status, upstream, message: err.message });
      setResolveState((s) => ({
        ...s,
        [intermediate]: {
          status: 'failed',
          error: upstream?.error || err.message,
        },
      }));
      // Close the pre-opened about:blank rather than navigating it to
      // the ad page — for 4xx errors the ad page won't help the user
      // anyway, and for 5xx errors we want them to retry not abandon.
      // Exception: 4xx host_not_allowed is the only case where falling
      // back to the ad page is genuinely useful as a manual escape hatch.
      if (status === 400 && upstream?.error === 'host_not_allowed') {
        navigatePopup(intermediate);
      } else {
        closePopup();
      }
      const detail = upstream?.detail || upstream?.error || err.message;
      const msg = status === 503
        ? '⚠️ Resolver service not configured.'
        : status === 429
        ? '⚠️ Resolve rate-limited; try again in a moment.'
        : status === 400 && upstream?.error === 'host_not_allowed'
        ? `⚠️ Host not in allow-list (${detail}); opening ad page.`
        : `⚠️ Resolve failed (${detail}); please try again.`;
      toast.update(toastId, { render: msg, type: 'warning', isLoading: false, autoClose: 4500 });
    }
  }, [resolveState, onDownload]);

  /**
   * Re-check upstream for an EXPIRED row.
   *
   * Calls POST /api/links/recheck which proxies to cold-radar's /recheck.
   * Cold-radar looks up the parent post URL, recrawls it once, and returns
   * { newLinks, movies, tvshows }. Outcomes:
   *   - newLinks > 0: upstream re-uploaded — toast "✨ X new mirrors!" and
   *     ask user to refresh the page so they see the new qualities. We
   *     don't auto-refresh because they may be mid-comparison across tiles.
   *   - newLinks === 0: post is still genuinely dead. Toast a friendly
   *     "still no live mirrors" so the user knows we actually checked.
   *   - error: surface a warning toast; the user can retry later.
   *
   * Throttled per-row by the local recheckState map: while a recheck is in
   * flight or has completed for that row, the button shows the appropriate
   * state instead of allowing repeated clicks.
   */
  const handleRecheck = useCallback(async (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    const intermediate = file.intermediateUrl || file.originalUrl;
    if (!intermediate) {
      toast.warn('⚠️ This row has no intermediate URL to recheck.');
      return;
    }
    setResolveState((s) => ({
      ...s,
      [intermediate]: {
        ...(s[intermediate] || {}),
        status: 'rechecking',
      },
    }));
    const toastId = toast.loading(`🔄 Asking upstream if "${file.filename}" is back…`);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const { data } = await axios.post(
        `${apiUrl}/api/links/recheck`,
        { intermediateUrl: intermediate },
        { timeout: 25000 },
      );
      if (!data?.found) {
        setResolveState((s) => ({
          ...s,
          [intermediate]: {
            status: 'expired',
            error: data?.error || 'post_dead',
            recheckedAt: Date.now(),
          },
        }));
        toast.update(toastId, {
          render: data?.error === 'post_dead'
            ? '😔 Still no live mirrors upstream. We will keep retrying daily.'
            : `⚠️ Recheck inconclusive (${data?.error || 'unknown'}).`,
          type: data?.error === 'post_dead' ? 'info' : 'warning',
          isLoading: false,
          autoClose: 4500,
        });
        return;
      }
      const newLinks = Number(data.newLinks || 0);
      setResolveState((s) => ({
        ...s,
        [intermediate]: {
          status: newLinks > 0 ? 'rechecked_fresh' : 'expired',
          newLinks,
          recheckedAt: Date.now(),
        },
      }));
      if (newLinks > 0) {
        toast.update(toastId, {
          render: `✨ Upstream re-uploaded — ${newLinks} new mirror${newLinks > 1 ? 's' : ''} found! Refresh the page to see them.`,
          type: 'success',
          isLoading: false,
          autoClose: 8000,
        });
      } else {
        toast.update(toastId, {
          render: '😔 Recrawled the post but no fresh mirrors yet. We will keep retrying daily.',
          type: 'info',
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const upstream = err.response?.data;
      console.error('Recheck error:', { status, upstream, message: err.message });
      setResolveState((s) => ({
        ...s,
        [intermediate]: {
          status: 'expired',
          error: upstream?.error || err.message,
        },
      }));
      toast.update(toastId, {
        render: status === 429
          ? '⚠️ Too many rechecks; try again in a minute.'
          : `⚠️ Recheck failed (${upstream?.error || err.message}).`,
        type: 'warning',
        isLoading: false,
        autoClose: 4500,
      });
    }
  }, []);

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

  // (handleResolveAndOpen lives above the early `return null` so hooks order
  // is invariant across renders; see the useCallback declaration earlier.)

  const handleWebhookClick = async (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const payload = {
        movie: {
          title: movie.title,
          year: movie.year,
          imdbRating: movie.imdbRating,
          tmdbRating: movie.tmdbRating,
          sources: movie.sources,
        },
        file: {
          filename: file.filename,
          originalFilename: file.originalFilename,
          size: file.size,
          href: file.href,
          language: file.language,
          releaseYear: file.releaseYear,
          source: file.source,
          kind: file.kind,
          status: file.status,
          host: file.host,
          magnetLink: file.magnetLink,
          torrentUrl: file.torrentUrl,
          originalUrl: file.originalUrl,
          finalUrl: file.finalUrl,
          postUrl: file.postUrl,
        },
      };

      // Proxy through our own backend to avoid browser CORS against n8n
      // and to keep the n8n URL out of the client bundle.
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const response = await axios.post(
        `${apiBaseUrl}/webhooks/request-movie`,
        payload,
        { timeout: 15000 }
      );

      if (response.data?.success) {
        console.log('Successfully sent to webhook', response.data);
        toast.success(`🚀 Movie "${movie.title}" requested successfully!`, {
          autoClose: 4000,
        });
      } else {
        console.error('Webhook request failed:', response.status, response.data);
        toast.error(`❌ Failed to request movie (status ${response.status}).`, {
          autoClose: 5000,
        });
      }
    } catch (error) {
      const status = error.response?.status;
      const upstreamMsg = error.response?.data?.error;
      console.error('Webhook error:', { status, upstreamMsg, error });
      toast.error(
        upstreamMsg
          ? `❌ ${upstreamMsg}${status ? ` (HTTP ${status})` : ''}`
          : '❌ Network error: Unable to send movie request',
        { autoClose: 5000 }
      );
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
        
        {/* Compact Summary Band — small thumb + chips + collapse toggle */}
        <div className="modal-summary-band">
          {movie.poster && (
            <div className="modal-summary-thumb">
              <img src={movie.poster} alt={movie.title} />
            </div>
          )}

          <div className="modal-summary-meta">
            <div className="modal-summary-chips">
              {movie.genre && (
                <span className="modal-chip chip-genre" title={movie.genre}>
                  🎭 {movie.genre.split(',')[0]}
                </span>
              )}
              {movie.runtime && (
                <span className="modal-chip chip-runtime">⏱️ {movie.runtime}</span>
              )}
              {movie.language && movie.language !== 'N/A' && (
                <span className="modal-chip chip-lang" title={movie.language}>
                  🗣️ {movie.language.split(',')[0]}
                </span>
              )}
              {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                <span className="modal-chip chip-rating">⭐ {movie.imdbRating}</span>
              )}
              {movie.tmdbRating && (
                <span className="modal-chip chip-rating">🌟 {movie.tmdbRating}</span>
              )}
            </div>
            {movie.tagline && (
              <p className="modal-summary-tagline" title={movie.tagline}>"{movie.tagline}"</p>
            )}
          </div>

          <button
            className="modal-details-toggle"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            aria-expanded={showDetails}
            title={showDetails ? 'Hide details' : 'Show details'}
          >
            <span>{showDetails ? 'Hide' : 'Details'}</span>
            <span className={`arrow ${showDetails ? 'expanded' : ''}`}>▼</span>
          </button>
        </div>

        {/* Expanded details — only mounted when toggled, scroll capped */}
        {showDetails && (
          <div className="modal-details-expanded">
            <div className="modal-info-grid">
              <div className="modal-basic-info">
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

        {/* Download Section with Tabs */}
        <div className="modal-downloads-section">
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
                    <div className="modal-files-grid">
                      {(() => {
                        const filteredQualities = availableQualities.filter(([quality]) => quality === activeTab);

                        if (filteredQualities.length === 0) {
                          return <div style={{padding: '20px', textAlign: 'center', color: '#999'}}>No files found for {activeTab}</div>;
                        }

                        return filteredQualities.map(([quality, files]) => {
                          return files.map((file, index) => {
                            const isDirect = file.kind === 'direct';
                            const isTorrent = file.kind === 'torrent';
                            const isMagnet = file.kind === 'magnet' && !isTorrent;
                            // `ad_gated` is the same UX as `cpm_gated` from the
                            // user's POV - both mean "the catalog has the
                            // redirector but no fresh final URL". Treat them
                            // equivalently so the resolve flow kicks in for
                            // both.
                            const cpmGated = isDirect && (file.status === 'cpm_gated' || file.status === 'ad_gated');
                            const stream = isDirect && file.status === 'stream';
                            const resolved = isDirect && file.status === 'resolved';
                            const sourceLabel = file.sourceLabel || (file.source === '1tamilmv' ? '1TamilMV' : file.source === 'hdhub4u' ? 'HDHub4u' : file.source);
                            const intermediateUrlForFile = file.intermediateUrl || file.originalUrl;
                            const rowResolve = intermediateUrlForFile ? resolveState[intermediateUrlForFile] : null;
                            const isResolving = rowResolve?.status === 'pending';
                            const isResolvedNow = rowResolve?.status === 'resolved' && !!rowResolve.finalUrl;
                            // Cold-radar told us this row is upstream-dead (e.g. hubdrive
                            // serves a "File not found" page for the file id). We surface
                            // it visually so the user doesn't keep clicking the dead link.
                            const isExpired = rowResolve?.status === 'expired';
                            const isRechecking = rowResolve?.status === 'rechecking';
                            const recheckedFresh = rowResolve?.status === 'rechecked_fresh';

                            return (
                              <div key={`${quality}-${index}`} className={`modal-download-item file-source-${file.source || 'unknown'} file-kind-${file.kind || 'unknown'}`}>
                                <div className="modal-file-info">
                                  <div className="modal-filename-container">
                                    <div className="modal-file-header-badges">
                                      {file.source && (
                                        <span className={`modal-source-chip chip-${file.source}`} title={`Source: ${sourceLabel}`}>
                                          {file.source === '1tamilmv' ? '🧲' : '🔗'} {sourceLabel}
                                        </span>
                                      )}
                                      {file.kind && (
                                        <span className={`modal-kind-chip kind-${file.kind}`}>
                                          {file.kind.toUpperCase()}
                                        </span>
                                      )}
                                      {isExpired && (
                                        <span className="modal-status-chip status-expired" title="The file is no longer available upstream. Try a different quality or use Request Movie.">
                                          🚫 EXPIRED
                                        </span>
                                      )}
                                      {cpmGated && !isResolvedNow && !isExpired && (
                                        <span className="modal-status-chip status-cpm" title="This link is ad-gated. Click 'Open' to auto-resolve to the final URL.">
                                          ⚠️ AD-GATED
                                        </span>
                                      )}
                                      {isResolvedNow && (
                                        <span className="modal-status-chip status-resolved" title={`Auto-resolved to ${rowResolve.finalUrlHost || 'final host'}`}>
                                          ✅ RESOLVED
                                        </span>
                                      )}
                                      {stream && (
                                        <span className="modal-status-chip status-stream" title="This URL streams in-browser.">
                                          ▶️ STREAM
                                        </span>
                                      )}
                                      {resolved && (
                                        <span className="modal-status-chip status-resolved" title="Direct download link (resolved).">
                                          ✅ DIRECT
                                        </span>
                                      )}
                                    </div>

                                    <span
                                      className="modal-filename"
                                      title={`${file.originalFilename ? 'Original: ' + file.originalFilename + '\n' : ''}${file.sizeSource ? 'Size from: ' + file.sizeSource.replace('_', ' ') + '\n' : ''}${file.postTitle ? 'Post: ' + file.postTitle : ''}`}
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

                                    {file.host && (
                                      <span className="modal-file-host" title={`Delivered via ${file.host}`}>
                                        🌐 {file.host}
                                      </span>
                                    )}

                                    {file.label && file.label !== file.filename && (
                                      <span className="modal-file-label" title="Post label">
                                        🏷️ {file.label}
                                      </span>
                                    )}
                                  </div>

                                  {/* Torrent Health Info – only meaningful when we have a magnet/hash */}
                                  {(isMagnet || isTorrent || file.magnetLink) && (() => {
                                    const infoHash = extractInfoHash(file.magnetLink);
                                    const stats = infoHash ? torrentStats[infoHash] : null;
                                    const health = stats ? getHealthStatus(stats.seeders) : null;
                                    const ratio = stats && stats.leechers > 0
                                      ? (stats.seeders / stats.leechers).toFixed(2)
                                      : stats?.seeders > 0 ? '∞' : '0';

                                    return (
                                      <div className="modal-torrent-metadata">
                                        {loadingStats ? (
                                          <span className="modal-stats-loading">Loading stats...</span>
                                        ) : stats ? (
                                          <>
                                            <div className="modal-torrent-health">
                                              <span
                                                className="modal-health-indicator"
                                                style={{
                                                  backgroundColor: health.color,
                                                  color: health.textColor,
                                                  padding: '2px 8px',
                                                  borderRadius: '3px',
                                                  fontSize: '11px',
                                                  fontWeight: '600',
                                                }}
                                                title={`Health: ${health.status}`}
                                              >
                                                {health.status}
                                              </span>
                                            </div>

                                            <div className="modal-torrent-stats">
                                              <span className="modal-seeders" title="Seeders (people sharing)">
                                                🌱 {stats.seeders}
                                              </span>
                                              <span className="modal-leechers" title="Leechers (people downloading)">
                                                📥 {stats.leechers}
                                              </span>
                                              <span className="modal-ratio" title="Seed/Leech Ratio">
                                                📊 {ratio}
                                              </span>
                                            </div>
                                          </>
                                        ) : infoHash ? (
                                          <span className="modal-stats-unavailable" title="No stats available - torrent not yet tracked">
                                            📊 Stats unavailable
                                          </span>
                                        ) : null}
                                      </div>
                                    );
                                  })()}
                                </div>

                                <div className="modal-download-buttons">
                                  <div className="modal-download-grid">
                                    {/* Primary action depends on kind. For
                                        ad-gated rows we route through the
                                        backend's /api/links/resolve so the
                                        user gets the final URL directly
                                        instead of having to walk an ad page.
                                    */}
                                    {isDirect && (
                                      <button
                                        className={`modal-download-file-btn ${cpmGated && !isResolvedNow ? 'gated' : ''} ${isExpired ? 'expired' : ''}`}
                                        disabled={isResolving || isExpired}
                                        onClick={(e) => {
                                          // 0) Already known dead — short-circuit so user gets
                                          //    the same explanation we showed on first click
                                          //    instead of re-walking the chain to the same
                                          //    upstream-deletion sentinel. Cold-radar already
                                          //    fired off a background recrawl after the first
                                          //    click; user can refresh later for a fresh blob.
                                          if (isExpired) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toast.info('🚫 File no longer available upstream. Try a different quality or use Request Movie.');
                                            return;
                                          }
                                          // 1) Already resolved this session? Reuse the in-memory result.
                                          if (isResolvedNow) {
                                            return handleDownloadClick(e, rowResolve.finalUrl, file.filename);
                                          }
                                          // 2) Have a stable intermediate? JIT-resolve through the
                                          //    backend so the user always gets a fresh signed URL.
                                          //    Required even for status='resolved' rows because the
                                          //    cached final_url in PG can be hours old and the
                                          //    upstream CDN tokens (hubcloud / fsl-buckets / etc.)
                                          //    expire well within that window. The backend +
                                          //    cold-radar share an LRU + PG cache so repeat clicks
                                          //    hit warm paths in <100 ms.
                                          if (intermediateUrlForFile) {
                                            return handleResolveAndOpen(e, file);
                                          }
                                          // 3) Legacy / non-resolvable rows: fall back to whatever
                                          //    final URL we have. Best-effort; may 404 if stale.
                                          return handleDownloadClick(e, file.href, file.filename);
                                        }}
                                        title={
                                          isExpired
                                            ? 'This file is no longer available upstream'
                                            : isResolving
                                            ? 'Resolving final URL…'
                                            : isResolvedNow
                                            ? `Open final URL${rowResolve.finalUrlHost ? ' on ' + rowResolve.finalUrlHost : ''}`
                                            : intermediateUrlForFile
                                            ? cpmGated
                                              ? 'Ad-gated: backend will auto-resolve to the final URL'
                                              : 'Backend will mint a fresh signed URL on click (avoids stale-token 404s)'
                                            : stream
                                            ? 'Stream in browser'
                                            : 'Open direct download'
                                        }
                                      >
                                        {isExpired
                                          ? '🚫 Unavailable'
                                          : isResolving
                                          ? '⏳ Resolving…'
                                          : isResolvedNow
                                          ? '⬇️ Download'
                                          : cpmGated
                                          ? '🔗 Resolve & Open'
                                          : stream
                                          ? '▶️ Stream'
                                          : '⬇️ Download'}
                                      </button>
                                    )}

                                    {/* Recheck button: visible only on EXPIRED rows.
                                        Asks cold-radar to re-fetch the parent post and
                                        report new mirrors. Cheap (1 upstream HTTP per
                                        click, rate-limited 30 RPM/IP) so the user can
                                        try after they think upstream might have re-uploaded.
                                        Disappears once a fresh recheck reported new links. */}
                                    {isExpired && intermediateUrlForFile && !recheckedFresh && (
                                      <button
                                        className={`modal-download-file-btn recheck${isRechecking ? ' rechecking' : ''}`}
                                        onClick={(e) => handleRecheck(e, file)}
                                        disabled={isRechecking}
                                        title={
                                          isRechecking
                                            ? 'Asking upstream if the file is back…'
                                            : 'Re-crawl the parent post page; if upstream re-uploaded with new file IDs, we ingest them and you can refresh to see the new mirrors.'
                                        }
                                      >
                                        {isRechecking ? '⏳ Rechecking…' : '🔄 Re-check upstream'}
                                      </button>
                                    )}
                                    {recheckedFresh && (
                                      <button
                                        className="modal-download-file-btn refresh-page"
                                        onClick={() => window.location.reload()}
                                        title="New mirrors discovered — reload to see them"
                                      >
                                        ✨ {rowResolve?.newLinks || 0} new — Refresh page
                                      </button>
                                    )}

                                    {isTorrent && file.torrentUrl && (
                                      <button
                                        className="modal-download-file-btn"
                                        onClick={(e) => handleDownloadClick(e, file.torrentUrl, file.filename)}
                                        title={`Download .torrent file for ${file.filename}`}
                                      >
                                        📥 .torrent
                                      </button>
                                    )}

                                    {file.magnetLink && (
                                      <button
                                        className="modal-magnet-btn"
                                        onClick={(e) => handleMagnetClick(e, file.magnetLink, file.filename)}
                                        title={`Open magnet link for ${file.filename}`}
                                      >
                                        🧲 Magnet
                                      </button>
                                    )}

                                    {/* For direct links, expose the post URL as a secondary action */}
                                    {isDirect && file.postUrl && (
                                      <button
                                        className="modal-post-btn"
                                        onClick={(e) => handleDownloadClick(e, file.postUrl, file.filename)}
                                        title="Open the source post page"
                                      >
                                        🔗 Post
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
                            );
                          });
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