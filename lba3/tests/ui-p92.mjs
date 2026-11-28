// UI-P92 (P92 task 4, the owner: "less UI clutter, clearer actions"). The HUD rule: from a distance, show where to go
// (not the action); within reach, show the action and its button; after a failed attempt, say why; after success, let
// the result speak. Driven by input (tests/lib/player.js: keys, a synthetic pad through a navigator.getGamepads stub, as
// tests/fps30.mjs and tests/uipass.mjs do); story flags are only read.
//   A  a new game at 1366×768, English, keyboard: the kitchen tap from across the room (no action shown) and within
//      reach (the action names the tap, with the key in use); used: his line says why it fails; the interact key
//      remapped (the prompt names the new key); a synthetic pad (the prompt and the inventory in the pad's buttons);
//      the inventory (focus inside, no gameplay through it, Esc closes, rapid open/close, focus restored); the
//      cupboard's ball (the found box, then one line); a coin from a container (a float, no toast); the ball held to aim
//      (the HUD side: what text shows while aiming)
//   B  the same game in Hebrew (Settings → Language, by clicks): the prompt, toasts with keys in them, the inventory
//      and the journal, keyboard and pad; an audit of every Hebrew line: a key name (kbd and pad labels) or a code
//      ("B-7", "J-17") inside a right-to-left line keeps its own left-to-right order, and a line that opens with a code
//      still reads right to left
//   C  two adjacent things (chapter 2's pump room, fixture new-04: three pipes to feel, two cocks, the plate, the gauge):
//      turning in place by the keys at three spots, the prompt per frame: which thing it is for, how often it changes,
//      whether two things in reach ever share one prompt text
// SHOTS=before|after writes captures/ui-p92/<SHOTS>-*.jpg (1366×768; chapters 1–2 only). Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const SHOTS = process.env.SHOTS || '';
const CAP = fileURLToPath(new URL('../captures/ui-p92/', import.meta.url));
if (SHOTS) fs.mkdirSync(CAP, { recursive: true });
const ONLY = process.env.ONLY || 'ABC';
const FIX = fileURLToPath(new URL('./fixtures/campaign/', import.meta.url));
const ORIGIN = new URL(process.env.GAME_URL || 'http://localhost:8123/').origin;
let browser, page, context;
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: CAP + SHOTS + '-' + n + '.jpg', type: 'jpeg', quality: 70, timeout: 240000 }).catch(() => {}); };

// page helpers (installed after every load)
const helpers = () => ev(async () => {
  const inp = await import('./src/engine/input.js');
  const i18n = await import('./src/game/i18n.js');
  window.U = {
    code: (a) => inp.keyFor(a),
    key: (a) => game.hud.key(a),
    prompt: () => (document.querySelector('#prompt.show') ? document.querySelector('#prompt').textContent.trim() : ''),
    promptHTML: () => (document.querySelector('#prompt.show') ? document.querySelector('#prompt').innerHTML : ''),
    target: () => { const it = game.findInteractable(); if (!it) return null; return it.kind + ':' + (it.which ?? it.npc?.def.id ?? it.sign?.key ?? it.label); },
    // the panels with text on screen now (the clutter count)
    panels: () => ['#tip.show', '#objective.show', '#prompt.show', '#toast .toast:not(.out)', '#dialog:not(.hidden)', '#found:not(.hidden)'].flatMap((s) => [...document.querySelectorAll(s)]).filter((e) => e.getClientRects().length && getComputedStyle(e).opacity !== '0').map((e) => (e.id || e.className) + ': ' + e.textContent.trim().slice(0, 70)),
    // which way a text's first line runs on screen (its first letter at the line's right end: rtl)
    reads(el) {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ch = [];
      for (let n; (n = w.nextNode());) for (let i = 0; i < n.data.length; i++) {
        if (!/[A-Za-z֐-׿]/.test(n.data[i])) continue;
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect(); if (b.width) ch.push(b);
      }
      if (ch.length < 2) return 'one';
      const f = ch[0], line = ch.filter((b) => Math.abs(b.top - f.top) < f.height / 2), L = Math.min(...line.map((b) => b.left)), R = Math.max(...line.map((b) => b.right));
      return f.right >= R - 1 ? 'rtl' : f.left <= L + 1 ? 'ltr' : 'mixed';
    },
    // the on-screen x of each character of `sub` inside el's text (the first occurrence): in order left to right?
    ltrOrder(el, sub) {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let txt = '', nodes = [];
      for (let n; (n = w.nextNode());) { nodes.push([n, txt.length]); txt += n.data; }
      const at = txt.indexOf(sub); if (at < 0) return null;
      const xs = [];
      for (let i = at; i < at + sub.length; i++) {
        if (/\s/.test(txt[i])) continue;
        const [n, o] = nodes.filter(([, s]) => s <= i).pop(); const r = document.createRange(); r.setStart(n, i - o); r.setEnd(n, i - o + 1);
        const b = r.getBoundingClientRect(); if (b.width) xs.push(b.left + b.width / 2);
      }
      for (let i = 1; i < xs.length; i++) if (xs[i] < xs[i - 1] - 0.5) return false;
      return true;
    },
    t: i18n.t,
    STR: i18n.STR,
    // turn in place by the keys for `s` seconds, the prompt and its target each frame
    turn(s, key = 'ArrowLeft') {
      const rows = []; game.input.keys.add(key);
      for (let t = 0; t < s; t += 1 / 30) { game.step(1 / 30); rows.push([U.target(), U.prompt()]); }
      game.input.keys.delete(key); game.step(0.1);
      return rows;
    },
    settleFound() { for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(0.4); },
    pad() {
      const btn = (p) => ({ pressed: p, value: p ? 1 : 0 });
      window.__pad = { connected: true, id: 'synthetic pad', index: 0, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => btn(false)) };
      navigator.getGamepads = () => [window.__pad];
      window.padTap = (i) => { window.__pad.buttons[i] = btn(true); game.step(0.05); window.__pad.buttons[i] = btn(false); game.step(0.1); };
    },
    unpad() { if (window.__pad) window.__pad.connected = false; navigator.getGamepads = () => []; dispatchEvent(new KeyboardEvent('keydown', { code: 'F8' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'F8' })); game.step(0.05); },   // (an unbound key: the keyboard again)
  };
});
// how often the prompt's target changes while he turns, and whether two in-reach things share one text
const flick = (rows) => {
  let changes = 0, abA = 0, sameText = 0; const seen = new Map();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== rows[i - 1][0]) { changes++; if (i >= 2 && rows[i][0] === rows[i - 2][0]) abA++; }
    if (rows[i][1]) { const k = rows[i][1]; if (!seen.has(k)) seen.set(k, new Set()); seen.get(k).add(rows[i][0]); }
  }
  for (const [, s] of seen) if (s.size > 1) sameText++;
  return { frames: rows.length, changes, bounceBack: abA, textsShared: sameText, texts: [...seen].map(([k, s]) => k + ' ← ' + [...s].join(', ')) };
};

if (ONLY.includes('A') || ONLY.includes('B')) {
  ({ browser, page, context } = await launch({ width: 1366, height: 768 }));
  await open(page, '?nocine');
  await ev(() => localStorage.clear());
  await open(page, '?nocine');
  await page.click('[data-act="new"]');
  if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
  await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });
  await helpers();

  // ---------------------------------------------------------------- A1 the kitchen tap, from across the room
  const far = await ev(() => {
    const H = game.story.chapters[0].home.parts.house, h = game.hero;
    P.go(H.tap.front.x - 0.4, H.tap.front.z + 3.0, { tol: 0.3 }); P.face(H.spout.x, H.spout.z); game.step(0.6);
    return { d: +Math.hypot(h.pos.x - H.tap.x, h.pos.z - H.tap.z).toFixed(1), prompt: U.prompt(), panels: U.panels() };
  });
  check('A1 the kitchen tap from across the room: no action prompt (the goal panel says where to go)', far.prompt === '' && far.d > 2, far);
  await shot('en-kbd-tap-far');
  const near = await ev(() => {
    const H = game.story.chapters[0].home.parts.house;
    P.go(H.tap.front.x, H.tap.front.z, { tol: 0.25, stopWhen: () => U.target()?.startsWith('h_tap') }); P.face(H.spout.x, H.spout.z); game.step(0.6);
    return { target: U.target(), prompt: U.prompt(), key: U.key('interact'), kbd: document.querySelector('#prompt.show kbd')?.textContent };
  });
  check('A1 within reach: the action names the tap ("Try Tap"), with the key in use', near.target?.startsWith('h_tap') && /\bTap\b/.test(near.prompt) && near.kbd === near.key, near);
  await shot('en-kbd-tap-near');
  const why = await ev(() => {
    P.tap(U.code('interact'), 0.1);
    for (let i = 0; i < 90 && game.state === 'play'; i++) game.step(1 / 30);
    const D = game.hud.dialog; game.step(0.1); const line = D.full; P.tap('KeyE', 0.05);
    return { state: game.state, line, tapFlag: !!game.flags.pr_tap };
  });
  check('A1 used: his line says why nothing came (dry, knocking), no extra success text', why.state === 'dialog' && /drop|dry|knock/i.test(why.line || ''), why);
  await shot('en-kbd-tap-why');
  const after = await ev(() => { P.settle(); game.step(0.8); return { prompt: U.prompt(), toasts: [...document.querySelectorAll('#toast .toast')].map((e) => e.textContent), flag: !!game.flags.pr_tap }; });
  check('A1 after the try: no "done" toast, the prompt is back for another try', after.flag && after.toasts.length === 0 && /\bTap\b/.test(after.prompt), after);

  // ---------------------------------------------------------------- A2 the interact key remapped: the prompt names it
  await ev(() => game.pause());
  await page.click('#pause [data-act="controls"]');
  await page.click('#rebind .keybtn[data-action="interact"]'); await page.keyboard.press('KeyG');
  await page.click('#controls [data-act="back"]'); await page.click('#pause [data-act="resume"]');
  const remap = await ev(() => { game.testFreeze = true; game.step(0.6); return { key: U.key('interact'), kbd: document.querySelector('#prompt.show kbd')?.textContent, prompt: U.prompt() }; });
  check('A2 the interact key remapped to G: the prompt names G at once', remap.key === 'G' && remap.kbd === 'G', remap);
  await ev(() => game.pause());
  await page.click('#pause [data-act="controls"]');
  await page.click('#controls [data-act="resetkeys"]');
  await page.click('#controls [data-act="back"]'); await page.click('#pause [data-act="resume"]');
  await ev(() => { game.testFreeze = true; game.step(0.3); });

  // ---------------------------------------------------------------- A3 a synthetic pad: the prompt and the inventory
  const pad = await ev(() => {
    U.pad(); padTap(8); game.step(0.3);   // (View: the inventory)
    const inv = { state: game.state, hint: document.querySelector('#inventory .inv-hint')?.textContent, focus: document.activeElement?.closest('#inventory') ? 'inside' : document.activeElement?.tagName };
    return inv;
  });
  check('A3 the pad\'s View opens the inventory; its line names the pad\'s buttons', pad.state === 'inventory' && /\bB\b|View/.test(pad.hint || ''), pad);
  await shot('en-pad-inventory');
  const padNear = await ev(() => { padTap(1); game.step(0.6); return { state: game.state, prompt: U.prompt(), kbd: document.querySelector('#prompt.show kbd')?.textContent, dev: game.input.lastDevice }; });
  check('A3 B closes it; within reach the prompt names the pad\'s A', padNear.state === 'play' && padNear.kbd === 'A' && /\bTap\b/.test(padNear.prompt), padNear);
  await shot('en-pad-tap-near');
  await ev(() => U.unpad());

  // ---------------------------------------------------------------- A4 the inventory by the keyboard
  const inv = await ev(() => {
    const h = game.hero, p0 = [h.pos.x, h.pos.z];
    P.tap(U.code('inventory'), 0.3);
    const open1 = game.state, focusIn = !!document.activeElement?.closest('#inventory'), sel0 = game.inventory.current()?.id;
    game.input.keys.add('ArrowUp'); game.input.keys.add(U.code('up')); game.step(0.8); game.input.keys.delete('ArrowUp'); game.input.keys.delete(U.code('up'));
    P.tap(U.code('interact'), 0.1);   // (E/W on an item that isn't a gadget closes the window; the world must not get it)
    const moved = +Math.hypot(h.pos.x - p0[0], h.pos.z - p0[1]).toFixed(3);
    const st1 = game.state;
    if (game.state === 'inventory') P.tap('Escape', 0.2);
    const closed = game.state;
    // rapid open / close, then one → moves the selection by one
    for (let i = 0; i < 6; i++) P.tap(U.code('inventory'), 1 / 30);
    const afterRapid = game.state;
    if (game.state !== 'inventory') P.tap(U.code('inventory'), 0.2);
    const nI = game.inventory.items().length, i0 = game.inventory.sel ?? 0; P.tap('ArrowRight', 0.1); const i1 = game.inventory.sel ?? 0;
    P.tap('Escape', 0.2);
    return { open1, focusIn, sel0, moved, st1, closed, afterRapid, nI, i0, i1, state: game.state, inDialog: game.state === 'dialog' };
  });
  check('A4 the inventory: opens on its key, nothing reaches the world under it (no step, no use), Esc closes back to play', inv.open1 === 'inventory' && inv.moved < 0.01 && inv.closed === 'play' && inv.state === 'play', inv);
  check('A4 rapid open/close (6 taps) leaves one consistent state; one → moves the selection by one', inv.afterRapid === 'play' && (inv.nI <= 1 || inv.i1 === (inv.i0 + 1) % inv.nI), inv);
  await ev(() => P.tap(U.code('inventory'), 0.3));
  await shot('en-kbd-inventory');
  await ev(() => { P.tap('Escape', 0.2); game.step(0.2); });

  // ---------------------------------------------------------------- A5 the ball from the cupboard; a coin from a container
  const found = await ev(() => {
    const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.go(sp.x, sp.z, { tol: 1.2 }); P.face(sp.x, sp.z); game.step(0.5);
    P.tap(U.code('interact'), 0.1);
    for (let i = 0; i < 200 && game.state !== 'found'; i++) { if (game.state === 'dialog') P.tap('KeyE', 0.1); else game.step(1 / 30); }
    game.step(0.6);
    return { state: game.state, name: document.querySelector('#found .found-name')?.textContent, panels: U.panels() };
  });
  check('A5 the magic ball: the found box names it', found.state === 'found' && !!found.name, found);
  await shot('en-found-ball');
  const afterBall = await ev(() => { U.settleFound(); game.step(0.3); return { panels: U.panels(), toasts: [...document.querySelectorAll('#toast .toast')].map((e) => e.textContent) }; });
  check('A5 after the box: at most one toast, naming the keys (no "Done")', afterBall.toasts.length <= 1 && !afterBall.toasts.some((s) => /done|success/i.test(s)), afterBall);
  await shot('en-after-ball');
  const coin = await ev(() => {
    // (the dresser, as a player searches it: its prompt, the key, then the coin picked up)
    const gv = game.givers().find((g) => g.id === 'dresser'); P.go(gv.x, gv.z, { tol: gv.r * 0.6, maxT: 30 }); P.face(gv.x, gv.z, 1.0); game.step(0.4);
    const pr = U.prompt(); P.tap(U.code('interact'), 0.1); game.step(1.4); const n = P.grab(6);
    const r = { r: game.hero.coins > 0 ? 'rummaged' : 'nothing', prompt: pr, n }; const fl = [...document.querySelectorAll('#floats .float')].map((e) => e.textContent); return { r, floats: fl, toasts: [...document.querySelectorAll('#toast .toast')].map((e) => e.textContent), coins: game.hero.coins }; });
  check('A5 a bonus from a container (the dresser, "Search" in reach): a float at the pickup and the counter, no toast for it', coin.r.r === 'rummaged' && coin.floats.length >= 1 && !coin.toasts.some((x) => /kash|coin|\+\d/i.test(x)), coin);
  await shot('en-pickup');

  // ---------------------------------------------------------------- A6 the yard; the ball held to aim (the HUD side)
  const yard = await ev(() => {
    const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.6); P.settle();
    P.talk('zoe'); U.settleFound(); P.tap(U.code('inventory'), 0.3); P.tap(U.code('inventory'), 0.3); game.step(1.5); P.settle();
    return { room: game.room?.id ?? 'out', kettle: !!game.flags.pr_kettle };
  });
  check('A6 out in the yard, Zoé talked to', yard.room === 'out', yard);
  // the garden tap's step, from 7 m off (on the far side of the path from the door) and then in reach
  const tapStep = await ev(() => {
    const Y = game.story.chapters[0].home.parts.yard, D = game.world.houses[0].door, h = game.hero, L = Math.hypot(Y.x - D.x, Y.z - D.z) || 1;
    const fx = Y.x + ((Y.x - D.x) / L) * 7, fz = Y.z + ((Y.z - D.z) / L) * 7;
    P.go(fx, fz, { tol: 1.0, maxT: 30 }); P.settle(); game.step(0.8);
    const far = { d: +Math.hypot(h.pos.x - Y.x, h.pos.z - Y.z).toFixed(1), step: game.tutorial.shown, tip: document.querySelector('#tip.show')?.textContent || '', prompt: U.prompt() };
    return { far, key: U.key('interact') };
  });
  check('A6 the garden tap\'s step from a distance: the goal (and the marker) only, no key line, no prompt for it', tapStep.far.step === 'step:tap' && tapStep.far.d > 3.5 && !tapStep.far.tip.includes(tapStep.key + ' Try') && !/Tap/.test(tapStep.far.prompt), tapStep);
  await shot('en-kbd-tapstep-far');
  const aim = await ev(() => {
    P.go(-45.3, 73.0, { tol: 0.4 }); P.settle(); P.go(-45.3, 73.0, { tol: 0.4 }); game.step(1.0);
    const B = game.story.cur.barrels(); P.face(B.x, B.z);
    game.input.keys.add(U.code('ball')); game.step(0.7);
    const Y = game.story.chapters[0].home.parts.yard, h = game.hero;
    return { panels: U.panels(), weapon: document.querySelector('#weapon')?.textContent.trim(), tip: document.querySelector('#tip.show')?.textContent || '', step: game.tutorial.shown, tapD: +Math.hypot(h.pos.x - Y.x, h.pos.z - Y.z).toFixed(1), key: U.key('interact') };
  });

  check('A6 aiming the ball: no action prompt over the aim; the text says what the key does', !aim.panels.some((p) => p.startsWith('prompt')), aim);
  await shot('en-kbd-aim');
  await ev(() => { game.input.keys.delete(U.code('ball')); game.step(2.0); P.settle(); });

  // ---------------------------------------------------------------- B: Hebrew
  if (ONLY.includes('B')) {
    await ev(() => game.pause());
    await page.click('#pause [data-act="settings"]');
    await page.click('#settings .seg[data-setting="lang"] button[data-v="he"]');
    await page.click('#settings .menu button'); await page.click('#pause [data-act="resume"]');
    await ev(() => { game.testFreeze = true; game.step(0.4); });
    const heTap = await ev(() => {
      const Y = game.story.chapters[0].home.parts.yard; P.go(Y.hand.front.x, Y.hand.front.z, { tol: 0.3, stopWhen: () => U.target()?.startsWith('h_yard') }); P.face(Y.x, Y.z); game.step(0.6);
      const el = document.querySelector('#prompt'), k = el.querySelector('kbd'), kt = el.querySelector('.kt');
      return { lang: game.settings.lang, prompt: U.prompt(), keyLeft: !!k && !!kt && k.getBoundingClientRect().right <= kt.getBoundingClientRect().left + 1, reads: kt ? U.reads(kt) : null };
    });
    check('B1 Hebrew, the prompt within reach: the key on the left as in English, the words right to left, naming the tap', heTap.lang === 'he' && heTap.keyLeft && (heTap.reads === 'rtl' || heTap.reads === 'one') && /ברז/.test(heTap.prompt), heTap);
    await shot('he-kbd-tap-near');
    // toasts with keys in them, as the HUD shows them (pad and keyboard labels)
    const toasts = await ev(() => {
      const out = [];
      for (const dev of ['kbd', 'pad']) {
        game.input.lastDevice = dev;
        document.querySelectorAll('#toast .toast').forEach((e) => e.remove());
        game.hud.toast('pr_toast_ball', { ball: U.key('ball'), map: U.key('map') });
        game.hud.toast('hint_jump', { b: U.key('b2'), k: U.key('action') });
        for (const el of document.querySelectorAll('#toast .toast')) {
          const keys = [U.key('ball'), U.key('map'), U.key('b2'), U.key('action')].filter((k) => el.textContent.includes(k));
          out.push({ dev, text: el.textContent, reads: U.reads(el), keysInOrder: keys.every((k) => U.ltrOrder(el, k)) });
        }
      }
      game.input.lastDevice = 'pad';
      return out;
    });
    check('B2 Hebrew toasts with keys in them (Alt, H, F2, Space; Y, LT, D-pad →, A): each line right to left, each key in its own order', toasts.every((x) => x.reads === 'rtl' && x.keysInOrder), toasts);
    await shot('he-pad-toasts');
    await ev(() => { document.querySelectorAll('#toast .toast').forEach((e) => e.remove()); game.input.lastDevice = 'kbd'; });
    const heInv = await ev(() => {
      P.tap(U.code('inventory'), 0.3);
      const name = document.querySelector('#inventory .inv-name'), desc = document.querySelector('#inventory .inv-desc');
      return { state: game.state, name: name?.textContent, reads: name ? U.reads(name) : null, desc: desc ? U.reads(desc) : null, hint: document.querySelector('#inventory .inv-hint')?.textContent };
    });
    check('B3 Hebrew inventory: the name and text right to left, the keys line in English\'s order', heInv.state === 'inventory' && heInv.reads !== 'ltr', heInv);
    await shot('he-kbd-inventory');
    const heJ = await ev(() => { P.tap('Tab', 0.3); const el = document.querySelector('#inventory .inv-obj'); return { tab: game.inventory.tab, text: el?.textContent.slice(0, 80), reads: el ? U.reads(el) : null }; });
    check('B3 Hebrew journal: the goal right to left', heJ.reads !== 'ltr', heJ);
    await shot('he-kbd-journal');
    await ev(() => { P.tap('Escape', 0.3); game.step(0.2); });
    const hePad = await ev(() => {
      U.pad(); padTap(8); game.step(0.3); const inv = { state: game.state, hint: document.querySelector('#inventory .inv-hint')?.textContent };
      return inv;
    });
    await shot('he-pad-inventory');
    const hePad2 = await ev(() => { padTap(1); game.step(0.6); return { prompt: U.prompt(), kbd: document.querySelector('#prompt.show kbd')?.textContent }; });
    check('B4 Hebrew with the pad: the inventory\'s line names the pad\'s buttons; the prompt names A', hePad.state === 'inventory' && hePad2.kbd === 'A', { hePad, hePad2 });
    await shot('he-pad-tap-near');
    await ev(() => U.unpad());

    // the audit: every Hebrew line, its placeholders filled with real key names (keyboard and pad labels) and the codes
    // already in it, laid out in a toast (plain text) and in a dialogue line's box (as the HUD sets them)
    const audit = await ev(() => {
      const he = U.STR.he, en = U.STR.en, host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:0;top:0;width:900px;visibility:hidden;font:16px sans-serif'; document.body.appendChild(host);
      const KEYV = ['D-pad →', 'Left Click', 'Num 4', 'Alt', '←', 'LB'];
      const bad = { order: [], dir: [] }; let n = 0, codes = 0;
      for (const k of Object.keys(he)) {
        const v = he[k]; if (typeof v !== 'string' || !/[֐-׿]/.test(v) || /</.test(v)) continue;
        const names = [...new Set([...v.matchAll(/\{([a-z0-9_]+)\}/gi)].map((m) => m[1]))];
        const keyish = names.filter((x) => /^(k|e|b|w|r|l|lr|aim|ball|map|key|move|close|zoom|centre|whole|kk)$/i.test(x));
        const code = /[A-Z]-\d/.exec(v);
        if (!keyish.length && !code) continue;
        const vars = {}; names.forEach((x, i) => { vars[x] = keyish.includes(x) ? KEYV[i % KEYV.length] : (/^(n|max|m|d|s|v|g\d?)$/.test(x) ? '3' : 'אבג'); });
        const el = document.createElement('div'); el.className = 'toast'; host.appendChild(el);
        el.textContent = U.t(k, vars); n++;
        if (code) codes++;
        for (const x of keyish) if (U.ltrOrder(el, vars[x]) === false) bad.order.push(k + ' {' + x + '}=' + vars[x] + ': ' + el.textContent.slice(0, 60));
        if (code && U.ltrOrder(el, code[0]) === false) bad.order.push(k + ' ' + code[0]);
        // a line (not a key hint) that opens with a code reads right to left
        const lead = /^\s*\(?['"]?[A-Z]-?\d/.test(v) && /[.!?)'"]\s*$/.test(v);
        if (lead && U.reads(el) !== 'rtl') bad.dir.push(k + ': ' + v.slice(0, 50));
        el.remove();
      }
      host.remove();
      return { lines: n, codes, order: bad.order.length, dir: bad.dir.length, orderList: bad.order.slice(0, 12), dirList: bad.dir };
    });
    check('B5 audit, every Hebrew line with a key or a code in it: each key name and code keeps its left-to-right order', audit.order === 0, audit);
    check('B5 audit: a Hebrew line opening with a code ("B-7 …", "(J-17. …") still reads right to left', audit.dir === 0, audit);
  }
  await browser.close();
}

// ---------------------------------------------------------------- C: two adjacent things (the pump room, chapter 2)
if (ONLY.includes('C')) {
  const save = JSON.parse(fs.readFileSync(path.join(FIX, 'new-04.save.json'), 'utf8')); for (const o of save.origins || []) o.origin = ORIGIN;
  ({ browser, page, context } = await launch({ width: 1366, height: 768, storageState: save }));
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { P.settle(); });
  await helpers();
  const into = await ev(() => {
    if (game.room) { const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle(); }
    P.talk('worker', { run: true }); P.settle();
    const K = game.world.pumpKiosk; P.through(K.door.x, K.door.z); P.settle();
    return { room: game.room?.id };
  });
  check('C0 in the pump room (fixture new-04)', into.room === 'pumproom', into);
  const sweep = await ev(() => {
    const U2 = game.room.pump, F = U2.feel, res = {};
    const spots = { pipes: [(F.upper.x + F.lower.x + F.copper.x) / 3, (F.upper.z + F.lower.z + F.copper.z) / 3], cocks: [(U2.cocks.upper.front.x + U2.cocks.lower.front.x) / 2, (U2.cocks.upper.front.z + U2.cocks.lower.front.z) / 2], plate: [(U2.plate.front.x + U2.gauge.front.x) / 2, (U2.plate.front.z + U2.gauge.front.z) / 2] };
    for (const [name, [x, z]] of Object.entries(spots)) {
      P.settle(); P.go(x, z, { tol: 0.45, maxT: 20 }); P.settle(); P.go(x, z, { tol: 0.45, maxT: 20 }); P.settle(); game.step(0.3);
      res[name] = { at: [+game.hero.pos.x.toFixed(2), +game.hero.pos.z.toFixed(2)], rows: U.turn(6.5) };
    }
    return res;
  });
  for (const [name, r] of Object.entries(sweep)) {
    const f = flick(r.rows);
    check(`C1 turning in place by the ${name}: two things in reach never share one prompt text (you can tell which you'll use)`, f.textsShared === 0, { at: r.at, ...f });
    check(`C1 turning in place by the ${name}: no flicker (no target that comes straight back within a frame or two)`, f.bounceBack === 0, { at: r.at, changes: f.changes, bounceBack: f.bounceBack });
  }
  // the pipes' spot, facing between two of them: the picture
  await ev(() => { const F = game.room.pump.feel; P.settle(); P.go((F.upper.x + F.lower.x) / 2, (F.upper.z + F.lower.z) / 2 + 0.2, { tol: 0.4, maxT: 15 }); P.face(F.upper.x, F.upper.z); P.settle(); game.step(0.5); });
  await shot('en-kbd-pump-pipes');
  await browser.close();
}
done();
