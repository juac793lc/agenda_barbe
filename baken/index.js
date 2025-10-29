require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const webpush = require('web-push');

const app = express();
app.use(cors());
app.use(express.json());

const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
// anon key (clients). If not present (local dev), fall back to service role key for server-side operations.
const SUPA_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
// Service role key - use only on the server (baken)
const SUPA_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize web-push VAPID details if provided. VAPID_PRIVATE_KEY must stay on server.
let webpushEnabled = false;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:your-email@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    webpushEnabled = true;
    console.log('Web Push VAPID initialized.');
  } catch (e) {
    console.warn('Warning: could not set VAPID details — invalid keys or format. Web Push will be disabled until valid VAPID keys are provided.');
    console.warn(e && e.message ? e.message : e);
    webpushEnabled = false;
  }
} else {
  console.log('VAPID keys not provided; Web Push disabled.');
}

// Telegram configuration (optional single-owner flow)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || null;
const TELEGRAM_OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || null;
const telegramEnabled = !!(TELEGRAM_BOT_TOKEN && TELEGRAM_OWNER_CHAT_ID);
if (telegramEnabled) console.log('Telegram notifications enabled for chat', TELEGRAM_OWNER_CHAT_ID);

async function supaFetch(path, opts = {}) {
  // allow passing a full URL in `path`, or build from SUPA_URL + /rest/v1
  if (!path) throw new Error('supaFetch requires a path');
  const url = (path.startsWith('http://') || path.startsWith('https://')) ? path : (SUPA_URL ? `${SUPA_URL}/rest/v1${path}` : null);
  if (!url) {
    console.error('SUPABASE_URL is not configured. Set SUPABASE_URL in .env');
    throw new Error('SUPABASE_URL not configured');
  }

  const headers = Object.assign({
    apikey: SUPA_KEY,
    Authorization: `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  }, opts.headers || {});

  // retry loop for transient network errors (ETIMEDOUT, ECONNRESET, etc.)
  const maxAttempts = opts._retry || 3;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const res = await fetch(url, Object.assign({}, opts, { headers }));
      const text = await res.text();
      try { return { ok: res.ok, status: res.status, body: JSON.parse(text) }; }
      catch (e) { return { ok: res.ok, status: res.status, body: text }; }
    } catch (err) {
      // network error
      const isTransient = (err && err.code && ['ETIMEDOUT','ECONNRESET','EAI_AGAIN','ENOTFOUND'].includes(err.code)) || err.type === 'system';
      console.warn(`supaFetch attempt ${attempt} error:`, err && err.message ? err.message : err);
      if (!isTransient || attempt >= maxAttempts) {
        throw err;
      }
      // exponential backoff
      const backoff = 200 * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, backoff));
      continue;
    }
  }
}

// Administrative fetch using service_role key. Use only in server-side code.
async function supaFetchAdmin(path, opts = {}) {
  // allow passing a full URL in `path`, or build from SUPA_URL + /rest/v1
  if (!path) throw new Error('supaFetchAdmin requires a path');
  const url = (path.startsWith('http://') || path.startsWith('https://')) ? path : (SUPA_URL ? `${SUPA_URL}/rest/v1${path}` : null);
  if (!url) {
    console.error('SUPABASE_URL is not configured. Set SUPABASE_URL in .env');
    throw new Error('SUPABASE_URL not configured');
  }

  const headers = Object.assign({
    apikey: SUPA_SERVICE_ROLE,
    Authorization: `Bearer ${SUPA_SERVICE_ROLE}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  }, opts.headers || {});

  const maxAttempts = opts._retry || 3;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const res = await fetch(url, Object.assign({}, opts, { headers }));
      const text = await res.text();
      try { return { ok: res.ok, status: res.status, body: JSON.parse(text) }; }
      catch (e) { return { ok: res.ok, status: res.status, body: text }; }
    } catch (err) {
      const isTransient = (err && err.code && ['ETIMEDOUT','ECONNRESET','EAI_AGAIN','ENOTFOUND'].includes(err.code)) || err.type === 'system';
      console.warn(`supaFetchAdmin attempt ${attempt} error:`, err && err.message ? err.message : err);
      if (!isTransient || attempt >= maxAttempts) {
        throw err;
      }
      const backoff = 200 * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, backoff));
      continue;
    }
  }
}

app.get('/services', async (req, res) => {
  try {
    const r = await supaFetch('/services?select=id,title,description,price', { method: 'GET' });
    if (!r.ok) return res.status(502).json({ error: 'supabase error', status: r.status, body: r.body });
    res.json(r.body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Expose the VAPID public key for clients to subscribe to Push (safe to share publicly)
app.get('/vapidPublicKey', async (req, res) => {
  try {
    return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null, enabled: webpushEnabled });
  } catch (err) {
    console.error('vapidPublicKey error', err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/appointments', async (req, res) => {
  try {
    const { date } = req.query || {};
    let qs = '?select=*&order=date.asc,time.asc';
    if (date) qs = `?select=*&date=eq.${date}&order=time.asc`;
    const r = await supaFetch(`/barber_teste${qs}`, { method: 'GET' });
    if (!r.ok) return res.status(502).json({ error: 'supabase error', status: r.status, body: r.body });
    res.json(r.body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/appointments', async (req, res) => {
  try {
    const { name, service, date, time } = req.body;
    if (!name || !service || !date || !time) return res.status(400).json({ error: 'missing fields' });
    // compute appointment_at (timestamptz) from date + time and a default notification_at 1 hour before
    let appointment_at = null;
    let notification_at = null;
    try {
      // date expected as YYYY-MM-DD, time as HH:mm or HH:mm:ss
      const iso = `${date}T${time}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        appointment_at = d.toISOString();
        // default notification 1 hour before
        notification_at = new Date(d.getTime() - 60 * 60 * 1000).toISOString();
      }
    } catch (e) {
      // leave as null
      console.warn('could not parse date/time for appointment_at', e && e.message ? e.message : e);
    }
    // Generate an owner token to allow future delete operations from the client
    const crypto = require('crypto');
    const owner_token = crypto.randomBytes(16).toString('hex');

    // Try inserting owner_token into the row if the column exists. If it doesn't, fall back to inserting without it but still return the token to the client.
    const payloadWithToken = [{ name, service, date, time, appointment_at, notification_at, notification_sent: false, owner_token }];
    let r = await supaFetch('/barber_teste', { method: 'POST', body: JSON.stringify(payloadWithToken) });
    if (!r.ok) {
      // If the error mentions missing column 'owner_token', retry without that column and still return the token to the client (best-effort)
      const msg = (r.body && r.body.message) ? String(r.body.message) : '';
      if (/column .*owner_token.* does not exist|owner_token/i.test(msg)) {
        const payload = [{ name, service, date, time, appointment_at, notification_at, notification_sent: false }];
        r = await supaFetch('/barber_teste', { method: 'POST', body: JSON.stringify(payload) });
        // attach the token in the response object we send back to the client (not persisted)
        if (r.ok) {
            const inserted = Array.isArray(r.body) ? (r.body.length > 0 ? r.body[0] : null) : r.body;
            if (inserted) {
              inserted.owner_token = owner_token;
              // If Telegram is enabled, try to send immediate notification even when owner_token column
              // doesn't exist in DB (we returned the token to client but still should notify owner).
              if (inserted && telegramEnabled) {
                try {
                  const tgApi = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
                  const text = `Nueva cita:\nNombre: ${inserted.name}\nServicio: ${inserted.service || ''}\nFecha: ${inserted.date || ''}\nHora: ${inserted.time || ''}`;
                  const tgRes = await fetch(tgApi, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: TELEGRAM_OWNER_CHAT_ID, text })
                  });
                  let tgBody = null;
                  try { tgBody = await tgRes.json(); } catch (e) { tgBody = await tgRes.text(); }
                  if (!tgRes.ok || (tgBody && tgBody.ok === false)) {
                    console.warn('Telegram send failed on appointment create (fallback path)', tgRes.status, tgBody);
                    try {
                      await supaFetchAdmin('/telegram_logs', { method: 'POST', body: JSON.stringify([{
                        appointment_id: inserted.id,
                        owner_chat_id: TELEGRAM_OWNER_CHAT_ID,
                        sent_at: new Date().toISOString(),
                        delivered: false,
                        response: tgBody
                      }]) });
                    } catch (logErr) {
                      console.warn('Failed to write telegram_logs', logErr && logErr.message ? logErr.message : logErr);
                    }
                  } else {
                    console.log('Telegram message sent for new appointment (fallback path)', inserted.id);
                    try {
                      await supaFetchAdmin('/telegram_logs', { method: 'POST', body: JSON.stringify([{
                        appointment_id: inserted.id,
                        owner_chat_id: TELEGRAM_OWNER_CHAT_ID,
                        sent_at: new Date().toISOString(),
                        delivered: true,
                        response: tgBody
                      }]) });
                    } catch (logErr) {
                      console.warn('Failed to write telegram_logs', logErr && logErr.message ? logErr.message : logErr);
                    }
                  }
                } catch (tgErr) {
                  console.warn('Telegram send error on appointment create (fallback path)', tgErr && tgErr.message ? tgErr.message : tgErr);
                }
              }

              return res.json(inserted);
            }
          }
      }
    }
    if (!r.ok) return res.status(502).json({ error: 'supabase error', status: r.status, body: r.body });
    // Supabase returns an array of inserted rows. Normalize to a single object to match client expectations.
    const inserted = Array.isArray(r.body) ? (r.body.length > 0 ? r.body[0] : null) : r.body;

    // If Telegram is enabled, send an immediate notification to the owner about the new appointment
    if (inserted && telegramEnabled) {
      try {
        const tgApi = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
          // Telegram: formato multi-línea al crear la cita (owner)
          const text = `Nueva cita:\nNombre: ${inserted.name}\nServicio: ${inserted.service || ''}\nFecha: ${inserted.date || ''}\nHora: ${inserted.time || ''}`;
        const tgRes = await fetch(tgApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_OWNER_CHAT_ID, text })
        });
        let tgBody = null;
        try { tgBody = await tgRes.json(); } catch (e) { tgBody = await tgRes.text(); }
        if (!tgRes.ok || (tgBody && tgBody.ok === false)) {
          console.warn('Telegram send failed on appointment create', tgRes.status, tgBody);
          try {
            await supaFetchAdmin('/telegram_logs', { method: 'POST', body: JSON.stringify([{
              appointment_id: inserted.id,
              owner_chat_id: TELEGRAM_OWNER_CHAT_ID,
              sent_at: new Date().toISOString(),
              delivered: false,
              response: tgBody
            }]) });
          } catch (logErr) {
            console.warn('Failed to write telegram_logs', logErr && logErr.message ? logErr.message : logErr);
          }
        } else {
          console.log('Telegram message sent for new appointment', inserted.id);
          try {
            await supaFetchAdmin('/telegram_logs', { method: 'POST', body: JSON.stringify([{
              appointment_id: inserted.id,
              owner_chat_id: TELEGRAM_OWNER_CHAT_ID,
              sent_at: new Date().toISOString(),
              delivered: true,
              response: tgBody
            }]) });
          } catch (logErr) {
            console.warn('Failed to write telegram_logs', logErr && logErr.message ? logErr.message : logErr);
          }
        }
      } catch (tgErr) {
        console.warn('Telegram send error on appointment create', tgErr && tgErr.message ? tgErr.message : tgErr);
      }
    }

    // Return created appointment (or raw body) to the client.
    // If we inserted owner_token in DB it will be present in `inserted`; otherwise ensure we include the owner_token we generated.
    if (inserted) {
      if (!inserted.owner_token) inserted.owner_token = owner_token;
      return res.json(inserted);
    }
    const bodyToReturn = Array.isArray(r.body) && r.body.length > 0 ? r.body[0] : r.body;
    if (!bodyToReturn.owner_token) bodyToReturn.owner_token = owner_token;
    return res.json(bodyToReturn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Save a push subscription coming from the browser client.
// Expects body: { subscription: { endpoint, keys: { p256dh, auth } }, user_id?: <uuid|string> }
app.post('/subscribe', async (req, res) => {
  try {
    const { subscription, user_id } = req.body || {};
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'invalid subscription' });

    // Normalize subscription and try inserting into columns that most schemas use.
    // Many Supabase examples store endpoint + keys_p256dh + keys_auth. We'll try that first.
    const base = { user_id: user_id || null };

    const endpoint = subscription.endpoint || null;
    const keysObj = (subscription.keys && typeof subscription.keys === 'object') ? subscription.keys : null;
    const p256dh = keysObj && keysObj.p256dh ? keysObj.p256dh : (subscription.p256dh || subscription.keys_p256dh || null);
    const auth = keysObj && keysObj.auth ? keysObj.auth : (subscription.auth || subscription.keys_auth || null);

    const metadata = req.body.metadata || null;

    const candidates = [];

  // Preferred order: use explicit columns that your schema contains (endpoint, keys_p256dh, keys_auth, metadata)
  const explicit = Object.assign({}, base, { endpoint, keys_p256dh: p256dh, keys_auth: auth, metadata });
  candidates.push(explicit);

  // Fallback: try storing the whole subscription JSON in various column names
  candidates.push(Object.assign({}, base, { endpoint, subscription }));
  candidates.push(Object.assign({}, base, { endpoint, subscription_payload: subscription }));
  candidates.push(Object.assign({}, base, { endpoint, payload: subscription }));
  candidates.push(Object.assign({}, base, { endpoint, data: subscription }));
  candidates.push(Object.assign({}, base, { endpoint, sub: subscription }));
    candidates.push(Object.assign({}, base, { endpoint, subscription_payload: subscription }));
    candidates.push(Object.assign({}, base, { endpoint, payload: subscription }));
    candidates.push(Object.assign({}, base, { endpoint, data: subscription }));
    candidates.push(Object.assign({}, base, { endpoint, sub: subscription }));

    let lastErr = null;
    for (const cand of candidates) {
      try {
        const r = await supaFetchAdmin('/push_subscriptions', { method: 'POST', body: JSON.stringify([cand]) });
        if (r.ok) {
          if (Array.isArray(r.body) && r.body.length > 0) return res.json(r.body[0]);
          return res.json(r.body);
        } else {
          lastErr = r;
          // If the error mentions missing column(s) related to subscription, try next candidate.
          const msg = (r.body && r.body.message) ? String(r.body.message) : '';
          if (/subscription/i.test(msg) || /Could not find/i.test(msg) || /column .* does not exist/i.test(msg)) {
            continue;
          }
          return res.status(502).json({ error: 'supabase error', status: r.status, body: r.body });
        }
      } catch (e) {
        lastErr = e;
      }
    }
    console.error('subscribe insert failures', lastErr);
    return res.status(500).json({ error: 'could not insert subscription', detail: lastErr });
  } catch (err) {
    console.error('subscribe error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Worker: every minute, find appointments with notification_at <= now and notification_sent = false
// and send web-push notifications to stored subscriptions. Logs deliveries to notification_logs
// and marks appointments as notification_sent = true on success (best-effort).
async function processPendingNotifications() {
  if (!webpushEnabled) return; // nothing to do
  try {
    const now = new Date().toISOString();
    const q = `/barber_teste?notification_sent=eq.false&notification_at=lte.${encodeURIComponent(now)}&select=*`;
    const r = await supaFetchAdmin(q, { method: 'GET' });
    if (!r.ok) { console.warn('Could not fetch pending appointments', r.status, r.body); return; }
    const appointments = Array.isArray(r.body) ? r.body : [];
    if (appointments.length === 0) return;

    for (const appt of appointments) {
      // Fetch subscriptions per-appointment: prefer those for the appointment's user_id when available.
      let subscriptions = [];
      try {
        let subsPath = '/push_subscriptions?select=*';
        if (appt.user_id) {
          // filter by user_id to send only to the user who created the appointment
          subsPath = `/push_subscriptions?user_id=eq.${encodeURIComponent(appt.user_id)}&select=*`;
        } else {
          // no user_id on appointment - fallback to global (existing behavior)
          console.warn('Appointment', appt.id, 'has no user_id; falling back to sending to all subscriptions');
        }
        const subsRes = await supaFetchAdmin(subsPath, { method: 'GET' });
        if (!subsRes.ok) { console.warn('Could not fetch subscriptions', subsRes.status, subsRes.body); continue; }
        subscriptions = Array.isArray(subsRes.body) ? subsRes.body : [];
      } catch (subFetchErr) {
        console.warn('Failed to fetch subscriptions for appointment', appt.id, subFetchErr && subFetchErr.message ? subFetchErr.message : subFetchErr);
        continue;
      }
      // Payload for web-push: include separate date/time fields and a human-readable body
      // Mensagem amistosa em português (título curto + corpo amigável)
      const payload = JSON.stringify({
        title: `Não esqueça! Hoje às ${appt.time || ''}`,
        body: `Oi ${appt.name}, sua sessão de ${appt.service || ''} é hoje às ${appt.time || ''}. Venha se preparar!`,
        appointment_id: appt.id,
        appointment_date: appt.date || null,
        appointment_time: appt.time || null
      });

      for (const s of subscriptions) {
        // Determine subscription object from various possible column names/formats
        let subObj = null;
        if (s.subscription && typeof s.subscription === 'object') subObj = s.subscription;
        else if (s.subscription_payload && typeof s.subscription_payload === 'object') subObj = s.subscription_payload;
        else if (s.payload && typeof s.payload === 'object') subObj = s.payload;
        else if (s.data && typeof s.data === 'object') subObj = s.data;
        else if (s.sub && typeof s.sub === 'object') subObj = s.sub;
  else if (s.endpoint && s.p256dh && s.auth) subObj = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
  // Accept alternative column names produced by some clients/backends
  else if (s.endpoint && s.keys_p256dh && s.keys_auth) subObj = { endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } };
  else if (s.endpoint && s.keys && typeof s.keys === 'object') subObj = { endpoint: s.endpoint, keys: s.keys };
  else if (s.endpoint) subObj = { endpoint: s.endpoint };

        if (!subObj) {
          console.warn('Skipping subscription row with no usable subscription object', s);
          continue;
        }

        // If the subscription doesn't include the required keys, try to mark it invalid (safer) and fallback to delete
        if (!subObj.keys || !subObj.keys.p256dh || !subObj.keys.auth) {
          console.warn('Subscription missing keys (p256dh/auth), marking subscription id', s.id);
          try {
            // Try to PATCH a marker column 'invalid' (non-fatal if column doesn't exist)
            const patchRes = await supaFetchAdmin(`/push_subscriptions?id=eq.${s.id}`, { method: 'PATCH', body: JSON.stringify({ invalid: true }) });
            if (!patchRes.ok) {
              // If PATCH failed (column missing or other), fallback to delete to avoid blocking sends
              await supaFetchAdmin(`/push_subscriptions?id=eq.${s.id}`, { method: 'DELETE' });
            }
          } catch (delErr) {
            console.warn('Failed to mark/delete invalid subscription', s.id, delErr && delErr.message ? delErr.message : delErr);
          }
          continue;
        }

        try {
          await webpush.sendNotification(subObj, payload);
          // log success
          await supaFetchAdmin('/notification_logs', { method: 'POST', body: JSON.stringify([{
            appointment_id: appt.id,
            subscription_id: s.id,
            sent_at: new Date().toISOString(),
            delivered: true,
            response: 'ok'
          }]) });
        } catch (sendErr) {
          console.warn('sendNotification error', sendErr && sendErr.message ? sendErr.message : sendErr);
          // log failure
          await supaFetchAdmin('/notification_logs', { method: 'POST', body: JSON.stringify([{
            appointment_id: appt.id,
            subscription_id: s.id,
            sent_at: new Date().toISOString(),
            delivered: false,
            response: (sendErr && sendErr.message) ? sendErr.message : String(sendErr)
          }]) });
        }
      }

      // Send Telegram notification to owner (single-owner flow) if enabled
      if (telegramEnabled) {
        try {
          const tgApi = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            // Telegram: enviar en formato multi-línea solicitado por el dueño
            const text = `Nueva cita:\nNombre: ${appt.name}\nServicio: ${appt.service || ''}\nFecha: ${appt.date || ''}\nHora: ${appt.time || ''}`;
          const tgRes = await fetch(tgApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_OWNER_CHAT_ID, text })
          });
          let tgBody = null;
          try { tgBody = await tgRes.json(); } catch (e) { tgBody = await tgRes.text(); }
          if (!tgRes.ok || (tgBody && tgBody.ok === false)) {
            console.warn('Telegram send failed', tgRes.status, tgBody);
            // attempt to log failure to telegram_logs (if table exists)
            try {
              await supaFetchAdmin('/telegram_logs', { method: 'POST', body: JSON.stringify([{
                appointment_id: appt.id,
                owner_chat_id: TELEGRAM_OWNER_CHAT_ID,
                sent_at: new Date().toISOString(),
                delivered: false,
                response: tgBody
              }]) });
            } catch (logErr) {
              console.warn('Failed to write telegram_logs', logErr && logErr.message ? logErr.message : logErr);
            }
          } else {
            console.log('Telegram message sent for appointment', appt.id);
            try {
              await supaFetchAdmin('/telegram_logs', { method: 'POST', body: JSON.stringify([{
                appointment_id: appt.id,
                owner_chat_id: TELEGRAM_OWNER_CHAT_ID,
                sent_at: new Date().toISOString(),
                delivered: true,
                response: tgBody
              }]) });
            } catch (logErr) {
              console.warn('Failed to write telegram_logs', logErr && logErr.message ? logErr.message : logErr);
            }
          }
        } catch (tgErr) {
          console.warn('Telegram send error', tgErr && tgErr.message ? tgErr.message : tgErr);
        }
      }

      // mark appointment as sent (best-effort)
      await supaFetchAdmin(`/barber_teste?id=eq.${appt.id}`, { method: 'PATCH', body: JSON.stringify({ notification_sent: true }) });
    }
  } catch (err) {
    console.error('processPendingNotifications error', err);
  }
}

// start worker loop (every 60s)
setInterval(() => {
  processPendingNotifications().catch(e => console.error('worker error', e));
}, 60 * 1000);

// Manual trigger for testing: run pending notifications immediately
app.post('/processNotifications', async (req, res) => {
  try {
    await processPendingNotifications();
    res.json({ ok: true, triggered: true });
  } catch (e) {
    console.error('processNotifications endpoint error', e);
    res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});

// Cleanup old appointments: delete rows whose `date` is not today or tomorrow
async function cleanOldAppointments() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    // Supabase REST: use not.in filter to delete all dates not in (today,tomorrow)
    const notIn = `(${today},${tomorrow})`;
    const path = `/barber_teste?date=not.in.${encodeURIComponent(notIn)}`;
    console.log('cleanup: deleting barber_teste where date not in', today, tomorrow);
    const r = await supaFetchAdmin(path, { method: 'DELETE' });
    if (!r.ok) {
      console.warn('cleanup delete failed', r.status, r.body);
      return r;
    }
    console.log('cleanup result', r.status, r.body);
    return r;
  } catch (err) {
    console.error('cleanOldAppointments error', err && err.message ? err.message : err);
    throw err;
  }
}

// Run cleanup at startup, then every 24 hours
cleanOldAppointments().catch(e => console.warn('initial cleanup failed', e && e.message ? e.message : e));
setInterval(() => {
  cleanOldAppointments().catch(e => console.error('scheduled cleanup failed', e && e.message ? e.message : e));
}, 24 * 60 * 60 * 1000);

// Optional manual trigger
app.post('/cleanup', async (req, res) => {
  try {
    const r = await cleanOldAppointments();
    res.json({ ok: true, status: r && r.status ? r.status : null, body: r && r.body ? r.body : null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});

// Delete appointment (cancel by user) — removes the row and notifies owner via Telegram (no logs)
app.delete('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'missing id' });

    // Fetch the appointment to include details in the Telegram message
    const fetchRes = await supaFetchAdmin(`/barber_teste?id=eq.${encodeURIComponent(id)}&select=*`, { method: 'GET' });
    if (!fetchRes.ok) return res.status(502).json({ error: 'supabase error', status: fetchRes.status, body: fetchRes.body });
    const rows = Array.isArray(fetchRes.body) ? fetchRes.body : [];
    if (rows.length === 0) return res.status(404).json({ error: 'appointment not found' });
    const appt = rows[0];

    // Ownership validation: prefer X-User-Id (when appointment.user_id exists) else accept X-Owner-Token matching appt.owner_token
    const requester = req.get('x-user-id') || null;
    const ownerTokenHeader = req.get('x-owner-token') || null;

    if (appt.user_id) {
      if (!requester) return res.status(401).json({ error: 'missing user id header (X-User-Id)' });
      if (String(appt.user_id) !== String(requester)) {
        return res.status(403).json({ error: 'forbidden: not appointment owner' });
      }
    } else if (appt.owner_token) {
      // appointment has owner_token stored in DB
      if (!ownerTokenHeader) return res.status(401).json({ error: 'missing owner token header (X-Owner-Token)' });
      if (String(appt.owner_token) !== String(ownerTokenHeader)) return res.status(403).json({ error: 'forbidden: invalid owner token' });
    } else {
      // Neither user_id nor owner_token present — allow deletion only if caller provides owner token that matches the token we generated at creation (we may have returned it to client even if not stored)
      if (!ownerTokenHeader) return res.status(401).json({ error: 'missing owner token header (X-Owner-Token)' });
      // As a best-effort fallback, also accept deletion when X-Owner-Token equals the appointment name+time hash (not ideal). For now, reject to be safe.
      return res.status(403).json({ error: 'forbidden: appointment has no owner data' });
    }

    // Delete the appointment row
    const delRes = await supaFetchAdmin(`/barber_teste?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!delRes.ok) return res.status(502).json({ error: 'supabase delete error', status: delRes.status, body: delRes.body });

    // Send Telegram notification to owner (single-owner flow) if enabled
    if (telegramEnabled) {
      try {
        const tgApi = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const text = `Nueva cita:\nNombre: ${appt.name}\nServicio: ${appt.service || ''}\nFecha: ${appt.date || ''}\nHora: ${appt.time || ''}\nMotivo: Cancelado por el usuario`;
        await fetch(tgApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_OWNER_CHAT_ID, text })
        });
      } catch (tgErr) {
        console.warn('Telegram send error on appointment delete', tgErr && tgErr.message ? tgErr.message : tgErr);
      }
    }

    return res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('DELETE /appointments/:id error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

const port = process.env.PORT || 3333;
app.listen(port, () => console.log(`Barbe backend listening on ${port}`));
