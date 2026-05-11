require('dotenv').config();

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

module.exports = {
  jira: {
    baseUrl: required('JIRA_BASE_URL'),
    email: required('JIRA_EMAIL'),
    apiToken: required('JIRA_API_TOKEN'),
    projectKey: required('JIRA_PROJECT_KEY'),
  },
  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  github: {
    token: required('GITHUB_TOKEN'),
    repo: required('GITHUB_REPO'), // format: owner/repo
  },
  vercel: {
    token: required('VERCEL_TOKEN'),
    projectName: required('VERCEL_PROJECT_NAME'),
  },
  email: {
    from: required('EMAIL_FROM'),
    to: required('EMAIL_TO'),
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
  },
};
