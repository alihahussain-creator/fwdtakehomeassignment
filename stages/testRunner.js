const { chat, model } = require('./groqClient');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function setupTestEnv(dir) {
  const pkgPath = path.join(dir, 'package.json');
  let pkg = {};
  if (fs.existsSync(pkgPath)) {
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch {}
  }
  pkg.scripts = { ...pkg.scripts, test: 'jest --forceExit --no-coverage' };
  pkg.devDependencies = { ...pkg.devDependencies, jest: '^29.7.0', 'jest-environment-jsdom': '^29.7.0' };
  pkg.jest = { testEnvironment: 'jsdom', transform: {} };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  execSync('npm install --silent', { cwd: dir, stdio: 'pipe', timeout: 120000 });
}

async function ask(system, user) {
  const res = await chat({
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: 4096,
  });
  return res.choices[0].message.content.trim();
}

function stripFences(text) {
  return text.startsWith('```') ? text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim() : text;
}

async function writeTests(requirements, files, dir) {
  const filesContent = Object.entries(files).map(([n, c]) => `--- ${n} ---\n${c}`).join('\n\n');

  let text = await ask(
    `Write Jest unit tests for a web app.
- Use const { fn1, fn2 } = require('./app.js') to import exported functions
- Jest environment is jsdom (already configured)
- Test every exported function with meaningful assertions
- Cover each acceptance criterion from the requirements
- Return ONLY raw JavaScript — no markdown fences, no explanation`,
    `Requirements:\n${requirements}\n\nSource files:\n${filesContent}\n\nWrite app.test.js:`
  );

  text = stripFences(text);
  fs.writeFileSync(path.join(dir, 'app.test.js'), text, 'utf8');
  return text;
}

function runTests(dir) {
  const result = spawnSync('npx', ['jest', '--forceExit', '--no-coverage'], {
    cwd: dir, encoding: 'utf8', timeout: 60000,
  });
  return { passed: result.status === 0, output: (result.stdout || '') + '\n' + (result.stderr || '') };
}

async function fixFailure(requirements, dir, failureOutput) {
  const appJs  = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  const testJs = fs.readFileSync(path.join(dir, 'app.test.js'), 'utf8');

  let text = await ask(
    `Fix failing Jest tests. Return a JSON object:
{ "app.js": "...fixed content...", "test": "...fixed test content..." }
Only include keys for files you changed. Return ONLY valid JSON — no markdown.`,
    `Requirements:\n${requirements}\n\napp.js:\n${appJs}\n\napp.test.js:\n${testJs}\n\nFailures:\n${failureOutput}\n\nReturn JSON:`
  );

  text = stripFences(text);
  try { return JSON.parse(text); } catch { return {}; }
}

async function writeAndRunTests(requirements, files, dir, maxIterations = 5) {
  console.log('    Setting up Jest environment...');
  setupTestEnv(dir);

  console.log('    Writing tests with Groq...');
  await writeTests(requirements, files, dir);

  for (let i = 1; i <= maxIterations; i++) {
    console.log(`    Running tests (attempt ${i}/${maxIterations})...`);
    const { passed, output } = runTests(dir);
    fs.writeFileSync(path.join(dir, 'test-results.txt'), output, 'utf8');

    if (passed) { console.log('    ✓ All tests passing!'); return { passed: true, output }; }
    if (i === maxIterations) { console.log('    ✗ Tests still failing after max iterations'); return { passed: false, output }; }

    console.log('    ✗ Tests failed — asking Groq to fix...');
    const fixes = await fixFailure(requirements, dir, output);
    if (fixes['app.js']) fs.writeFileSync(path.join(dir, 'app.js'), fixes['app.js'], 'utf8');
    if (fixes['test'])   fs.writeFileSync(path.join(dir, 'app.test.js'), fixes['test'], 'utf8');
  }

  return { passed: false, output: 'Max iterations reached' };
}

module.exports = { writeAndRunTests };
