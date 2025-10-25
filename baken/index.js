require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPA_KEY = process.env.SUPABASE_KEY;

async function supaFetch(path, opts = {}) {
  const url = `${SUPA_URL}/rest/v1${path}`;
  const headers = Object.assign({
    apikey: SUPA_KEY,
    Authorization: `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  }, opts.headers || {});
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, body: JSON.parse(text) }; }
  catch (e) { return { ok: res.ok, status: res.status, body: text }; }
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
    const payload = [{ name, service, date, time }];
    const r = await supaFetch('/barber_teste', { method: 'POST', body: JSON.stringify(payload) });
    if (!r.ok) return res.status(502).json({ error: 'supabase error', status: r.status, body: r.body });
    return res.json(r.body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

const port = process.env.PORT || 3333;
app.listen(port, () => console.log(`Barbe backend listening on ${port}`));
