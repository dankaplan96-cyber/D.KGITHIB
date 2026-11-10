/* המשמרת — engine core: canvas frame, text, shapes, input, sound, effects.
   The frame follows the Bofi Man engine: a 480×320 logical play-frame that widens on
   landscape screens and grows taller on tall ones, drawn at devicePixelRatio. */
'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const TILE = 40;
let VW = 480, VH = 320, dpr = 1, clock = 0;
const FONT_STACK = 'Rubik,"Arial Hebrew","Noto Sans Hebrew",Arial,"Segoe UI",sans-serif';

function resizeCanvas() {
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (cw > 0 && ch > 0 && cw / ch > 1.5) { VH = 320; VW = Math.min(760, Math.round(320 * cw / ch)); }
  else { VW = 480; VH = cw > 0 && ch > 0 ? Math.max(320, Math.min(900, Math.round(VW * ch / cw))) : 320; }
  // render scale = real screen pixels per logical pixel, so large screens stay sharp (capped to keep it fast)
  const real = cw > 0 ? cw / VW * (window.devicePixelRatio || 1) : (window.devicePixelRatio || 1);
  dpr = Math.max(1, Math.min(3, 2400 / VW, Math.ceil(real * 4) / 4));
  canvas.width = Math.round(VW * dpr);
  canvas.height = Math.round(VH * dpr);
}

/* ---------- math ---------- */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

/* ---------- text (RTL-aware, measured and fitted) ---------- */
function setFont(size, bold) { ctx.font = (bold ? '800 ' : '500 ') + size + 'px ' + FONT_STACK; }
function fitFont(text, maxWidth, size, bold, min) {
  let s = size; setFont(s, bold);
  while (s > (min || 8) && ctx.measureText(text).width > maxWidth) setFont(--s, bold);
  return s;
}
function heText(text, x, y, o) {
  o = o || {};
  const str = String(text == null ? '' : text);
  ctx.save();
  ctx.direction = o.ltr ? 'ltr' : 'rtl';
  ctx.textAlign = o.align || 'right';
  ctx.textBaseline = o.baseline || 'alphabetic';
  fitFont(str, o.maxWidth || 9999, o.size || 13, o.bold, o.minSize);
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 6; ctx.shadowOffsetY = o.shadowY || 0; }
  ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW || 3; ctx.strokeStyle = o.stroke; ctx.strokeText(str, x, y); }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(str, x, y);
  ctx.restore();
}
function numText(text, x, y, o) { heText(text, x, y, Object.assign({ align: 'left', ltr: true }, o)); }

/* ---------- shapes ---------- */
function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function bar(x, y, w, h, pct, fill, back) {
  ctx.fillStyle = back || '#060e19'; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  if (pct > 0) { ctx.fillStyle = fill; roundRect(ctx, x, y, Math.max(h, clamp(pct, 0, 1) * w), h, h / 2); ctx.fill(); }
  ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.lineWidth = 1; roundRect(ctx, x + .5, y + .5, w - 1, h - 1, h / 2); ctx.stroke();
}
function lin(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
function rad(x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
function ellipse(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832); c.fill(); }
function circle(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }

/* ---------- input ---------- */
const Input = {
  held: new Set(), queue: [], run: false,
  dirKeys: { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' },
  heldDir() { for (const d of ['up', 'down', 'left', 'right']) if (this.held.has(d)) return d; return null; },
};
window.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.offsetParent && e.key !== 'Escape') return;
  const d = Input.dirKeys[e.code];
  if (d) { Input.held.add(d); Input.queue.push(d); e.preventDefault(); return; }
  if (e.key === 'Shift') { Input.run = true; return; }
  let act = null;
  if (['KeyZ', 'Space', 'Enter', 'NumpadEnter'].includes(e.code)) act = 'a';
  else if (['KeyX', 'Escape', 'Backspace'].includes(e.code)) act = 'b';
  else if (['KeyM', 'Tab'].includes(e.code)) act = 'menu';
  if (act) { if (!e.repeat) Input.queue.push(act); e.preventDefault(); }
});
window.addEventListener('keyup', e => {
  const d = Input.dirKeys[e.code]; if (d) Input.held.delete(d);
  if (e.key === 'Shift') Input.run = false;
});
window.addEventListener('blur', () => { Input.held.clear(); Input.run = false; });

// Screen point → logical canvas point, also when the container is rotated for landscape.
function eventToLogical(ev) {
  const r = canvas.getBoundingClientRect();
  const t = ev.touches ? ev.touches[0] || ev.changedTouches[0] : ev;
  if (document.body.classList.contains('rotated')) return { x: (t.clientY - r.top) / r.height * VW, y: (r.right - t.clientX) / r.width * VH };
  return { x: (t.clientX - r.left) / r.width * VW, y: (t.clientY - r.top) / r.height * VH };
}

/* ---------- sound: everything synthesized ---------- */
const Sound = {
  ctx: null, master: null, sfxBus: null, musicBus: null,
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.ctx = new AC();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      this.master = c.createGain(); this.master.connect(comp); comp.connect(c.destination);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      this.apply();
    } catch (e) { this.ctx = null; }
  },
  apply() {
    if (!this.ctx) return;
    const s = (window.S && S.settings) || {};
    const on = s.sound === false ? 0 : 1;
    this.sfxBus.gain.value = on * (s.sfxVol == null ? .8 : s.sfxVol);
    this.musicBus.gain.value = on * .55 * (s.musicVol == null ? .6 : s.musicVol);
  },
  tone(f, dur, o) {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    o = o || {};
    const t = c.currentTime + (o.at || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? .12 : o.vol;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.attack || .008));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g); g.connect(o.bus || this.sfxBus); osc.start(t); osc.stop(t + dur + .05);
  },
  noise(dur, o) {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    o = o || {};
    const t = c.currentTime + (o.at || 0), n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = o.filter || 'bandpass'; f.frequency.value = o.freq || 1200; g.gain.value = o.vol || .15;
    src.connect(f); f.connect(g); g.connect(this.sfxBus); src.start(t);
  },
  blip() { this.tone(880, .05, { vol: .05 }); },
  select() { this.tone(660, .06, { vol: .08 }); this.tone(990, .09, { vol: .07, at: .05 }); },
  back() { this.tone(520, .07, { vol: .06, to: 360 }); },
  talk() { this.tone(540 + Math.random() * 120, .03, { vol: .025, type: 'triangle' }); },
  step() { this.noise(.04, { freq: 500, vol: .03 }); },
  door() { this.noise(.18, { freq: 300, vol: .12, filter: 'lowpass' }); this.tone(180, .15, { type: 'triangle', vol: .08 }); },
  good() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .14, { at: i * .07, vol: .09, type: 'triangle' })); },
  bad() { this.tone(220, .28, { type: 'sawtooth', to: 110, vol: .08 }); this.noise(.15, { freq: 200, vol: .08 }); },
  hit() { this.noise(.12, { freq: 900, vol: .16 }); this.tone(330, .12, { to: 140, vol: .1 }); },
  crit() { this.noise(.2, { freq: 1400, vol: .2 }); this.tone(660, .2, { to: 180, vol: .12 }); this.tone(990, .12, { at: .05, vol: .08 }); },
  reveal() { this.tone(1180, .08, { vol: .06, type: 'triangle' }); this.tone(1570, .12, { at: .06, vol: .06, type: 'triangle' }); },
  pager() { [0, .16, .32].forEach(a => this.tone(1650, .1, { at: a, vol: .07 })); },
  encounter() { for (let i = 0; i < 6; i++) this.tone(300 + i * 120, .08, { at: i * .05, vol: .07 }); },
  levelUp() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, .18, { at: i * .09, vol: .09 })); },
  badge() { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, .3, { at: i * .12, vol: .1, type: 'triangle' })); this.tone(1568, .8, { at: .7, vol: .06, type: 'sine' }); },
  coin() { this.tone(988, .06, { vol: .07 }); this.tone(1319, .14, { at: .06, vol: .07 }); },
  heal() { [784, 988, 1175].forEach((f, i) => this.tone(f, .2, { at: i * .08, vol: .06, type: 'sine' })); },
};

/* Music: small step sequencer, one bar = 16 steps. Notes are MIDI numbers (0 = rest). */
const Music = {
  track: null, step: 0, next: 0, timer: null,
  TRACKS: {
    title: { bpm: 84, lead: [76, 0, 79, 0, 81, 0, 79, 76, 74, 0, 72, 0, 74, 0, 76, 0, 72, 0, 74, 0, 76, 0, 79, 0, 81, 0, 83, 81, 79, 0, 0, 0], bass: [45, 0, 0, 0, 52, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0], lt: 'triangle', bt: 'sine' },
    ward: { bpm: 96, lead: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 74, 72, 0, 0, 0, 74, 0, 77, 0, 81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 0, 0], bass: [48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 57, 0, 55, 0, 52, 0, 50, 0, 57, 0, 53, 0, 57, 0, 55, 0, 59, 0, 55, 0, 52, 0], lt: 'triangle', bt: 'triangle' },
    battle: { bpm: 148, lead: [69, 0, 72, 69, 76, 0, 74, 72, 71, 0, 72, 0, 74, 0, 71, 0, 69, 0, 72, 69, 77, 0, 76, 74, 76, 0, 72, 0, 71, 0, 68, 0], bass: [45, 45, 57, 45, 45, 57, 45, 57, 43, 43, 55, 43, 44, 44, 56, 44, 45, 45, 57, 45, 41, 41, 53, 41, 40, 40, 52, 40, 44, 44, 56, 44], lt: 'square', bt: 'triangle' },
    boss: { bpm: 156, lead: [64, 0, 67, 0, 70, 0, 69, 67, 64, 0, 63, 0, 64, 67, 70, 72, 71, 0, 67, 0, 64, 0, 66, 67, 69, 0, 67, 0, 66, 0, 63, 0], bass: [40, 40, 52, 40, 40, 52, 40, 52, 39, 39, 51, 39, 38, 38, 50, 38, 40, 40, 52, 40, 43, 43, 55, 43, 35, 35, 47, 35, 39, 39, 51, 39], lt: 'sawtooth', bt: 'square' },
    town: { bpm: 104, lead: [76, 0, 79, 81, 0, 79, 76, 0, 74, 0, 76, 79, 0, 0, 72, 0, 74, 0, 77, 79, 0, 77, 74, 0, 72, 74, 76, 0, 0, 0, 0, 0], bass: [48, 0, 55, 0, 52, 0, 55, 0, 45, 0, 52, 0, 48, 0, 52, 0, 50, 0, 57, 0, 53, 0, 57, 0, 43, 0, 50, 0, 47, 0, 50, 0], lt: 'square', bt: 'triangle' },
    lab: { bpm: 112, lead: [79, 0, 0, 83, 0, 0, 86, 0, 84, 0, 0, 81, 0, 0, 79, 0, 77, 0, 0, 81, 0, 0, 84, 0, 83, 0, 79, 0, 0, 0, 0, 0], bass: [43, 0, 50, 0, 43, 0, 50, 0, 45, 0, 52, 0, 45, 0, 52, 0, 41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 47, 0, 50, 0], lt: 'triangle', bt: 'sine' },
  },
  hz: m => 440 * Math.pow(2, (m - 69) / 12),
  play(name) {
    if (this.track === name) return;
    this.track = name; this.step = 0;
    if (!Sound.ctx) return;
    this.next = Sound.ctx.currentTime + .1;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 60);
  },
  stop() { this.track = null; },
  tick() {
    const c = Sound.ctx, tr = this.TRACKS[this.track];
    if (!c || !tr || c.state !== 'running') return;
    const dt = 60 / tr.bpm / 4;
    if (this.next < c.currentTime - .5) this.next = c.currentTime + .05;
    while (this.next < c.currentTime + .25) {
      const i = this.step % tr.lead.length, at = this.next - c.currentTime;
      if (tr.lead[i]) Sound.tone(this.hz(tr.lead[i]), dt * 1.8, { at, type: tr.lt, vol: tr.lt === 'square' || tr.lt === 'sawtooth' ? .035 : .07, bus: Sound.musicBus });
      if (tr.bass[i % tr.bass.length]) Sound.tone(this.hz(tr.bass[i % tr.bass.length]), dt * 1.6, { at, type: tr.bt, vol: .08, bus: Sound.musicBus });
      if ((this.track === 'battle' || this.track === 'boss') && i % 4 === 0) Sound.noise(.05, { at, freq: 4000, vol: .025, filter: 'highpass' });
      this.next += dt; this.step++;
    }
  },
};

function buzz(p) { try { if (window.S && S.settings.haptics !== false && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

/* ---------- effects: particles, rings, floating text, flashes, shake ---------- */
const FX = { parts: [], rings: [], floats: [], flash: null, shake: 0 };
function reduceFx() { return !!(window.S && S.settings.reduceFx) || matchMedia('(prefers-reduced-motion: reduce)').matches; }
function addParticles(x, y, n, o) {
  o = o || {};
  if (reduceFx()) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, sp = (o.speed || 120) * (.4 + Math.random() * .8);
    FX.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift || 0), life: o.life || 600, max: o.life || 600, size: (o.size || 3) * (.6 + Math.random() * .8), color: Array.isArray(o.color) ? pick(o.color) : o.color || '#fbbf24', star: o.star });
  }
}
function addRing(x, y, o) { o = o || {}; FX.rings.push({ x, y, r: 4, maxR: o.maxR || 60, color: o.color || '#fbbf24', width: o.width || 3, life: o.life || 420, max: o.life || 420, flat: o.flat }); }
function addFloater(x, y, text, o) { o = o || {}; FX.floats.push({ x, y, text, color: o.color || '#fff', size: o.size || 18, life: o.life || 1000, max: o.life || 1000 }); }
function screenFlash(color, ms) { if (reduceFx()) ms = Math.min(ms, 90); FX.flash = { color, t: ms, max: ms }; }
function screenShake(ms) { if (!reduceFx()) FX.shake = Math.max(FX.shake, ms); }
function stepFx(dt) {
  const s = dt / 1000;
  FX.parts = FX.parts.filter(p => { p.life -= dt; p.x += p.vx * s; p.y += p.vy * s; p.vy += 260 * s; p.vx *= .98; return p.life > 0; });
  FX.rings = FX.rings.filter(r => { r.life -= dt; r.r = lerp(4, r.maxR, easeOut(1 - r.life / r.max)); return r.life > 0; });
  FX.floats = FX.floats.filter(f => { f.life -= dt; return f.life > 0; });
  if (FX.flash) { FX.flash.t -= dt; if (FX.flash.t <= 0) FX.flash = null; }
  FX.shake = Math.max(0, FX.shake - dt);
}
function renderFx() {
  FX.rings.forEach(r => {
    ctx.save(); ctx.globalAlpha = r.life / r.max; ctx.strokeStyle = r.color; ctx.lineWidth = r.width;
    ctx.beginPath(); if (r.flat) ctx.ellipse(r.x, r.y, r.r, r.r * .3, 0, 0, 6.28); else ctx.arc(r.x, r.y, r.r, 0, 6.28); ctx.stroke(); ctx.restore();
  });
  FX.parts.forEach(p => {
    ctx.save(); ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color;
    if (p.star) { ctx.translate(p.x, p.y); ctx.rotate(p.life / 200); ctx.fillRect(-p.size, -p.size / 4, p.size * 2, p.size / 2); ctx.fillRect(-p.size / 4, -p.size, p.size / 2, p.size * 2); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill(); }
    ctx.restore();
  });
  FX.floats.forEach(f => {
    const k = 1 - f.life / f.max;
    heText(f.text, f.x, f.y - easeOut(k) * 34, { size: f.size, bold: true, color: f.color, align: 'center', alpha: k > .7 ? (1 - k) / .3 : 1, stroke: 'rgba(8,13,24,.85)', strokeW: 4, ltr: /^[-+\d]/.test(f.text) });
  });
}
function renderScreenOverlay() {
  if (FX.flash) { ctx.save(); ctx.globalAlpha = .6 * FX.flash.t / FX.flash.max; ctx.fillStyle = FX.flash.color; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
}
