// Self-test of the result policy in tests/lib/boot.mjs (R7-VERDICTS): node tests/verdicts.mjs  (ONLY=model,optional for some)
// Each scenario boots the real game in a child process (`node tests/verdicts.mjs <scenario>`), provokes one kind of
// message and prints the policy's verdict; the parent checks the verdict line AND the child's exit code agree:
//   clean       nothing injected                                      → PASS, exit 0
//   pageerror   an uncaught exception thrown in the page              → FAIL (error), exit ≠ 0
//   console     a console.error from the page                         → FAIL (error), exit ≠ 0
//   model       Doran's model (assets/poly/doran.json) answers 404 — the game falls back to its sculpt without a
//               word, so only the network rule can catch it            → FAIL (resource), exit ≠ 0
//   asset       a texture-like file of ours that doesn't exist (404)  → FAIL (resource), exit ≠ 0
//   optional    an outside web-font stylesheet, offline (declared optional) → OPTIONAL listed, PASS, exit 0
//   undeclared  the same offline stylesheet, not declared optional    → FAIL (resource), exit ≠ 0
//   check       one failed check, nothing else                         → FAIL (functional), exit ≠ 0
//   late        a page error after the verdict was printed            → exit ≠ 0 (LATE FAIL)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const SELF = fileURLToPath(import.meta.url);
const scenario = process.argv[2];

if (scenario) {
  const { launch, open, menu, checker, optional, done } = await import('./lib/boot.mjs');
  const { check } = checker();
  const { browser, page } = await launch();
  const FONT = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;700&display=swap';
  if (scenario === 'model') await page.route('**/assets/poly/doran.json', (r) => r.fulfill({ status: 404, body: 'not found' }));
  if (scenario === 'optional' || scenario === 'undeclared') await page.route('https://fonts.googleapis.com/**', (r) => r.abort('internetdisconnected'));
  if (scenario === 'optional') optional(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, 'web font CDN; the game ships Rubik in assets/fonts');
  await open(page, '?nocine');
  await menu(page, 'new');
  if (scenario === 'model') check('Doran is in the world (with or without his model)', await page.evaluate(() => !!game.npcs.find((n) => n.def.id === 'doran')));
  const settle = () => page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  if (scenario === 'pageerror') { await page.evaluate(() => { setTimeout(() => { throw new Error('R7 injected page error'); }, 0); }); await settle(); }
  if (scenario === 'console') { await page.evaluate(() => console.error('R7 injected console error')); await settle(); }
  if (scenario === 'asset') { await page.evaluate(() => { const i = new Image(); i.src = 'assets/lba2/r7-missing-texture.png'; document.body.appendChild(i); }); await page.waitForTimeout(1500); }
  if (scenario === 'optional' || scenario === 'undeclared') {
    await page.evaluate((u) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = u; document.head.appendChild(l); }, FONT);
    await page.waitForTimeout(1500);
  }
  if (scenario === 'check') check('a check that fails on purpose', false, { why: 'self-test' });
  check('the game is in play', await page.evaluate(() => game.state === 'play' || game.state === 'dialog'));
  done();
  if (scenario === 'late') { await page.evaluate(() => { setTimeout(() => { throw new Error('R7 late page error'); }, 0); }); await settle(); }
  await browser.close();
} else {
  const { checker, done } = await import('./lib/boot.mjs');
  const { check } = checker();
  const want = {   // scenario → [verdict, exit code non-zero?, a line the summary must contain]
    clean: ['PASS', false, 'resources:  no required file missing, 0 optional'],
    pageerror: ['FAIL', true, 'FAIL page error: R7 injected page error'],
    console: ['FAIL', true, 'FAIL console error: R7 injected console error'],
    model: ['FAIL', true, /FAIL missing local file: HTTP 404 \S*assets\/poly\/doran\.json/],
    asset: ['FAIL', true, /FAIL missing local file: HTTP 404 \S*r7-missing-texture\.png/],
    optional: ['PASS', false, 'OPTIONAL net::ERR_INTERNET_DISCONNECTED https://fonts.googleapis.com/'],
    undeclared: ['FAIL', true, 'FAIL outside request failed (not declared optional)'],
    check: ['FAIL', true, 'VERDICT: FAIL (1 functional)'],
    late: ['PASS', true, 'LATE FAIL (after the verdict) page error: R7 late page error'],
  };
  for (const [sc, [verdict, nonzero, line]] of Object.entries(process.env.ONLY ? Object.fromEntries(process.env.ONLY.split(",").map((k) => [k, want[k]])) : want)) {
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [SELF, sc], { encoding: 'utf8', env: process.env, timeout: 900000 });
    const out = (r.stdout || '') + (r.stderr || '');
    const v = out.match(/^VERDICT: (PASS|FAIL)/m)?.[1];
    const tail = out.split('\n').filter((l) => /VERDICT|FAIL|OPTIONAL|EXPECTED|resources:|errors:|functional:/.test(l)).slice(0, 12);
    console.log(`-- ${sc} (exit ${r.status}, ${((Date.now() - t0) / 1000).toFixed(0)} s)\n   ` + tail.join('\n   '));
    check(`${sc}: verdict ${verdict}`, v === verdict, { v });
    check(`${sc}: exit code ${nonzero ? 'non-zero' : '0'}`, nonzero ? r.status !== 0 && r.status !== null : r.status === 0, { status: r.status, signal: r.signal });
    check(`${sc}: the summary lists it (${line})`, typeof line === 'string' ? out.includes(line) : line.test(out), { tail });
  }
  done();
}
