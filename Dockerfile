# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install system dependencies needed for Aptos CLI
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    git \
    bash

# Install Aptos CLI
RUN curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Add Aptos CLI to PATH
ENV PATH="/root/.local/bin:${PATH}"

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY index.js index.html ./

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]