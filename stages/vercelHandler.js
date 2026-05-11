const { execSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { vercel: cfg } = require('../config');

const DEPLOY_FILES = ['index.html', 'app.js', 'style.css'];

async function deploy(outputDir) {
  // Copy only web files into a clean temp deploy dir
  const deployDir = outputDir + '_deploy';
  fs.mkdirSync(deployDir, { recursive: true });

  for (const file of DEPLOY_FILES) {
    const src = path.join(outputDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(deployDir, file));
      console.log(`    ✓ Prepared: ${file}`);
    }
  }

  console.log('    Running vercel deploy...');
  let output = '';
  try {
    const scopeFlag = cfg.scope ? `--scope=${cfg.scope}` : '';
    output = execSync(
      `npx --yes vercel@latest --token=${cfg.token} --yes --name=${cfg.projectName} ${scopeFlag} --no-clipboard 2>&1`,
      { cwd: deployDir, encoding: 'utf8', timeout: 180000 }
    );
  } catch (err) {
    const msg = err.stdout || err.stderr || err.message;
    throw new Error(`Vercel CLI failed:\n${msg}`);
  } finally {
    fs.rmSync(deployDir, { recursive: true, force: true });
  }

  console.log('    Vercel output:', output.trim().split('\n').slice(-3).join(' | '));

  // Extract the deployment URL from CLI output
  const url = extractUrl(output);
  if (!url) throw new Error(`Could not find deployment URL in:\n${output}`);

  await healthCheck(url);
  return url;
}

function extractUrl(output) {
  // vercel CLI prints the URL on its own line, usually last
  const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of [...lines].reverse()) {
    const match = line.match(/https:\/\/[^\s]+\.vercel\.app/);
    if (match) return match[0];
  }
  return null;
}

async function healthCheck(url, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, { timeout: 10000 });
      if (res.status === 200) { console.log(`    ✓ Live: ${url}`); return; }
    } catch {}
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Health check failed — ${url} never returned 200`);
}

module.exports = { deploy };
