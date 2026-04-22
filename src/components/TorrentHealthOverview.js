import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TorrentHealthOverview.css';

const TorrentHealthOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(true);  // Start visible

  useEffect(() => {
    fetchTorrentStats();
  }, []);

  const fetchTorrentStats = async () => {
    try {
      setError(null);
      // Use same API base URL pattern as rest of app
      // REACT_APP_API_BASE_URL already includes /api, so just append the endpoint
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
      const url = `${apiBaseUrl}/torrent-stats`;
      console.log('Fetching torrent stats from:', url);
      const response = await axios.get(url);
      console.log('Torrent stats response:', response.data);
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch torrent stats:', err);
      setError(err.message || 'Failed to load stats');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="torrent-overview loading">
        <div className="loading-spinner-small"></div>
        <span>Loading torrent stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="torrent-overview">
        <div className="stats-panel" style={{ padding: '15px', color: '#ff6b6b' }}>
          <span>⚠️ Torrent stats unavailable: {error}</span>
          <button onClick={fetchTorrentStats} className="refresh-btn" style={{ marginLeft: '10px' }}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="torrent-overview">
      <button 
        className="stats-toggle"
        onClick={() => setIsVisible(!isVisible)}
        title="Toggle Torrent Health Statistics"
      >
        📊 Torrent Stats {isVisible ? '▼' : '▶'}
      </button>
      
      {isVisible && (
        <div className="stats-panel">
          <div className="stats-header">
            <h3>🌱 Torrent Health Overview</h3>
            <div className="stats-badges">
              <span className="cache-info">Tracked: {stats.totalTrackedTorrents} torrents</span>
              <span className={`data-source ${stats.dataSource}`}>
                {stats.dataSource === 'real' ? '🔴 Live Data' : '📊 Enhanced Data'}
              </span>
            </div>
          </div>
          
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Quality Distribution</h4>
              {Object.entries(stats.averageHealthByQuality).map(([quality, data]) => (
                <div key={quality} className="quality-stat">
                  <span className="quality-name">{quality.toUpperCase()}</span>
                  <div className="quality-metrics">
                    <span className="metric seeders">🌱 {data.avgSeeders}</span>
                    <span className="metric leechers">📥 {data.avgLeechers}</span>
                    <span className="metric ratio">📊 {data.avgRatio}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="stat-card">
              <h4>Health Distribution</h4>
              <div className="health-bars">
                {Object.entries(stats.healthDistribution).map(([status, percentage]) => (
                  <div key={status} className="health-bar">
                    <span className="health-status">{status}</span>
                    <div className="bar-container">
                      <div 
                        className={`bar ${status}`}
                        style={{ width: percentage }}
                      ></div>
                    </div>
                    <span className="percentage">{percentage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="stats-footer">
            <div className="footer-info">
              <span className="cache-hit">Cache Hit Rate: {stats.cacheHitRate}</span>
              <span className="data-type">
                💡 Pre-download health data - analyzed before adding to qBittorrent
              </span>
            </div>
            <button onClick={fetchTorrentStats} className="refresh-btn" title="Refresh Stats">
              🔄 Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TorrentHealthOverview; 