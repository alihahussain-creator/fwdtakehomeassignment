const axios = require('axios');
const { jira: cfg } = require('../config');

const auth = Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString('base64');

const client = axios.create({
  baseURL: cfg.baseUrl.replace(/\/$/, ''),
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

async function getReadyStories() {
  const jql = `project = "${cfg.projectKey}" AND labels = "ai-ready" AND status = "To Do" AND summary ~ "[AI-PIPELINE]"`;
  const res = await client.get('/rest/api/3/search', {
    params: { jql, fields: 'summary,status,labels,attachment', maxResults: 10 },
  });
  return res.data.issues || [];
}

async function getRequirementsContent(issueKey) {
  const res = await client.get(`/rest/api/3/issue/${issueKey}`, {
    params: { fields: 'attachment' },
  });
  const attachments = res.data.fields.attachment || [];
  const req = attachments.find(a => a.filename === 'requirements.md');
  if (!req) return null;

  const content = await axios.get(req.content, {
    headers: { Authorization: `Basic ${auth}` },
    responseType: 'text',
  });
  return content.data;
}

async function transitionIssue(issueKey, transitionName) {
  const res = await client.get(`/rest/api/3/issue/${issueKey}/transitions`);
  const transitions = res.data.transitions || [];

  let t = transitions.find(x => x.name.toLowerCase() === transitionName.toLowerCase());
  if (!t) t = transitions.find(x => x.name.toLowerCase().includes(transitionName.toLowerCase()));
  if (!t) {
    console.warn(`  ⚠ Transition "${transitionName}" not found. Available: ${transitions.map(x => x.name).join(', ')}`);
    return;
  }

  await client.post(`/rest/api/3/issue/${issueKey}/transitions`, {
    transition: { id: t.id },
  });
}

async function addComment(issueKey, text) {
  await client.post(`/rest/api/3/issue/${issueKey}/comment`, {
    body: {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    },
  });
}

module.exports = { getReadyStories, getRequirementsContent, transitionIssue, addComment };
