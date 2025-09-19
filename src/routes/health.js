import express from 'express';
import { spawn } from 'child_process';

const router = express.Router();

router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Check Aptos CLI
    try {
      await checkAptosCLI();
      health.services.aptosCLI = 'ok';
    } catch (error) {
      health.services.aptosCLI = 'error';
      health.status = 'degraded';
    }

    // Check environment variables
    const requiredEnvVars = ['API_TOKEN'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      health.services.environment = `missing: ${missingEnvVars.join(', ')}`;
      health.status = 'degraded';
    } else {
      health.services.environment = 'ok';
    }

    res.json(health);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

function checkAptosCLI() {
  return new Promise((resolve, reject) => {
    const process = spawn('aptos', ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });

    let stdout = '';
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Aptos CLI check failed with exit code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(new Error(`Aptos CLI not found: ${error.message}`));
    });
  });
}

export default router;