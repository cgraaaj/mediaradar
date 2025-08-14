# Movie Downloader App

A React-based movie downloader application that fetches movie data from Redis cache and displays them in a beautiful grid layout.

## Features

- 🎬 Movie grid with poster images, titles, and metadata
- 🔍 Dark theme UI similar to modern streaming platforms
- 📱 Responsive design for all screen sizes
- ⚡ Redis caching for fast movie data retrieval
- 🔄 Automatic fallback to mock data if Redis is unavailable
- 🎨 Hover effects and smooth animations
- ⬇️ Download buttons for each movie

## Project Structure

```
jsx/
├── src/
│   ├── components/
│   │   ├── Header.js          # Navigation header component
│   │   ├── Header.css
│   │   ├── MovieGrid.js       # Grid layout for movies
│   │   ├── MovieGrid.css
│   │   ├── MovieCard.js       # Individual movie card
│   │   └── MovieCard.css
│   ├── App.js                 # Main application component
│   ├── App.css               # Global styles
│   └── index.js              # React entry point
├── backend/
│   ├── server.js             # Express API server
│   └── package.json          # Backend dependencies
└── package.json              # Frontend dependencies
```

## Prerequisites

- Node.js (v14 or higher)
- Redis server running on localhost:6379 (optional - app works without Redis)

## Installation & Setup

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Start Redis (Optional)

If you have Redis installed, start it:

```bash
redis-server
```

If you don't have Redis, the app will work with fallback mock data.

## Running the Application

### Start Backend API (Terminal 1)

```bash
cd backend
npm start
```

The backend API will run on `http://localhost:5000`

### Start Frontend React App (Terminal 2)

```bash
npm start
```

The React app will run on `http://localhost:3000`

## API Endpoints

- `GET /api/movies` - Fetch movies from Redis cache with key `onetamilmv_movies_cache`
- `GET /api/health` - Health check endpoint
- `POST /api/seed-redis` - Add sample movie data to Redis cache

## Using with Your Redis Data

To use your existing Redis data:

1. Make sure your Redis server is running
2. Ensure you have data stored with the key `onetamilmv_movies_cache`
3. The data should be a JSON array of movie objects with this structure:

```json
[
  {
    "id": 1,
    "title": "Movie Title",
    "year": 2023,
    "poster": "https://example.com/poster.jpg",
    "genre": "Action, Drama",
    "downloadUrl": "https://example.com/download/movie"
  }
]
```

## Seeding Sample Data

To add sample data to your Redis cache:

```bash
curl -X POST http://localhost:5000/api/seed-redis
```

## Customization

- **Colors**: Edit the CSS files to change the color scheme
- **Layout**: Modify the grid layout in `MovieGrid.css`
- **Movie Data**: Update the API endpoint in `App.js` to point to your data source
- **Redis Key**: Change the Redis key in `backend/server.js` if needed

## Technologies Used

- **Frontend**: React, Axios, CSS3
- **Backend**: Node.js, Express.js
- **Database**: Redis
- **Styling**: Custom CSS with responsive grid layout

## License

This project is open source and available under the [MIT License](LICENSE).
