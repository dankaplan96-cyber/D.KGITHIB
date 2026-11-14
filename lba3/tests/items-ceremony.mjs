// SHOPS-ITEMS + I-24: items with their look, and the found-object ceremony.
//   1. the cupboard's magic ball (chapter 1): the ceremony once — state 'found', the framed box drawn with the ball
//      turning and its name, Twinsen turning to the camera and dancing, the camera held, keys ignored for the first
//      beat, any key continues; then his line; the cupboard again gives nothing and no second ceremony
//   2. a Kash bonus: no ceremony
//   3. Pippa's stall: a picture per item (the item's own model), the selected one turning large; buying by keys
//      still works (potion, flask, clover), no magic for sale; can't-afford and maximum told in words
//   4. the inventory: pictures per slot (rendered models), the selected turning; keys move the selection; opens
//      and closes with the keyboard (I) and the pad (View, B); rapid open/close leaves nothing turning
//   5. nothing drawn for the interface during play (the offscreen renderer idle)
// SHOTS=dir writes review pictures (the stall, the inventory, the ball's box) there as small JPEGs.
import { launch, checker } from './lib/boot.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const { browser, page } = await launch({ width: 1280, height: 720 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
// a review picture: the page as shown (HTML overlays included), as a small JPEG
const shot = async (name) => {
  if (!SHOTS) return;
  await page.waitForTimeout(800);   // (the box's grow is a CSS animation in real time)
  await ev(() => { game.frame(1 / 60, false); game.renderer.render(); });
  const buf = await page.screenshot({ type: 'jpeg', quality: 78, timeout: 600000 });
  writeFileSync(`${SHOTS}/${name}.jpg`, buf);
};

await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: +process.env.BOOT_TIMEOUT || 300000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await page.addScriptTag({ path: new URL('./lib/player.js', import.meta.url).pathname });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.step(1.0);
  window.PAD = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  window.padTap = (b) => { PAD.buttons[b] = { pressed: true }; G.step(1 / 60); PAD.buttons[b] = { pressed: false }; G.step(1 / 60); };
  // how much of a canvas is drawn (alpha > 0), and a cheap hash of it (does it change as it turns?)
  window.inked = (c) => { if (!c) return { n: 0, h: 0 }; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, h = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) { n++; h = (h * 31 + d[i - 3] + d[i - 2] * 7) % 1e9; } return { n, frac: +(n / (c.width * c.height)).toFixed(3), h }; };
  // count the item renderer's draws
  window.ITEMDRAWS = 0;
});

// ---------------------------------------------------------------- 1. the cupboard's ball
const c1 = await ev(() => {
  const G = game, h = G.hero, s = G.room.searches.find((x) => x.id === 'cupboard');
  h.pos.set(s.x + 0.3, 0, s.z); h.angle = -Math.PI / 2; h.vel?.set(0, 0); h.onGround = true; G.step(0.3);
  const cam0 = G.camera.position.clone(), hp0 = h.hp;
  P.tap('KeyE', 1 / 60);
  const r = { state: G.state, ball: h.hasBall, cur: G.foundObj.cur?.id };
  const box = document.querySelector('#found');
  r.shown = !box.classList.contains('hidden'); r.name = box.querySelector('.found-name').textContent;
  // a key in the first beat does not skip it (the key that searched is still down)
  P.tap('Space', 0.1); r.afterEarlyKey = G.state;
  G.step(0.5);
  r.anim = h.rig.anim; r.faceErr = +Math.abs(Math.atan2(Math.sin(h.angle - Math.atan2(G.camera.position.x - h.pos.x, G.camera.position.z - h.pos.z)), Math.cos(h.angle - Math.atan2(G.camera.position.x - h.pos.x, G.camera.position.z - h.pos.z)))).toFixed(2);
  r.camMoved = +G.camera.position.distanceTo(cam0).toFixed(3);
  const c = box.querySelector('canvas'); const a = inked(c); G.step(0.3); const b = inked(c);
  r.boxInk = a.frac; r.turned = a.h !== b.h;
  // (its laid-out place: the grow is a CSS animation in real time, which a test's stepped time outruns)
  const fb = box.querySelector('.found-box');
  r.box = { top: +(fb.offsetTop / innerHeight).toFixed(2), h: +(fb.offsetHeight / innerHeight).toFixed(2), cx: +((fb.offsetLeft + fb.offsetWidth / 2) / innerWidth).toFixed(2), square: +(fb.offsetWidth / fb.offsetHeight).toFixed(2) };
  r.hp = h.hp === hp0;
  return r;
});
await shot('ball-found');
const c1b = await ev(() => {
  const G = game, r = {};
  P.tap('KeyX', 0.05); r.leaving = G.foundObj.cur?.out >= 0;
  G.step(0.6); r.after = G.state; r.line = document.querySelector('#dialog .text')?.textContent?.length > 0;
  P.settle(); r.play = G.state; r.shown = G.foundObj.shown.slice(); r.hidden = document.querySelector('#found').classList.contains('hidden');
  // the cupboard again: nothing more, no second box
  const s = G.room.searches.find((x) => x.id === 'cupboard'), h = G.hero;
  h.pos.set(s.x + 0.3, 0, s.z); h.angle = -Math.PI / 2; h.onGround = true; G.step(0.3); P.tap('KeyE', 0.1); P.settle();
  r.again = G.foundObj.shown.length;
  return r;
});
check('the cupboard: the ball\'s box comes up at once (state found, the ball, its name)', c1.state === 'found' && c1.ball && c1.cur === 'ball' && c1.shown && c1.name === 'Magic Ball', c1);
check('the first beat ignores keys (the key that searched cannot skip it)', c1.afterEarlyKey === 'found', c1);
check('Twinsen turns to the camera and dances the found dance; the camera holds; nothing hurts him', c1.anim === 'found' && c1.faceErr < 0.15 && c1.camMoved < 0.01 && c1.hp, c1);
check('the box: the ball drawn large and turning, near the top, centred, square (LBA2: top 10 %, 27 % tall)', c1.boxInk > 0.12 && c1.turned && Math.abs(c1.box.top - 0.1) < 0.03 && Math.abs(c1.box.h - 0.27) < 0.03 && Math.abs(c1.box.cx - 0.5) < 0.02 && Math.abs(c1.box.square - 1) < 0.05, c1);
check('any key continues: the box goes, his line follows, then play', c1b.leaving && c1b.after === 'dialog' && c1b.line && c1b.play === 'play' && c1b.hidden, c1b);
check('the ceremony came once (the cupboard again: no second one)', c1b.shown.length === 1 && c1b.shown[0] === 'ball' && c1b.again === 1, c1b);

// ---------------------------------------------------------------- 2. a Kash: no ceremony
const k = await ev(() => {
  const G = game, h = G.hero, n0 = G.foundObj.shown.length, c0 = h.coins;
  G.pickups.spawn('coin', h.pos.x, h.pos.y + 0.4, h.pos.z, { value: 5 });
  for (let i = 0; i < 30 && h.coins === c0; i++) G.step(0.05);
  G.step(0.2);
  return { coins: h.coins - c0, state: G.state, shown: G.foundObj.shown.length - n0 };
});
check('a Kash bonus: counted, no ceremony', k.coins > 0 && k.state === 'play' && k.shown === 0, k);

// ---------------------------------------------------------------- 3. Pippa's stall
const s1 = await ev(() => {
  const G = game, W = G.world;
  G.exitRoom({ x: W.stall.x + Math.sin(W.stall.a) * 3, z: W.stall.z + Math.cos(W.stall.a) * 3, a: W.stall.a + Math.PI }, true);
  G.step(1.5); P.settle();
  const n = P.npc('pippa');
  P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z);
  P.tap('KeyE', 0.1);
  for (let i = 0; i < 40 && G.state === 'dialog'; i++) P.tap('KeyE', 0.12);
  G.step(0.2);
  const el = document.querySelector('#shop'), rows = [...el.querySelectorAll('.item')];
  return { state: G.state, goods: el.classList.contains('goods'), ids: G.hud.shopSel, labels: rows.map((b) => b.querySelector('span').textContent),
    pics: rows.map((b) => (b.querySelector('img.pic')?.src || '').slice(0, 22)), big: inked(el.querySelector('.shop-big canvas')).frac, purse: el.querySelector('.coins img') ? 'coin' : 'text',
    name: el.querySelector('.shop-name')?.textContent };
});
await ev(() => { game.hero.coins = 30; game.hero.hp = 3; game.hero.mp = 0; game.hud.shopRender(); game.step(0.4); });
await shot('pippa-stall');
check('Pippa\'s stall: the potion, the flask and the clover, each with its picture; no magic for sale', s1.state === 'shop' && s1.goods && s1.labels.length === 3 && s1.pics.every((p) => p.startsWith('data:image/png')) && !s1.labels.some((l) => /magic level/i.test(l)), s1);
check('the selected item turns large beside the list, with its name; the purse shows a Kash', s1.big > 0.08 && /Heart potion/.test(s1.name) && s1.purse === 'coin', s1);
const s2 = await ev(async () => {
  const G = game, h = G.hero, r = {};
  const look = () => ({ sel: G.hud.shopSel, name: document.querySelector('#shop .shop-name')?.textContent, why: document.querySelector('#shop .shop-why')?.textContent });
  h.coins = 40; h.hp = 3; h.mp = 0; const cl0 = h.clovers;
  r.sel0 = G.hud.shopSel; G.hud.shopSel = 0; G.hud.shopRender();
  P.tap('KeyE', 0.1); r.potion = { hp: h.hp === h.maxHp, coins: h.coins };
  P.tap('ArrowDown', 0.1); r.sel1 = look();
  P.tap('KeyE', 0.1); r.flask = { mp: h.mp === h.mpMax, coins: h.coins };
  P.tap('ArrowDown', 0.1); r.sel2 = look();
  P.tap('KeyE', 0.1); r.clover = { n: h.clovers - cl0, coins: h.coins };
  // not enough left for another clover: told in words, nothing bought
  r.poor = look(); P.tap('KeyE', 0.1); r.poorAfter = { n: h.clovers - cl0, coins: h.coins };
  // turning: the large view changes as time passes
  const c = document.querySelector('#shop .shop-big canvas'); const a = inked(c).h; G.step(0.5); r.turned = inked(c).h !== a;
  P.tap('ArrowDown', 0.1); r.leaveSel = look();
  P.tap('Escape', 0.1); r.closed = G.state; r.hidden = document.querySelector('#shop').classList.contains('hidden');
  return r;
});
check('buying by keys: the potion fills the life (6), the flask the magic (5), a clover (22)', s2.potion.hp && s2.potion.coins === 34 && s2.flask.mp && s2.flask.coins === 29 && s2.clover.n === 1 && s2.clover.coins === 7, s2);
check('the arrows move the selection and the large view follows; Leave shows nothing', /flask/i.test(s2.sel1.name) && /Clover/.test(s2.sel2.name) && s2.leaveSel.name == null, s2);
check('too few kashes: "You need N more kashes", nothing bought', /You need 15 more kashes/.test(s2.poor.why) && s2.poorAfter.n === 1 && s2.poorAfter.coins === 7, s2);
check('the selected item turns; Esc leaves the stall', s2.turned && s2.closed === 'play' && s2.hidden, s2);

// ---------------------------------------------------------------- 4. the inventory
const i1 = await ev(() => {
  const G = game, r = {};
  G.hero.coins = 12;
  P.tap('KeyI', 0.1);
  const el = document.querySelector('#inventory'), slots = [...el.querySelectorAll('.inv-item')];
  const items = G.inventory.items();
  r.state = G.state; r.n = slots.length; r.items = items.map((i) => i.id);
  r.rendered = slots.every((b, i) => b.querySelector('img').src === G.inventory.pic(items[i]) && b.querySelector('img').src.startsWith('data:image/png'));
  r.spin = !!el.querySelector('.inv-item.sel canvas.spin'); r.big = inked(el.querySelector('.inv-big canvas')).frac;
  r.name = el.querySelector('.inv-name')?.textContent;
  const c = el.querySelector('.inv-big canvas'), a = inked(c).h; G.step(0.6); r.turned = inked(c).h !== a;
  P.tap('ArrowRight', 0.1); r.name2 = el.querySelector('.inv-name')?.textContent; r.sel2 = G.inventory.sel;
  r.coin = el.querySelectorAll('.inv-item')[items.findIndex((i) => i.id === 'kashes')]?.querySelector('em')?.textContent;
  return r;
});
await shot('inventory');
const i2 = await ev(() => {
  const G = game, r = {};
  P.tap('KeyI', 0.1); r.closed = G.state;
  // the pad: View opens, B closes; View again opens and View closes
  navigator.getGamepads = () => [PAD];
  padTap(8); r.padOpen = G.state; r.padHint = document.querySelector('#inventory .inv-hint')?.textContent; padTap(1); r.padB = G.state; padTap(8); padTap(8); r.padView = G.state;
  navigator.getGamepads = () => []; G.input.lastDevice = 'kbd'; G.step(0.1);
  // rapid open/close: an even number of presses ends shut, nothing turning
  for (let k = 0; k < 6; k++) P.tap('KeyI', 1 / 60);
  G.step(0.2); r.rapid = G.state; r.rapidHidden = document.querySelector('#inventory').classList.contains('hidden');
  return r;
});
check('I opens the inventory: a rendered model per slot, the selected turning in its slot and large, with its name', i1.state === 'inventory' && i1.n === i1.items.length && i1.rendered && i1.spin && i1.big > 0.05 && i1.turned && i1.name === 'Medallion', i1);
check('the arrows move the selection (the name follows); the Kashes slot shows the count', i1.sel2 === 1 && i1.name2 !== i1.name && i1.coin === '12', i1);
check('I closes it; the pad\'s View opens it (its line says View / B), B closes it, View closes it', i2.closed === 'play' && i2.padOpen === 'inventory' && /View \/ B: close/.test(i2.padHint) && i2.padB === 'play' && i2.padView === 'play', i2);
check('rapid open/close ends shut and in play', i2.rapid === 'play' && i2.rapidHidden, i2);

// ---------------------------------------------------------------- 4b. the world waits under the box (an enemy beside him)
const w1 = await ev(() => {
  const G = game, h = G.hero, e = G.enemies.find((x) => !x.ko && !x.dead && x.pos);
  if (!e) return { none: true };
  const home = e.pos.clone(); e.pos.set(h.pos.x + 1.0, h.pos.y, h.pos.z); e.alerted = true;
  const p0 = e.pos.clone(), hp0 = h.hp;
  G.found('lidkey', 'pr_toast_key', () => {});
  const st = G.state; G.step(2.0);
  const r = { st, hp: h.hp === hp0, still: +e.pos.distanceTo(p0).toFixed(3), during: G.state };
  G.step(1.5); r.after = G.state; e.pos.copy(home); G.step(0.2);
  return r;
});
check('the world waits under the box: an enemy beside him neither moves nor hurts him', w1.none || (w1.st === 'found' && w1.hp && w1.still < 0.01 && w1.after === 'play'), w1);

// ---------------------------------------------------------------- 5. nothing drawn for the interface during play
const p1 = await ev(async () => {
  const { stage } = await import('/src/game/itemlook.js');
  const R = stage.r, real = R.render.bind(R); let n = 0; R.render = (...a) => { n++; return real(...a); };
  game.step(2.0);
  const inPlay = n;
  P.tap('KeyI', 0.1); game.step(0.5); const inInv = n - inPlay; P.tap('KeyI', 0.1);
  R.render = real;
  return { inPlay, inInv, spins: stage.spins.length, state: game.state };
});
check('in play the item renderer draws nothing (it draws only while a pausing screen is open)', p1.inPlay === 0 && p1.inInv > 0 && p1.inInv <= 20 && p1.spins === 0 && p1.state === 'play', p1);

// ---------------------------------------------------------------- 6. big text reaches the new screens
const t1 = await ev(() => {
  const G = game, fs = (s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
  P.tap('KeyI', 0.1); const n = fs('.inv-desc'); P.tap('KeyI', 0.1);
  G.settings.textSize = 'large'; G.applySettings(); P.tap('KeyI', 0.1); const b = fs('.inv-desc'); P.tap('KeyI', 0.1);
  G.settings.textSize = 'normal'; G.applySettings();
  return { normal: n, big: b };
});
check('Text size: big makes the inventory\'s text larger', t1.big > t1.normal, t1);

done();
await browser.close();
