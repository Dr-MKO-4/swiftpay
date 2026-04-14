# Frontend Dockerfile - React Native / Expo

FROM node:20-alpine AS builder

WORKDIR /app

# Install Expo CLI globally
RUN npm install -g @expo/cli eas-cli

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production (optional - for web version)
# RUN expo export --platform web

# Final stage - for running Expo development server or web build
FROM node:20-alpine

WORKDIR /app

# Install Expo CLI
RUN npm install -g @expo/cli eas-cli

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app . .

# Switch to non-root user
USER nodejs

# Expose ports (Expo development server + Metro bundler)
EXPOSE 8081 19000 19001

# Start Expo development server
CMD ["expo", "start", "--tunnel", "--clear"]
