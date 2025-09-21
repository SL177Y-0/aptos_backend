# Use the Debian 11 (Bullseye) slim image which has libssl1.1 required by the Aptos CLI
FROM node:18-bullseye-slim

# Install system dependencies, including git and the required libssl1.1
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    unzip \
    ca-certificates \
    libssl1.1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install a stable version of the Aptos CLI.
RUN APTOS_CLI_VERSION="2.4.0" && \
    wget -O aptos-cli.zip "https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v${APTOS_CLI_VERSION}/aptos-cli-${APTOS_CLI_VERSION}-Ubuntu-x86_64.zip" && \
    unzip aptos-cli.zip && \
    mv aptos /usr/local/bin/ && \
    rm aptos-cli.zip

# Pre-fetch the Aptos framework dependencies during the build to avoid timeouts at runtime.
# We download a source code archive which is much faster than cloning the git repo.
RUN APTOS_CLI_VERSION="2.4.0" && \
    wget -O aptos-framework.tar.gz "https://github.com/aptos-labs/aptos-core/archive/refs/tags/aptos-cli-v${APTOS_CLI_VERSION}.tar.gz" && \
    mkdir -p /tmp/aptos-framework && \
    tar -xzf aptos-framework.tar.gz -C /tmp/aptos-framework --strip-components=1 && \
    rm aptos-framework.tar.gz
ENV APTOS_FRAMEWORK_PATH=/tmp/aptos-framework/aptos-move/framework

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /home/appuser

# Set environment variables for Aptos credentials.
# These will be passed in during the build process on Render.
ARG APTOS_PRIVATE_KEY
ARG APTOS_ADDRESS
ENV APTOS_PRIVATE_KEY=$APTOS_PRIVATE_KEY
ENV APTOS_ADDRESS=$APTOS_ADDRESS

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
