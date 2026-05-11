const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { github: cfg } = require('../config');

const api = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${cfg.token}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

async function getDefaultBranch() {
  const res = await api.get(`/repos/${cfg.repo}`);
  return res.data.default_branch;
}

async function getBranchSha(branch) {
  const res = await api.get(`/repos/${cfg.repo}/git/refs/heads/${branch}`);
  return res.data.object.sha;
}

async function createBranch(name, fromSha) {
  try {
    await api.post(`/repos/${cfg.repo}/git/refs`, {
      ref: `refs/heads/${name}`,
      sha: fromSha,
    });
  } catch (err) {
    if (err.response?.status === 422) {
      // Branch already exists — delete and recreate
      await api.delete(`/repos/${cfg.repo}/git/refs/heads/${name}`);
      await api.post(`/repos/${cfg.repo}/git/refs`, {
        ref: `refs/heads/${name}`,
        sha: fromSha,
      });
    } else {
      throw err;
    }
  }
}

async function pushFile(branch, filePath, contentBuffer, message) {
  const content = contentBuffer.toString('base64');

  let existingSha;
  try {
    const res = await api.get(`/repos/${cfg.repo}/contents/${filePath}`, {
      params: { ref: branch },
    });
    existingSha = res.data.sha;
  } catch {
    // File doesn't exist yet
  }

  await api.put(`/repos/${cfg.repo}/contents/${filePath}`, {
    message,
    content,
    branch,
    ...(existingSha ? { sha: existingSha } : {}),
  });
}

function collectFiles(dir, prefix) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'screenshots'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const repoPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, repoPath));
    } else {
      results.push({ fullPath, repoPath });
    }
  }
  return results;
}

async function pushAndPR(outputDir, jiraKey, description) {
  const branch = `feature/${jiraKey.toLowerCase()}-ai-pipeline`;

  const defaultBranch = await getDefaultBranch();
  const baseSha = await getBranchSha(defaultBranch);
  await createBranch(branch, baseSha);

  const files = collectFiles(outputDir, '');
  for (const { fullPath, repoPath } of files) {
    const content = fs.readFileSync(fullPath);
    await pushFile(branch, repoPath, content, `feat(${jiraKey}): add ${path.basename(repoPath)}`);
    console.log(`    ✓ Pushed: ${repoPath}`);
  }

  const res = await api.post(`/repos/${cfg.repo}/pulls`, {
    title: `[${jiraKey}] AI Pipeline: Web App`,
    body: `## AI-Generated Web App\n\n**Jira:** ${jiraKey}\n**Summary:** ${description}\n\n🤖 Built automatically by the Zero Human Touch Pipeline`,
    head: branch,
    base: defaultBranch,
  });

  return { prUrl: res.data.html_url, branch };
}

module.exports = { pushAndPR };
