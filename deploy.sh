#!/bin/bash

# Aptos Contract Deployer - Universal Deployment Script
echo " Aptos Contract Deployer - Universal Deployment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo " Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo " npm is not installed. Please install npm first."
    exit 1
fi

echo " Node.js and npm found"

# Install dependencies
echo " Installing dependencies..."
npm install

# Check if Aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "  Aptos CLI not found. Installing..."
    curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
    echo " Aptos CLI installed"
else
    echo " Aptos CLI found: aptos 7.8.1"
fi

# Initialize Aptos if not already done
if [ ! -f ".aptos/config.yaml" ]; then
    echo " Initializing Aptos CLI..."
    aptos init --assume-yes --network testnet
    echo " Aptos CLI initialized"
else
    echo " Aptos CLI already configured"
fi

# Test Move compilation
echo " Testing Move compilation..."
if aptos move compile; then
    echo " Move compilation successful"
else
    echo " Move compilation failed"
    exit 1
fi

# Start the server
echo " Starting Aptos Contract Deployer..."
echo " Server will be available at: http://localhost:3000"
echo " Health check: http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
