import React from 'react';
import './Header.css';
import { toast } from 'react-toastify';

const Header = ({
  activeTab,
  setActiveTab,
  onSearchClick,
  selectedLanguage,
  setSelectedLanguage,
  selectedSource,
  setSelectedSource,
  selectedTier,
  setSelectedTier,
}) => {
  const tabs = ['Movies', 'TV Shows', 'Player', 'PopcornPal'];
  const showGridControls = activeTab === 'Movies' || activeTab === 'TV Shows';

  const handleTabClick = async (tab) => {
    if (tab === 'Player') {
      await openPlayerWithAuth();
    } else {
      setActiveTab(tab);
    }
  };

  const openPlayerWithAuth = async () => {
    try {
      const server = 'https://vrplayer.cgraaaj.in';
      const isDev =
        process.env.REACT_APP_ENV === 'development' ||
        process.env.NODE_ENV === 'development';

      console.log(`🎬 Opening Jellyfin Player (${isDev ? 'dev' : 'prod'} mode)...`);

      const jellyfinWindow = window.open('about:blank', '_blank');
      if (!jellyfinWindow) {
        toast.error('❌ Please allow popups to open Jellyfin player');
        return;
      }

      if (isDev) {
        try {
          const authResponse = await fetch(`${server}/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Emby-Authorization':
                'MediaBrowser Client="MediaRadar", Device="WebApp", DeviceId="media-radar-web", Version="1.0.0"',
            },
            body: JSON.stringify({ Username: 'anonymous', Pw: 'anonymous@jelly' }),
          });
          if (!authResponse.ok) throw new Error(`Authentication failed: ${authResponse.status}`);
          const authData = await authResponse.json();
          const tokenLoginUrl =
            `${server}/web/token-login.html?` +
            `token=${encodeURIComponent(authData.AccessToken)}&` +
            `userId=${encodeURIComponent(authData.User.Id)}`;
          jellyfinWindow.location.href = tokenLoginUrl;
          toast.success('🎥 Opening Jellyfin Player (Dev Mode)!', { autoClose: 3000 });
        } catch (error) {
          console.error('❌ Dev mode auth failed:', error);
          jellyfinWindow.location.href = `${server}/web/index.html#!/login.html`;
          toast.warning('⚠️ Dev auth failed. Please login manually.', { autoClose: 5000 });
        }
      } else {
        jellyfinWindow.location.href = `${server}/web/index.html#!/login.html`;
        toast.info('🔐 Opening Jellyfin Player (Secure Login)', { autoClose: 3000 });
      }
    } catch (error) {
      console.error('Error opening player:', error);
      toast.error('❌ Failed to open Jellyfin player');
    }
  };

  return (
    <header className="header">
      {/* Row 1 — brand/tabs on the left, quick actions on the right. */}
      <div className="header-row header-row-primary">
        <nav className="main-nav">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="action-btn" onClick={onSearchClick} title="Search" aria-label="Search">🔍</button>
          <button className="action-btn" title="Random" aria-label="Random">🎲</button>
          <button className="action-btn" title="Notifications" aria-label="Notifications">🔔</button>
          <button className="action-btn" title="Favorites" aria-label="Favorites">❤️</button>
          <button className="action-btn" title="Files" aria-label="Files">📁</button>
          <button className="action-btn" title="Info" aria-label="Info">ℹ️</button>
          <button className="action-btn" title="Settings" aria-label="Settings">⚙️</button>
        </div>
      </div>

      {/* Row 2 — filters. Only visible for grid tabs (Movies / TV Shows). */}
      {showGridControls && (
        <div className="header-row header-row-filters">
          {setSelectedTier && (
            <label className="filter">
              <span className="filter-label">Catalog</span>
              <select
                value={selectedTier || 'cold'}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="filter-select"
                title="Redis cache tier. Cold = full 7-day catalog, Hot = fresh pool, Warm = union of both."
              >
                <option value="cold">🧊 Full Catalog</option>
                <option value="hot">⚡ Latest</option>
                <option value="warm">🌡️ Union</option>
              </select>
            </label>
          )}

          {setSelectedSource && (
            <label className="filter">
              <span className="filter-label">Source</span>
              <select
                value={selectedSource || 'all'}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="filter-select"
                title="Filter by data source"
              >
                <option value="all">All sources</option>
                <option value="1tamilmv">1TamilMV</option>
                <option value="hdhub4u">HDHub4u</option>
              </select>
            </label>
          )}

          {activeTab === 'Movies' && setSelectedLanguage && (
            <label className="filter">
              <span className="filter-label">Language</span>
              <select
                value={selectedLanguage || 'all'}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="filter-select"
                title="Filter by language"
              >
                <option value="all">All languages</option>
                <option value="tamil">Tamil</option>
                <option value="telugu">Telugu</option>
                <option value="kannada">Kannada</option>
                <option value="malayalam">Malayalam</option>
                <option value="hindi">Hindi</option>
                <option value="english">English</option>
                <option value="others">Others</option>
              </select>
            </label>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
