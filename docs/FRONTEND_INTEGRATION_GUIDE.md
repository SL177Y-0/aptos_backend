# Frontend Integration Guide

## Backend API Endpoints

### Base URL
```
http://localhost:3001
```

### Authentication
All deploy endpoints require API key authentication:
```javascript
const headers = {
  'x-api-key': '8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0'
};
```

## API Endpoints

### 1. Health Check
```javascript
// GET /api/health
const healthCheck = async () => {
  const response = await fetch('http://localhost:3001/api/health');
  const data = await response.json();
  return data;
};

// Response:
{
  "status": "ok",
  "timestamp": "2025-09-19T15:41:36.987Z",
  "services": {
    "aptosCLI": "ok",
    "environment": "ok"
  }
}
```

### 2. Deploy Move Package
```javascript
// POST /api/deploy
const deployPackage = async (file, network = 'testnet', namedAddresses = {}) => {
  const formData = new FormData();
  formData.append('move_package', file);
  formData.append('network', network);
  formData.append('named_addresses', JSON.stringify(namedAddresses));

  const response = await fetch('http://localhost:3001/api/deploy', {
    method: 'POST',
    headers: {
      'x-api-key': '8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0'
    },
    body: formData
  });

  return await response.json();
};
```

## Frontend Implementation Examples

### React Component Example
```jsx
import React, { useState } from 'react';

const MoveDeployer = () => {
  const [file, setFile] = useState(null);
  const [network, setNetwork] = useState('testnet');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDeploy = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('move_package', file);
      formData.append('network', network);

      const response = await fetch('http://localhost:3001/api/deploy', {
        method: 'POST',
        headers: {
          'x-api-key': '8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0'
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || 'Deployment failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="move-deployer">
      <h2>Deploy Move Package</h2>
      
      <div className="form-group">
        <label>Select Package File:</label>
        <input
          type="file"
          accept=".zip,.tar,.tar.gz"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      <div className="form-group">
        <label>Network:</label>
        <select value={network} onChange={(e) => setNetwork(e.target.value)}>
          <option value="devnet">Devnet</option>
          <option value="testnet">Testnet</option>
          <option value="mainnet">Mainnet</option>
        </select>
      </div>

      <button onClick={handleDeploy} disabled={loading || !file}>
        {loading ? 'Deploying...' : 'Deploy Package'}
      </button>

      {error && (
        <div className="error">
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="success">
          <h3>Deployment Successful!</h3>
          <p><strong>Network:</strong> {result.network}</p>
          <p><strong>Module Address:</strong> {result.moduleAddress}</p>
          <p><strong>Transaction Hash:</strong> {result.txHash}</p>
          <p><strong>Explorer URL:</strong> 
            <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer">
              View Transaction
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default MoveDeployer;
```

### Vue.js Component Example
```vue
<template>
  <div class="move-deployer">
    <h2>Deploy Move Package</h2>
    
    <div class="form-group">
      <label>Select Package File:</label>
      <input
        type="file"
        accept=".zip,.tar,.tar.gz"
        @change="handleFileSelect"
      />
    </div>

    <div class="form-group">
      <label>Network:</label>
      <select v-model="network">
        <option value="devnet">Devnet</option>
        <option value="testnet">Testnet</option>
        <option value="mainnet">Mainnet</option>
      </select>
    </div>

    <button @click="handleDeploy" :disabled="loading || !file">
      {{ loading ? 'Deploying...' : 'Deploy Package' }}
    </button>

    <div v-if="error" class="error">
      <h3>Error:</h3>
      <p>{{ error }}</p>
    </div>

    <div v-if="result" class="success">
      <h3>Deployment Successful!</h3>
      <p><strong>Network:</strong> {{ result.network }}</p>
      <p><strong>Module Address:</strong> {{ result.moduleAddress }}</p>
      <p><strong>Transaction Hash:</strong> {{ result.txHash }}</p>
      <p><strong>Explorer URL:</strong> 
        <a :href="result.explorerUrl" target="_blank" rel="noopener noreferrer">
          View Transaction
        </a>
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MoveDeployer',
  data() {
    return {
      file: null,
      network: 'testnet',
      loading: false,
      result: null,
      error: null
    };
  },
  methods: {
    handleFileSelect(event) {
      this.file = event.target.files[0];
    },
    async handleDeploy() {
      if (!this.file) {
        this.error = 'Please select a file';
        return;
      }

      this.loading = true;
      this.error = null;
      this.result = null;

      try {
        const formData = new FormData();
        formData.append('move_package', this.file);
        formData.append('network', this.network);

        const response = await fetch('http://localhost:3001/api/deploy', {
          method: 'POST',
          headers: {
            'x-api-key': '8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0'
          },
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          this.result = data;
        } else {
          this.error = data.message || 'Deployment failed';
        }
      } catch (err) {
        this.error = 'Network error: ' + err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

### Vanilla JavaScript Example
```html
<!DOCTYPE html>
<html>
<head>
    <title>Move Package Deployer</title>
    <style>
        .form-group { margin: 10px 0; }
        .error { color: red; background: #ffe6e6; padding: 10px; border-radius: 5px; }
        .success { color: green; background: #e6ffe6; padding: 10px; border-radius: 5px; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:disabled { background: #ccc; cursor: not-allowed; }
    </style>
</head>
<body>
    <h2>Deploy Move Package</h2>
    
    <div class="form-group">
        <label>Select Package File:</label>
        <input type="file" id="fileInput" accept=".zip,.tar,.tar.gz">
    </div>

    <div class="form-group">
        <label>Network:</label>
        <select id="networkSelect">
            <option value="devnet">Devnet</option>
            <option value="testnet" selected>Testnet</option>
            <option value="mainnet">Mainnet</option>
        </select>
    </div>

    <button id="deployBtn" onclick="deployPackage()">Deploy Package</button>

    <div id="result"></div>

    <script>
        const API_KEY = '8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0';
        const API_URL = 'http://localhost:3001/api/deploy';

        async function deployPackage() {
            const fileInput = document.getElementById('fileInput');
            const networkSelect = document.getElementById('networkSelect');
            const deployBtn = document.getElementById('deployBtn');
            const resultDiv = document.getElementById('result');

            const file = fileInput.files[0];
            const network = networkSelect.value;

            if (!file) {
                showResult('Please select a file', 'error');
                return;
            }

            deployBtn.disabled = true;
            deployBtn.textContent = 'Deploying...';
            showResult('', '');

            try {
                const formData = new FormData();
                formData.append('move_package', file);
                formData.append('network', network);

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'x-api-key': API_KEY
                    },
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    showResult(`
                        <h3>Deployment Successful!</h3>
                        <p><strong>Network:</strong> ${data.network}</p>
                        <p><strong>Module Address:</strong> ${data.moduleAddress}</p>
                        <p><strong>Transaction Hash:</strong> ${data.txHash}</p>
                        <p><strong>Explorer URL:</strong> 
                            <a href="${data.explorerUrl}" target="_blank" rel="noopener noreferrer">
                                View Transaction
                            </a>
                        </p>
                    `, 'success');
                } else {
                    showResult(`Error: ${data.message || 'Deployment failed'}`, 'error');
                }
            } catch (err) {
                showResult(`Network error: ${err.message}`, 'error');
            } finally {
                deployBtn.disabled = false;
                deployBtn.textContent = 'Deploy Package';
            }
        }

        function showResult(message, type) {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = message;
            resultDiv.className = type;
        }
    </script>
</body>
</html>
```

## Error Handling

### Common Error Responses
```javascript
// Authentication errors
{
  "error": "Authentication required",
  "message": "Please provide an API key in the x-api-key header"
}

{
  "error": "Invalid API key",
  "message": "The provided API key is not valid"
}

// File upload errors
{
  "error": "No file uploaded",
  "message": "Upload .zip, .tar, or .tar.gz"
}

{
  "error": "Invalid file type. Only .zip, .tar, and .tar.gz files are allowed."
}

// Network errors
{
  "error": "Invalid network",
  "message": "Use one of: devnet, testnet, mainnet"
}

// Deployment errors
{
  "error": "Deployment failed",
  "message": "Move.toml not found in package"
}

{
  "error": "Deployment failed",
  "message": "Compilation failed with exit code 1: ..."
}
```

## Best Practices

### 1. File Validation
```javascript
const validateFile = (file) => {
  const allowedTypes = ['.zip', '.tar', '.tar.gz'];
  const fileName = file.name.toLowerCase();
  const isValidType = allowedTypes.some(type => fileName.endsWith(type));
  
  if (!isValidType) {
    throw new Error('Invalid file type. Only .zip, .tar, and .tar.gz files are allowed.');
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    throw new Error('File too large. Maximum size is 50MB.');
  }
};
```

### 2. Progress Tracking
```javascript
const deployWithProgress = async (file, network, onProgress) => {
  const formData = new FormData();
  formData.append('move_package', file);
  formData.append('network', network);

  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      onProgress('uploading', percentComplete);
    }
  });

  return new Promise((resolve, reject) => {
    xhr.onload = () => {
      if (xhr.status === 200) {
        onProgress('processing', 100);
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(JSON.parse(xhr.responseText));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    
    xhr.open('POST', 'http://localhost:3001/api/deploy');
    xhr.setRequestHeader('x-api-key', API_KEY);
    xhr.send(formData);
  });
};
```

### 3. Retry Logic
```javascript
const deployWithRetry = async (file, network, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await deployPackage(file, network);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

## Environment Configuration

### Development
```javascript
const config = {
  apiUrl: 'http://localhost:3001',
  apiKey: '8f5f2a6d4c7b1a0e9c3d52f6b8e4a1d0f2c7e5a9b3d48276c954e1a3f6b2d8c0',
  defaultNetwork: 'testnet'
};
```

### Production
```javascript
const config = {
  apiUrl: 'https://your-backend-domain.com',
  apiKey: process.env.REACT_APP_API_KEY, // Store in environment variables
  defaultNetwork: 'mainnet'
};
```

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000` (Create React App default)
- `http://localhost:8080` (Vue CLI default)

For custom frontend URLs, update the CORS configuration in `backend/src/server.js`:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-API-Key']
}));
```
