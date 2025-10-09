# Aptos Contract Deployer

A production-ready Docker containerized backend service for compiling and deploying Aptos Move smart contracts to the testnet. This service provides a REST API and web interface for seamless contract deployment.

##  Features

- **Docker Containerized**: Fully containerized with Aptos CLI 4.2.5
- **REST API**: Simple HTTP API for contract deployment
- **Web Interface**: User-friendly web UI for contract deployment
- **Automatic Compilation**: Handles Move contract compilation with dependencies
- **Testnet Deployment**: Deploys to Aptos testnet with proper gas configuration
- **Transaction Tracking**: Returns explorer links for deployed contracts
- **Health Monitoring**: Built-in health checks and monitoring
- **Security**: Non-root user execution and proper file permissions

##  Prerequisites

- Docker and Docker Compose
- Aptos testnet account with APT tokens for gas fees

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo>
cd aptos_backend
```

### 2. Configure Aptos Account

Update `aptos-config.yaml` with your testnet account details:

```yaml
---
profiles:
  default:
    network: Testnet
    private_key: ed25519-priv-0xYOUR_PRIVATE_KEY
    public_key: ed25519-pub-0xYOUR_PUBLIC_KEY
    account: YOUR_ACCOUNT_ADDRESS
    rest_url: "https://fullnode.testnet.aptoslabs.com"
```

### 3. Deploy with Docker

```bash
# Build and start the service
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Service

- **Web Interface**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Endpoint**: http://localhost:3000/deploy

##  API Usage

### Deploy Contract

**POST** `/deploy`

```bash
curl -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "moveToml": "[package]\nname = \"MyContract\"\nversion = \"1.0.0\"\n\n[dependencies]\nAptosFramework = { git = \"https://github.com/aptos-labs/aptos-core.git\", subdir = \"aptos-move/framework/aptos-framework\", rev = \"aptos-node-v1.15.0\" }",
    "contractFile": "module MyContract::MyContract { public fun hello(): vector<u8> { b\"Hello, World!\" } }"
  }'
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "moduleAddress": "0x...",
  "transactionLink": "https://explorer.aptoslabs.com/txn/0x...?network=testnet",
  "output": "..."
}
```

### Health Check

**GET** `/health`

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "aptosVersion": "aptos 4.2.5"
}
```

## Move Contract Requirements

### Move.toml Format

```toml
[package]
name = "YourContract"
version = "1.0.0"

[dependencies]
AptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-framework", rev = "aptos-node-v1.15.0" }
AptosStdlib = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-stdlib", rev = "aptos-node-v1.15.0" }
MoveStdlib = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/move-stdlib", rev = "aptos-node-v1.15.0" }
```

### Contract Template

```move
module YourContract::YourContract {
    public fun hello(): vector<u8> {
        b"Hello, World!"
    }
}
```

**Important Notes:**
- Use `vector<u8>` instead of `String` for text
- Use `b"text"` for byte strings
- Module names are automatically replaced with your account address
- Compatible with Move 1.x syntax (CLI 4.2.5)

##  Docker Configuration

### Dockerfile Features

- **Base Image**: Node.js 18 on Debian 11 (Bullseye)
- **Aptos CLI**: Version 4.2.5 with proper dependencies
- **Security**: Non-root user execution
- **Health Checks**: Built-in service monitoring
- **Optimized**: Multi-stage build with minimal image size

### Environment Variables

```bash
NODE_ENV=production
APTOS_CONFIG_DIR=/home/appuser/.aptos
```

### Port Configuration

- **Application**: 3000 (configurable via `PORT` environment variable)
- **Health Check**: Built-in endpoint at `/health`

##  Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Testing

```bash
# Test deployment
curl -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "moveToml": "[package]\nname = \"TestContract\"\nversion = \"1.0.0\"\n\n[dependencies]\nAptosFramework = { git = \"https://github.com/aptos-labs/aptos-core.git\", subdir = \"aptos-move/framework/aptos-framework\", rev = \"aptos-node-v1.15.0\" }",
    "contractFile": "module TestContract::TestContract { public fun test(): vector<u8> { b\"Test\" } }"
  }'
```

##  Monitoring

### Health Check

The service includes comprehensive health monitoring:

```bash
# Check container health
docker-compose ps

# View health check logs
docker logs aptos_backend-aptos-deployer-1

# Manual health check
curl http://localhost:3000/health
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f aptos-deployer
```

##  Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   # Rebuild container with proper permissions
   docker-compose down
   docker-compose up --build -d
   ```

2. **Compilation Errors**
   - Ensure Move.toml uses correct framework version (`aptos-node-v1.15.0`)
   - Use Move 1.x syntax (not Move 2.0)
   - Check module naming conventions

3. **Deployment Failures**
   - Verify account has sufficient APT tokens
   - Check private key format in `aptos-config.yaml`
   - Ensure network connectivity to testnet

4. **Container Won't Start**
   ```bash
   # Check container logs
   docker logs aptos_backend-aptos-deployer-1
   
   # Verify Docker setup
   docker --version
   docker-compose --version
   ```

### Debug Mode

```bash
# Run container in debug mode
docker-compose down
docker-compose up --build
```

## Security

- **Non-root Execution**: Container runs as `appuser`
- **File Permissions**: Proper ownership and permissions
- **Network Security**: Only necessary ports exposed
- **Private Key Handling**: Secure configuration management

## Performance

- **Optimized Build**: Minimal Docker image size
- **Efficient Compilation**: Cached dependencies
- **Resource Management**: Proper cleanup of temporary files
- **Health Monitoring**: Built-in performance tracking



**Ready to deploy Aptos contracts? Start with `docker-compose up --build -d` and visit http://localhost:3000!** 
