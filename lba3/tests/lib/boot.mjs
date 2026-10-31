// Shared boot for the regression tests: a fresh browser profile (no saved settings or saves unless given), the
// game served at localhost:8123, the player-input harness (tests/lib/player.js) installed as window.P.
//
// Result policy (R7-VERDICTS; tests/README.md "Reading a verdict"). One policy for every suite:
//   FAIL      a failed check; an unexpected page error; a console error; a crashed page; a failed request for one
//             of our own files (a 404 on a model, texture, script, sound …) or for an outside URL nobody declared
//             optional.
//   OPTIONAL  a failed request whose URL matches a declared optional resource (OPTIONAL below, or optional() in
//             a test): listed with its reason, never a failure, never silently dropped. Today the game asks for
//             nothing outside its own folder, so the list is empty.
//   EXPECTED  a page or console error the test provokes on purpose and declares with expectError(): listed.
//   NOTE      a request the page or a navigation cancelled (net::ERR_ABORTED): listed, not a failure.
// done() prints functional checks, errors, resources and visual captures separately, then one VERDICT line,
// and sets the exit code: non-zero on any FAIL. A FAIL captured after done() (or with no done() at all) still
// makes the exit code non-zero and is printed as a late FAIL.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./player.js', import.meta.url));
export const URL0 = process.env.GAME_URL || 'http://localhost:8123/';
const ORIGIN = new URL(URL0).origin;

// Optional resources: { match: RegExp on the URL, why }. Add one only for something the game really works without.
export const OPTIONAL = [];
export function optional(match, why) { OPTIONAL.push({ match, why }); }
// Errors a test provokes on purpose: { match: RegExp on the message, why }
const EXPECTED = [];
export function expectError(match, why) { EXPECTED.push({ match, why }); }

// one report per test process (a test may open several browsers or pages)
export const report = { fails: [], optional: [], expected: [], notes: [], captures: [], checks: { functional: [0, 0], visual: [0, 0] } };
let doneAt = -1;             // report.fails.length when done() printed the verdict (-1: not yet)
let watched = false;
const netSeen = new Set();   // one entry per failed URL (+ status), whichever event reports it first

function fail(kind, text) {
  report.fails.push({ kind, text });
  if (doneAt >= 0) console.log(`LATE FAIL (after the verdict) ${kind}: ${text}`);
}
function errorMsg(kind, text, list) {
  const ex = EXPECTED.find((e) => e.match.test(text));
  if (ex) { report.expected.push({ kind, text, why: ex.why }); return; }
  fail(kind, text); list?.push(kind + ': ' + text);
}
function netFail(url, why, list) {
  const key = url + ' ' + why.replace(/^.*?(\d{3}|net::\w+).*$/, '$1');
  if (netSeen.has(key)) return; netSeen.add(key);
  const opt = OPTIONAL.find((o) => o.match.test(url));
  if (opt) { report.optional.push({ url, why, reason: opt.why }); return; }
  if (/ERR_ABORTED/.test(why)) { report.notes.push(`aborted (cancelled by the page or a navigation): ${url}`); return; }
  let local = false; try { local = new URL(url).origin === ORIGIN; } catch { local = !/^https?:/.test(url); }
  const kind = local ? 'missing local file' : 'outside request failed (not declared optional)';
  fail(kind, `${why} ${url}`); list?.push(`${kind}: ${why} ${url}`);
}

// Attach the policy's listeners to a page. Returns the page's list of FAIL messages (strings, for printing).
export function watch(page) {
  watched = true;
  const errs = [];
  page.on('pageerror', (e) => errorMsg('page error', e.message + ' ' + ((e.stack || '').split('\n')[1] || '').trim(), errs));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Chromium's own line for a failed request: classified by its URL with the network rules below
    if (/^Failed to load resource/.test(t)) { const u = m.location()?.url; if (u) return netFail(u, t.replace(/^Failed to load resource: /, ''), errs); }
    errorMsg('console error', t, errs);
  });
  page.on('response', (r) => { if (r.status() >= 400) netFail(r.url(), `HTTP ${r.status()}`, errs); });
  page.on('requestfailed', (r) => netFail(r.url(), r.failure()?.errorText || 'failed', errs));
  page.on('crash', () => { fail('page crashed', page.url()); errs.push('page crashed'); });
  // every screenshot is a visual capture for review: listed under "visual", never judged here
  const shot = page.screenshot.bind(page);
  page.screenshot = async (o = {}) => { const r = await shot(o); report.captures.push(o.path || '(in memory)'); return r; };
  if (process.env.REGIONS_LOG) page.on('console', (m) => { if (/^\[regions\]/.test(m.text())) console.log('REGIONS', m.text()); });   // (LAZY-REGIONS: areas built where something read them)
  if (process.env.LIVE_ERRS) { page.on('pageerror', (e) => console.log('LIVE pageerror', e.message)); page.on('console', (m) => { if (m.type() === 'error') console.log('LIVE console', m.text()); }); }
  return errs;
}

export async function launch({ width = 960, height = 540, storageState, locale, scale } = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width, height }, ...(storageState ? { storageState } : {}), ...(locale ? { locale } : {}), ...(scale ? { deviceScaleFactor: scale } : {}) });
  const page = await context.newPage();
  const errs = watch(page);
  return { browser, context, page, errs };
}

// load the page and wait for the title screen; `query` e.g. '?nocine' skips the opening cinematic
export async function open(page, query = '', { freeze = true } = {}) {
  // a navigation the game started itself (Quit's delayed reload) can abort ours under heavy load: let it land, retry
  for (let i = 0; ; i++) {
    try { await page.goto(URL0 + query, { waitUntil: 'load', timeout: 180000 }); break; }
    catch (e) { if (i >= 2 || !/ERR_ABORTED|frame was detached/.test(e.message)) throw e; await page.waitForLoadState('load').catch(() => {}); await page.waitForTimeout(1500); }
  }
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 300000 }); // (BOOT_TIMEOUT: a loaded machine)
  if (freeze) await page.evaluate(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
}

// press a title-menu button the way a player does (a real click on the button)
export async function menu(page, act) {
  await page.click(`[data-act="${act}"]`, { timeout: 60000 });
  await page.evaluate(() => { game.testFreeze = true; game.step(0.2); });
}

// check(name, ok, info) for behaviour; checkVisual(...) for an automated look measurement (pixels, framing,
// visibility): both FAIL the run, counted apart. done() prints the verdict and returns the number of FAILs.
// { info: 'always' } prints a check's info (its measured values) on PASS too, as evidence.
export function checker({ info: show = 'fail' } = {}) {
  const rows = [];
  const mk = (cat) => (name, ok, info) => {
    report.checks[cat][ok ? 0 : 1]++;
    if (!ok) fail(cat === 'visual' ? 'visual check' : 'check', name);
    rows.push([name, !!ok]);
    const txt = info === undefined || info === '' ? '' : JSON.stringify(info);
    console.log((ok ? 'PASS ' : 'FAIL ') + (cat === 'visual' ? '[visual] ' : '') + name, ok ? (show === 'always' ? txt : '') : txt?.slice(0, 600));
    return !!ok;
  };
  return { check: mk('functional'), checkVisual: mk('visual'), done, rows };
}

// Print the verdict (the argument, a page's errs, is accepted for old callers and not needed: every watched page
// reports here). Returns the number of FAILs and sets process.exitCode.
export function done() {
  const R = report, by = (k) => R.fails.filter((f) => f.kind === k);
  const errors = R.fails.filter((f) => /page error|console error|page crashed/.test(f.kind));
  const res = R.fails.filter((f) => /local file|outside request/.test(f.kind));
  const [fp, ff] = R.checks.functional, [vp, vf] = R.checks.visual;
  const list = (a, f) => a.slice(0, 15).forEach((x) => console.log('  ' + f(x))) || (a.length > 15 && console.log(`  … ${a.length - 15} more`));
  console.log('--- verdict (tests/README.md "Reading a verdict") ---');
  console.log(`functional: ${fp} passed, ${ff} failed`);
  console.log(`errors:     ${errors.length ? errors.length + ' FAIL' : 'none'}${R.expected.length ? `, ${R.expected.length} expected (provoked by the test)` : ''}`);
  list(errors, (f) => `FAIL ${f.kind}: ${f.text}`); list(R.expected, (e) => `EXPECTED ${e.kind}: ${e.text}  (${e.why})`);
  console.log(`resources:  ${res.length ? res.length + ' FAIL' : 'no required file missing'}, ${R.optional.length} optional${R.notes.length ? `, ${R.notes.length} note` : ''}`);
  list(res, (f) => `FAIL ${f.kind}: ${f.text}`); list(R.optional, (o) => `OPTIONAL ${o.why} ${o.url}  (${o.reason})`); list(R.notes, (n) => `NOTE ${n}`);
  console.log(`visual:     ${vp + vf ? `${vp} passed, ${vf} failed; ` : ''}${R.captures.length} capture(s) written for review, not judged here`);
  const n = R.fails.length;
  const parts = [ff && `${ff} functional`, vf && `${vf} visual`, errors.length && `${errors.length} error`, res.length && `${res.length} resource`].filter(Boolean);
  console.log(n ? `VERDICT: FAIL (${parts.join(', ')})` : 'VERDICT: PASS');
  console.log(n ? `${n} FAILED` : 'ALL PASSED');
  if (!watched) console.log('(no page was watched: errors and resources were not captured)');
  doneAt = n;
  process.exitCode = n ? 1 : 0;
  return n;
}
// the exit code always agrees with what was captured: a FAIL after done(), or no done() at all, is non-zero
process.on('exit', (code) => {
  if (doneAt < 0 && report.fails.length) { console.log(`VERDICT: FAIL (no verdict printed; ${report.fails.length} FAIL captured)`); report.fails.slice(0, 10).forEach((f) => console.log(`  FAIL ${f.kind}: ${f.text}`)); }
  if (report.fails.length > Math.max(doneAt, 0) || (doneAt > 0 && !code)) process.exitCode = 1;
});

// Esc → pause menu → "Quit to title" (it saves), then keep the browser storage (the save) in a file
export async function quitAndKeep(page, context, file) {
  await page.evaluate(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  // the game saves, then reloads the page 500 ms later (src/main.js): wait for that reload, or a later open() races it
  const reloaded = page.waitForEvent('load', { timeout: 300000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000 });
  await reloaded;
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 })
    .catch(async (e) => {   // say where the boot stopped, not just that it timed out
      const st = await page.evaluate(() => ({ url: location.href, game: !!window.game, preparing: window.game?.preparing, loading: document.querySelector('#loading')?.textContent?.slice(0, 120) })).catch((x) => String(x));
      console.log('quitAndKeep: the reload did not finish booting', JSON.stringify(st)); throw e; });
  await context.storageState({ path: file });
}
