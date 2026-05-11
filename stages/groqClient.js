const Groq = require('groq-sdk');
const { groq: cfg } = require('../config');

const groq = new Groq({ apiKey: cfg.apiKey });

// Retry on 429 rate-limit with exponential backoff
async function chat(params, retries = 4) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('429');
      if (!is429 || i === retries) throw err;

      // Parse retry-after from error message if available
      const match = err.message?.match(/try again in (\d+)m/);
      const waitMs = match ? parseInt(match[1]) * 60 * 1000 : (2 ** i) * 5000;
      const waitSec = Math.round(waitMs / 1000);

      console.log(`    ⚠ Groq rate limit — waiting ${waitSec}s before retry ${i + 1}/${retries}...`);
      await new Promise(r => setTimeout(r, Math.min(waitMs, 60000))); // cap at 60s per wait
    }
  }
}

module.exports = { chat, model: cfg.model };
