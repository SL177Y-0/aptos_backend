# Use Node.js 18 Slim for compatibility with the Aptos CLI binary
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Aptos CLI
# We download the binary directly to avoid GitHub API rate limiting issues with the install script.
RUN APLTOS_CLI_VERSION="2.4.0" && \
    wget -O aptos-cli.zip "https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v${APLTOS_CLI_VERSION}/aptos-cli-${APLTOS_CLI_VERSION}-Ubuntu-x86_64.zip" && \
    unzip aptos-cli.zip && \
    mv aptos /usr/local/bin/ && \
    rm aptos-cli.zip

# The aptos binary is now in /usr/local/bin, which is in the PATH by default.

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Using npm install instead of ci because there is no package-lock.json
RUN npm install --only=production

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
