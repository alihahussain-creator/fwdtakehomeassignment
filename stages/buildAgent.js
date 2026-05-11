const { chat, model } = require('./groqClient');
const fs = require('fs');
const path = require('path');

const tools = [
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write a file to the output directory',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Filename e.g. index.html, app.js, style.css' },
          content:  { type: 'string', description: 'Full file content' },
        },
        required: ['filename', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_complete',
      description: 'Call this when all files have been written and the build is finished',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Brief summary of what was built' },
        },
        required: ['summary'],
      },
    },
  },
];

const SYSTEM = `You are an expert web developer. Build web apps from requirements.

Rules:
1. Always create THREE separate files: index.html, app.js, style.css.
2. In app.js write all logic as named functions. At the very end add:
   if (typeof module !== 'undefined') module.exports = { fn1, fn2, ... };
   (lists every function — enables Jest testing while browser still works)
3. index.html uses <script src="app.js"></script> and <link rel="stylesheet" href="style.css">.
4. No build step — must run directly in Chrome, zero console errors.
5. Mobile-responsive and visually polished.
6. Write all files using write_file(), then call build_complete().`;

async function buildApp(requirements, jiraKey, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Build this web app for Jira story ${jiraKey}.\n\nRequirements:\n${requirements}` },
  ];

  const written = {};

  while (true) {
    const response = await chat({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 8192,
    });

    const msg = response.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) break;

    let done = false;
    for (const call of msg.tool_calls) {
      const name = call.function.name;
      const args = JSON.parse(call.function.arguments);

      if (name === 'write_file') {
        const { filename, content } = args;
        const filepath = path.join(outputDir, filename);
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
        fs.writeFileSync(filepath, content, 'utf8');
        written[filename] = content;
        console.log(`    ✓ Written: ${filename}`);
        messages.push({ role: 'tool', tool_call_id: call.id, content: 'Written successfully' });
      } else if (name === 'build_complete') {
        console.log(`    ✓ Build complete: ${args.summary}`);
        done = true;
        messages.push({ role: 'tool', tool_call_id: call.id, content: 'Pipeline continues' });
      }
    }

    if (done) break;
  }

  return written;
}

module.exports = { buildApp };
