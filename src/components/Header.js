import React, { useState } from 'react';
import './Header.css';
import { toast } from 'react-toastify';

const Header = ({ activeTab, setActiveTab, onSearchClick, selectedLanguage, setSelectedLanguage, selectedSource, setSelectedSource }) => {
  const [activeGenre, setActiveGenre] = useState('All');
  const [sortBy, setSortBy] = useState('Popularity');

  const tabs = ['Movies', 'TV Shows', 'Player', 'PopcornPal'];
  const genres = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Documentary'];
  const sortOptions = ['Popularity', 'Year', 'Rating', 'Name'];

  const handleTabClick = async (tab) => {
    if (tab === 'Player') {
      // Open Player with authentication logic
      await openPlayerWithAuth();
    } else {
      setActiveTab(tab);
    }
  };

  const openPlayerWithAuth = async () => {
    try {
      const server = 'https://vrplayer.cgraaaj.in';
      const isDev = process.env.REACT_APP_ENV === 'development' || process.env.NODE_ENV === 'development';
      
      console.log(`🎬 Opening Jellyfin Player (${isDev ? 'dev' : 'prod'} mode)...`);
      
      // Open a new window/tab for Jellyfin
      const jellyfinWindow = window.open('about:blank', '_blank');
      
      if (!jellyfinWindow) {
        toast.error('❌ Please allow popups to open Jellyfin player');
        return;
      }
      
      if (isDev) {
        // Development mode: Use token-login approach
        try {
          console.log('🔐 Dev mode: Authenticating with Jellyfin...');
          const authResponse = await fetch(`${server}/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Emby-Authorization': 'MediaBrowser Client="MediaRadar", Device="WebApp", DeviceId="media-radar-web", Version="1.0.0"'
            },
            body: JSON.stringify({
              Username: 'anonymous',
              Pw: 'anonymous@jelly'
            })
          });
          
          if (!authResponse.ok) {
            throw new Error(`Authentication failed: ${authResponse.status}`);
          }
          
          const authData = await authResponse.json();
          console.log('✅ Dev mode: Authentication successful');
          
          // Use token-login.html for authentication
          const tokenLoginUrl = `${server}/web/token-login.html?` +
            `token=${encodeURIComponent(authData.AccessToken)}&` +
            `userId=${encodeURIComponent(authData.User.Id)}`;
          
          jellyfinWindow.location.href = tokenLoginUrl;
          
          toast.success('🎥 Opening Jellyfin Player (Dev Mode)!', {
            autoClose: 3000
          });
          
        } catch (error) {
          console.error('❌ Dev mode auth failed:', error);
          // Fallback to manual login
          jellyfinWindow.location.href = `${server}/web/index.html#!/login.html`;
          toast.warning('⚠️ Dev auth failed. Please login manually.', {
            autoClose: 5000
          });
        }
      } else {
        // Production mode: Direct to login page
        console.log('🔒 Prod mode: Redirecting to secure login');
        jellyfinWindow.location.href = `${server}/web/index.html#!/login.html`;
        
        toast.info('🔐 Opening Jellyfin Player (Secure Login)', {
          autoClose: 3000
        });
      }
      
    } catch (error) {
      console.error('Error opening player:', error);
      toast.error('❌ Failed to open Jellyfin player');
    }
  };

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <nav className="main-nav">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        
        <div className="controls">
          {(activeTab === 'Movies' || activeTab === 'TV Shows') && setSelectedSource && (
            <div className="source-control">
              <span className="control-label">Source</span>
              <select
                value={selectedSource || 'all'}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="control-select"
                title="Filter by data source"
              >
                <option value="all">All Sources</option>
                <option value="1tamilmv">1TamilMV</option>
                <option value="hdhub4u">HDHub4u</option>
              </select>
            </div>
          )}

          {activeTab === 'Movies' && selectedLanguage && setSelectedLanguage && (
            <div className="language-control">
              <span className="control-label">Language</span>
              <select 
                value={selectedLanguage} 
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="control-select"
              >
                <option value="all">All</option>
                <option value="tamil">Tamil</option>
                <option value="telugu">Telugu</option>
                <option value="kannada">Kannada</option>
                <option value="malayalam">Malayalam</option>
                <option value="hindi">Hindi</option>
                <option value="english">English</option>
                <option value="others">Others</option>
              </select>
            </div>
          )}
          
          <div className="genre-control">
            <span className="control-label">Genre</span>
            <select 
              value={activeGenre} 
              onChange={(e) => setActiveGenre(e.target.value)}
              className="control-select"
            >
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
          
          <div className="sort-control">
            <span className="control-label">Sort by</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="control-select"
            >
              {sortOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="header-actions">
          <button className="action-btn search-btn" onClick={handleSearchClick} title="Search">🔍</button>
          <button className="action-btn random-btn" title="Random">🎲</button>
          <button className="action-btn notifications-btn" title="Notifications">🔔</button>
          <button className="action-btn favorites-btn" title="Favorites">❤️</button>
          <button className="action-btn folder-btn" title="Files">📁</button>
          <button className="action-btn info-btn" title="Info">ℹ️</button>
          <button className="action-btn settings-btn" title="Settings">⚙️</button>
        </div>
      </div>
    </header>
  );
};

export default Header; 