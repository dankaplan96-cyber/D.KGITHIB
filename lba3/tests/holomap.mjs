// MAP-1: the Holomap (M) and the minimap, drawn from the world the game built (src/game/mapdraw.js, hud.js).
//   - opened by a real key press in Citadel, Desert Island, the Hamalayi, Zeelich's spaceport island and two of its
//     islands (Tralu Rock, Otringal): the drawn ground matches the world (walkable sample points are land on the map,
//     open sea is water), Twinsen's arrow sits on his real position and shows his facing, no two labels overlap and
//     none leaves the map; a JPEG of each to docs/lba3-production/reviews/MAP-1/
//   - zoom and pan by mouse wheel, drag, keyboard (+/−, the move keys), a gamepad (RT/LT, the stick) and touch
//     pinch; the recentre key centres on Twinsen; Esc/M close; a gamepad's B closes; the close button closes
//   - repeated open/close (20×) leaves one set of listeners and play resumes each time with no leaked action
//   - indoors: the room's name and its plan; the door he came in by is marked outside
//   - the minimap (HUD "Always on"): north-up and turning with the camera (the setting, persisted), its cost per frame
// ISO (logged): he is put in each region by enterRoom (as tests/travel.mjs does), the ball given so the map opens.
// BEFORE=1 only takes the screenshots (for the before/after pair on the old build).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const W0 = +(process.env.W || 1280), H0 = +(process.env.H || 720);
const { browser, page, errs } = await launch({ width: W0, height: H0 });
const ev = (f, a) => page.evaluate(f, a);
const BEFORE = !!process.env.BEFORE;
const OUT = process.env.SHOTS || new URL('../docs/lba3-production/reviews/MAP-1/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const tag = BEFORE ? 'before' : 'after';
const shot = async (name, sel = '#holomap .frame') => {
  // (a busy machine can take minutes for a SwiftShader frame: retry once, then go on without the picture)
  for (let i = 0; i < 2; i++) {
    try {
      const el = await page.$(sel), box = el && await el.boundingBox();
      await page.screenshot({ path: `${OUT}/${name}-${tag}.jpg`, type: 'jpeg', quality: 78, timeout: 180000, ...(box ? { clip: box } : {}) });
      return true;
    } catch (e) { console.log('shot failed', name, e.message.split('\n')[0]); }
  }
  return false;
};
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true }); game.hero.hasBall = true; game.story.refreshCast(); });

// put him at a walkable spot of a region (ISO); Citadel: by the square
const place = (where) => ev((where) => {
  const G = game;
  if (where === 'citadel') { G.exitRoom({ x: G.world.well.x + 3, z: G.world.well.z + 6, a: 0.6 }, true); P.settle(); return { region: 'citadel' }; }
  const p = G.travel.points[where], L = p.landing || p;
  const a = Math.atan2(L.x - p.x, L.z - p.z), d = Math.min(8, Math.hypot(L.x - p.x, L.z - p.z) + 3), x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
  G.enterRoom(p.region, { x, z, a: a + Math.PI * 0.75 }, true); P.settle(); return { region: p.region };
}, where);

const REGIONS = [['citadel', 'citadel'], ['desert', 'desert_ferry'], ['hamalayi', 'hamalayi_glider'], ['zeelich', 'zeelich_port'], ['isle_tralu', 'isle_tralu'], ['isle_otringal', 'isle_otringal']];
const rows = [];
for (const [region, where] of REGIONS) {
  await place(where);
  // a few steps by input, so the facing is his own
  await ev(() => { P.holdFor(['ArrowLeft'], 0.25); P.holdFor(['ArrowUp'], 0.4); P.settle(); });
  const r = await ev(() => { P.tap('KeyM', 0.3); return { state: game.state }; });
  await page.waitForTimeout(150);
  await shot(`holomap-${region}`);
  if (BEFORE) { await ev(() => { P.tap('KeyM', 0.3); P.settle(); }); continue; }
  const m = await ev((region) => {
    const G = game, H = G.hud, V = H.holoView, h = G.hero, B = H.mapBase(region);
    // where his arrow must be, from the view's own transform
    const ex = V.W / 2 + (h.pos.x - V.cx) * V.ppm, ey = V.H / 2 + (h.pos.z - V.cz) * V.ppm;
    // the map against the world: points he can stand on are land, open sea is water (class 0)
    const cls = (x, z) => { const i = Math.floor((x - B.X0) / B.s * B.N), j = Math.floor((z - B.Z0) / B.s * B.N); return i < 0 || j < 0 || i >= B.N || j >= B.N ? -1 : B.cls[j * B.N + i]; };
    const P2 = G.physics; let land = 0, landOK = 0, sea = 0, seaOK = 0;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 4000; k++) {
      const x = B.X0 + rnd() * B.s, z = B.Z0 + rnd() * B.s, gi = P2.groundInfo(x, z, 60);
      if (gi.h < -0.35 && !gi.brick) { sea++; if (cls(x, z) === 0) seaOK++; }
      else if (gi.h > 0.2 && !P2.steepAt(x, z, gi.h) && !P2.blockedAt(x, z, gi.h)) { land++; if (cls(x, z) > 0) landOK++; }
    }
    const L = H.holoLabels || [];
    let overlaps = 0, outside = 0;
    for (let i = 0; i < L.length; i++) { const a = L[i]; if (a.x < 0 || a.y < 0 || a.x + a.w > V.W || a.y + a.h > V.H) outside++; for (let j = i + 1; j < L.length; j++) { const b = L[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++; } }
    const title = document.querySelector('#holomap .title').textContent;
    return { state: G.state, hero: H.holoHero, expect: [ex, ey], heroCls: cls(h.pos.x, h.pos.z), facing: [+H.holoHero.angle.toFixed(3), +h.angle.toFixed(3)],
      land, landOK, sea, seaOK, labels: L.map((b) => b.text), overlaps, outside, title, base: [B.N, +B.s.toFixed(1), B.ms] };
  }, region);
  rows.push({ region, ...m });
  const dHero = Math.hypot(m.hero.x - m.expect[0], m.hero.y - m.expect[1]);
  check(`${region}: M opens the Holomap; his arrow is on his position (${dHero.toFixed(2)} px off) and faces his way; he stands on land on the map`, r.state === 'map' && m.state === 'map' && dHero < 1.5 && m.hero.region === region && Math.abs(Math.atan2(Math.sin(m.facing[0] - m.facing[1]), Math.cos(m.facing[0] - m.facing[1]))) < 1e-3 && m.heroCls > 0, m);
  check(`${region}: the drawn ground matches the world (land ${m.landOK}/${m.land}, sea ${m.seaOK}/${m.sea})`, m.land > 50 && m.landOK / m.land > 0.97 && (m.sea < 20 || m.seaOK / m.sea > 0.97), { land: [m.landOK, m.land], sea: [m.seaOK, m.sea] });
  check(`${region}: ${m.labels.length} labels, none overlapping or outside the map`, m.labels.length >= 2 && m.overlaps === 0 && m.outside === 0, { labels: m.labels, overlaps: m.overlaps, outside: m.outside });
  await ev(() => { P.tap('KeyM', 0.3); P.settle(); });
}

if (!BEFORE) {
  // ---------------------------------------------------------------- zoom and pan (Citadel)
  await place('citadel');
  await ev(() => P.tap('KeyM', 0.3));
  const v0 = await ev(() => ({ ...game.hud.holoView }));
  const cv = await (await page.$('#holomap canvas')).boundingBox();
  await page.mouse.move(cv.x + cv.width * 0.5, cv.y + cv.height * 0.5);
  await page.mouse.wheel(0, -300); await ev(() => game.step(0.05));
  const v1 = await ev(() => ({ ...game.hud.holoView }));
  await page.mouse.move(cv.x + cv.width * 0.5, cv.y + cv.height * 0.5); await page.mouse.down(); await page.mouse.move(cv.x + cv.width * 0.3, cv.y + cv.height * 0.6, { steps: 6 }); await page.mouse.up();
  await ev(() => game.step(0.05));
  const v2 = await ev(() => ({ ...game.hud.holoView }));
  check('mouse: the wheel zooms in, a drag pans the map', v1.zoom > v0.zoom * 1.2 && Math.hypot(v2.cx - v1.cx, v2.cz - v1.cz) > 1, { v0, v1, v2 });
  const k = await ev(() => {
    const H = game.hud, I = game.input, a = { ...H.holoView };
    P.holdFor(['Minus'], 0.4); const b = { ...H.holoView };
    P.holdFor(['Equal'], 0.6); const c = { ...H.holoView };
    P.holdFor(['ArrowRight'], 0.5); const d = { ...H.holoView };
    P.tap('Enter', 0.1); const e = { ...H.holoView };
    return { a, b, c, d, e, hero: [game.hero.pos.x, game.hero.pos.z], state: game.state };
  });
  check('keyboard: − zooms out, + zooms in, → pans east, Enter centres on Twinsen; the map stays open (no leaked action)', k.b.zoom < k.a.zoom && k.c.zoom > k.b.zoom && k.d.cx > k.c.cx + 1 && Math.hypot(k.e.cx - k.hero[0], k.e.cz - k.hero[1]) < 1 && k.state === 'map', k);
  await shot('holomap-citadel-zoomed');
  // a gamepad (a stand-in for navigator.getGamepads): RT zooms in, the stick pans, B closes
  const pad = await ev(() => {
    const H = game.hud, btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const fake = { connected: true, axes: [0, 0, 0, 0], buttons: btn() };
    const orig = navigator.getGamepads; navigator.getGamepads = () => [fake];
    const a = { ...H.holoView };
    fake.buttons[7] = { pressed: true, value: 1 }; game.step(0.4); fake.buttons[7] = { pressed: false, value: 0 };
    const b = { ...H.holoView };
    fake.axes[1] = -1; game.step(0.4); fake.axes[1] = 0; game.step(0.05);
    const c = { ...H.holoView }, hint = document.querySelector('#holomap .hint').textContent;
    fake.buttons[1] = { pressed: true, value: 1 }; game.step(0.05); fake.buttons[1] = { pressed: false, value: 0 }; game.step(0.1);
    const st = game.state, dodging = game.hero.combat.dodgeT > 0;
    navigator.getGamepads = orig; game.input.lastDevice = 'kbd'; game.step(0.05);
    return { a, b, c, hint, st, dodging };
  });
  check('gamepad: RT zooms in, the stick pans north, the hint names the pad\'s buttons, B closes the map without a dodge', pad.b.zoom > pad.a.zoom && pad.c.cz < pad.b.cz - 1 && /RT/.test(pad.hint) && pad.st === 'play' && !pad.dodging, pad);
  // touch: a pinch zooms (two touch pointers on the canvas)
  await ev(() => { P.tap('KeyM', 0.3); P.tap('KeyQ', 0.1); });   // (Q: the whole map, so there is room to zoom)
  const pinch = await ev(() => {
    const c = document.querySelector('#holomap canvas'), r = c.getBoundingClientRect(), H = game.hud, a = { ...H.holoView };
    const pe = (type, id, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
    const mx = r.x + r.width / 2, my = r.y + r.height / 2;
    pe('pointerdown', 1, mx - 20, my); pe('pointerdown', 2, mx + 20, my);
    for (let s = 1; s <= 5; s++) { pe('pointermove', 1, mx - 20 - s * 12, my); pe('pointermove', 2, mx + 20 + s * 12, my); }
    pe('pointerup', 1, mx - 80, my); pe('pointerup', 2, mx + 80, my); game.step(0.05);
    return { a, b: { ...H.holoView } };
  });
  check('touch: a pinch zooms in', pinch.b.zoom > pinch.a.zoom * 1.5, pinch);
  const btn = await ev(() => { document.querySelector('#holomap .close').click(); game.step(0.1); return { state: game.state, hidden: document.querySelector('#holomap').classList.contains('hidden') }; });
  check('the Close button closes the map (touch and mouse)', btn.state === 'play' && btn.hidden, btn);
  // repeated open/close: one set of listeners, play resumes each time, no action leaks into play
  const rep = await ev(() => {
    const G = game, before = G.hud._listeners;
    let ok = 0;
    for (let i = 0; i < 20; i++) { P.tap(i % 2 ? 'KeyH' : 'KeyM', 1 / 60); const open = G.state === 'map'; P.tap(i % 3 ? 'Escape' : 'KeyM', 1 / 60); if (open && G.state === 'play') ok++; }
    G.step(0.2);
    return { ok, state: G.state, listeners: [before, G.hud._listeners], paused: !document.querySelector('#pause').classList.contains('hidden') };
  });
  check('20 quick open/close cycles (M, H, Esc): each opens and closes, play resumes, no pause menu leaks, no new listeners', rep.ok === 20 && rep.state === 'play' && !rep.paused && rep.listeners[0] === rep.listeners[1], rep);

  // ---------------------------------------------------------------- indoors: the room's name and plan; the door used
  const inside = await ev(() => {
    const G = game, d = G.story.doors().find((x) => x.room === 'house');
    G.exitRoom({ x: d.x + 2.5, z: d.z + 1.2, a: -2 }, true); P.settle();
    P.go(d.x, d.z, { tol: 0.2, maxT: 20 });
    for (let i = 0; i < 80 && (!G.room || G.room.outdoor); i++) { P.holdFor(['ArrowUp'], 0.1); }
    P.settle();
    P.tap('KeyM', 0.3);
    const r = { room: G.room?.id, state: G.state, title: document.querySelector('#holomap .title').textContent, plan: G.hud.holoRoom, used: G.flags.mapDoors, hero: G.hud.holoHero };
    return r;
  });
  await shot('holomap-interior-house');
  check('indoors (Twinsen\'s house, entered by its door): the title names the room, its plan is drawn, the door he used is recorded and marked, in view', inside.room === 'house' && inside.state === 'map' && inside.hero.x > 0 && inside.hero.y > 0 && /Twinsen's house/.test(inside.title) && inside.plan === 'house' && inside.used?.house, inside);
  await ev(() => { P.tap('KeyM', 0.3); P.settle(); });

  // ---------------------------------------------------------------- the minimap (HUD "Always on")
  await place('citadel');
  const mm = await ev(() => {
    const G = game, H = G.hud;
    G.settings.hud = 'modern'; G.applySettings();
    P.holdFor(['ArrowUp'], 0.5); P.settle();
    H.mapBase('citadel');
    const N = 400, ts = [];
    for (let i = 0; i < N; i++) { const t0 = performance.now(); H.drawMinimap(); ts.push(performance.now() - t0); }
    ts.sort((a, b) => a - b);
    return { visible: getComputedStyle(document.querySelector('#minimap')).display !== 'none', avg: ts.reduce((a, b) => a + b, 0) / N, p50: ts[N >> 1], p95: ts[Math.floor(N * 0.95)], max: ts[N - 1], mode: H.miniMode };
  });
  await shot('minimap-citadel-north', '#minimap');
  check(`minimap: shown with the "Always on" HUD; north-up; drawing it costs ${mm.avg.toFixed(3)} ms a frame (p95 ${mm.p95.toFixed(3)} ms, software canvas here)`, mm.visible && mm.mode === 'north' && mm.p95 < 2, mm);
  // the setting, as a player changes it: pause → Settings → Minimap: Turns with camera; kept in storage
  const set = await ev(() => {
    P.tap('Escape', 0.1);
    document.querySelector('#pause [data-act="settings"]')?.click(); game.step(0.05);
    const b = document.querySelector('#settings [data-setting="minimap"] [data-v="camera"]'); b?.click();
    const stored = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /set/i.test(k)) || '{}') || '{}');
    document.querySelector('#settings [data-act="back"]')?.click(); game.step(0.05);
    P.tap('Escape', 0.1); P.settle();
    return { button: !!b, setting: game.settings.minimap, stored: stored.minimap, on: b?.classList.contains('on'), state: game.state };
  });
  check('Settings → Minimap: "Turns with camera" is applied and kept in storage', set.button && set.setting === 'camera' && set.stored === 'camera' && set.on, set);
  const rot = await ev(() => {
    const G = game, H = G.hud; P.settle(); H.drawMinimap();
    // a point 20 m straight ahead of the camera must be drawn above the centre
    const y = G.camRig.yaw, fx = -Math.sin(y), fz = -Math.cos(y), h = G.hero.pos;
    const p = H.miniToCanvas(h.x + fx * 20, h.z + fz * 20), c = H.mini.width / 2;
    return { mode: H.miniMode, p, c };
  });
  await shot('minimap-citadel-camera', '#minimap');
  check('minimap turning with the camera: what lies ahead on screen is up on the minimap', rot.mode === 'camera' && Math.abs(rot.p[0] - rot.c) < 2 && rot.p[1] < rot.c - 10, rot);
  // indoors the minimap shows the room's plan, not the island
  const mmIn = await ev(() => { const G = game; G.enterRoom('house', null, true); P.settle(); G.step(0.1); return { room: G.room.id, mode: G.hud.miniRoom }; });
  await shot('minimap-interior-house', '#minimap');
  check('minimap indoors: the room\'s plan', mmIn.mode === 'house', mmIn);
  await ev(() => { const G = game; G.settings.hud = 'lba'; G.settings.minimap = 'north'; G.applySettings(); });

  // ---------------------------------------------------------------- small window: the map fits, labels still apart
  await page.setViewportSize({ width: 640, height: 360 });
  await place('citadel');
  const small = await ev(() => {
    P.tap('KeyM', 0.3); P.tap('KeyQ', 0.1);   // (Q: the whole map again, after the zooming above)
    const f = document.querySelector('#holomap .frame').getBoundingClientRect(), V = game.hud.holoView, L = game.hud.holoLabels;
    let overlaps = 0; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++; }
    return { frame: [f.x, f.y, f.width, f.height].map(Math.round), fits: f.x >= 0 && f.y >= 0 && f.right <= innerWidth && f.bottom <= innerHeight, overlaps, labels: L.length, canvas: [V.W, V.H] };
  });
  await shot('holomap-citadel-640x360');
  check('640×360: the Holomap fits the window; Q shows the whole island again; labels apart', small.fits && small.overlaps === 0 && small.labels >= 2, small);
  await ev(() => { P.tap('KeyM', 0.3); P.settle(); });
  fs.writeFileSync(`${OUT}/holomap-results.json`, JSON.stringify({ rows, mm, small }, null, 1));
} else {
  // the old minimap (HUD "Always on")
  await place('citadel');
  await ev(() => { const G = game; G.settings.hud = 'modern'; G.applySettings(); P.holdFor(['ArrowUp'], 0.5); P.settle(); });
  await shot('minimap-citadel', '#minimap');
}
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
