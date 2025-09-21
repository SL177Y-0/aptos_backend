# Use the Debian 11 (Bullseye) slim image which has libssl1.1 required by the Aptos CLI
FROM node:18-bullseye-slim

# Install system dependencies, including the required libssl1.1
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    unzip \
    ca-certificates \
    libssl1.1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install the latest stable version of the Aptos CLI
RUN APTOS_CLI_VERSION="4.2.5" && \
    wget -O aptos-cli.zip "https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v${APTOS_CLI_VERSION}/aptos-cli-${APTOS_CLI_VERSION}-Ubuntu-x86_64.zip" && \
    unzip aptos-cli.zip && \
    mv aptos /usr/local/bin/ && \
    rm aptos-cli.zip

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /home/appuser

# Copy application source and install dependencies first
COPY --chown=appuser:appuser package*.json ./
RUN npm install --only=production

COPY --chown=appuser:appuser . .

# Switch to appuser BEFORE setting up Aptos
USER appuser

# Create .aptos directory and copy the working config
RUN mkdir -p /home/appuser/.aptos

# Create the working Aptos config file
RUN echo '---' > /home/appuser/.aptos/config.yaml && \
    echo 'profiles:' >> /home/appuser/.aptos/config.yaml && \
    echo '  default:' >> /home/appuser/.aptos/config.yaml && \
    echo '    network: Testnet' >> /home/appuser/.aptos/config.yaml && \
    echo '    private_key: ed25519-priv-0xaa2745dce28e8a013cf82c163d4247e8cb41fbb5feacbf304e98a06f9d613d82' >> /home/appuser/.aptos/config.yaml && \
    echo '    public_key: ed25519-pub-0xdd1d4e467c06b4ec1ab33160d82c4db95d904cd729ad10e2c1444c031ad44fc8' >> /home/appuser/.aptos/config.yaml && \
    echo '    account: 30d3e6ccc894d4df2765383964d70ecedefd4c9c9839a29305202559206f6886' >> /home/appuser/.aptos/config.yaml && \
    echo '    rest_url: "https://fullnode.testnet.aptoslabs.com"' >> /home/appuser/.aptos/config.yaml

# Expose the application port
EXPOSE 3000

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]