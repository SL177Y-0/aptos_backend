# Use the Debian 11 (Bullseye) slim image which has libssl1.1 required by the Aptos CLI
FROM node:18-bullseye-slim

# Install system dependencies, including the required libssl1.1
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    unzip \
    ca-certificates \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# Install the latest Aptos CLI by downloading the binary directly
# This is more reliable than the install script and avoids API rate-limiting.
RUN LATEST_APTOS_CLI_URL=$(curl -s "https://api.github.com/repos/aptos-labs/aptos-core/releases/latest" | grep "browser_download_url.*Ubuntu-x86_64.zip" | cut -d '"' -f 4) && \
    wget -O aptos-cli.zip "$LATEST_APTOS_CLI_URL" && \
    unzip aptos-cli.zip && \
    mv aptos /usr/local/bin/ && \
    rm aptos-cli.zip

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /home/appuser
USER appuser

# Copy application source and install dependencies
COPY --chown=appuser:appuser package*.json ./
RUN npm install --only=production

COPY --chown=appuser:appuser . .

# Expose the application port
EXPOSE 3000

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
