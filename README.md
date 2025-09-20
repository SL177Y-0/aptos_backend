# Aptos Contract Deployer

A simple web application for compiling and deploying Aptos Move smart contracts. This backend service provides a REST API and web interface to upload Move contract code and deploy it to the Aptos blockchain.

## Features

- Web-based interface for contract deployment
- REST API endpoint for programmatic access
- Automatic contract compilation using Aptos CLI
- Transaction hash and module address extraction
- Docker support for easy deployment

## Prerequisites

- Node.js 18+
- Aptos CLI installed and configured
- An Aptos account with `aptos init` completed

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Install and configure Aptos CLI:
```bash
# Install Aptos CLI (see https://aptos.dev/build/cli for detailed instructions)
aptos init
```

## Usage

### Local Development

Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Using the Web Interface

1. Open `http://localhost:3000` in your browser
2. Fill in the Move.toml configuration
3. Paste your Move contract code
4. Click "Deploy" to compile and deploy your contract

### API Usage

Send a POST request to `/deploy` with the following JSON payload:

```json
{
  "moveToml": "[package]\nname = \"MyContract\"\nversion = \"1.0.0\"\n[dependencies]\nAptosFramework = { git = \"https://github.com/aptos-labs/aptos-core.git\", subdir = \"aptos-move/framework/aptos-framework\", rev = \"main\" }",
  "contractFile": "module {{ADDR}}::my_contract {\n    // Your Move code here\n}"
}
```

Response:
```json
{
  "txHash": "0x...",
  "moduleAddress": "0x..."
}
```

## Docker

Build and run with Docker:

```bash
docker build -t aptos-deployer .
docker run -p 3000:3000 aptos-deployer
```

## Project Structure

```
backend/
├── index.js          # Main server file
├── index.html        # Web interface
├── package.json      # Dependencies and scripts
├── Dockerfile        # Docker configuration
└── README.md         # This file
```

## Notes

- The server automatically cleans up temporary project directories after deployment
- Make sure your Aptos CLI is properly configured with a default profile
- The application assumes you have sufficient APT tokens for deployment fees
- Contract compilation and deployment happen synchronously - large contracts may take time
