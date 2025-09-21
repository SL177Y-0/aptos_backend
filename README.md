# Aptos Contract Deployer

A robust web application for compiling and deploying Aptos Move smart contracts with **universal compatibility** for any Move version and environment.

##  Features

### Universal Compatibility
-  **Auto-detects and fixes** legacy Move 1.x configurations
-  **Supports modern Move 2.x** with enum, match, and advanced features
-  **Handles any TOML format** - automatically adds missing configuration
-  **Cross-platform** - works on Windows, Mac, Linux
-  **Environment agnostic** - adapts to different Aptos CLI versions

### Smart Contract Features
-  **Automatic configuration fixing** - adds missing edition and compiler-version
-  **Enhanced error handling** - detailed error messages and validation
-  **Legacy support** - converts old Move.toml to modern format
-  **Input validation** - prevents common mistakes and security issues
-  **Auto-cleanup** - temporary files automatically removed

### Deployment Options
-  **Web Interface** - Upload files or paste code directly
-  **REST API** - Programmatic access for automation
-  **Docker Support** - Containerized deployment
-  **Cloud Ready** - GitHub Actions, Vercel, Railway support
-  **CI/CD Pipeline** - Automated testing and deployment

##  Quick Start

### Option 1: Local Development
`ash
# Clone the repository
git clone https://github.com/SL177Y-0/aptos_backend.git
cd aptos_backend

# Install dependencies
npm install

# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
aptos init

# Start the server
npm start
`

### Option 2: Docker
`ash
# Build and run with Docker
docker-compose up aptos-dev

# Or build manually
docker build -f Dockerfile.move -t aptos-deployer .
docker run -p 3000:3000 aptos-deployer
`

### Option 3: Cloud Deployment
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SL177Y-0/aptos_backend)

##  Universal Compatibility

This deployer automatically handles:

### Move 1.x Contracts
`move
// Legacy contracts work automatically
module 0x123::MyContract {
    use std::signer;
    
    struct Data has key {
        value: u64,
    }
    
    public fun init(account: &signer) {
        move_to(account, Data { value: 0 });
    }
}
`

### Move 2.x Contracts
`move
// Modern contracts with advanced features
module 0x123::MyContract {
    use std::signer;
    use std::error;
    
    enum Status has drop {
        Active,
        Inactive,
    }
    
    struct Data has key {
        value: u64,
        status: Status,
    }
    
    public entry fun init(account: &signer) {
        move_to(account, Data { 
            value: 0,
            status: Status::Active,
        });
    }
}
`

### Automatic TOML Fixing
The deployer automatically converts legacy Move.toml:

**Before (Legacy):**
`	oml
[package]
name = "MyContract"
version = "1.0.0"

[addresses]
my_addr = "0x123"
`

**After (Auto-fixed):**
`	oml
[package]
name = "MyContract"
version = "1.0.0"
edition = "2024.beta"
compiler-version = "2.1.0"

[addresses]
my_addr = "0x123"

[dependencies]
AptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-framework", rev = "main" }
`

##  API Usage

### Deploy Contract
`ash
curl -X POST https://your-deployment-url.com/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "moveToml": "[package]\nname = \"MyContract\"\nversion = \"1.0.0\"",
    "contractFile": "module 0x123::MyContract {\n    // Your Move code\n}"
  }'
`

### Health Check
`ash
curl https://your-deployment-url.com/health
`

##  Docker Deployment

### Docker Compose
`yaml
version: '3.8'
services:
  aptos-deployer:
    build:
      context: .
      dockerfile: Dockerfile.move
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
`

### Manual Docker
`ash
# Build
docker build -f Dockerfile.move -t aptos-deployer .

# Run
docker run -p 3000:3000 aptos-deployer
`

##  Cloud Deployment

### Vercel (Recommended)
1. Fork this repository
2. Connect to [Vercel](https://vercel.com)
3. Deploy automatically

### Railway
1. Connect your GitHub repository
2. Railway will auto-detect Node.js
3. Deploy with one click

### GitHub Actions
The repository includes a complete CI/CD pipeline:
-  Automatic testing on every push
-  Move compilation validation
-  Node.js server testing
-  Ready for cloud deployment

##  Development

### Project Structure
`
aptos_backend/
 sources/
    contract.move          # Example Move contract
 .github/workflows/
    deploy.yml            # CI/CD pipeline
    aptos.yml             # Aptos-specific tests
 index.js                  # Enhanced Node.js backend
 index.html                # Web interface
 move.toml                 # Move configuration
 Dockerfile.move           # Docker setup
 docker-compose.yml        # Docker orchestration
 vercel.json              # Vercel deployment config
 README.md                # This file
`

### Key Features
- **Universal Compatibility**: Handles any Move version automatically
- **Smart Error Handling**: Detailed error messages and automatic fixes
- **Security**: Input validation, file size limits, timeout protection
- **Scalability**: Docker support, cloud deployment ready
- **Developer Experience**: Comprehensive logging and debugging

##  Troubleshooting

### Common Issues

**"Aptos CLI not found"**
`ash
# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
aptos init
`

**"Compilation failed"**
- The deployer automatically fixes most common issues
- Check that your Move contract syntax is correct
- Ensure proper module structure

**"Deployment timeout"**
- Large contracts may take longer to compile
- The deployer has built-in timeout protection
- Try breaking large contracts into smaller modules

### Environment Issues
The deployer automatically handles:
-  Different Aptos CLI versions
-  Missing Move.toml configuration
-  Legacy vs modern Move syntax
-  Cross-platform compatibility

##  Monitoring

### Health Check
`ash
curl https://your-deployment-url.com/health
`

Response:
`json
{
  "status": "ok",
  "timestamp": "2025-01-21T14:20:00.000Z",
  "aptosVersion": "aptos 7.8.1"
}
`

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with different Move versions
5. Submit a pull request

##  License

This project is open source and available under the [MIT License](LICENSE).

##  Links

- **Repository**: https://github.com/SL177Y-0/aptos_backend
- **Aptos CLI**: https://aptos.dev/build/cli
- **Move Language**: https://aptos.dev/build/move
- **Aptos Framework**: https://github.com/aptos-labs/aptos-core

---
