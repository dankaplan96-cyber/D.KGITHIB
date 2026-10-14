// Regression checks from the v0.10.0 audit: a bonus carried by the magic ball is credited exactly once on a
// scene change and let go (never credited) on a load; shadow and bloom state follow quality + visual mode in
// every order (and on a start with saved Low settings); the frame-time overlay has its own key (F9), never
// changes the behaviour, and a held key toggles it once.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, JSON.stringify(info)); };
const open = async (query = '', pre = null) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  if (pre) await page.addInitScript(pre);
  await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + query, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  return page;
};

let page = await open();
// 1. the ball carrying a coin: through a door → credited once; a load → let go, not credited
let r = await page.evaluate(() => {
  const G = window.game; G.testFreeze = true; G.devArena();
  const h = G.hero, B = G.ball, step = (s) => { for (let t = 0; t < s; t += 1 / 60) G.frame(1 / 60, false); };
  const carry = () => {
    h.pos.set(6190, G.physics.groundAt(6190, 8), 8); G.state = 'play'; B.reset(); h.mp = 0;
    B.launch(h, 'normal', 1, { aim: { x: 1, z: 0 } }); step(0.15);
    const p = G.pickups.spawn('coin', B.pos.x + B.vel.x * 0.05, B.pos.y + B.vel.y * 0.05, B.pos.z, { value: 3 });
    for (let i = 0; i < 30 && !p.carried; i++) step(1 / 60);
    return p;
  };
  const p1 = carry(), c0 = h.coins, carried1 = !!p1.carried;
  G.enterRoom('house', null, true);
  const door = { carried: carried1, gained: h.coins - c0, inList: G.pickups.list.includes(p1) };
  step(1); door.after = h.coins - c0; // (nothing more later)
  G.devArena();
  const p2 = carry(), c1 = h.coins, carried2 = !!p2.carried;
  G.applySave(G.snapshot());
  const load = { carried: carried2, gained: h.coins - c1, inList: G.pickups.list.includes(p2), stillCarried: !!p2.carried };
  return { door, load };
});
check('ball: a carried bonus is credited once on a scene change', r.door.carried && r.door.gained === 3 && r.door.after === 3 && !r.door.inList, r.door);
check('ball: a load lets a carried bonus go without crediting it', r.load.carried && r.load.gained === 0 && r.load.inList && !r.load.stillCarried, r.load);

// 2. shadows and bloom follow quality + visual mode in every order
r = await page.evaluate(() => {
  const G = window.game, R = G.renderer, out = [];
  const set = (k, v) => { G.settings[k] = v; G.applySettings(); out.push([k + '=' + v, R.renderer.shadowMap.enabled, R.bloom.enabled]); };
  set('quality', 'high'); set('quality', 'low'); set('quality', 'high'); set('quality', 'low'); set('quality', 'medium');
  for (const q of ['low', 'medium', 'high']) { set('quality', q); set('visual', '1997'); set('visual', '2026'); }
  return out;
});
const want = (row) => { const [kv] = row; return kv; };
let ok = true; const bad = [];
{
  let q = null, v = '2026';
  for (const row of r) {
    const [kv, sh, bl] = row; const [k, val] = kv.split('=');
    if (k === 'quality') q = val; else v = val;
    const exp = v !== '1997' && q !== 'low';
    if (sh !== exp || bl !== (exp && q === 'high')) { ok = false; bad.push(row); } // (bloom: High only)
  }
}
void want;
check('graphics: shadows (not Low) and bloom (High) match quality and visual mode after every change', ok, { bad, steps: r.length });
await page.close();

// 3. a start with saved Low settings: no shadows, no bloom
page = await open('', () => localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'low' })));
r = await page.evaluate(() => { const G = window.game; return { q: G.settings.quality, sh: G.renderer.renderer.shadowMap.enabled, bl: G.renderer.bloom.enabled }; });
check('graphics: a start with saved Low has no shadows or bloom', r.q !== 'low' || (!r.sh && !r.bl), r);

// 4. F9 toggles the overlay once per press, never the behaviour; F3 still picks a behaviour
r = await page.evaluate(async () => {
  const G = window.game, h = G.hero; G.testFreeze = true; G.devArena(); G.state = 'play';
  const b0 = h.behaviour;
  const fire = (code, repeat = false) => window.dispatchEvent(new KeyboardEvent('keydown', { code, repeat }));
  const up = (code) => window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  const on0 = !!G.perf.el;
  fire('F9'); for (let i = 0; i < 5; i++) fire('F9', true); up('F9');
  for (let i = 0; i < 3; i++) G.frame(1 / 60, false);
  const on1 = !!G.perf.el, b1 = h.behaviour;
  fire('F3'); for (let i = 0; i < 3; i++) G.frame(1 / 60, false); up('F3');
  return { on0, on1, b0, b1, b2: h.behaviour, overlayAfterF3: !!G.perf.el };
});
check('F9: one toggle per press (key repeat ignored)', r.on1 === !r.on0, r);
check('F9: the overlay never changes the behaviour', r.b1 === r.b0, r);
check('F3: picks a behaviour and leaves the overlay alone', r.overlayAfterF3 === r.on1, r);

console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
