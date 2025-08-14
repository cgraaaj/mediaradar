# syntax=docker/dockerfile:1.6
# Multi-stage build for React application
# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S reactapp && \
    adduser -S reactapp -u 1001

# Prepare writable dirs for non-root Nginx
RUN mkdir -p /tmp/nginx /tmp/nginx/client_temp /tmp/nginx/proxy_temp \
    /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp /var/log/nginx && \
    chown -R reactapp:reactapp /tmp/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx

# Copy built application from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx configuration (uses pid /tmp/nginx.pid)
COPY nginx.conf /etc/nginx/nginx.conf

# Switch to non-root user
USER reactapp

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:3000/ >/dev/null || exit 1

# Start nginx with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"] 