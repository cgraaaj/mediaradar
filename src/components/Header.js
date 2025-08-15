import React, { useState } from 'react';
import './Header.css';

const Header = ({ activeTab, setActiveTab, onSearchClick }) => {
  const [activeGenre, setActiveGenre] = useState('All');
  const [sortBy, setSortBy] = useState('Popularity');

  const tabs = ['Movies', 'TV Shows', 'VR Player', 'PopcornPal'];
  const genres = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Documentary'];
  const sortOptions = ['Popularity', 'Year', 'Rating', 'Name'];

  const handleTabClick = (tab) => {
    if (tab === 'VR Player') {
      // Open VR Player in new tab
      window.open('https://vrplayer.cgraaaj.in', '_blank');
    } else {
      setActiveTab(tab);
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
              className={`nav-tab ${activeTab === tab ? 'active' : ''} ${tab === 'VR Player' ? 'vr-tab' : ''}`}
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