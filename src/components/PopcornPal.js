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
  const [watchLinks, setWatchLinks] = useState({});

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
    setWatchLinks({});

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
        
        // Extract movie names from suggestions and get watch links
        extractAndFindWatchLinks(response.data.message);
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

  // Extract movie names from AI response and get watch links
  const extractAndFindWatchLinks = async (aiResponse) => {
    try {
      console.log('🔍 Extracting movie names from:', aiResponse);
      
      const matches = [];
      
      // Priority 1: Extract movies marked with asterisks **Movie Name**
      const asteriskPattern = /\*\*([^*]+)\*\*/g;
      let asteriskMatch;
      while ((asteriskMatch = asteriskPattern.exec(aiResponse)) !== null) {
        const movieName = asteriskMatch[1].trim();
        if (movieName && movieName.length > 2 && movieName.length < 100) {
            // Clean up the movie name
          const cleanName = movieName
              .replace(/^(the|a|an)\s+/i, '') // Remove articles at the beginning
              .replace(/\s+(movie|film)$/i, '') // Remove "movie" or "film" at the end
              .trim();
            
            if (cleanName.length > 2) {
              matches.push(cleanName);
            console.log('✅ Found asterisk movie:', cleanName);
          }
        }
      }
      
      // Priority 2: Only if no asterisk movies found, try quoted patterns
      if (matches.length === 0) {
        console.log('⚠️ No asterisk movies found, trying quoted patterns...');
        
        const quotedPatterns = [
          /"([^"]+)"/g,        // "Movie Name"
          /'([^']+)'/g,        // 'Movie Name'
        ];
        
        quotedPatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(aiResponse)) !== null) {
            const movieName = match[1].trim();
            // Only include if it looks like a movie title (contains letters, reasonable length)
            if (movieName && 
                movieName.length > 2 && 
                movieName.length < 100 &&
                /^[A-Z]/.test(movieName) && // Starts with capital letter
                !/^(the|a|an|in|on|at|to|for|with|by|from)$/i.test(movieName) && // Not just articles/prepositions
                !movieName.includes('http') && // Not URLs
                !movieName.includes('@')) { // Not emails
              
              const cleanName = movieName
                .replace(/^(the|a|an)\s+/i, '')
                .replace(/\s+(movie|film)$/i, '')
                .trim();
              
              if (cleanName.length > 2) {
                matches.push(cleanName);
                console.log('📝 Found quoted movie:', cleanName);
              }
            }
          }
        });
      }
      
      // Priority 3: Only if still no movies found, try pattern matching
      if (matches.length === 0) {
        console.log('⚠️ No quoted movies found, trying pattern matching...');
        
        // Look for movie titles with years: Movie Name (2023) or Movie Name from 2023
        const yearPatterns = [
          /([A-Z][a-zA-Z\s:&'-]{2,40}?)\s+\(\d{4}\)/g,  // Movie Name (2023)
          /([A-Z][a-zA-Z\s:&'-]{2,40}?)\s+from\s+\d{4}/g,  // Movie Name from 2023
        ];
        
        yearPatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(aiResponse)) !== null) {
            const movieName = match[1].trim();
            if (movieName && movieName.length > 2 && movieName.length < 100) {
              const cleanName = movieName
                .replace(/^(the|a|an)\s+/i, '')
                .replace(/\s+(movie|film)$/i, '')
                .trim();
              
              if (cleanName.length > 2) {
                matches.push(cleanName);
                console.log('📅 Found year-pattern movie:', cleanName);
            }
            }
        }
        });
      }
      
      // Remove duplicates and get unique movie names
      const uniqueMovies = [...new Set(matches)].slice(0, 5); // Limit to 5 movies
      
      console.log('📝 Extracted movie names:', uniqueMovies);
      
      // Get watch links for each movie
      console.log('🎬 Searching for watch links for movies:', uniqueMovies);
      
      const watchLinkPromises = uniqueMovies.map(async (movieName) => {
        try {
          console.log(`🔍 Searching Jellyfin for: "${movieName}"`);
          const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
          const response = await axios.post(`${apiBaseUrl}/ai/watch`, {
            movieName: movieName
          });
          
          console.log(`📡 Response for "${movieName}":`, response.data);
          
          return {
            movieName,
            ...response.data
          };
        } catch (error) {
          console.error(`❌ Failed to get watch link for ${movieName}:`, error);
          return {
            movieName,
            success: false,
            available: false
          };
        }
      });
      
      const watchResults = await Promise.all(watchLinkPromises);
      
      // Store watch links
      const newWatchLinks = {};
      watchResults.forEach(result => {
        if (result.success && result.available) {
          newWatchLinks[result.movieName] = result;
        }
      });
      
      setWatchLinks(newWatchLinks);
      
      console.log('💾 Final watch links stored:', newWatchLinks);
      
      if (Object.keys(newWatchLinks).length > 0) {
        toast.info(`🎥 Found ${Object.keys(newWatchLinks).length} movies available to watch!`, {
          autoClose: 4000
        });
      } else {
        console.log('⚠️ No watch links found for any movies');
        if (uniqueMovies.length > 0) {
          toast.info(`🔍 Searched for ${uniqueMovies.length} movies but none are available in Jellyfin`, {
            autoClose: 4000
          });
        }
      }
      
    } catch (error) {
      console.error('Error extracting watch links:', error);
    }
  };

    // Handle watch movie click with environment-based authentication
  const handleWatchMovie = async (movieData) => {
    try {
      const { server, movieId } = movieData.watchData;
      const movieName = movieData.movie.name;
      const isDev = process.env.REACT_APP_ENV === 'development' || process.env.NODE_ENV === 'development';
      
      console.log(`🎬 Opening "${movieName}" in Jellyfin (${isDev ? 'dev' : 'prod'} mode)...`);
      
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
            `userId=${encodeURIComponent(authData.User.Id)}&` +
            `movieId=${encodeURIComponent(movieId)}`;
          
          jellyfinWindow.location.href = tokenLoginUrl;
          
          toast.success(`🎥 Opening "${movieName}" in Jellyfin (Dev Mode)!`, {
            autoClose: 3000
          });
          
        } catch (error) {
          console.error('❌ Dev mode auth failed:', error);
          // Fallback to manual login
          jellyfinWindow.location.href = `${server}/web/index.html#!/login.html`;
          toast.warning(`⚠️ Dev auth failed. Please login manually.`, {
            autoClose: 5000
          });
        }
      } else {
        // Production mode: Direct to login page with movie context
        console.log('🔒 Prod mode: Redirecting to secure login');
        jellyfinWindow.location.href = `${server}/web/index.html#!/details?id=${movieId}`;
        
        toast.info(`🔐 Opening "${movieName}" (Secure Login Required)`, {
          autoClose: 4000
        });
      }
     
    } catch (error) {
      console.error('Error opening watch link:', error);
      toast.error('❌ Failed to open movie player');
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
                  
                  {Object.keys(watchLinks).length > 0 && (
                    <div className="watch-links-section">
                      <h4>🎥 Available to Watch:</h4>
                      <div className="watch-links-grid">
                        {Object.entries(watchLinks).map(([movieName, movieData]) => (
                          <div key={movieName} className="watch-link-item">
                            <div className="movie-info">
                              <h5>{movieData.movie.name}</h5>
                              {movieData.movie.year && (
                                <span className="movie-year">({movieData.movie.year})</span>
                              )}
                              {movieData.movie.rating && (
                                <span className="movie-rating">⭐ {parseFloat(movieData.movie.rating).toFixed(1)}</span>
                              )}
                            </div>
                            <button
                              className="watch-btn"
                              onClick={() => handleWatchMovie(movieData)}
                              title={`Watch ${movieData.movie.name}`}
                            >
                              ▶️ Watch Now
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                setWatchLinks({});
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