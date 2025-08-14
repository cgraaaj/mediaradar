# Docker Setup for Media Radar Frontend

This document explains how to build and run the Media Radar frontend using Docker with proper environment variable protection.

## Files Overview

- `Dockerfile` - Multi-stage build for production-ready React app
- `.dockerignore` - Excludes sensitive files (including .env) from Docker build context
- `nginx.conf` - Secure nginx configuration for serving the React app
- `env.template` - Template showing required environment variables
- `docker-compose.yml` - Development setup
- `docker-compose.prod.yml` - Production setup with additional security

## Environment Variable Protection

### 🔒 Security Features

1. **`.env` files are excluded** from Docker images via `.dockerignore`
2. **Environment variables are passed at runtime**, not baked into the image
3. **Non-root user** runs the application
4. **Read-only filesystem** in production (nginx temp dirs on tmpfs)
5. **Security headers** configured in nginx

### 🔧 Setup Instructions

1. **Create your environment file:**
   ```bash
   cp env.template .env
   ```

2. **Edit `.env` with your actual values:**
   ```bash
   nano .env
   ```
   Update the `REACT_APP_API_BASE_URL` to point to your backend server.

3. **Build the Docker image:**
   ```bash
   # Development build
   docker build -t media-radar-frontend .
   
   # Production build
   docker build -t media-radar-frontend:prod --target production .
   ```

4. **Run with docker-compose:**
   ```bash
   # Development
   docker-compose up -d
   
   # Production
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Environment Variables

### Required Variables

- `REACT_APP_API_BASE_URL` - Backend API endpoint (e.g., `http://localhost:5000`)

### Optional Variables

- `REACT_APP_ENV` - Environment name (development, staging, production)
- `REACT_APP_NAME` - Application display name
- `REACT_APP_VERSION` - Application version
- `REACT_APP_ENABLE_ANALYTICS` - Enable/disable analytics
- `REACT_APP_GA_TRACKING_ID` - Google Analytics tracking ID
- `REACT_APP_SENTRY_DSN` - Sentry error tracking DSN

## Manual Docker Commands

### Build and Run

```bash
# Build the image
docker build -t media-radar-frontend .

# Run with environment variables
docker run -d \
  --name media-radar-frontend \
  -p 3000:3000 \
  -e REACT_APP_API_BASE_URL=http://your-backend:5000 \
  -e REACT_APP_ENV=production \
  media-radar-frontend
```

### Using .env file

```bash
# Run with .env file
docker run -d \
  --name media-radar-frontend \
  -p 3000:3000 \
  --env-file .env \
  media-radar-frontend
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different `.env` files** for different environments
3. **Rotate sensitive values** regularly
4. **Use secrets management** in production (Docker Swarm secrets, Kubernetes secrets, etc.)
5. **Monitor logs** for any accidentally exposed secrets

## Production Deployment

For production, use `docker-compose.prod.yml` which includes:

- Read-only root filesystem
- Proper logging configuration
- Enhanced security settings
- Health checks
- Automatic restart policies

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f frontend

# Health check
curl http://localhost/health
```

## Troubleshooting

### Common Issues

1. **403 Forbidden errors**: Check nginx permissions and user configuration
2. **API connection issues**: Verify `REACT_APP_API_BASE_URL` is correct
3. **Build failures**: Ensure all dependencies are available and `.dockerignore` isn't excluding required files

### Debug Commands

```bash
# Check running containers
docker ps

# View container logs
docker logs media-radar-frontend

# Execute commands in container
docker exec -it media-radar-frontend sh

# Check environment variables
docker exec media-radar-frontend env | grep REACT_APP
```

## Health Checks

The container includes health checks on:
- HTTP endpoint: `http://localhost:3000/health`
- Nginx status
- Container responsiveness

Check health status:
```bash
docker inspect --format='{{.State.Health.Status}}' media-radar-frontend
``` 