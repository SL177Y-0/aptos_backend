import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { exec, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import util from "util";

// Promisify the exec function for modern async/await usage
const execAsync = util.promisify(exec);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for job statuses
const jobs = {};

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

function getAccountAddress() {
    const accountAddress = process.env.APTOS_ADDRESS;
    if (!accountAddress) {
        throw new Error("APTOS_ADDRESS environment variable is not set.");
    }
    return accountAddress;
}

function fixMoveToml(moveTomlContent, accountAddress) {
    let tomlContent = moveTomlContent;
    const frameworkPath = process.env.APTOS_FRAMEWORK_PATH;
    if (!frameworkPath) {
        throw new Error("APTOS_FRAMEWORK_PATH environment variable is not set.");
    }

    if (!tomlContent.includes("[package]")) {
        tomlContent = "[package]\nname = \"MyContract\"\nversion = \"1.0.0\"\n\n" + tomlContent;
    }
    if (!tomlContent.includes("AptosFramework")) {
        if (!tomlContent.includes("[dependencies]")) {
            tomlContent += "\n\n[dependencies]";
        }
        tomlContent += `\nAptosFramework = { local = "${frameworkPath}" }`;
    }
    tomlContent = tomlContent.replace(/\{\{ADDR\}\}/g, accountAddress);
    return tomlContent;
}

function fixMoveContract(contractContent, accountAddress) {
    return contractContent.replace(/\{\{ADDR\}\}/g, accountAddress);
}

async function runDeployment(jobId, body) {
    const projectDir = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const { moveToml, contractFile } = body;
        const privateKey = process.env.APTOS_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("APTOS_PRIVATE_KEY environment variable is not set on the server.");
        }

        const accountAddress = getAccountAddress();
        const fixedMoveToml = fixMoveToml(moveToml, accountAddress);
        const fixedContract = fixMoveContract(contractFile, accountAddress);
        const sourcesDir = path.join(projectDir, "sources");

        await fs.promises.mkdir(sourcesDir, { recursive: true });
        await fs.promises.writeFile(path.join(projectDir, "Move.toml"), fixedMoveToml);
        await fs.promises.writeFile(path.join(sourcesDir, "contract.move"), fixedContract);

        jobs[jobId].status = "publishing";
        console.log(`[Job ${jobId}] Compiling and publishing contract...`);
        
        // Use the non-blocking execAsync and provide a generous timeout
        const { stdout, stderr } = await execAsync(
            `aptos move publish --package-dir ${projectDir} --assume-yes --private-key ${privateKey}`,
            { timeout: 900000 } // 15 minutes timeout, should be more than enough
        );

        if (stderr) {
            console.error(`[Job ${jobId}] Deployment stderr:`, stderr);
        }

        const output = stdout;
        const txHashMatch = output.match(/"transaction_hash": "([^"]+)"/);
        const txHash = txHashMatch ? txHashMatch[1] : "Not found";
        const accountAddressMatch = output.match(/"sender": "([^"]+)"/);
        const moduleAddress = accountAddressMatch ? accountAddressMatch[1] : "Not found";
        const transactionLink = txHash !== "Not found" 
            ? `https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`
            : null;

        jobs[jobId] = {
            status: "success",
            result: { success: true, txHash, moduleAddress, transactionLink, output: output.substring(0, 2000) }
        };

    } catch (err) {
        console.error(`[Job ${jobId}] Deployment error:`, err);
        jobs[jobId] = {
            status: "error",
            error: "Deployment failed",
            details: err.stderr || err.stdout || err.message
        };
    } finally {
        try {
            await fs.promises.rm(projectDir, { recursive: true, force: true });
        } catch (cleanupErr) {
            console.warn(`[Job ${jobId}] Failed to cleanup ${projectDir}:`, cleanupErr.message);
        }
    }
}

app.post("/deploy", async (req, res) => {
    const jobId = `job_${Date.now()}`;
    jobs[jobId] = { status: "pending", message: "Deployment has been queued." };
    
    res.status(202).json({ jobId });

    // Run the deployment in the background without awaiting it
    runDeployment(jobId, req.body);
});

app.get("/status/:jobId", (req, res) => {
    const { jobId } = req.params;
    const job = jobs[jobId];

    if (!job) {
        return res.status(404).json({ error: "Job not found." });
    }
    res.json(job);
});

app.get("/health", (req, res) => {
  try {
    const version = execSync("aptos --version").toString().trim();
    res.json({ status: "ok", timestamp: new Date().toISOString(), aptosVersion: version });
  } catch (e) {
    res.status(500).json({ status: "error", message: "Aptos CLI not found or not working." });
  }
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
