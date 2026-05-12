# Zero Human Touch Pipeline

> A fully automated, end-to-end software delivery pipeline. A PM drops a Jira story — the pipeline builds, tests, deploys, QA-tests, emails a bug report, and closes the loop. Zero human intervention.

---

## How It Works

```
Jira story created  (label: ai-ready)
        │
        ├─ Stage 1  Poll Jira every 5 min — download requirements.md
        ├─ Stage 2  AI agent builds index.html + app.js + style.css  (Groq LLaMA)
        ├─ Stage 3  Write & run Jest unit tests — self-heals on failure
        ├─ Stage 4  Push single commit to this repo — open Pull Request
        ├─ Stage 5  Detect Vercel preview deployment via REST API — poll until READY
        ├─ Stage 6  Playwright opens live URL — tests every acceptance criterion
        ├─ Stage 7  Email bug report + screenshots via SMTP
        └─ Stage 8  Transition Jira story to Done or In Review
```

---

## Tech Stack

| Stage | Tool |
|-------|------|
| Scheduler | `node-cron` (every 5 min) |
| Jira | Jira REST API v3 |
| AI Build | Groq SDK — LLaMA 3.3 70B / 3.1 8B fallback |
| Unit Tests | Jest + jsdom + Babel |
| GitHub | GitHub REST API (Trees API — single commit) |
| Vercel | Vercel REST API v6 — polls auto-triggered preview deploy |
| QA | Playwright Chromium (headless) |
| Email | nodemailer (Gmail SMTP) |

---

## Setup

```bash
git clone https://github.com/alihahussain-creator/fwdtakehomeassignment
cd fwdtakehomeassignment
npm install
npx playwright install chromium
cp .env.example .env
# Fill in .env values (see below)
npm start
```

---

## Environment Variables

```env
# Jira
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=AS

# Groq (free tier)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# GitHub
GITHUB_TOKEN=your_github_pat
GITHUB_REPO=owner/repo-connected-to-vercel

# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_PROJECT_NAME=your-vercel-project-name
VERCEL_SCOPE=your-vercel-team-slug

# Email (Gmail SMTP)
EMAIL_FROM=you@gmail.com
EMAIL_TO=recipient@company.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_gmail_app_password
```

---

## Jira Story Format

Every story must follow this format to be picked up:

| Field | Value |
|-------|-------|
| **Title** | `[AI-PIPELINE] <short description>` |
| **Label** | `ai-ready` |
| **Status** | `To Do` |
| **Attachment** | `requirements.md` (describes the app to build) |

---

## Pipeline Stages

### Stage 1 — Jira Poll
Polls every 5 minutes for stories matching `project = X AND labels = ai-ready AND status = "To Do"`. Downloads `requirements.md` and transitions the story to `In Progress` immediately so it won't be picked up again.

### Stage 2 — AI Build
Groq LLaMA reads `requirements.md` and generates `index.html`, `app.js`, `style.css`. Falls back from 70B to 8B model if the daily token limit is hit. Retries up to 3 times for missing files.

### Stage 3 — Unit Tests
AI writes Jest tests, runs them, and self-heals on failure (up to 3 fix iterations). Falls back to deterministic structural tests if AI tests keep failing.

### Stage 4 — GitHub
Uses the GitHub Trees API to push all 3 web files in a **single commit** (one webhook = one Vercel deployment). Opens a Pull Request titled `[JIRA-KEY] AI Pipeline: Web App`.

### Stage 5 — Vercel Deploy
Polls `GET /v6/deployments?app=PROJECT` to find the preview deployment auto-triggered by the GitHub push. Waits for `state: READY`, extracts the live URL, and health-checks it (200 OK).

### Stage 6 — QA Agent
Playwright loads the live URL, extracts real DOM elements (input IDs, button IDs), passes them to the AI to generate valid Playwright selectors, then tests every acceptance criterion and takes screenshots.

### Stage 7 — Email
Sends a `QA Report — JIRA-KEY — PASS/FAIL` email with the full bug report body and all screenshots attached via Gmail SMTP.

### Stage 8 — Close the Loop
- **PASS**: Transitions story to `Done`, adds comment with deploy URL + PR link
- **PARTIAL/FAIL**: Transitions to `In Review`, adds full bug report as a comment
- Story is **never** left stuck in `In Progress`

---

## Output per Run

```
/tmp/pipeline_AS-XX_<hash>/
  ├── requirements.md
  ├── index.html
  ├── app.js
  ├── style.css
  ├── app.test.js
  ├── test-results.txt
  ├── bug-report.md
  └── screenshots/
      ├── screenshot-01-initial-load.png
      ├── screenshot-02-fill.png
      └── ...
```

---

## Assignment

Built for the **Practical AI Workflows** take-home assignment at Clustox.
Deadline: 12 May 2026
