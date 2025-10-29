// Simple helper to fetch Telegram updates and print chat_id for /start commands
// Usage:
// 1) Put your bot token in baken/.env as TELEGRAM_BOT_TOKEN=YOUR_TOKEN (do NOT commit)
// 2) From the baken folder run: node telegram_poll.js

require('dotenv').config();
const fetch = require('node-fetch');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set in .env or environment');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

async function poll() {
  try {
    const res = await fetch(`${API}/getUpdates`);
    const j = await res.json();
    if (!j.ok) {
      console.error('Telegram getUpdates failed', j);
      process.exit(1);
    }
    const updates = j.result || [];
    if (updates.length === 0) {
      console.log('No updates');
      return;
    }
    for (const u of updates) {
      // Some updates are messages, some edited messages, etc.
      const msg = u.message || u.edited_message || u.channel_post || null;
      if (!msg) continue;
      const text = (msg.text || '').trim();
      if (text.startsWith('/start')) {
        // /start or /start <code>
        const parts = text.split(/\s+/);
        const code = parts.length > 1 ? parts[1] : null;
        console.log('Found /start from chat id:', msg.chat && msg.chat.id, 'code:', code);
      }
    }
    // Optionally print raw updates for debugging
    // console.log(JSON.stringify(updates, null, 2));
  } catch (e) {
    console.error('poll error', e && e.message ? e.message : e);
  }
}

poll();
