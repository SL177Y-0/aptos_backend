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

app.post("/deploy", async (req, res) => {
  try {
    const { moveToml, contractFile } = req.body;

    if (!moveToml || !contractFile) {
      return res.status(400).json({ error: "Both Move.toml and contract content are required" });
    }

    // Define a unique project directory for this request
    const projectDir = `project_${Date.now()}`;
    const sourcesDir = path.join(projectDir, 'sources');
    fs.mkdirSync(sourcesDir, { recursive: true });

    // Write files locally
    fs.writeFileSync(path.join(projectDir, 'Move.toml'), moveToml);
    fs.writeFileSync(path.join(sourcesDir, 'contract.move'), contractFile);

    // Compile contract
    execSync(`aptos move compile --package-dir ${projectDir}`, { stdio: "inherit" });

    // Publish contract (assumes a default profile is configured via `aptos init`)
    const output = execSync(
      `aptos move publish --package-dir ${projectDir} --assume-yes --profile default`
    ).toString();

    // Extract transaction hash and module address from CLI output
    const txHashMatch = output.match(/transaction_hash": "([^"]+)"/);
    const txHash = txHashMatch ? txHashMatch[1] : "Not found";
    
    const accountAddressMatch = output.match(/"sender": "([^"]+)"/);
    const moduleAddress = accountAddressMatch ? accountAddressMatch[1] : "Not found";

    res.json({ txHash, moduleAddress });

    // Clean up the temporary project directory
    fs.rmSync(projectDir, { recursive: true, force: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

// Check for Aptos CLI before starting
try {
    const version = execSync("aptos --version").toString().trim();
    console.log(`Aptos CLI found: ${version}`);
    app.listen(3000, () => console.log("Backend running at http://localhost:3000"));
} catch (e) {
    console.error('----------------------------------------------------------------');
    console.error('ERROR: Aptos CLI not found.');
    console.error('Please install the Aptos CLI and run `aptos init` before starting the server.');
    console.error('Installation instructions: https://aptos.dev/build/cli');
    console.error('----------------------------------------------------------------');
    process.exit(1);
}
