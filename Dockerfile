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
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S reactapp && \
    adduser -S reactapp -u 1001

# Copy built application from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories and set permissions
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp /var/log/nginx /var/run && \
    chown -R reactapp:reactapp /var/cache/nginx /var/log/nginx \
    /var/run /usr/share/nginx/html /etc/nginx

# Switch to non-root user
USER reactapp

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"] 