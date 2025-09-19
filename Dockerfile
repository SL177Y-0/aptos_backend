# Use Node.js LTS as base image
FROM node:18-slim

# Install system dependencies and Aptos CLI
ARG APTOS_CLI_VERSION=3.0.0
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Aptos CLI
RUN curl -fsSL "https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v${APTOS_CLI_VERSION}/aptos-cli-${APTOS_CLI_VERSION}-Ubuntu-22.04-x86_64.zip" -o aptos-cli.zip \
    && unzip aptos-cli.zip \
    && chmod +x aptos \
    && mv aptos /usr/local/bin/ \
    && rm aptos-cli.zip

# Create app directory and non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY src ./src

# Create directories and set permissions
RUN mkdir -p uploads jobs data logs \
    && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "start"]