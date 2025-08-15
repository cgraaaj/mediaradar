import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './PopcornPal.css';

const PopcornPal = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [examples, setExamples] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    fetchExamples();
    checkAiStatus();
  }, []);

  const fetchExamples = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const response = await axios.get(`${apiBaseUrl}/ai/examples`);
      if (response.data.success) {
        setExamples(response.data.examples);
      }
    } catch (error) {
      console.error('Failed to fetch examples:', error);
    }
  };

  const checkAiStatus = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const response = await axios.get(`${apiBaseUrl}/ai/status`);
      setAiStatus(response.data);
    } catch (error) {
      console.error('Failed to check AI status:', error);
      setAiStatus({ status: 'error', configured: false });
    }
  };

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a movie question or description');
      return;
    }

    setLoading(true);
    setSuggestions(null);

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const response = await axios.post(`${apiBaseUrl}/ai/suggestions`, {
        query: searchQuery.trim(),
        matchCount: 5,
        includeSources: false
      });

      if (response.data.success) {
        setSuggestions(response.data);
        toast.success('🎬 Got your movie suggestions!');
      } else {
        toast.error(response.data.message || 'Failed to get suggestions');
        setSuggestions({ success: false, message: response.data.message });
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to get AI suggestions';
      toast.error(`❌ ${errorMessage}`);
      setSuggestions({ success: false, message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example) => {
    setQuery(example);
    handleSearch(example);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (aiStatus && !aiStatus.configured) {
    return (
      <div className="popcorn-pal">
        <div className="ai-unavailable">
          <div className="ai-unavailable-icon">🍿</div>
          <h2>PopcornPal AI is Currently Unavailable</h2>
          <p>AI movie suggestions require additional configuration.</p>
          <div className="config-info">
            <p>Required: OpenAI API Key and Supabase credentials</p>
            <p>Status: {aiStatus.status}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="popcorn-pal">
      <div className="popcorn-header">
        <div className="popcorn-title">
          <span className="popcorn-icon">🍿</span>
          <h1>PopcornPal</h1>
          <span className="ai-badge">AI</span>
        </div>
        <p className="popcorn-subtitle">
          Your AI-powered movie companion. Ask me anything about movies!
        </p>
      </div>

      <div className="search-section">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about movies... (e.g., 'What are some good action movies?')"
            className="ai-search-input"
            disabled={loading}
          />
          <button
            onClick={() => handleSearch()}
            className="ai-search-btn"
            disabled={loading || !query.trim()}
          >
            {loading ? '🤔' : '🔍'}
          </button>
        </div>
      </div>

      {examples.length > 0 && !suggestions && (
        <div className="examples-section">
          <h3>Try asking me:</h3>
          <div className="examples-grid">
            {examples.slice(0, 6).map((example, index) => (
              <button
                key={index}
                className="example-btn"
                onClick={() => handleExampleClick(example)}
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-section">
          <div className="ai-loading">
            <div className="loading-spinner-ai"></div>
            <p>🤖 AI is thinking about your movie request...</p>
          </div>
        </div>
      )}

      {suggestions && (
        <div className="suggestions-section">
          <div className="suggestions-header">
            <h3>
              {suggestions.success ? '🎬 Movie Suggestions' : '❌ No Results'}
            </h3>
            {suggestions.success && suggestions.matchCount && (
              <span className="match-count">
                Found {suggestions.matchCount} relevant movies
              </span>
            )}
          </div>

          <div className="suggestions-content">
            {suggestions.success ? (
              <div className="ai-response">
                <div className="response-text">
                  {suggestions.message.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-results">
                <p>{suggestions.message}</p>
                <p>💡 Try rephrasing your question or being more specific.</p>
              </div>
            )}
          </div>

          <div className="suggestions-footer">
            <button
              className="new-search-btn"
              onClick={() => {
                setQuery('');
                setSuggestions(null);
              }}
            >
              🔄 Ask Another Question
            </button>
          </div>
        </div>
      )}

      {aiStatus && aiStatus.configured && (
        <div className="ai-status">
          <span className="status-indicator online">●</span>
          PopcornPal AI is ready to help!
        </div>
      )}
    </div>
  );
};

export default PopcornPal; 