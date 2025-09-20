# Aptos Contract Deployer

A simple web application for compiling and deploying Aptos Move smart contracts. Upload your Move files or paste code directly through an intuitive web interface.

## Features

- **File Upload Support**: Upload Move.toml and contract files directly from your local machine
- **Multiple Contract Files**: Upload and combine multiple `.move` files in a single deployment
- **Manual Input**: Still supports pasting code directly for quick testing
- **Web Interface**: Clean, user-friendly interface for contract deployment
- **REST API**: Programmatic access for automation and integration
- **Docker Support**: Easy deployment with containerization
- **Auto Cleanup**: Temporary files are automatically removed after deployment

## Prerequisites

- Node.js 18+
- Aptos CLI installed and configured
- An Aptos account with `aptos init` completed

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Aptos CLI:**
```bash
# Install Aptos CLI (see https://aptos.dev/build/cli)
aptos init
```

3. **Start the server:**
```bash
npm start
```

4. **Open your browser:**
Navigate to `http://localhost:3000`

## Usage

### Web Interface

The web interface provides two ways to input your contract:

#### Option 1: File Upload (Recommended)
1. **Move.toml**: Click "Choose File" and select your `Move.toml` file
2. **Contract Files**: Select one or more `.move` files (supports multiple selection)
3. **Deploy**: Click the "Deploy" button

#### Option 2: Manual Input
1. **Move.toml**: Paste your Move.toml configuration in the textarea
2. **Contract Code**: Paste your Move contract code in the textarea
3. **Deploy**: Click the "Deploy" button

### API Usage

Send a POST request to `/deploy`:

```bash
curl -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "moveToml": "[package]\nname = \"MyContract\"\nversion = \"1.0.0\"\n[dependencies]\nAptosFramework = { git = \"https://github.com/aptos-labs/aptos-core.git\", subdir = \"aptos-move/framework/aptos-framework\", rev = \"main\" }",
    "contractFile": "module {{ADDR}}::my_contract {\n    // Your Move code here\n}"
  }'
```

**Response:**
```json
{
  "txHash": "0x...",
  "moduleAddress": "0x..."
}
```

## Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t aptos-deployer .

# Run the container
docker run -p 3000:3000 aptos-deployer
```

## Project Structure

```
backend/
├── index.js          # Express server with deployment logic
├── index.html        # Web interface with file upload
├── package.json      # Dependencies and scripts
├── Dockerfile        # Container configuration
└── README.md         # This documentation
```

## How It Works

1. **File Processing**: Uploaded files are read and combined into the appropriate format
2. **Temporary Project**: A unique project directory is created for each deployment
3. **Compilation**: Aptos CLI compiles the Move contracts
4. **Deployment**: Contracts are published to the Aptos blockchain
5. **Response**: Transaction hash and module address are returned
6. **Cleanup**: Temporary files are automatically removed

## Supported File Types

- **Move.toml**: Project configuration files (`.toml`)
- **Move Contracts**: Smart contract source files (`.move`)

## Important Notes

- **Account Setup**: Ensure your Aptos CLI is configured with `aptos init`
- **APT Tokens**: Your account needs sufficient APT for deployment fees
- **File Size**: Large contracts may take longer to compile and deploy
- **Multiple Files**: When uploading multiple `.move` files, they're combined with clear separators
- **Temporary Storage**: Files are temporarily stored during deployment and automatically cleaned up

## Troubleshooting

### Common Issues

**"Aptos CLI not found" error:**
```bash
# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
aptos init
```

**Deployment fails:**
- Check your account has sufficient APT tokens
- Verify Move contract syntax is correct
- Ensure Move.toml dependencies are properly configured
- Check Aptos CLI is properly authenticated

**File upload issues:**
- Ensure files have correct extensions (`.toml`, `.move`)
- Check file permissions and accessibility
- Try manual input as a fallback

### Getting Help

- **Aptos CLI Documentation**: https://aptos.dev/build/cli
- **Move Language Guide**: https://aptos.dev/build/move
- **Aptos Framework**: https://github.com/aptos-labs/aptos-core

## Development

To contribute or modify this project:

1. Fork the repository
2. Make your changes
3. Test with local Move contracts
4. Submit a pull request

The codebase is intentionally simple and focused on the core deployment functionality, making it easy to understand and extend.
