import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RedisDataAnalyzer = () => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeRedisData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const response = await axios.get(`${apiBaseUrl}/analyze-redis-structure`);
      
      setAnalysis(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error analyzing Redis data:', err);
      setError(err.response?.data?.error || 'Failed to analyze Redis data');
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeRedisData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>🔍 Analyzing Redis data structure...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#ff4444' }}>
        <div>❌ Error: {error}</div>
        <button onClick={analyzeRedisData} style={{ marginTop: '10px', padding: '5px 10px' }}>
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#1a1a1a', 
      color: '#fff', 
      borderRadius: '8px',
      margin: '20px 0',
      fontFamily: 'monospace'
    }}>
      <h3 style={{ color: '#4a9eff', marginBottom: '15px' }}>
        🚀 Redis Data Structure Analysis
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
        <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px' }}>
          <h4 style={{ color: '#00ff88', margin: '0 0 10px 0' }}>📊 Data Overview</h4>
          <div>Structure: <span style={{ color: '#4a9eff' }}>{analysis.analysis.structure}</span></div>
          <div>Total Movies: <span style={{ color: '#4a9eff' }}>{analysis.analysis.movieCount}</span></div>
          <div>With Downloads: <span style={{ color: '#00ff88' }}>{analysis.analysis.moviesWithDownloads}</span></div>
          <div>Cache Size: <span style={{ color: '#ffa500' }}>{(analysis.analysis.totalSize / 1024 / 1024).toFixed(2)} MB</span></div>
        </div>

        <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px' }}>
          <h4 style={{ color: '#00ff88', margin: '0 0 10px 0' }}>🎥 Quality Distribution</h4>
          {Object.entries(analysis.analysis.qualityDistribution).map(([quality, count]) => (
            <div key={quality}>
              {quality}: <span style={{ color: '#4a9eff' }}>{count} movies</span>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px' }}>
          <h4 style={{ color: '#00ff88', margin: '0 0 10px 0' }}>📁 File Formats</h4>
          {Object.entries(analysis.analysis.fileFormatSupport).slice(0, 5).map(([format, count]) => (
            <div key={format}>
              .{format}: <span style={{ color: '#4a9eff' }}>{count} files</span>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px' }}>
          <h4 style={{ color: '#00ff88', margin: '0 0 10px 0' }}>🔧 Detected Fields</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {analysis.analysis.detectedFields.map(field => (
              <span key={field} style={{ 
                backgroundColor: field === 'language' ? '#90cea1' : field === 'year' ? '#4a9eff' : '#666', 
                color: field === 'language' || field === 'year' ? '#000' : '#fff', 
                padding: '2px 6px', 
                borderRadius: '3px', 
                fontSize: '12px',
                fontWeight: field === 'language' || field === 'year' ? '600' : '400'
              }}>
                {field === 'language' ? '🗣️ ' : field === 'year' ? '📅 ' : ''}{field}
              </span>
            ))}
          </div>
          {(analysis.analysis.detectedFields.includes('language') || analysis.analysis.detectedFields.includes('year')) && (
            <div style={{ fontSize: '10px', color: '#00ff88' }}>
              ✨ Enhanced metadata detected! Better TMDB matching and language filtering available.
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px' }}>
        <h4 style={{ color: '#00ff88', margin: '0 0 10px 0' }}>💡 Recommendations</h4>
        {analysis.recommendations.map((rec, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            {rec}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '15px', backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px' }}>
        <h4 style={{ color: '#00ff88', margin: '0 0 10px 0' }}>⚡ Optimizations Applied</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {Object.entries(analysis.optimizations).map(([feature, enabled]) => (
            <div key={feature} style={{ 
              color: enabled ? '#00ff88' : '#ff4444',
              backgroundColor: enabled ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)',
              padding: '8px',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              {enabled ? '✅' : '❌'} {feature.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <button 
          onClick={analyzeRedisData}
          style={{
            backgroundColor: '#4a9eff',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Refresh Analysis
        </button>
      </div>

      <div style={{ 
        marginTop: '15px', 
        fontSize: '12px', 
        color: '#888',
        textAlign: 'center'
      }}>
        Last analyzed: {new Date(analysis.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default RedisDataAnalyzer; 