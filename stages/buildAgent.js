const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { gemini: cfg } = require('../config');

const genAI = new GoogleGenerativeAI(cfg.apiKey);

const functionDeclarations = [
  {
    name: 'write_file',
    description: 'Write a file to the output directory',
    parameters: {
      type: 'OBJECT',
      properties: {
        filename: { type: 'STRING', description: 'Filename, e.g. index.html, app.js, style.css' },
        content:  { type: 'STRING', description: 'Full file content' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'build_complete',
    description: 'Call this when all files have been written and the build is finished',
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING', description: 'Brief summary of what was built' },
      },
      required: ['summary'],
    },
  },
];

const SYSTEM_INSTRUCTION = `You are an expert web developer. Build web apps from requirements.

Rules:
1. Read the requirements completely before writing any code.
2. Always create exactly THREE separate files: index.html, app.js, style.css.
3. In app.js: write all logic as named functions. At the very end add:
   if (typeof module !== 'undefined') module.exports = { fn1, fn2, ... };
   (list every function — this lets Jest unit-test them while the browser still works normally)
4. index.html must use <script src="app.js"></script> and <link rel="stylesheet" href="style.css">.
5. No build step — must run directly in Chrome with no errors.
6. Mobile-responsive and visually polished.
7. After all files are written, call build_complete().`;

async function buildApp(requirements, jiraKey, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const model = genAI.getGenerativeModel({
    model: cfg.model,
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations }],
  });

  const chat = model.startChat({ generationConfig: { maxOutputTokens: 8192 } });
  const written = {};

  let result = await chat.sendMessage(
    `Build this web app for Jira story ${jiraKey}.\n\nRequirements:\n${requirements}\n\nWrite each file using write_file(), then call build_complete().`
  );

  while (true) {
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts.filter(p => p.functionCall);

    if (functionCalls.length === 0) break;

    let done = false;
    const functionResponses = [];

    for (const part of functionCalls) {
      const { name, args } = part.functionCall;

      if (name === 'write_file') {
        const { filename, content } = args;
        const filepath = path.join(outputDir, filename);
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
        fs.writeFileSync(filepath, content, 'utf8');
        written[filename] = content;
        console.log(`    ✓ Written: ${filename}`);
        functionResponses.push({
          functionResponse: { name, response: { result: 'Written successfully' } },
        });
      } else if (name === 'build_complete') {
        console.log(`    ✓ Build complete: ${args.summary}`);
        done = true;
        functionResponses.push({
          functionResponse: { name, response: { result: 'Pipeline continues' } },
        });
      }
    }

    if (done) break;
    result = await chat.sendMessage(functionResponses);
  }

  return written;
}

module.exports = { buildApp };
