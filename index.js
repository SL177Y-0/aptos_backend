import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Function to detect and fix Move.toml configuration
function fixMoveToml(moveTomlContent) {
    let tomlContent = moveTomlContent;
    
    // Check if it's a legacy Move.toml (missing edition/compiler-version)
    if (!tomlContent.includes('edition') && !tomlContent.includes('compiler-version')) {
        console.log('Detected legacy Move.toml, adding Move 2 configuration...');
        
        // Add Move 2 configuration after [package] section
        const packageMatch = tomlContent.match(/\[package\]([^[]*)/);
        if (packageMatch) {
            const packageSection = packageMatch[0];
            const afterPackage = tomlContent.substring(packageMatch.index + packageMatch[0].length);
            
            // Check if name and version exist
            if (!packageSection.includes('name =') || !packageSection.includes('version =')) {
                throw new Error('Move.toml must contain [package] section with name and version');
            }
            
            // Add Move 2 configuration
            const move2Config = 
edition = "2024.beta"
compiler-version = "2.1.0";
            
            tomlContent = packageSection + move2Config + afterPackage;
        }
    }
    
    // Ensure AptosFramework dependency exists
    if (!tomlContent.includes('AptosFramework')) {
        console.log('Adding AptosFramework dependency...');
        const dependenciesSection = tomlContent.includes('[dependencies]') 
            ? tomlContent 
            : tomlContent + '\n\n[dependencies]';
        
        tomlContent = dependenciesSection + '\nAptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-framework", rev = "main" }';
    }
    
    return tomlContent;
}

// Function to validate and fix Move contract
function fixMoveContract(contractContent) {
    let contract = contractContent;
    
    // Check for common issues and fix them
    if (contract.includes('friend fun') && !contract.includes('use std::error')) {
        console.log('Adding std::error import for friend functions...');
        contract = contract.replace(/use std::signer;/, 'use std::signer;\n    use std::error;');
    }
    
    // Fix reserved keyword usage
    if (contract.includes('public fun exists(')) {
        console.log('Fixing reserved keyword usage...');
        contract = contract.replace(/public fun exists\(/g, 'public fun resource_exists(');
        contract = contract.replace(/exists<Counter>/g, 'exists<Counter>');
    }
    
    return contract;
}

app.post("/deploy", async (req, res) => {
  try {
    const { moveToml, contractFile } = req.body;

    // Validate input
    if (!moveToml || !contractFile) {
      return res.status(400).json({ error: "Both Move.toml and contract content are required" });
    }

    // Validate file sizes
    if (moveToml.length > 10000 || contractFile.length > 100000) {
      return res.status(400).json({ error: "File size too large" });
    }

    // Fix Move.toml configuration
    const fixedMoveToml = fixMoveToml(moveToml);
    
    // Fix Move contract
    const fixedContract = fixMoveContract(contractFile);

    // Define a unique project directory for this request
    const projectDir = project__;
    const sourcesDir = path.join(projectDir, 'sources');
    
    try {
      fs.mkdirSync(sourcesDir, { recursive: true });

      // Write files locally
      fs.writeFileSync(path.join(projectDir, 'Move.toml'), fixedMoveToml);
      fs.writeFileSync(path.join(sourcesDir, 'contract.move'), fixedContract);

      console.log(Compiling project in ...);
      
      // Compile contract with better error handling
      let compileOutput;
      try {
        compileOutput = execSync(ptos move compile --package-dir , { 
          stdio: "pipe",
          timeout: 30000 // 30 second timeout
        }).toString();
        console.log('Compilation successful');
      } catch (compileError) {
        console.error('Compilation failed:', compileError.message);
        throw new Error(Compilation failed: );
      }

      // Publish contract (assumes a default profile is configured via ptos init)
      console.log('Publishing contract...');
      const output = execSync(
        ptos move publish --package-dir  --assume-yes --profile default,
        { stdio: "pipe", timeout: 60000 } // 60 second timeout
      ).toString();

      // Extract transaction hash and module address from CLI output
      const txHashMatch = output.match(/transaction_hash": "([^"]+)"/);
      const txHash = txHashMatch ? txHashMatch[1] : "Not found";
      
      const accountAddressMatch = output.match(/"sender": "([^"]+)"/);
      const moduleAddress = accountAddressMatch ? accountAddressMatch[1] : "Not found";

      res.json({ 
        success: true,
        txHash, 
        moduleAddress,
        compileOutput: compileOutput.substring(0, 1000), // Limit output size
        output: output.substring(0, 1000) // Limit output size
      });

    } finally {
      // Clean up the temporary project directory
      try {
        fs.rmSync(projectDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn(Failed to cleanup :, cleanupErr.message);
      }
    }

  } catch (err) {
    console.error('Deployment error:', err);
    
    // Provide more specific error messages
    let errorMessage = "Deployment failed";
    if (err.message.includes('timeout')) {
      errorMessage = "Operation timed out";
    } else if (err.message.includes('compilation')) {
      errorMessage = "Compilation failed";
    } else if (err.message.includes('publish')) {
      errorMessage = "Publishing failed";
    } else if (err.message.includes('Move.toml')) {
      errorMessage = "Invalid Move.toml configuration";
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: err.message.substring(0, 500) // Limit error message size
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    aptosVersion: execSync("aptos --version").toString().trim()
  });
});

// Check for Aptos CLI before starting
try {
    const version = execSync("aptos --version").toString().trim();
    console.log(Aptos CLI found: );
    app.listen(3000, () => console.log("Backend running at http://localhost:3000"));
} catch (e) {
    console.error('----------------------------------------------------------------');
    console.error('ERROR: Aptos CLI not found.');
    console.error('Please install the Aptos CLI and run ptos init before starting the server.');
    console.error('Installation instructions: https://aptos.dev/build/cli');
    console.error('----------------------------------------------------------------');
    process.exit(1);
}
