// RTL-138 (P138, the user and the local agent's ORDER-73, 26.11): in the Hebrew opening film a subtitle's speaker name
// sat at the LEFT end of the right-to-left line, so it read last, and in a two-line subtitle it landed in the middle of
// the text. In Hebrew the name opens the line on its RIGHT, the words follow to its left; English unchanged (the name on
// the left, the words to its right). Measured in the DOM, letter by letter (each letter's box on screen), for every
// subtitle of the opening film as it plays (the film's own clock, the game's own subtitle code), in both languages, at
// the three Subtitle Size settings (Normal, Large, Extra large: the two-line lines are the film's real lines at the
// sizes they wrap at, nothing injected), 1280×720:
//   - the name is on the subtitle's first line, at the line's start edge (Hebrew: the right end; English: the left);
//   - the first letter of the words stands right next to the name on that line (Hebrew: the rightmost letter of the
//     words on line 1, left of the name; English: the leftmost, right of it): the name comes first in reading order;
//   - so in a two-line subtitle the second line holds words only (no name in the middle).
// Also the other line with a speaker's name and words in one box: the radio tuning's line (story/oneplace.js #omtune
// .omline, rebuilt here with its own markup and real lines; one starting with a number, one of two lines). And the
// dialogue box (the user's pick via the local agent, 26.11): in Hebrew its name tag at the top RIGHT, over where the
// Hebrew line starts (a talk with Arthur in the house, then Zoé in the yard); English: top left, unchanged.
// PART=film | dialog: one half only. SHOTS=before|after: pictures (a Hebrew 1-line and 2-line subtitle in chapter 1's
// opening, the two Hebrew talks) to SHOTDIR (default captures/rtl-138/raw/, not committed; captures/rtl-138/sheet.png
// is made from them).
// Automated runtime only (SwiftShader, headless Chromium): it measures where the letters are drawn; it cannot say how a
// line reads to a person.
import { launch, open, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const SHOTS = process.env.SHOTS || '';
const DIR = process.env.SHOTDIR || fileURLToPath(new URL('../captures/rtl-138/raw/', import.meta.url));
if (SHOTS) mkdirSync(DIR, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const SIZES = ['normal', 'large', 'xl'];

const helpers = () => ev(() => {
  // where a name + words line's letters are: lines (by their tops), the name's letters, the words' first letter
  window.RT = {
    measure(el) {
      if (!el) return null;
      const b = el.querySelector('b');
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ch = [];
      let word = 0, gap = false;   // (the words' word index: a number or a Latin word runs left to right inside a Hebrew line)
      for (let n; (n = w.nextNode());) {
        const inB = !!b && b.contains(n);
        for (let i = 0; i < n.data.length; i++) {
          if (/\s/.test(n.data[i])) { if (!inB) gap = true; continue; }
          if (!inB && gap) { word++; gap = false; }
          const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const q = r.getBoundingClientRect();
          if (q.width) ch.push({ inB, word: inB ? -1 : word, l: q.left, r: q.right, t: q.top, h: q.height });
        }
      }
      const cs = getComputedStyle(el);
      const o = { dir: cs.direction, bidi: cs.unicodeBidi, text: el.textContent.slice(0, 80) };
      if (!ch.length) return o;
      const tops = [];
      for (const c of ch) { let k = tops.findIndex((t) => Math.abs(t - c.t) < c.h / 2); if (k < 0) { tops.push(c.t); k = tops.length - 1; } c.line = k; }
      const order = [...tops].sort((a, b2) => a - b2); for (const c of ch) c.line = order.indexOf(tops[c.line]);
      o.lines = order.length;
      const name = ch.filter((c) => c.inB), words = ch.filter((c) => !c.inB);
      if (!name.length || !words.length) return { ...o, name: !!name.length };
      const L1 = ch.filter((c) => c.line === 0), w1 = words.filter((c) => c.line === 0);
      const nL = Math.min(...name.map((c) => c.l)), nR = Math.max(...name.map((c) => c.r));
      const fw = words.filter((c) => c.word === words[0].word), first = { line: fw[0].line, l: Math.min(...fw.map((c) => c.l)), r: Math.max(...fw.map((c) => c.r)) };
      o.nameLines = [...new Set(name.map((c) => c.line))];
      o.nameOnLine1 = o.nameLines.length === 1 && o.nameLines[0] === 0;
      // the side the name stands on in line 1, and whether the words' first word is the one next to it
      o.nameSide = nR >= Math.max(...L1.map((c) => c.r)) - 1 ? 'right' : nL <= Math.min(...L1.map((c) => c.l)) + 1 ? 'left' : 'middle';
      o.firstOnLine1 = first.line === 0;
      o.firstNext = first.line === 0 && (o.nameSide === 'right' ? first.r <= nL + 1 && first.r >= Math.max(...w1.map((c) => c.r)) - 0.5
        : o.nameSide === 'left' ? first.l >= nR - 1 && first.l <= Math.min(...w1.map((c) => c.l)) + 0.5 : false);
      o.gap = +(o.nameSide === 'right' ? nL - first.r : first.l - nR).toFixed(1);
      return o;
    },
    size(s) { game.settings.textSize = s; game.applySettings(); },
  };
});
function RT_ok(m, lang) { return !!m && m.nameOnLine1 && m.nameSide === (lang === 'he' ? 'right' : 'left') && m.firstNext; }
const boot = async (lang, q) => {
  await open(page, q);
  await ev((l) => { localStorage.clear(); game.settings.lang = l; game.applySettings(); game.saveSettings(); }, lang);
  await helpers();
  await page.click('[data-act="new"]', { timeout: 180000 });
  if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]', { timeout: 180000 });
};

// a new game in `lang` (set before New Game: the film's lines are made then), its opening film played on its own clock:
// every subtitle measured at every size as it comes up
async function film(lang, shoot) {
  await boot(lang, '');
  await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
  const out = [], shots = { one: null, two: null };
  for (let guard = 0; guard < 60; guard++) {
    // on to the next subtitle (30 fps, no drawing), then measured at each size
    const m = await ev((S) => {
      const c = game.cine; if (!c) return null;
      const from = c.subI;
      for (let i = 0; i < 4000 && game.cine && (game.cine.subI === from || game.cine.subI < 0); i++) game.frame(1 / 30, false);
      if (!game.cine || game.cine.subI < 0) return null;
      const el = document.querySelector('#cine-sub'), s = game.cine.def.subs[game.cine.subI], r = { i: game.cine.subI, t: +game.cine.t.toFixed(2), who: s.who, by: {} };
      for (const z of S) { RT.size(z); r.by[z] = RT.measure(el); }
      RT.size('normal');
      return r;
    }, SIZES);
    if (!m) break;
    out.push(m);
    if (shoot) {
      // a picture of the first named 1-line subtitle (Normal) and the first named 2-line one (at the size it wraps at)
      const two = SIZES.find((z) => m.by[z]?.lines === 2);
      const want = !shots.one && m.who && m.by.normal?.lines === 1 ? ['one', 'normal'] : !shots.two && m.who && two ? ['two', two] : null;
      if (want) {
        await ev(([z]) => { RT.size(z); for (let i = 0; i < 9; i++) game.frame(1 / 30, false); game.renderer.resize(); game.frame(1 / 60, true); }, [want[1]]);
        await page.waitForTimeout(400);   // (the subtitle's 0.25 s fade in: CSS, on the wall clock)
        const f = `${DIR}${SHOTS}-${want[0]}.png`;
        await page.screenshot({ path: f, timeout: 180000 });
        shots[want[0]] = { f, size: want[1], i: m.i, text: m.by[want[1]]?.text };
        await ev(() => RT.size('normal'));
      }
    }
  }
  return { out, shots };
}
const sum = (r, lang) => {
  const rows = r.out.filter((m) => m.who).flatMap((m) => SIZES.map((z) => ({ i: m.i, z, ...m.by[z] }))).filter((x) => x.lines);
  const bad = rows.filter((x) => !RT_ok(x, lang));
  return { subs: r.out.length, named: r.out.filter((m) => m.who).length, measured: rows.length, oneLine: rows.filter((x) => x.lines === 1).length, twoLine: rows.filter((x) => x.lines === 2).length, more: rows.filter((x) => x.lines > 2).length, bad: bad.slice(0, 6), style: rows[0] && { dir: rows[0].dir, bidi: rows[0].bidi } };
};
// the radio tuning's line (oneplace.js overlay's markup, real lines): as it is, starting with a number, a long one
const radio = () => ev(async () => {
  const { t } = await import('./src/game/i18n.js');
  const mk = (txt) => {
    const el = document.createElement('div'); el.id = 'omtune';
    el.style.cssText = 'position:fixed;left:50%;bottom:7%;transform:translateX(-50%);max-width:min(720px,92vw);padding:10px 18px;text-align:center;line-height:1.5;z-index:40;';
    el.innerHTML = `<div class="omline"><b style="color:#fc6">${t('n_brix')}</b> ${txt}</div>`;
    document.body.appendChild(el);
    const m = RT.measure(el.querySelector('.omline')); el.remove(); return m;
  };
  return { real: mk(t('om_brix_zee')), number: mk('17 ' + t('om_brix_zee')), long: mk([1, 2, 3].map(() => t('om_brix_zee')).join(' ')) };
});
// the dialogue box (a talk with Arthur in the house, then Zoé in the yard): which side its name tag is on
async function talks(lang, shoot) {
  await boot(lang, '?nocine');
  await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
  await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });
  const tag = () => ev(() => {
    const D = document.querySelector('#dialog'), N = D.querySelector('.name'), d = D.getBoundingClientRect(), n = N.getBoundingClientRect();
    return { state: game.state, name: N.textContent, left: +(n.left - d.left).toFixed(0), right: +(d.right - n.right).toFixed(0), side: n.left - d.left < d.right - n.right ? 'left' : 'right', inside: n.left >= d.left && n.right <= d.right };
  });
  const snap = async (n) => { if (!shoot) return; await ev(() => { game.renderer.resize(); game.frame(1 / 60, true); }); await page.waitForTimeout(300); await page.screenshot({ path: `${DIR}${SHOTS}-${n}.png`, timeout: 180000 }); };
  const r = {};
  await ev(() => { const a = P.npc('arthur'); P.go(a.pos.x + 1.1, a.pos.z - 1.1, { tol: 0.35 }); P.face(a.pos.x, a.pos.z); game.step(0.6); P.tap('KeyE', 0.05); game.step(1.6); });
  r.arthur = await tag();
  await snap('dialog-arthur');
  await ev(() => {
    for (let i = 0; i < 40 && game.state === 'dialog'; i++) { P.tap('KeyE', 0.05); game.step(0.4); }
    P.settle();
    const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.go(sp.x, sp.z, { tol: 1.4 }); game.step(0.8); P.use(sp.x, sp.z);
    for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
    game.step(1.0);
    const e = game.room.exits.find((x) => x.to === 'outdoor'); P.settle(); P.through(e.x, e.z); game.step(1.0);
    const z = P.npc('zoe'); P.go(z.pos.x, z.pos.z, { tol: 1.6, stopWhen: () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; } });
    P.face(z.pos.x, z.pos.z); game.step(0.4); P.tap('KeyE', 0.05); game.step(3.0);
  });
  r.zoe = await tag();
  await snap('dialog-zoe');
  return r;
}

const PART = process.env.PART || 'all';
const tagOk = (t, s) => t && t.state === 'dialog' && t.inside && t.side === s && t.name;
if (PART !== 'dialog') {
  const he = await film('he', !!SHOTS);
  const H = sum(he, 'he');
  check('Hebrew opening: every named subtitle at every size has its name on line 1 at the RIGHT end, the words\' first letter next to it (name first)', H.measured > 0 && !H.bad.length, H);
  check('Hebrew opening: real two-line subtitles were among them (the case P138 names)', H.twoLine > 0, { twoLine: H.twoLine, oneLine: H.oneLine });
  if (SHOTS) console.log('shots', JSON.stringify(he.shots));
  const rh = await radio();
  check('Hebrew radio line (#omtune .omline): the name on the right, first: a real line, one starting with a number, one of two lines', ['real', 'number', 'long'].every((k) => RT_ok(rh[k], 'he')) && rh.long.lines >= 2, rh);
  const en = await film('en', false);
  const E = sum(en, 'en');
  check('English opening: every named subtitle at every size has its name on line 1 at the LEFT, the words next to it (unchanged)', E.measured > 0 && !E.bad.length, E);
  check('English opening: two-line subtitles among them too', E.twoLine > 0, { twoLine: E.twoLine, oneLine: E.oneLine });
  const re = await radio();
  check('English radio line: the name on the left, first (unchanged)', ['real', 'number', 'long'].every((k) => RT_ok(re[k], 'en')), re);
}
if (PART !== 'film') {
  const dh = await talks('he', !!SHOTS);
  check('Hebrew dialogue box (Arthur in the house, Zoé in the yard): the name tag at the top RIGHT, over where the Hebrew line starts', tagOk(dh.arthur, 'right') && tagOk(dh.zoe, 'right'), dh);
  const de = await talks('en', false);
  check('English dialogue box: the name tag at the top left (unchanged)', tagOk(de.arthur, 'left') && tagOk(de.zoe, 'left'), de);
}

done();
await browser.close();
