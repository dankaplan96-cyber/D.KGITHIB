// On-screen text census (CLAR-2), loaded into the page next to tests/lib/player.js.
//
// C.now()   → the words the player can read on screen this moment, outside dialogue: { items: [{ kind, text }], n,
//             chars, dialog }. An element counts when it is displayed, not faded out (its own and its ancestors'
//             opacity > 0.05) and inside the window; the minimap's canvas text (N, the room's name) from its state.
//             Kash/clover numbers are counted apart (`counters`): they are numbers, not words.
// C.log     → every text the game put up since install: { t (game s), kind, text } — toasts, objective changes,
//             prompt labels as they appear, chapter cards, pickup numbers. Dialogue is counted apart (C.lines,
//             C.lineChars): those are the characters' voices, not HUD text.
// Timing: the HUD's toasts and chapter card fade on real-time timers (2.3–3.8 s). The tests step game time much
// faster or slower than real time, so here those timers run on game time instead (as in play, where the two match):
// a screenshot then shows what a player would see at that moment of play.
(() => {
  const G = window.game, H = G.hud;
  const C = (window.C = { log: [], lines: 0, lineChars: 0 });
  const note = (kind, text) => { if (text) C.log.push({ t: +G.time.toFixed(2), kind, text: String(text) }); };
  const strip = (html) => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.replace(/\s+/g, ' ').trim(); };
  // HUD timers on game time
  const due = [];
  const onGameTime = (fn) => function (...a) {
    const st = window.setTimeout;
    window.setTimeout = (cb, ms) => { due.push([G.time + (ms || 0) / 1000, cb]); return 0; };
    try { return fn.apply(this, a); } finally { window.setTimeout = st; }
  };
  const step = G.step.bind(G);
  G.step = function (dt) {
    const r = step(dt);
    for (let i = due.length - 1; i >= 0; i--) if (due[i][0] <= G.time) { const [, cb] = due.splice(i, 1)[0]; try { cb(); } catch { /* (census only) */ } }
    return r;
  };
  const toast = onGameTime(H.toast);
  H.toast = function (...a) { const r = toast.apply(H, a); note('toast', H.toastLog?.at(-1)); return r; };
  const card = onGameTime(H.chapterCard);
  H.chapterCard = function (a, b) { note('chapter', [a, b].filter(Boolean).join(' ')); return card.call(H, a, b); };
  const wrap = (name, fn) => { const o = H[name].bind(H); H[name] = function (...a) { try { fn(...a); } catch { /* (census only) */ } return o(...a); }; };
  let lastPrompt = '', lastObj = '';
  wrap('prompt', (s) => { if (s && s !== lastPrompt) note('prompt', s); lastPrompt = s || ''; });
  wrap('objective', (html) => { const s = strip(html); if (s !== lastObj) note('objective', s); lastObj = s; });
  wrap('float', (s) => note('float', s));
  wrap('say', (name, lines) => { C.lines += lines.length; C.lineChars += lines.join('').length; });
  C.clear = () => { C.log.length = 0; C.lines = 0; C.lineChars = 0; };

  const shown = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || e.classList.contains('hidden')) return false;
    }
    return true;
  };
  const txt = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
  // [kind, selector, one item per element?]
  const SPOTS = [
    ['objective', '#objective'], ['prompt', '#prompt'], ['toast', '#toast .toast', true], ['chapter', '#chapter'],
    ['weapon', '#weapon'], ['behaviour', '#behaviour .beh .lbl', true], ['boss', '#bossbar span'], ['float', '#floats .float', true],
    ['caption', '#cine-sub'], ['caption', '#cine-cap'], ['title', '#cine-title'], ['skip', '#cine-skip'],
    ['counter', '#stats .counters .ctr b', true], ['jet', '#jetgauge b'],
  ];
  C.now = () => {
    // (CSS transitions: what the frame shows once they have run; the census reads the end state)
    const items = [];
    for (const [kind, sel, each] of SPOTS) {
      const els = each ? [...document.querySelectorAll(sel)] : [document.querySelector(sel)];
      for (const el of els) { if (!shown(el)) continue; const s = txt(el); if (s) items.push({ kind, text: s }); }
    }
    const mm = document.querySelector('#minimap');
    if (shown(mm)) { items.push({ kind: 'minimap', text: 'N' }); if (H.miniRoom) items.push({ kind: 'minimap', text: H.miniRoom }); }
    const dlg = document.querySelector('#dialog');
    const dialog = shown(dlg) ? txt(dlg.querySelector('.text')) : '';
    const words = items.filter((i) => i.kind !== 'counter');
    return { items, n: words.length, chars: words.reduce((s, i) => s + i.text.length, 0), counters: items.length - words.length, dialog };
  };
  // the totals of C.log (what the game put up), by kind; pickup numbers (+1, ♥) apart
  C.sum = () => {
    const by = {};
    for (const e of C.log) { const b = (by[e.kind] ||= { n: 0, chars: 0 }); b.n++; b.chars += e.text.length; }
    const words = C.log.filter((e) => e.kind !== 'float');
    return { by, n: words.length, chars: words.reduce((s, e) => s + e.text.length, 0), lines: C.lines, lineChars: C.lineChars };
  };
})();
