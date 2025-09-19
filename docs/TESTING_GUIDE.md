# Aptos Move Deployer Backend - Testing Guide

## Quick Setup & Test

### 1. Prerequisites
- Node.js 18+ installed
- Aptos CLI installed globally
- Docker (optional, for containerized testing)

### 2. Environment Setup
```bash
# Set required environment variables
export API_TOKEN="8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0"
export DEPLOYER_PRIVATE_KEY="ed25519-priv-0xaa2745dce28e8a013cf82c163d4247e8cb41fbb5feacbf304e98a06f9d613d82"
export DEPLOYER_ADDRESS="0x30d3e6ccc894d4df2765383964d70ecedefd4c9c9839a29305202559206f6886"
```

### 3. Install & Start Backend
```bash
cd backend
npm install
npm start
```

### 4. Comprehensive Testing

#### A. Health Check
```bash
curl http://localhost:3001/api/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-19T15:41:36.987Z",
  "services": {
    "aptosCLI": "ok",
    "environment": "ok"
  }
}
```

#### B. Authentication Tests
```bash
# Test 1: No API key (should fail)
curl -X POST http://localhost:3001/api/deploy
# Expected: {"error":"Authentication required","message":"Please provide an API key in the x-api-key header"}

# Test 2: Wrong API key (should fail)
curl -X POST -H "x-api-key: wrong-key" http://localhost:3001/api/deploy
# Expected: {"error":"Invalid API key","message":"The provided API key is not valid"}

# Test 3: Correct API key (should pass auth, fail on missing file)
curl -X POST -H "x-api-key: 8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" http://localhost:3001/api/deploy
# Expected: {"error":"No file uploaded","message":"Upload .zip, .tar, or .tar.gz"}
```

#### C. File Upload Tests
Create a test Move package:
```bash
# Create test package structure
mkdir test_package
cd test_package
mkdir sources

# Create Move.toml
cat > Move.toml << EOF
[package]
name = "hello_world"
version = "1.0.0"

[addresses]
hello = "0x1"

[dependencies]
AptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-framework", rev = "main" }
EOF

# Create simple Move module
cat > sources/hello_world.move << EOF
module hello::hello_world {
    public fun hi() {}
}
EOF

# Create archives
tar -czf ../test_package.tar.gz .
zip -r ../test_package.zip .
cd ..
```

Test all archive formats:
```bash
# Test ZIP file
curl -X POST \
  -H "x-api-key: 8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" \
  -F "move_package=@test_package.zip" \
  -F "network=testnet" \
  http://localhost:3001/api/deploy

# Test TAR.GZ file
curl -X POST \
  -H "x-api-key: 8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" \
  -F "move_package=@test_package.tar.gz" \
  -F "network=testnet" \
  http://localhost:3001/api/deploy
```

#### D. Network Tests
Test all supported networks:
```bash
# Devnet
curl -X POST \
  -H "x-api-key: 8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" \
  -F "move_package=@test_package.tar.gz" \
  -F "network=devnet" \
  http://localhost:3001/api/deploy

# Testnet
curl -X POST \
  -H "x-api-key: 8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" \
  -F "move_package=@test_package.tar.gz" \
  -F "network=testnet" \
  http://localhost:3001/api/deploy

# Mainnet (use with caution)
curl -X POST \
  -H "x-api-key: 8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" \
  -F "move_package=@test_package.tar.gz" \
  -F "network=mainnet" \
  http://localhost:3001/api/deploy
```

#### E. Error Handling Tests
```bash
# Invalid network
curl -X POST \
  -H "x-api-key: 8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" \
  -F "move_package=@test_package.tar.gz" \
  -F "network=invalid" \
  http://localhost:3001/api/deploy

# Invalid file type
curl -X POST \
  -H "x-api-key: 8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" \
  -F "move_package=@somefile.txt" \
  -F "network=testnet" \
  http://localhost:3001/api/deploy
```

### 5. Docker Testing
```bash
# Build and run with Docker
docker build -t aptos-backend .
docker run -d -p 3001:3001 \
  -e API_TOKEN="8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0" \
  -e DEPLOYER_PRIVATE_KEY="ed25519-priv-0xaa2745dce28e8a013cf82c163d4247e8cb41fbb5feacbf304e98a06f9d613d82" \
  -e DEPLOYER_ADDRESS="0x30d3e6ccc894d4df2765383964d70ecedefd4c9c9839a29305202559206f6886" \
  --name aptos-backend-test aptos-backend

# Test health endpoint
curl http://localhost:3001/api/health
```

## Expected Results

### Successful Deployment Response
```json
{
  "status": "completed",
  "network": "testnet",
  "moduleAddress": "0x30d3e6ccc894d4df2765383964d70ecedefd4c9c9839a29305202559206f6886",
  "txHash": "0x1234567890abcdef...",
  "explorerUrl": "https://explorer.aptoslabs.com/txn/0x1234567890abcdef...?network=testnet"
}
```

### Error Response
```json
{
  "error": "Deployment failed",
  "message": "Specific error message here"
}
```

## Performance Benchmarks
- Health check: < 100ms
- File upload (1MB): < 2s
- Compilation: 10-30s (depends on dependencies)
- Deployment: 5-15s (depends on network)

## Troubleshooting

### Common Issues
1. **"Aptos CLI not found"**: Install Aptos CLI globally
2. **"Authentication required"**: Set API_TOKEN environment variable
3. **"Move.toml not found"**: Ensure package has proper structure
4. **"Compilation failed"**: Check Move code syntax and dependencies

### Logs
Check server logs for detailed error information:
```bash
# Local development
npm run dev

# Docker
docker logs aptos-backend-test
```
