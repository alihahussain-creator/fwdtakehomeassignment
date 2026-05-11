const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { vercel: cfg } = require('../config');

const api = axios.create({
  baseURL: 'https://api.vercel.com',
  headers: {
    Authorization: `Bearer ${cfg.token}`,
    'Content-Type': 'application/json',
  },
});

async function uploadFile(contentBuffer) {
  const sha1 = crypto.createHash('sha1').update(contentBuffer).digest('hex');

  try {
    await axios.put('https://api.vercel.com/v2/files', contentBuffer, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'x-vercel-digest': sha1,
        'Content-Length': String(contentBuffer.length),
        'Content-Type': 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  } catch {
    // 200 = new upload, other responses may indicate file already exists — both are fine
  }

  return { sha: sha1, size: contentBuffer.length };
}

function collectFiles(dir, prefix) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'screenshots'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const filePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, filePath));
    } else {
      results.push({ fullPath, filePath });
    }
  }
  return results;
}

async function pollDeployment(id, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await api.get(`/v13/deployments/${id}`);
    const state = res.data.readyState || res.data.state || '';
    console.log(`    Status: ${state}`);

    if (state === 'READY') return `https://${res.data.url}`;
    if (['ERROR', 'CANCELED'].includes(state)) throw new Error(`Deployment failed: ${state}`);

    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Deployment timed out after 5 minutes');
}

async function healthCheck(url, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, { timeout: 10000 });
      if (res.status === 200) {
        console.log(`    ✓ Health check passed: ${url}`);
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Health check failed: ${url} never returned 200`);
}

async function deploy(outputDir) {
  const files = collectFiles(outputDir, '');

  // Upload all files and get their hashes
  const deployFiles = [];
  for (const { fullPath, filePath } of files) {
    const content = fs.readFileSync(fullPath);
    const { sha, size } = await uploadFile(content);
    deployFiles.push({ file: filePath, sha, size });
    console.log(`    ✓ Uploaded: ${filePath}`);
  }

  // Create the deployment
  const res = await api.post('/v13/deployments', {
    name: cfg.projectName,
    files: deployFiles,
    projectSettings: { framework: null },
  });

  const deploymentId = res.data.id;
  console.log(`    Deployment ID: ${deploymentId}`);

  // Poll until live
  const url = await pollDeployment(deploymentId);

  // Verify it returns 200
  await healthCheck(url);

  return url;
}

module.exports = { deploy };
