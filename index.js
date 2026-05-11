require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const jira = require('./stages/jiraClient');
const { buildApp } = require('./stages/buildAgent');
const { writeAndRunTests } = require('./stages/testRunner');
const { pushAndPR } = require('./stages/githubHandler');
const { deploy } = require('./stages/vercelHandler');
const { runQA } = require('./stages/qaAgent');
const { sendReport } = require('./stages/emailSender');

let isRunning = false;

async function runPipeline() {
  if (isRunning) {
    console.log('[pipeline] Already running — skipping this tick');
    return;
  }
  isRunning = true;

  const sep = '='.repeat(60);
  console.log(`\n${sep}`);
  console.log(`[${new Date().toISOString()}] 🔍 Polling Jira for ai-ready stories...`);

  let stories;
  try {
    stories = await jira.getReadyStories();
  } catch (err) {
    console.error('[stage 1] Failed to poll Jira:', err.message);
    isRunning = false;
    return;
  }

  if (!stories.length) {
    console.log('No new stories found.');
    isRunning = false;
    return;
  }

  for (const story of stories) {
    const issueKey = story.key;
    const summary = story.fields.summary;
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `pipeline_${issueKey}_`));

    console.log(`\n📥 Processing: ${issueKey} — ${summary}`);
    console.log(`   Workspace: ${workspace}`);

    try {
      // ── Stage 1: Download requirements ───────────────────────────
      console.log('\n[Stage 1] Downloading requirements.md from Jira...');
      await jira.transitionIssue(issueKey, 'In Progress');
      const requirements = await jira.getRequirementsContent(issueKey);
      if (!requirements) throw new Error('No requirements.md attachment found on story');
      fs.writeFileSync(path.join(workspace, 'requirements.md'), requirements, 'utf8');
      console.log('  ✓ Requirements downloaded');

      // ── Stage 2: Build ────────────────────────────────────────────
      console.log('\n[Stage 2] Building web app with Claude...');
      const files = await buildApp(requirements, issueKey, workspace);
      console.log(`  ✓ Built ${Object.keys(files).length} files`);

      // ── Stage 3: Unit Tests ───────────────────────────────────────
      console.log('\n[Stage 3] Writing and running unit tests...');
      const { passed: testsPassed, output: testOutput } = await writeAndRunTests(
        requirements, files, workspace
      );
      console.log(`  ${testsPassed ? '✓ Tests passed' : '⚠ Tests did not fully pass (continuing pipeline)'}`);

      // ── Stage 4: GitHub ───────────────────────────────────────────
      console.log('\n[Stage 4] Pushing to GitHub and opening PR...');
      const { prUrl, branch } = await pushAndPR(workspace, issueKey, summary);
      console.log(`  ✓ PR opened: ${prUrl}`);

      // ── Stage 5: Vercel Deploy ────────────────────────────────────
      console.log('\n[Stage 5] Deploying to Vercel...');
      const deployUrl = await deploy(workspace);
      console.log(`  ✓ Live at: ${deployUrl}`);

      // ── Stage 6: QA with Playwright ───────────────────────────────
      console.log('\n[Stage 6] Running Playwright QA against live site...');
      const { bugReport, screenshots, overall } = await runQA(
        deployUrl, requirements, workspace, issueKey
      );
      console.log(`  ✓ QA overall: ${overall}`);

      // ── Stage 7: Email Report ─────────────────────────────────────
      console.log('\n[Stage 7] Sending bug report email...');
      await sendReport(issueKey, bugReport, screenshots, overall);

      // ── Stage 8: Close Loop in Jira ───────────────────────────────
      console.log('\n[Stage 8] Updating Jira story...');
      if (overall === 'PASS') {
        await jira.transitionIssue(issueKey, 'Done');
        await jira.addComment(
          issueKey,
          `✅ Pipeline completed successfully!\n\nDeployment: ${deployUrl}\nPR: ${prUrl}\nUnit tests: ${testsPassed ? 'PASS' : 'FAIL'}\n\nAll QA acceptance criteria passed.`
        );
      } else {
        const fallbackTransitions = ['In Review', 'Done'];
        for (const t of fallbackTransitions) {
          try { await jira.transitionIssue(issueKey, t); break; } catch {}
        }

        await jira.addComment(
          issueKey,
          `⚠️ QA found issues (${overall}).\n\nDeployment: ${deployUrl}\nPR: ${prUrl}\n\n${bugReport}`
        );
      }

      console.log(`\n✅ Pipeline complete for ${issueKey}!`);

    } catch (err) {
      console.error(`\n❌ Pipeline failed for ${issueKey}:`, err.message);
      console.error(err.stack);

      // Always close the Jira story — never leave it stuck In Progress
      try {
        await jira.addComment(
          issueKey,
          `❌ Pipeline error — manual review needed.\n\nError: ${err.message}\n\nStack:\n${err.stack || ''}`
        );
      } catch {}

      const fallbackTransitions = ['In Review', 'Done'];
      for (const t of fallbackTransitions) {
        try { await jira.transitionIssue(issueKey, t); break; } catch {}
      }
    } finally {
      try { fs.rmSync(workspace, { recursive: true, force: true }); } catch {}
    }
  }

  isRunning = false;
}

// ── Entry point ──────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   Zero Human Touch Pipeline  —  Node.js          ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('Polling Jira every 5 minutes for [AI-PIPELINE] stories');
console.log('Label filter: ai-ready  |  Status filter: To Do');
console.log('Press Ctrl+C to stop.\n');

// Run once immediately on start
runPipeline();

// Then every 5 minutes
cron.schedule('*/5 * * * *', runPipeline);
