import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

function fixMoveToml(moveTomlContent) {
    let tomlContent = moveTomlContent;
    
    if (!tomlContent.includes("[package]")) {
        tomlContent = "[package]\nname = \"MyContract\"\nversion = \"1.0.0\"\n\n" + tomlContent;
    }
    
    if (!tomlContent.includes("AptosFramework")) {
        if (!tomlContent.includes("[dependencies]")) {
            tomlContent += "\n\n[dependencies]";
        }
        tomlContent += "\nAptosFramework = { git = \"https://github.com/aptos-labs/aptos-core.git\", subdir = \"aptos-move/framework/aptos-framework\", rev = \"main\" }";
    }
    
    return tomlContent;
}

function fixMoveContract(contractContent) {
    // Get the actual account address - try multiple methods
    let accountAddress = "0x1";
    
    try {
        // Method 1: Try aptos account list
        const accountInfo = execSync("aptos account list", { 
            stdio: "pipe", 
            encoding: "utf8" 
        }).toString();
        
        const match = accountInfo.match(/"account": "([^"]+)"/);
        if (match) {
            accountAddress = match[1];
        } else {
            // Method 2: Try aptos account list with profile
            const profileInfo = execSync("aptos account list --profile default", { 
                stdio: "pipe", 
                encoding: "utf8" 
            }).toString();
            
            const profileMatch = profileInfo.match(/"account": "([^"]+)"/);
            if (profileMatch) {
                accountAddress = profileMatch[1];
            }
        }
    } catch (e) {
        console.log("Could not get account address, using 0x1");
    }
    
    console.log(`Using account address: ${accountAddress}`);
    
    // Replace {{ADDR}} with actual account address
    let contract = contractContent.replace(/\{\{ADDR\}\}/g, accountAddress);
    
    return contract;
}

app.post("/deploy", async (req, res) => {
  try {
    const { moveToml, contractFile } = req.body;

    if (!moveToml || !contractFile) {
      return res.status(400).json({ error: "Both Move.toml and contract content are required" });
    }

    const fixedMoveToml = fixMoveToml(moveToml);
    const fixedContract = fixMoveContract(contractFile);
    const projectDir = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sourcesDir = path.join(projectDir, "sources");
    
    try {
      fs.mkdirSync(sourcesDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, "Move.toml"), fixedMoveToml);
      fs.writeFileSync(path.join(sourcesDir, "contract.move"), fixedContract);

      console.log(`Compiling project in ${projectDir}...`);
      
      const compileOutput = execSync(`aptos move compile --package-dir ${projectDir}`, { 
        stdio: "pipe",
        timeout: 60000,
        encoding: "utf8"
      }).toString();
      
      console.log("Compilation successful");

      console.log("Publishing contract...");
      const output = execSync(
        `aptos move publish --package-dir ${projectDir} --assume-yes --profile default`,
        { 
          stdio: "pipe", 
          timeout: 60000,
          encoding: "utf8"
        }
      ).toString();

      const txHashMatch = output.match(/transaction_hash": "([^"]+)"/);
      const txHash = txHashMatch ? txHashMatch[1] : "Not found";
      
      const accountAddressMatch = output.match(/"sender": "([^"]+)"/);
      const moduleAddress = accountAddressMatch ? accountAddressMatch[1] : "Not found";

      const transactionLink = txHash !== "Not found" 
        ? `https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`
        : null;

      res.json({ 
        success: true,
        txHash, 
        moduleAddress,
        transactionLink,
        output: output.substring(0, 1000)
      });

    } finally {
      try {
        fs.rmSync(projectDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn(`Failed to cleanup ${projectDir}:`, cleanupErr.message);
      }
    }

  } catch (err) {
    console.error("Deployment error:", err);
    res.status(500).json({ 
      error: "Deployment failed",
      details: err.message.substring(0, 500)
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    aptosVersion: execSync("aptos --version").toString().trim()
  });
});

try {
    const version = execSync("aptos --version").toString().trim();
    console.log(`Aptos CLI found: ${version}`);
    app.listen(3000, () => console.log("Backend running at http://localhost:3000"));
} catch (e) {
    console.error("----------------------------------------------------------------");
    console.error("ERROR: Aptos CLI not found.");
    console.error("Please install the Aptos CLI and run `aptos init` before starting the server.");
    console.error("Installation instructions: https://aptos.dev/build/cli");
    console.error("----------------------------------------------------------------");
    process.exit(1);
}