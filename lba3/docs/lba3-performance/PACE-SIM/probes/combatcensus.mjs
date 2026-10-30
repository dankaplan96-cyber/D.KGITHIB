// PACE-SIM: what the benchmark's combat route does, counted, over its 7.5 s (1.5 s warm-up + 6 s measured) at a fixed
// 60 Hz step, drawn every frame: the HUD's DOM work (the hurt vignette, floats, toasts, the stats panel's writes),
// sounds started, particle bursts, enemies knocked out, timers set, and the renderer's per-frame counts.
//   GAME_URL=... ROUTE=combat node combatcensus.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const ID = process.env.ROUTE || 'combat', S = +(process.env.S || 7.5);
const { browser, page } = await launch({ width: 960, height: 540 });
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); } catch {} });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
const out = await ev(({ id, S }) => {
  const G = game, H = G.hud, C = {}, n = (k) => { C[k] = (C[k] || 0) + 1; };
  const wrap = (o, m, k) => { const f = o[m]; o[m] = function (...a) { n(k(a)); return f.apply(this, a); }; };
  wrap(H, 'hurt', () => 'hud.hurt (vignette)'); wrap(H, 'float', () => 'hud.float'); wrap(H, 'toast', (a) => 'hud.toast ' + a[0]);
  wrap(H, 'weaponFlash', () => 'hud.weaponFlash'); wrap(G.audio, 'play', (a) => 'sound ' + a[0]); wrap(G.particles, 'burst', () => 'particles.burst');
  wrap(G, 'onEnemyKilled', () => 'enemy killed');
  const st = window.setTimeout; let timers = 0; window.setTimeout = function (...a) { timers++; return st.apply(this, a); };
  // the stats panel: count its real writes (the lifebar's width)
  let statsW = 0; const lb = document.querySelector('#lifebar i'); new MutationObserver((L) => { statsW += L.length; }).observe(document.querySelector('#hud') || document.body, { attributes: true, childList: true, subtree: true, characterData: true });
  const route = G.bench.routes().find((r) => r.id === id);
  G.benching = true; G.state = 'play'; route.setup(); G.state = 'play';
  let t = 0; const dt = 1 / 60, calls = [];
  for (let i = 0; i < S * 60; i++) { t += dt; G.state = 'play'; route.drive(t, dt); G.perf.beginFrame(); G.frame(dt, true); calls.push(G.renderer.renderer.info.render.calls); }
  G.benching = false;
  window.setTimeout = st;
  calls.sort((a, b) => a - b);
  return { counts: C, timersSet: timers, hudMutations: statsW, callsP50: calls[calls.length >> 1], enemies: G.enemies.filter((e) => e.present && e.alive).length, heroHp: G.hero.hp };
}, { id: ID, S });
console.log(JSON.stringify(out, null, 1));
await browser.close();
