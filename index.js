import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

function getAccountAddress() {
    const accountAddress = process.env.APTOS_ADDRESS;
    if (!accountAddress) {
        throw new Error("APTOS_ADDRESS environment variable is not set.");
    }
    console.log(`Using account address: ${accountAddress}`);
    return accountAddress;
}

function fixMoveToml(moveTomlContent, accountAddress) {
    let tomlContent = moveTomlContent;
    
    if (!tomlContent.includes("[package]")) {
        tomlContent = "[package]\nname = \"MyContract\"\nversion = \"1.0.0\"\n\n" + tomlContent;
    }
    
    const frameworkPath = process.env.APTOS_FRAMEWORK_PATH;
    if (!frameworkPath) {
        throw new Error("APTOS_FRAMEWORK_PATH environment variable is not set.");
    }

    // Use the local, pre-fetched framework dependency to avoid network timeouts.
    if (!tomlContent.includes("AptosFramework")) {
        if (!tomlContent.includes("[dependencies]")) {
            tomlContent += "\n\n[dependencies]";
        }
        tomlContent += `\nAptosFramework = { local = "${frameworkPath}" }`;
    }
    
    // Replace {{ADDR}} with actual account address
    tomlContent = tomlContent.replace(/\{\{ADDR\}\}/g, accountAddress);
    
    return tomlContent;
}

function fixMoveContract(contractContent, accountAddress) {
    // Replace {{ADDR}} with actual account address
    const contract = contractContent.replace(/\{\{ADDR\}\}/g, accountAddress);
    return contract;
}

app.post("/deploy", async (req, res) => {
  try {
    const { moveToml, contractFile } = req.body;

    if (!moveToml || !contractFile) {
      return res.status(400).json({ error: "Both Move.toml and contract content are required" });
    }

    const privateKey = process.env.APTOS_PRIVATE_KEY;
    if (!privateKey) {
        return res.status(500).json({ error: "Deployment failed", details: "APTOS_PRIVATE_KEY environment variable is not set on the server." });
    }

    const accountAddress = getAccountAddress();
    const fixedMoveToml = fixMoveToml(moveToml, accountAddress);
    const fixedContract = fixMoveContract(contractFile, accountAddress);
    const projectDir = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sourcesDir = path.join(projectDir, "sources");
    
    try {
      fs.mkdirSync(sourcesDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, "Move.toml"), fixedMoveToml);
      fs.writeFileSync(path.join(sourcesDir, "contract.move"), fixedContract);

      console.log(`Compiling project in ${projectDir}...`);
      
      const compileOutput = execSync(`aptos move compile --package-dir ${projectDir}`, { 
        stdio: "pipe",
        encoding: "utf8"
      }).toString();
      
      console.log("Compilation successful");

      console.log("Publishing contract...");
      const output = execSync(
        `aptos move publish --package-dir ${projectDir} --assume-yes --private-key ${privateKey}`,
        { 
          stdio: "pipe", 
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
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Backend running at http://0.0.0.0:${PORT}`);
    });
} catch (e) {
    console.error("----------------------------------------------------------------");
    console.error("ERROR: Aptos CLI not found.");
    console.error("Please install the Aptos CLI and run `aptos init` before starting the server.");
    console.error("Installation instructions: https://aptos.dev/build/cli");
    console.error("----------------------------------------------------------------");
    process.exit(1);
}
