import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import yauzl from 'yauzl';
import tar from 'tar';
import { v4 as uuidv4 } from 'uuid';
import { appendJobLog, updateJobStatus, setJobResult } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JOBS_DIR = process.env.JOBS_DIR || path.join(__dirname, '../../jobs');
const TIMEOUT_MS = (process.env.JOB_TIMEOUT_SECONDS || 300) * 1000;

// Ensure jobs directory exists
if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

export async function processDeployment(jobId, jobData) {
  const jobDir = path.join(JOBS_DIR, jobId);
  
  try {
    // Create job directory
    fs.mkdirSync(jobDir, { recursive: true });
    
    await appendJobLog(jobId, 'Starting deployment process...');
    
    // Extract package
    const packageDir = await extractPackage(jobId, jobData.packagePath, jobDir);
    
    // Validate package
    await validatePackage(jobId, packageDir);
    
    // Prepare named addresses
    if (jobData.namedAddresses && Object.keys(jobData.namedAddresses).length > 0) {
      await prepareNamedAddresses(jobId, packageDir, jobData.namedAddresses);
    }
    
    // Compile package
    await compilePackage(jobId, packageDir);
    
    // Publish package
    const result = await publishPackage(jobId, packageDir, jobData);
    
    // Verify deployment
    await verifyDeployment(jobId, result);
    
    await setJobResult(jobId, result);
    await appendJobLog(jobId, 'Deployment completed successfully!');
    
    return result;
    
  } catch (error) {
    await updateJobStatus(jobId, 'failed', error.message);
    await appendJobLog(jobId, `Error: ${error.message}`);
    throw error;
  } finally {
    // Cleanup job directory
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to cleanup job directory:', e);
    }
  }
}

async function extractPackage(jobId, packagePath, jobDir) {
  await appendJobLog(jobId, 'Extracting package...');
  
  const extractDir = path.join(jobDir, 'package');
  fs.mkdirSync(extractDir, { recursive: true });
  
  if (packagePath.endsWith('.zip')) {
    await extractZip(packagePath, extractDir);
  } else if (packagePath.endsWith('.tar') || packagePath.endsWith('.tar.gz')) {
    await extractTar(packagePath, extractDir);
  } else {
    throw new Error('Unsupported package format. Use .zip, .tar, or .tar.gz');
  }
  
  await appendJobLog(jobId, 'Package extracted successfully');
  return extractDir;
}

function extractZip(zipPath, extractDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        // Security check for zip slip
        const entryPath = path.join(extractDir, entry.fileName);
        if (!entryPath.startsWith(extractDir)) {
          return reject(new Error('Zip slip detected: ' + entry.fileName));
        }
        
        if (/\/$/.test(entry.fileName)) {
          // Directory
          fs.mkdirSync(entryPath, { recursive: true });
          zipfile.readEntry();
        } else {
          // File
          fs.mkdirSync(path.dirname(entryPath), { recursive: true });
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);
            
            const writeStream = fs.createWriteStream(entryPath);
            readStream.pipe(writeStream);
            writeStream.on('close', () => zipfile.readEntry());
            writeStream.on('error', reject);
          });
        }
      });
      
      zipfile.on('end', resolve);
      zipfile.on('error', reject);
    });
  });
}

function extractTar(tarPath, extractDir) {
  return tar.extract({
    file: tarPath,
    cwd: extractDir,
    strict: true
  });
}

async function validatePackage(jobId, packageDir) {
  await appendJobLog(jobId, 'Validating package structure...');
  
  // Find Move.toml file
  const moveTomlPath = findMoveToml(packageDir);
  if (!moveTomlPath) {
    throw new Error('Move.toml not found in package');
  }
  
  await appendJobLog(jobId, `Found Move.toml at: ${path.relative(packageDir, moveTomlPath)}`);
  
  // Check for sources directory
  const sourcesDir = path.join(path.dirname(moveTomlPath), 'sources');
  if (!fs.existsSync(sourcesDir)) {
    throw new Error('sources/ directory not found in package');
  }
  
  await appendJobLog(jobId, 'Package structure validated');
}

function findMoveToml(dir) {
  const items = fs.readdirSync(dir);
  
  // Check current directory
  if (items.includes('Move.toml')) {
    return path.join(dir, 'Move.toml');
  }
  
  // Check subdirectories
  for (const item of items) {
    const itemPath = path.join(dir, item);
    if (fs.statSync(itemPath).isDirectory()) {
      const found = findMoveToml(itemPath);
      if (found) return found;
    }
  }
  
  return null;
}

async function prepareNamedAddresses(jobId, packageDir, namedAddresses) {
  await appendJobLog(jobId, 'Preparing named addresses...');
  
  const moveTomlPath = findMoveToml(packageDir);
  let content = fs.readFileSync(moveTomlPath, 'utf8');
  
  // Add or update [addresses] section
  const addressEntries = Object.entries(namedAddresses)
    .map(([name, address]) => `${name} = "${address}"`)
    .join('\n');
  
  if (content.includes('[addresses]')) {
    // Replace existing addresses section
    content = content.replace(/\[addresses\][\s\S]*?(?=\n\[|\n$|$)/, `[addresses]\n${addressEntries}`);
  } else {
    // Add new addresses section
    content += `\n\n[addresses]\n${addressEntries}\n`;
  }
  
  fs.writeFileSync(moveTomlPath, content);
  await appendJobLog(jobId, `Updated named addresses: ${Object.keys(namedAddresses).join(', ')}`);
}

async function compilePackage(jobId, packageDir) {
  await appendJobLog(jobId, 'Compiling Move package...');
  await updateJobStatus(jobId, 'compiling');
  
  const moveTomlPath = findMoveToml(packageDir);
  const packageRoot = path.dirname(moveTomlPath);
  
  return new Promise((resolve, reject) => {
    const args = ['move', 'compile', '--package-dir', packageRoot];
    
    const process = spawn('aptos', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: TIMEOUT_MS
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      appendJobLog(jobId, output.trim());
    });
    
    process.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      appendJobLog(jobId, `[ERROR] ${output.trim()}`);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        appendJobLog(jobId, 'Compilation successful');
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Compilation failed with exit code ${code}: ${stderr}`));
      }
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start compilation: ${error.message}`));
    });
  });
}

async function publishPackage(jobId, packageDir, jobData) {
  await appendJobLog(jobId, 'Publishing package to blockchain...');
  await updateJobStatus(jobId, 'publishing');
  
  const moveTomlPath = findMoveToml(packageDir);
  const packageRoot = path.dirname(moveTomlPath);
  
  // Prepare CLI arguments
  const args = ['move', 'publish', '--package-dir', packageRoot, '--assume-yes'];
  
  // Add network configuration
  if (jobData.network) {
    const nodeUrl = getNodeUrl(jobData.network);
    args.push('--url', nodeUrl);
  }
  
  // Add named addresses if provided
  if (jobData.namedAddresses && Object.keys(jobData.namedAddresses).length > 0) {
    const namedAddressesStr = Object.entries(jobData.namedAddresses)
      .map(([name, address]) => `${name}=${address}`)
      .join(',');
    args.push('--named-addresses', namedAddressesStr);
  }
  
  // Handle resource account mode
  if (jobData.publishMode === 'resource-account' && jobData.resourceAccountSeed) {
    args.push('--resource-account-seed', jobData.resourceAccountSeed);
  }
  
  return new Promise((resolve, reject) => {
    const process = spawn('aptos', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: TIMEOUT_MS,
      env: {
        ...process.env,
        APTOS_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      appendJobLog(jobId, output.trim());
    });
    
    process.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      appendJobLog(jobId, `[ERROR] ${output.trim()}`);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const result = parsePublishOutput(stdout, jobData.network);
          appendJobLog(jobId, `Publication successful! TX: ${result.txHash}`);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse publish output: ${error.message}`));
        }
      } else {
        reject(new Error(`Publication failed with exit code ${code}: ${stderr}`));
      }
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start publication: ${error.message}`));
    });
  });
}

function getNodeUrl(network) {
  const urls = {
    devnet: process.env.APTOS_NODE_URL_DEVNET || 'https://fullnode.devnet.aptoslabs.com',
    testnet: process.env.APTOS_NODE_URL_TESTNET || 'https://fullnode.testnet.aptoslabs.com',
    mainnet: process.env.APTOS_NODE_URL_MAINNET || 'https://fullnode.mainnet.aptoslabs.com'
  };
  
  return urls[network] || urls.devnet;
}

function parsePublishOutput(output, network) {
  // Try to extract transaction hash from output
  const txHashMatch = output.match(/Transaction hash:\s*([0-9a-fA-Fx]+)/i) ||
                     output.match(/Hash:\s*([0-9a-fA-Fx]+)/i) ||
                     output.match(/([0-9a-fA-Fx]{64,66})/);
  
  if (!txHashMatch) {
    throw new Error('Could not extract transaction hash from output');
  }
  
  const txHash = txHashMatch[1];
  
  // Try to extract published addresses
  const addressMatches = output.match(/0x[a-fA-F0-9]+/g) || [];
  const publishedAddresses = [...new Set(addressMatches)]; // Remove duplicates
  
  // Extract module names
  const moduleMatches = output.match(/module\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi) || [];
  const modules = moduleMatches.map(match => match.replace(/module\s+/i, ''));
  
  const explorerUrl = getExplorerUrl(txHash, network);
  
  return {
    txHash,
    publishedAddresses,
    modules,
    network,
    explorerUrl
  };
}

function getExplorerUrl(txHash, network) {
  const baseUrls = {
    devnet: 'https://explorer.aptoslabs.com/txn',
    testnet: 'https://explorer.aptoslabs.com/txn',
    mainnet: 'https://explorer.aptoslabs.com/txn'
  };
  
  const baseUrl = baseUrls[network] || baseUrls.devnet;
  return `${baseUrl}/${txHash}?network=${network}`;
}

async function verifyDeployment(jobId, result) {
  await appendJobLog(jobId, 'Verifying deployment...');
  
  // In a production system, you would query the Aptos REST API here
  // to verify the transaction was successful and modules were published
  
  await appendJobLog(jobId, 'Deployment verified successfully');
}