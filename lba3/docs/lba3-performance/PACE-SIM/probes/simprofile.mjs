// PACE-SIM: a JS CPU profile of the simulation alone (game.frame without drawing) on a benchmark route at a fixed
// 60 Hz step: inclusive time per function, per step. For "what does the interior's simulation spend its time on".
//   GAME_URL=... ROUTE=interior STEPS=900 node simprofile.mjs
// (not drawn: the far cull runs each step as a drawn frame runs it, so the people's animation rates are as in play;
//  RENDER=1 draws every step instead — on SwiftShader the GL calls then swamp the profile)
import { launch, open } from '../../../../tests/lib/boot.mjs';
const ID = process.env.ROUTE || 'interior', STEPS = +(process.env.STEPS || 900);
const { browser, context, page } = await launch({ width: 640, height: 360 });
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); } catch {} });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((on) => { window.__render = on; }, !!process.env.RENDER);
await ev((id) => { const G = game, r = G.bench.routes().find((x) => x.id === id); G.benching = true; G.state = 'play'; r.setup(); window.__r = r; window.__t = 0; for (let i = 0; i < 600; i++) { window.__t += 1 / 60; G.state = 'play'; r.drive(window.__t, 1 / 60); G.frame(1 / 60, false); } }, ID);
const cdp = await context.newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
await cdp.send('Profiler.start');
const ms = await ev((n) => { const G = game, t0 = performance.now(); for (let i = 0; i < n; i++) { window.__t += 1 / 60; G.state = 'play'; window.__r.drive(window.__t, 1 / 60); G.frame(1 / 60, !!window.__render); if (!window.__render) { G.farCull.hide(); G.farCull.restore(); } } return performance.now() - t0; }, STEPS);
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n])), parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const counts = new Map(); for (let i = 0; i < profile.samples.length; i++) counts.set(profile.samples[i], (counts.get(profile.samples[i]) || 0) + (profile.timeDeltas[i] || 0));
const name = (id) => { const f = byId.get(id).callFrame; return `${f.functionName || '(anon)'} ${f.url.split('/').slice(-1)[0]}:${f.lineNumber + 1}`; };
const incl = new Map(), self = new Map();
for (const [id, us] of counts) { self.set(name(id), (self.get(name(id)) || 0) + us); const seen = new Set(); for (let x = id; x != null; x = parent.get(x)) { const k = name(x); if (seen.has(k)) continue; seen.add(k); incl.set(k, (incl.get(k) || 0) + us); } }
console.log(`route ${ID} · ${STEPS} steps · ${(ms / STEPS).toFixed(3)} ms a step (wall, profiler on)`);
console.log('--- inclusive ms per step');
for (const [k, us] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 60)) console.log((us / 1000 / STEPS).toFixed(4).padStart(8), k);
console.log('--- self ms per step');
for (const [k, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log((us / 1000 / STEPS).toFixed(4).padStart(8), k);
await browser.close();
