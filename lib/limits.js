'use strict';

const https = require('https');

const BALANCE_URL = 'https://zcode.z.ai/api/v1/zcode-plan/billing/balance?app_version=3.1.2';

const CONCURRENCY = 1;
const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 1500;
const MAX_BACKOFF_MS = 15000;

function getJsonRaw(url, headers = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const status = res.statusCode || 0;
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch {}
        resolve({ status, headers: res.headers || {}, json });
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Таймаут запроса'));
    });
  });
}

let queueTail = Promise.resolve();
let queueDepth = 0;

function enqueue(task) {
  const run = queueTail.then(task, task);
  queueTail = run.then(always, always);
  function always() { queueDepth = Math.max(0, queueDepth - 1); }
  queueDepth += 1;
  return run;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfter(headers) {
  const v = headers && headers['retry-after'];
  if (!v) return null;
  const sec = parseInt(String(v).trim(), 10);
  if (Number.isFinite(sec) && sec > 0) return sec * 1000;
  return null;
}

function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (p.length % 4) p += '=';
    const json = Buffer.from(p, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isValidJwt(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length < 2) return false;
  return decodeJwt(token) !== null;
}

async function fetchLimits(apiKey) {
  if (!isValidJwt(apiKey)) {
    throw new Error('Невалидный JWT');
  }

  const headers = {
    Authorization: 'Bearer ' + apiKey,
    Accept: 'application/json',
  };

  const shoot = () => getJsonRaw(BALANCE_URL, headers);

  let resp = null;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    resp = await enqueue(shoot);

    if (resp.status >= 200 && resp.status < 300) {
      break;
    }

    if (resp.status === 401 || resp.status === 403) {
      throw new Error(`HTTP ${resp.status}`);
    }

    if (resp.status === 429 || resp.status >= 500) {
      lastError = new Error(`HTTP ${resp.status}`);
      if (attempt < MAX_ATTEMPTS) {
        const retryAfter = parseRetryAfter(resp.headers);
        const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        const wait = retryAfter != null ? Math.min(retryAfter, MAX_BACKOFF_MS) : exp;
        await sleep(wait);
        continue;
      }
      throw new Error(`HTTP 429: Z.ai временно ограничивает запросы. Попробуйте обновить через минуту.`);
    }

    throw new Error(`HTTP ${resp.status}`);
  }

  const json = (resp && resp.json) || null;

  const data = (json && json.data) || {};
  const rawBalances = Array.isArray(data.balances) ? data.balances : [];

  const balances = rawBalances.map((b) => ({
    showName: b.show_name || '—',
    totalUnits: b.total_units || 0,
    usedUnits: b.used_units || 0,
    remainingUnits: b.remainingUnits != null ? b.remaining_units : (b.total_units || 0) - (b.used_units || 0),
  }));

  return {
    balances,
    expiresAt: rawBalances[0] && rawBalances[0].expires_at ? rawBalances[0].expires_at : null,
    serverTime: data.server_time || null,
  };
}

module.exports = {
  fetchLimits,
  isValidJwt,
  decodeJwt,
};
