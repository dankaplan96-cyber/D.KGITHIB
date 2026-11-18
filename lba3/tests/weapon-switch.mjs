// WEAPON-SWITCH (the user, 17.11, P59: "switching from the ball is not comfortable"; docs/lba-maturity/WEAPON-SWITCH.md).
// The swap key (R by default in both schemes; LB on a pad; ⇄ on touch): a tap takes the next weapon he owns in a fixed
// order (ball, fists, sword, glove, … the tools, round to the ball); held 0.4 s it goes straight back to the ball. The
// wheel (hold G in Classic / X in Modern / RT) stays the direct choice, and the swap key steps it; the inventory's Use
// takes a weapon in hand (LBA2's way). The weapon pill shows the one in hand by name, the key and what it gives next, a
// strip of what he owns; a tip, the first time a third weapon arrives in play (Settings → Tips respected).
// Checked by input: keys (cycle, wheel, back to the ball), a faked standard gamepad (LB), a rebound key (Settings →
// Controls, by clicks and a key press), the behaviours' keys untouched, an interruption (the key held into a dialogue),
// Hebrew. ISO (logged): chapter 2 by flags (as tests/equip2.mjs); the sword and the glove given by their flags.
// Screenshots go to WS_SHOTS (default /dev/shm/ws-shots).
import { launch, open, menu, checker } from './lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.WS_SHOTS || '/dev/shm/ws-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const snap = async (name) => { if (process.env.WS_NOSHOTS) return; await ev(() => { game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 180000 }); console.log('  shot ' + path.join(SHOTS, name + '.png')); };
const helpers = () => ev(() => {
  window.W = {
    // the pill as shown: name, key hint, strip (icons' titles, the lit one), shown or not
    pill() { const el = document.querySelector('#weapon'); const st = el.querySelector('.strip'); return { name: el.querySelector('.name').textContent, alt: el.querySelector('.alt').textContent, show: el.classList.contains('show'), strip: st && st.style.display !== 'none' ? [...st.querySelectorAll('i')].map((i) => i.title) : [], on: st?.querySelector('i.on')?.title || null }; },
    w: () => game.hero.combat.weapon,
    tip: () => (game.tutorial.shown ? document.querySelector('#tip')?.textContent || '' : ''),
    // a press of `code` for one frame, then `after` s (the release acts on the next frame)
    tap(code, after = 0.15) { P.tap(code, after); return game.hero.combat.weapon; },
  };
});

await open(page, '?nocine'); await menu(page, 'new');
await helpers();
iso('the prologue finished by flags (as tests/equip2.mjs): chapter 2 on Citadel, the ball found');
await ev(() => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, opening: true, c1_started: true, c1_radio: true, c1_veskGone: true }); G.hero.hasBall = true; G.story.nextChapter(); P.settle(); G.step(0.5); G.hero.combat.equip('ball', true); G.step(0.3); });
const s0 = await ev(() => ({ scheme: game.settings.controls, swap: game.input.label('swap'), wheel: game.input.label('weapons'), list: game.hero.combat.cycleList(), w: W.w(), ch: game.flags.chapterKey }));
check('Classic controls by default; the swap key is R, the wheel G; with the ball and the fists: the cycle is [ball, fists]', s0.scheme === 'classic' && s0.swap === 'R' && s0.wheel === 'G' && JSON.stringify(s0.list) === '["ball","fists"]' && s0.w === 'ball', s0);

// ---------------------------------------------------------------- the tip (Settings → Tips respected)
iso('the sword given by its flag in play (it comes in chapter 6), tips Off first');
const t0 = await ev(() => { const G = game; G.settings.tips = 'off'; G.hero.hasSword = true; G.step(2.0); return { tip: G.tutorial.shown, armed: G.tutorial.wsArmed, list: G.hero.combat.cycleList() }; });
check('tips Off: a third weapon arrives, no tip panel (the lesson is still armed)', !t0.tip && t0.armed && t0.list.join() === 'ball,fists,sword', t0);
const t1 = await ev(() => { const G = game; G.settings.tips = 'on'; G.step(1.5); return { tip: G.tutorial.shown, text: W.tip() }; });
check('tips On: the tip names the keys as bound: R next weapon, hold R back to the Magic Ball, hold G the wheel', t1.tip === 'wswitch' && /R Next weapon/.test(t1.text) && /hold R: back to the Magic Ball/.test(t1.text) && /hold G: the wheel/.test(t1.text), t1);
await snap('ws-1-tip');

// ---------------------------------------------------------------- keys: the cycle, back to the ball
const k1 = await ev(() => { const G = game, r = {};
  r.a = W.tap('KeyR'); r.pillA = W.pill();
  r.tipAfter = G.tutorial.shown; r.tipDone = G.tutorial.done.has('wswitch');
  r.b = W.tap('KeyR'); r.pillB = W.pill();
  r.c = W.tap('KeyR');
  return r; });
check('keys: R from the ball → the fists → the sword → round to the ball (three presses for ball → fists → sword → ball)', k1.a === 'fists' && k1.b === 'sword' && k1.c === 'ball', k1);
check('…the first R completes the tip', k1.tipDone && k1.tipAfter !== 'wswitch', k1);
check('the pill: the one in hand by name, the key and what comes next ("R ▸ Sword"), the strip of what he owns with the one in hand lit; shown', k1.pillA.name === 'Fists' && k1.pillA.alt.startsWith('R ▸ Sword') && k1.pillA.strip.join() === 'Magic Ball,Fists,Sword' && k1.pillA.on === 'Fists' && k1.pillA.show && k1.pillB.name === 'Sword' && k1.pillB.alt.startsWith('R ▸ Magic Ball'), k1);
iso('the Wannie glove and Arthur\'s pocket set given by their flags: five in the cycle');
const k2 = await ev(() => { const G = game, h = G.hero, r = {};
  h.arms.glove = true; h.arms.pocketset = true; G.step(0.2); r.list = h.combat.cycleList();
  W.tap('KeyR'); W.tap('KeyR'); r.at = W.w(); r.pill = W.pill();
  // held: the hint says where the hold goes while it fills
  G.input.keys.add('KeyR'); G.input.taps.add('KeyR'); G.step(0.2); r.mid = { w: W.w(), alt: W.pill().alt, hold: +document.querySelector('#weapon').style.getPropertyValue('--hold') };
  G.step(0.35); r.held = W.w(); G.input.keys.delete('KeyR'); G.step(0.2); r.after = W.w();
  return r; });
check('with five owned (ball, fists, sword, glove, pocket set): from the sword the hint offers the hold ("hold R: Magic Ball")', k2.list.join() === 'ball,fists,sword,glove,pocketset' && k2.at === 'sword' && /R ▸ Wannie Glove/.test(k2.pill.alt) && /hold R: Magic Ball/.test(k2.pill.alt), k2);
check('…R held: the hint turns to the ball and fills while held; at 0.4 s the ball is in hand; the release does nothing more', k2.mid.w === 'sword' && /R ▸ Magic Ball/.test(k2.mid.alt) && k2.mid.hold > 0.2 && k2.held === 'ball' && k2.after === 'ball', k2);
await ev(() => { const G = game; W.tap('KeyR'); W.tap('KeyR'); G.input.keys.add('KeyR'); G.input.taps.add('KeyR'); G.step(0.25); });
await snap('ws-2-hold-to-ball');
await ev(() => { game.step(0.3); game.input.keys.delete('KeyR'); game.step(0.3); });   // (held on past 0.4 s: back to the ball)
const k3 = await ev(() => { const G = game, r = {}; r.w0 = W.w(); G.input.keys.add('KeyR'); G.input.taps.add('KeyR'); G.step(0.6); G.input.keys.delete('KeyR'); G.step(0.2); r.w1 = W.w(); r.pill = W.pill(); return r; });
check('…held with the ball already in hand: it stays the ball (the pill shows it again)', k3.w0 === 'ball' && k3.w1 === 'ball' && k3.pill.show, k3);

// ---------------------------------------------------------------- the wheel: the direct choice, stepped by R
const wh = await ev(() => { const G = game, r = {};
  G.input.keys.add('KeyG'); G.input.taps.add('KeyG'); G.step(0.1); r.open = G.hud.wselOpen;
  P.tap('KeyR', 0.05); P.tap('KeyR', 0.05); r.pick = G.hud.wselPick; r.still = W.w();
  G.input.keys.delete('KeyG'); G.step(0.2); r.after = W.w(); r.open2 = G.hud.wselOpen;
  // and by direction: hold G, ← (the fists' slot), release
  G.input.keys.add('KeyG'); G.input.taps.add('KeyG'); G.step(0.1); G.input.keys.add('ArrowLeft'); G.step(0.1); G.input.keys.delete('ArrowLeft'); G.input.keys.delete('KeyG'); G.step(0.2); r.dir = W.w();
  return r; });
check('the wheel (hold G): R steps its choice in the cycle\'s order (ball → fists → sword), nothing changes until G is let go; ← picks the fists\' slot', wh.open && wh.pick === 'sword' && wh.still === 'ball' && wh.after === 'sword' && !wh.open2 && wh.dir === 'fists', wh);

// ---------------------------------------------------------------- the inventory's Use (LBA2: the weapon chosen there)
const inv = await ev(() => { const G = game, I = G.inventory, r = {};
  P.tap('KeyI', 0.1); r.state = G.state; const i = I.items().findIndex((x) => x.id === 'ball'); I.sel = i; I.render();
  r.use = document.querySelector('.inv-use')?.textContent || ''; P.tap('KeyE', 0.15); r.after = G.state; r.w = W.w(); return r; });
check('the inventory: the Magic Ball selected, Use (E) takes it in hand and shuts the window', inv.state === 'inventory' && /Use/.test(inv.use) && inv.after === 'play' && inv.w === 'ball', inv);

// ---------------------------------------------------------------- the behaviours' keys untouched
const beh = await ev(() => { const G = game, h = G.hero, r = {}; const w0 = W.w();
  P.tap('F3', 0.1); r.f3 = h.behaviour; P.tap('F2', 0.1); r.f2 = h.behaviour; P.tap('Digit4', 0.1); r.d4 = h.behaviour; P.tap('F1', 0.1); r.f1 = h.behaviour; r.w = W.w(); r.w0 = w0; return r; });
check('F1–F4 (and 1–4) still pick the behaviours; the weapon is untouched by them', beh.f3 === 'aggressive' && beh.f2 === 'athletic' && beh.d4 === 'discreet' && beh.f1 === 'normal' && beh.w === beh.w0, beh);

// ---------------------------------------------------------------- an interruption: R held into a dialogue
const intr = await ev(() => { const G = game, h = G.hero, r = {}; r.w0 = W.w();
  G.input.keys.add('KeyR'); G.input.taps.add('KeyR'); G.step(1 / 60);
  let ended = false; G.say('Twinsen', ['Test.'], () => { ended = true; }, h); r.state = G.state;
  G.input.keys.delete('KeyR'); G.step(0.3); G.hud.advance?.(); G.step(0.2); if (!ended) { G.hud.advance?.(); G.step(0.2); } if (G.state !== 'play') G.setState('play');
  G.step(0.8); r.w1 = W.w(); return r; });
check('R pressed as a dialogue opens and let go during it: no weapon change after it', intr.state === 'dialog' && intr.w1 === intr.w0, intr);

// ---------------------------------------------------------------- a gamepad: LB
const pad = await ev(() => { const G = game, r = {};
  const btn = () => ({ pressed: false, value: 0 });
  window.__pad = { connected: true, id: 'test pad', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
  navigator.getGamepads = () => [window.__pad];
  const LB = window.__pad.buttons[4];
  G.hero.combat.equip('ball', true); G.step(0.1);
  const tapLB = () => { LB.pressed = true; G.step(1 / 60); LB.pressed = false; G.step(0.15); return W.w(); };
  r.dev = (G.step(0.05), G.input.lastDevice);
  r.a = tapLB(); r.alt = W.pill().alt; r.b = tapLB();
  LB.pressed = true; G.step(0.6); LB.pressed = false; G.step(0.2); r.held = W.w();
  r.label = G.input.label('swap');
  navigator.getGamepads = () => []; G.input.lastDevice = 'kbd'; G.step(0.1);
  return r; });
check('a gamepad: LB taps step the cycle (ball → fists → sword); LB held: back to the ball; the pill names LB', pad.a === 'fists' && pad.b === 'sword' && pad.held === 'ball' && pad.label === 'LB' && /^LB ▸ Sword/.test(pad.alt), pad);

// ---------------------------------------------------------------- rebinding (Settings → Controls), by clicks and a key
await ev(() => game.pause());
await page.click('#pause [data-act="controls"]');
const rb0 = await ev(() => { const b = document.querySelector('#rebind .keybtn[data-action="swap"]'); return { key: b?.textContent, name: b?.closest('.krow')?.querySelector('.kname')?.textContent, desc: b?.closest('.krow')?.querySelector('.kdesc')?.textContent }; });
await page.click('#rebind .keybtn[data-action="swap"]'); await page.keyboard.press('KeyV');
const rb1 = await ev(() => ({ key: document.querySelector('#rebind .keybtn[data-action="swap"]')?.textContent, saved: game.settings.keys?.swap }));
await page.click('#controls [data-act="back"]'); await page.click('#pause [data-act="resume"]');
const rb2 = await ev(() => { const G = game, r = {}; G.hero.combat.equip('ball', true); G.step(0.2);
  r.v = W.tap('KeyV'); r.alt = W.pill().alt; r.r = W.tap('KeyR'); r.label = G.input.label('swap');
  G.settings.keys = {}; G.applySettings(); G.step(0.1); r.back = G.input.label('swap'); return r; });
check('Settings → Controls lists it as "Next Weapon" — "Next weapon (hold: back to the Magic Ball)" — on R', rb0.key === 'R' && rb0.name === 'Next Weapon' && /Next weapon \(hold: back to the Magic Ball\)/.test(rb0.desc), rb0);
check('rebound to V (click, then the key): V steps the cycle, R does nothing now, the pill says V; defaults restored after', rb1.key === 'V' && rb1.saved === 'KeyV' && rb2.v === 'fists' && rb2.r === 'fists' && /^V ▸ Sword/.test(rb2.alt) && rb2.label === 'V' && rb2.back === 'R', { rb0, rb1, rb2 });

// ---------------------------------------------------------------- Hebrew
const he = await ev(() => { const G = game, r = {}; G.settings.lang = 'he'; G.applySettings(); G.hero.combat.equip('ball', true); G.step(0.1);
  r.w = W.tap('KeyR'); r.pill = W.pill(); return r; });
await snap('ws-3-hebrew');
await ev(() => { const G = game; G.settings.lang = 'en'; G.applySettings(); G.step(0.1); });
check('Hebrew: the pill in Hebrew (אגרופים; "R ◂ חרב")', he.w === 'fists' && he.pill.name === 'אגרופים' && /^R ◂ חרב/.test(he.pill.alt), he);

// ---------------------------------------------------------------- a look at the pill in the town (chapter 2)
await ev(() => { const G = game; G.hero.combat.equip('ball', true); G.camRig.recenter?.(); G.step(0.5); P.tap('KeyR', 0.15); P.tap('KeyR', 0.3); });
await snap('ws-4-pill-strip');
const fin = await ev(() => ({ w: W.w(), pill: W.pill() }));
check('the pill after two presses: Sword in hand, "R ▸ Wannie Glove", the strip lit on the Sword', fin.w === 'sword' && /^R ▸ Wannie Glove/.test(fin.pill.alt) && fin.pill.on === 'Sword', fin);

await browser.close();
done();
