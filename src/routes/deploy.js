import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import yauzl from 'yauzl';
import tar from 'tar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: (process.env.MAX_UPLOAD_MB || 50) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.zip', '.tar', '.tar.gz'];
    const ext = path.extname(file.originalname).toLowerCase();
    const isGzTar = file.originalname.toLowerCase().endsWith('.tar.gz');
    if (allowed.includes(ext) || isGzTar) cb(null, true);
    else cb(new Error('Invalid file type. Only .zip, .tar, and .tar.gz files are allowed.'));
  }
});

router.post('/', upload.single('move_package'), async (req, res) => {
  let workDir = '';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded', message: 'Upload .zip, .tar, or .tar.gz' });
    }

    const { network = 'devnet', named_addresses = '{}' } = req.body;
    const validNetworks = ['devnet', 'testnet', 'mainnet'];
    if (!validNetworks.includes(network)) {
      return res.status(400).json({ error: 'Invalid network', message: `Use one of: ${validNetworks.join(', ')}` });
    }

    let parsedNamed = {};
    if (named_addresses && String(named_addresses).trim()) {
      try { parsedNamed = JSON.parse(named_addresses); }
      catch { return res.status(400).json({ error: 'Invalid named addresses', message: 'Must be valid JSON' }); }
    }

    // Create a per-request working dir
    workDir = path.join(__dirname, '../../uploads', `job_${Date.now()}`);
    fs.mkdirSync(workDir, { recursive: true });

    const packageDir = path.join(workDir, 'package');
    fs.mkdirSync(packageDir, { recursive: true });

    // Extract archive using original filename to determine type
    await extractArchive(req.file.path, packageDir, req.file.originalname);

    // Find Move.toml
    const moveTomlPath = findMoveToml(packageDir);
    if (!moveTomlPath) {
      throw new Error('Move.toml not found in package');
    }
    const pkgRoot = path.dirname(moveTomlPath);

    // Compile
    await runAptos(['move', 'compile', '--package-dir', pkgRoot]);

    // Build publish args
    const args = ['move', 'publish', '--package-dir', pkgRoot, '--assume-yes'];
    const nodeUrl = getNodeUrl(network);
    if (nodeUrl) args.push('--url', nodeUrl);
    if (parsedNamed && Object.keys(parsedNamed).length > 0) {
      const namedStr = Object.entries(parsedNamed).map(([k, v]) => `${k}=${v}`).join(',');
      args.push('--named-addresses', namedStr);
    }

    // Publish with private key via env
    const { stdout } = await runAptos(args, { APTOS_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY });

    // Parse tx hash and any addresses from output
    const txHash = extractTxHash(stdout);
    const addresses = extractAddresses(stdout);

    // Prefer explicit DEPLOYER_ADDRESS if provided, else first address from output
    const moduleAddress = process.env.DEPLOYER_ADDRESS || addresses[0] || null;

    return res.json({
      status: 'completed',
      network,
      moduleAddress,
      txHash,
      explorerUrl: txHash ? getExplorerUrl(txHash, network) : undefined
    });
  } catch (error) {
    return res.status(500).json({ error: 'Deployment failed', message: error.message });
  } finally {
    try {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (workDir && fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
    } catch {}
  }
});

function extractArchive(archivePath, destDir, originalName) {
  // Use original filename to determine archive type
  const fileName = originalName.toLowerCase();
  
  if (fileName.endsWith('.zip')) {
    return extractZip(archivePath, destDir);
  } else if (fileName.endsWith('.tar.gz') || fileName.endsWith('.tgz')) {
    return extractTar(archivePath, destDir);
  } else if (fileName.endsWith('.tar')) {
    return extractTar(archivePath, destDir);
  } else {
    // Fallback: try to detect by file content
    return detectAndExtract(archivePath, destDir);
  }
}

function detectAndExtract(archivePath, destDir) {
  return new Promise((resolve, reject) => {
    // Read first few bytes to detect file type
    const fd = fs.openSync(archivePath, 'r');
    const buffer = Buffer.alloc(512);
    fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);
    
    // Check for ZIP signature (PK)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      return extractZip(archivePath, destDir).then(resolve).catch(reject);
    }
    
    // Check for GZIP signature
    if (buffer[0] === 0x1F && buffer[1] === 0x8B) {
      return extractTar(archivePath, destDir).then(resolve).catch(reject);
    }
    
    // Default to tar for other cases
    return extractTar(archivePath, destDir).then(resolve).catch(reject);
  });
}

function extractZip(zipPath, extractDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        const entryPath = path.join(extractDir, entry.fileName);
        if (!entryPath.startsWith(extractDir)) return reject(new Error('Zip slip detected'));
        if (/\/$/.test(entry.fileName)) {
          fs.mkdirSync(entryPath, { recursive: true });
          zipfile.readEntry();
        } else {
          fs.mkdirSync(path.dirname(entryPath), { recursive: true });
          zipfile.openReadStream(entry, (err, rs) => {
            if (err) return reject(err);
            const ws = fs.createWriteStream(entryPath);
            rs.pipe(ws);
            ws.on('close', () => zipfile.readEntry());
            ws.on('error', reject);
          });
        }
      });
      zipfile.on('end', resolve);
      zipfile.on('error', reject);
    });
  });
}

function extractTar(tarPath, extractDir) {
  return tar.extract({ file: tarPath, cwd: extractDir, strict: true });
}

function findMoveToml(dir) {
  const items = fs.readdirSync(dir);
  if (items.includes('Move.toml')) return path.join(dir, 'Move.toml');
  for (const item of items) {
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) {
      const found = findMoveToml(p);
      if (found) return found;
    }
  }
  return null;
}

function runAptos(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('aptos', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: (process.env.JOB_TIMEOUT_SECONDS || 300) * 1000,
      env: { ...process.env, ...extraEnv }
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(stderr || `aptos exited with code ${code}`));
    });
    child.on('error', err => reject(err));
  });
}

function extractTxHash(output) {
  const m = output.match(/Transaction hash:\s*([0-9a-fA-Fx]+)/i) ||
            output.match(/Hash:\s*([0-9a-fA-Fx]+)/i) ||
            output.match(/([0-9a-fA-Fx]{64,66})/);
  return m ? m[1] : null;
}

function extractAddresses(output) {
  const matches = output.match(/0x[a-fA-F0-9]+/g) || [];
  return [...new Set(matches)];
}

function getNodeUrl(network) {
  const urls = {
    devnet: process.env.APTOS_NODE_URL_DEVNET || 'https://fullnode.devnet.aptoslabs.com/v1',
    testnet: process.env.APTOS_NODE_URL_TESTNET || 'https://fullnode.testnet.aptoslabs.com/v1',
    mainnet: process.env.APTOS_NODE_URL_MAINNET || 'https://fullnode.mainnet.aptoslabs.com/v1'
  };
  return urls[network] || urls.devnet;
}

function getExplorerUrl(txHash, network) {
  const base = 'https://explorer.aptoslabs.com/txn';
  return `${base}/${txHash}?network=${network}`;
}

export default router;