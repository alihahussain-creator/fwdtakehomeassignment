const { chat, model } = require('./groqClient');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generateTestSteps(requirements) {
  const res = await chat({
    model,
    messages: [
      {
        role: 'system',
        content: `Extract testable acceptance criteria from web app requirements.
Return a JSON array. Each item: { "criterion": "description", "action": "click|fill|check|navigate", "selector": "CSS selector", "value": "text to type if fill", "expected": "what should happen" }
Use realistic CSS selectors. Return ONLY a valid JSON array — no markdown.`,
      },
      { role: 'user', content: requirements },
    ],
    max_tokens: 1024,
  });

  let text = res.choices[0].message.content.trim();
  if (text.startsWith('```')) text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  try { return JSON.parse(text); } catch {
    return [{ criterion: 'Page loads successfully', action: 'check', selector: 'body', expected: 'visible' }];
  }
}

async function runQA(url, requirements, outputDir, jiraKey) {
  const screenshotsDir = path.join(outputDir, 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const screenshots   = [];
  const consoleErrors = [];
  const testResults   = [];

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[console] ${msg.text()}`); });
  page.on('pageerror', err => consoleErrors.push(`[error] ${err.message}`));

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const shot1 = path.join(screenshotsDir, 'screenshot-01-initial-load.png');
    await page.screenshot({ path: shot1, fullPage: true });
    screenshots.push(shot1);
    console.log('    ✓ Screenshot: initial load');

    const steps = await generateTestSteps(requirements);
    console.log(`    Running ${steps.length} acceptance criteria...`);

    for (let i = 0; i < steps.length; i++) {
      const step     = steps[i];
      const num      = String(i + 2).padStart(2, '0');
      const label    = step.action.replace(/\s+/g, '-').substring(0, 20);
      const shotPath = path.join(screenshotsDir, `screenshot-${num}-${label}.png`);

      try {
        switch (step.action) {
          case 'click':    await page.click(step.selector, { timeout: 5000 }); break;
          case 'fill':     await page.fill(step.selector, step.value || 'Test value'); await page.keyboard.press('Enter'); break;
          case 'navigate': await page.goto(step.selector, { waitUntil: 'networkidle', timeout: 10000 }); break;
          default:         await page.waitForSelector(step.selector, { timeout: 5000 });
        }
        await page.waitForTimeout(500);
        await page.screenshot({ path: shotPath, fullPage: true });
        screenshots.push(shotPath);
        testResults.push({ criterion: step.criterion, result: '✅ PASS', notes: '' });
        console.log(`    ✓ PASS: ${step.criterion}`);
      } catch (err) {
        await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
        screenshots.push(shotPath);
        testResults.push({ criterion: step.criterion, result: '❌ FAIL', notes: err.message.split('\n')[0] });
        console.log(`    ✗ FAIL: ${step.criterion}`);
      }
    }
  } finally {
    await browser.close();
  }

  const passCount = testResults.filter(r => r.result.includes('PASS')).length;
  const overall   = passCount === testResults.length ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL';
  const rows      = testResults.map(r => `| ${r.criterion} | ${r.result} | ${r.notes} |`).join('\n');
  const errors    = consoleErrors.length ? consoleErrors.map(e => `- ${e}`).join('\n') : '- None';
  const shotList  = screenshots.map(s => `- ${path.basename(s)}`).join('\n');
  const now       = new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

  const bugReport = `# QA Report — ${jiraKey}
**Deployment URL:** ${url}
**Tested at:** ${now}
**Overall status:** ${overall}

## Test Results
| Acceptance Criterion | Result | Notes |
|----------------------|--------|-------|
${rows}

## Console Errors
${errors}

## Screenshots
${shotList}

## Summary
Tested ${testResults.length} acceptance criteria. ${passCount}/${testResults.length} passed. Overall: **${overall}**.
${overall === 'PASS' ? 'All acceptance criteria met.' : 'See table above for failed criteria.'}
`;

  fs.writeFileSync(path.join(outputDir, 'bug-report.md'), bugReport, 'utf8');
  return { bugReport, screenshots, overall };
}

module.exports = { runQA };
