import React, { useState } from 'react';
import './Header.css';
import { toast } from 'react-toastify';

const Header = ({ activeTab, setActiveTab, onSearchClick }) => {
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
      console.log('🎬 Opening Jellyfin Player with authentication...');
      
      // Open a new window/tab for Jellyfin
      const jellyfinWindow = window.open('about:blank', '_blank');
      
      if (!jellyfinWindow) {
        toast.error('❌ Please allow popups to open Jellyfin player');
        return;
      }
      
      try {
        // Authenticate with Jellyfin API (same logic as PopcornPal)
        console.log('🔐 Authenticating with Jellyfin...');
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
        console.log('✅ Authentication successful');
        
        // Use token-login.html for authentication (without movieId since we're going to home)
        const tokenLoginUrl = `${server}/web/token-login.html?` +
          `token=${encodeURIComponent(authData.AccessToken)}&` +
          `userId=${encodeURIComponent(authData.User.Id)}`;
        
        console.log('🌉 Redirecting to token login page:', tokenLoginUrl);
        
        // Redirect the popup to token login page
        jellyfinWindow.location.href = tokenLoginUrl;
        
        toast.success('🎥 Opening Jellyfin Player!', {
          autoClose: 3000
        });
        
      } catch (error) {
        console.error('❌ Player auth failed:', error);
        
        // Fallback: redirect to manual login
        jellyfinWindow.location.href = `${server}/web/index.html#!/login.html`;
        
        toast.warning('⚠️ Please login manually. Username: anonymous, Password: anonymous@jelly', {
          autoClose: 5000
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