# Zero Human Touch Pipeline

## What this project does
A fully automated end-to-end software delivery pipeline. A PM drops a Jira story with a `requirements.md` attachment → the pipeline builds the web app, tests it, deploys it to Vercel, runs Playwright QA against the live URL, emails a bug report, and transitions the Jira story to Done or Bug Reported. Zero human intervention required.

## Architecture

```
index.js  (node-cron, every 5 min)
    │
    ├─ Stage 1: jiraClient.js      → Poll Jira for [AI-PIPELINE] stories, download requirements.md
    ├─ Stage 2: buildAgent.js      → Gemini 2.0 Flash writes index.html + app.js + style.css via function calling
    ├─ Stage 3: testRunner.js      → Gemini 2.0 Flash writes Jest tests; loop until all pass
    ├─ Stage 4: githubHandler.js   → Push files to GitHub branch via REST API, open PR
    ├─ Stage 5: vercelHandler.js   → Upload files to Vercel, poll until READY, health-check
    ├─ Stage 6: qaAgent.js         → Playwright opens live URL, Claude generates test steps, screenshots
    ├─ Stage 7: emailSender.js     → nodemailer (SMTP) or Resend API with screenshots attached
    └─ Stage 8: jiraClient.js      → Transition to Done or Bug Reported, add comment
```

## Key files
- `index.js` — entry point; cron schedule; full pipeline orchestration
- `config.js` — reads all env vars; throws on missing required vars
- `stages/buildAgent.js` — Claude tool-use loop that writes files to a temp workspace
- `stages/testRunner.js` — Jest setup + AI-written tests + self-healing fix loop
- `stages/githubHandler.js` — creates branch, pushes files, opens PR (all via GitHub REST API)
- `stages/vercelHandler.js` — SHA1-based file upload → deployment → polling → health check
- `stages/qaAgent.js` — Playwright browser automation with AI-generated test steps + screenshots
- `stages/emailSender.js` — SMTP via nodemailer or HTTP via Resend

## Conventions
- CommonJS (`require`) throughout — no ESM
- All stages export a single async function
- Errors propagate to `index.js`, which always closes the Jira story in a terminal state
- Temp workspaces (`os.tmpdir()/pipeline_<KEY>_...`) are cleaned up in `finally`

## Running the project
```bash
cp .env.example .env
# fill in .env values
npm install
npx playwright install chromium
npm start
```

## Jira story format required
- **Title:** `[AI-PIPELINE] <short description>`
- **Label:** `ai-ready`
- **Status:** `To Do`
- **Attachment:** a file named exactly `requirements.md`

## Do not touch
- `stages/` files — each maps exactly to one pipeline stage
- The `isRunning` guard in `index.js` — prevents re-entrant runs on slow pipelines
