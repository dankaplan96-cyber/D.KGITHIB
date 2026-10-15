// Inventory + journal screen (I / J). Items are drawn on small canvases in a
// painted style (no image files); the journal lists what happened so far,
// chapter by chapter. Kept compact: one panel, the game paused behind it.
import { t } from './i18n.js';

const ICON = 72;

function ctx() {
  const c = document.createElement('canvas');
  c.width = c.height = ICON;
  const x = c.getContext('2d');
  x.lineJoin = x.lineCap = 'round';
  return [c, x];
}
const radial = (x, cx, cy, r, a, b) => { const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };

const DRAW = {
  ball(x) { x.fillStyle = radial(x, 36, 38, 22, '#fff6c0', '#d89a10'); x.beginPath(); x.arc(36, 38, 22, 0, 7); x.fill(); x.strokeStyle = 'rgba(120,70,0,0.6)'; x.lineWidth = 2; x.stroke(); x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.ellipse(28, 29, 6, 4, -0.6, 0, 7); x.fill(); },
  holomap(x) {
    x.fillStyle = '#5a4630'; x.beginPath(); x.ellipse(36, 60, 22, 6, 0, 0, 7); x.fill();
    x.fillStyle = radial(x, 36, 32, 24, '#bff4ff', '#2a78c8'); x.globalAlpha = 0.9; x.beginPath(); x.arc(36, 32, 22, 0, 7); x.fill(); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 1.5; for (const k of [-10, 0, 10]) { x.beginPath(); x.ellipse(36, 32 + k, Math.sqrt(484 - k * k), 3, 0, 0, 7); x.stroke(); }
    x.fillStyle = '#7fd06a'; x.beginPath(); x.ellipse(30, 28, 7, 4, 0.4, 0, 7); x.fill(); x.beginPath(); x.ellipse(44, 38, 5, 3, -0.3, 0, 7); x.fill();
  },
  medallion(x) {
    x.strokeStyle = '#c0302a'; x.lineWidth = 3; x.beginPath(); x.moveTo(20, 6); x.quadraticCurveTo(36, 30, 52, 6); x.stroke();
    x.fillStyle = radial(x, 36, 42, 20, '#fff0a0', '#b8820a'); x.beginPath(); x.arc(36, 42, 19, 0, 7); x.fill(); x.strokeStyle = '#8a5a00'; x.lineWidth = 2; x.stroke();
    x.beginPath(); x.arc(36, 42, 9, 0.3, 5.2); x.stroke();
  },
  key(x) {
    x.strokeStyle = '#a8781a'; x.lineWidth = 7; x.beginPath(); x.arc(22, 30, 11, 0, 7); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.moveTo(31, 36); x.lineTo(58, 56); x.stroke();
    x.beginPath(); x.moveTo(50, 50); x.lineTo(44, 58); x.moveTo(56, 55); x.lineTo(51, 62); x.stroke();
    x.strokeStyle = 'rgba(255,240,180,0.6)'; x.lineWidth = 2; x.beginPath(); x.arc(22, 30, 11, 3.6, 5); x.stroke();
  },
  rope(x) { x.strokeStyle = '#b08850'; x.lineWidth = 6; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(36, 34 + i * 4, 22 - i * 2, 12 - i, 0, 0, 7); x.stroke(); } x.strokeStyle = '#8a6430'; x.lineWidth = 2; x.beginPath(); x.moveTo(52, 46); x.quadraticCurveTo(62, 58, 56, 66); x.stroke(); },
  stamp(x) { x.fillStyle = '#7a4a24'; x.fillRect(30, 10, 12, 26); x.fillStyle = radial(x, 36, 12, 10, '#a8703a', '#5a3418'); x.beginPath(); x.arc(36, 12, 9, 0, 7); x.fill(); x.fillStyle = '#c03030'; x.fillRect(18, 38, 36, 12); x.fillStyle = '#3a2410'; x.fillRect(20, 50, 32, 5); },
  map(x) { x.fillStyle = '#e8d8b0'; x.beginPath(); x.moveTo(10, 14); x.lineTo(62, 10); x.lineTo(60, 60); x.lineTo(12, 62); x.closePath(); x.fill(); x.strokeStyle = '#3a7ab8'; x.lineWidth = 3; x.beginPath(); x.moveTo(18, 50); x.lineTo(30, 30); x.lineTo(46, 34); x.lineTo(54, 20); x.stroke(); x.fillStyle = '#c03030'; for (const [a, b] of [[30, 30], [46, 34], [54, 20]]) { x.beginPath(); x.arc(a, b, 3.5, 0, 7); x.fill(); } },
  leaflet(x) { x.fillStyle = '#f4f0e0'; x.fillRect(16, 8, 40, 56); x.fillStyle = '#2f8a8a'; x.fillRect(16, 8, 40, 12); x.fillStyle = '#9aa'; for (let i = 0; i < 6; i++) x.fillRect(21, 26 + i * 6, 30 - (i % 3) * 6, 2.5); x.fillStyle = '#e0a020'; x.font = 'bold 12px sans-serif'; x.fillText('A', 31, 18); },
  plan(x) { x.fillStyle = '#2a5a9a'; x.fillRect(8, 12, 56, 46); x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 1.5; x.strokeRect(12, 16, 48, 38); x.beginPath(); x.arc(30, 36, 12, 0, 7); x.stroke(); x.beginPath(); x.moveTo(44, 22); x.lineTo(56, 22); x.moveTo(44, 28); x.lineTo(54, 28); x.moveTo(44, 34); x.lineTo(56, 34); x.stroke(); x.fillStyle = '#ff6a4a'; x.beginPath(); x.arc(30, 36, 4, 0, 7); x.fill(); },
  clover(x) { x.fillStyle = '#4fae3a'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; x.beginPath(); x.ellipse(36 + Math.cos(a) * 11, 32 + Math.sin(a) * 11, 11, 8, a, 0, 7); x.fill(); } x.strokeStyle = '#2f7a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(36, 34); x.quadraticCurveTo(40, 52, 32, 64); x.stroke(); },
  cloth(x) { const c = ['#c8452f', '#f2e2c0', '#2f7a9a', '#f2e2c0']; for (let i = 0; i < 8; i++) { x.fillStyle = c[i % 4]; x.fillRect(12, 14 + i * 5.5, 48, 5.6); } x.strokeStyle = '#7a5a30'; x.lineWidth = 2; x.strokeRect(12, 14, 48, 44); x.fillStyle = '#f2e2c0'; for (let i = 0; i < 6; i++) x.fillRect(14 + i * 8, 58, 2, 6); },
  coin(x) { x.fillStyle = radial(x, 36, 36, 22, '#fff2a0', '#c08a10'); x.beginPath(); x.ellipse(36, 36, 20, 22, 0, 0, 7); x.fill(); x.strokeStyle = '#8a5a00'; x.lineWidth = 2; x.stroke(); x.fillStyle = '#8a5a00'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('K', 36, 44); },
  part(x) { x.fillStyle = radial(x, 36, 36, 24, '#e8d090', '#8a6420'); x.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 24 : 18; x.lineTo(36 + Math.cos(a) * r, 36 + Math.sin(a) * r); } x.closePath(); x.fill(); x.fillStyle = '#3a2a10'; x.beginPath(); x.arc(36, 36, 7, 0, 7); x.fill(); },
  crystal(x) { x.fillStyle = '#8fe8ff'; x.strokeStyle = '#2a9ac8'; x.lineWidth = 2; x.beginPath(); x.moveTo(36, 6); x.lineTo(50, 30); x.lineTo(40, 64); x.lineTo(28, 62); x.lineTo(22, 30); x.closePath(); x.fill(); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.moveTo(36, 10); x.lineTo(30, 30); x.lineTo(36, 54); x.closePath(); x.fill(); },
  // the arsenal (weapons.js, gadgets.js)
  blowgun(x) { x.strokeStyle = '#8a6430'; x.lineWidth = 6; x.beginPath(); x.moveTo(10, 60); x.lineTo(62, 12); x.stroke(); x.strokeStyle = '#e0b25a'; x.lineWidth = 8; for (const k of [0.25, 0.5, 0.75]) { const px = 10 + 52 * k, py = 60 - 48 * k; x.beginPath(); x.moveTo(px - 2, py - 2); x.lineTo(px + 2, py + 2); x.stroke(); } x.fillStyle = '#f2ead6'; x.beginPath(); x.arc(10, 60, 5, 0, 7); x.fill(); },
  blowtron(x) { x.strokeStyle = '#2f8a5a'; x.lineWidth = 8; x.beginPath(); x.moveTo(10, 60); x.lineTo(62, 12); x.stroke(); x.fillStyle = radial(x, 34, 36, 12, '#fff0a0', '#b8820a'); x.beginPath(); x.arc(34, 36, 11, 0, 7); x.fill(); x.fillStyle = 'rgba(138,200,176,0.8)'; x.beginPath(); x.ellipse(24, 30, 12, 5, -0.8, 0, 7); x.fill(); },
  darts(x) { for (let i = 0; i < 3; i++) { const o = i * 10; x.strokeStyle = '#d8c8a0'; x.lineWidth = 3; x.beginPath(); x.moveTo(16 + o, 60); x.lineTo(30 + o, 12); x.stroke(); x.fillStyle = '#c83a2a'; x.beginPath(); x.moveTo(13 + o, 62); x.lineTo(21 + o, 64); x.lineTo(18 + o, 52); x.fill(); } },
  laser(x) { x.fillStyle = radial(x, 32, 30, 22, '#fff2b0', '#c08a10'); x.beginPath(); x.ellipse(32, 30, 22, 11, 0, 0, 7); x.fill(); x.fillStyle = '#e0704a'; x.beginPath(); x.moveTo(20, 34); x.lineTo(30, 34); x.lineTo(26, 58); x.lineTo(16, 56); x.fill(); x.fillStyle = radial(x, 58, 30, 8, '#ffffff', '#2a9aff'); x.beginPath(); x.arc(56, 30, 7, 0, 7); x.fill(); },
  cell(x) { x.fillStyle = '#e0b25a'; x.fillRect(26, 8, 20, 8); x.fillRect(26, 56, 20, 8); x.fillStyle = radial(x, 36, 36, 18, '#ffffff', '#2a9aff'); x.beginPath(); x.moveTo(36, 14); x.lineTo(48, 36); x.lineTo(36, 58); x.lineTo(24, 36); x.closePath(); x.fill(); },
  glove(x) { x.fillStyle = radial(x, 36, 32, 24, '#e86a4a', '#8a2a1a'); x.beginPath(); x.ellipse(36, 30, 20, 22, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(56, 34, 7, 12, 0.5, 0, 7); x.fill(); x.fillStyle = '#6a3a22'; x.fillRect(20, 50, 32, 14); x.fillStyle = '#e0b25a'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(25 + i * 7.5, 57, 2.5, 0, 7); x.fill(); } },
  lightning(x) { x.fillStyle = radial(x, 36, 36, 26, 'rgba(160,220,255,0.5)', 'rgba(40,90,200,0)'); x.fillRect(0, 0, 72, 72); x.fillStyle = '#fff6a0'; x.strokeStyle = '#2a5ac8'; x.lineWidth = 2; x.beginPath(); x.moveTo(42, 6); x.lineTo(20, 40); x.lineTo(34, 40); x.lineTo(26, 66); x.lineTo(54, 28); x.lineTo(39, 28); x.closePath(); x.fill(); x.stroke(); },
  protect(x) { x.fillStyle = radial(x, 36, 36, 26, 'rgba(220,245,255,0.9)', 'rgba(80,160,230,0.3)'); x.beginPath(); x.arc(36, 36, 26, 0, 7); x.fill(); x.strokeStyle = '#2a78c8'; x.lineWidth = 3; x.stroke(); x.fillStyle = '#2a66d9'; x.beginPath(); x.moveTo(36, 20); x.lineTo(50, 28); x.lineTo(46, 50); x.lineTo(36, 56); x.lineTo(26, 50); x.lineTo(22, 28); x.closePath(); x.fill(); },
  penguin(x) { x.fillStyle = '#22262e'; x.beginPath(); x.ellipse(36, 42, 17, 22, 0, 0, 7); x.fill(); x.beginPath(); x.arc(36, 18, 12, 0, 7); x.fill(); x.fillStyle = '#f2f0e8'; x.beginPath(); x.ellipse(36, 46, 11, 16, 0, 0, 7); x.fill(); x.fillStyle = '#f0902a'; x.beginPath(); x.moveTo(36, 18); x.lineTo(48, 21); x.lineTo(36, 24); x.fill(); x.fillRect(26, 62, 8, 4); x.fillRect(38, 62, 8, 4); x.strokeStyle = '#e0b25a'; x.lineWidth = 3; x.beginPath(); x.arc(14, 40, 5, 0, 7); x.moveTo(19, 40); x.lineTo(22, 40); x.stroke(); },
  conch(x) { x.fillStyle = radial(x, 32, 34, 26, '#fff0e0', '#e0907a'); x.beginPath(); x.moveTo(8, 50); x.quadraticCurveTo(14, 12, 46, 14); x.quadraticCurveTo(66, 22, 60, 40); x.quadraticCurveTo(44, 60, 8, 50); x.fill(); x.strokeStyle = '#b8604a'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(46 - i * 6, 30 + i * 2, 10 - i * 2, 0.5, 3.5); x.stroke(); } },
  lantern(x) { x.fillStyle = radial(x, 36, 42, 22, 'rgba(255,220,140,0.9)', 'rgba(255,180,60,0)'); x.fillRect(0, 0, 72, 72); x.strokeStyle = '#b8820a'; x.lineWidth = 3; x.beginPath(); x.arc(36, 10, 6, 0, 7); x.stroke(); x.fillStyle = '#e0b25a'; x.beginPath(); x.moveTo(24, 22); x.lineTo(48, 22); x.lineTo(36, 14); x.fill(); x.fillRect(24, 58, 24, 6); x.fillStyle = '#fff2c8'; x.fillRect(26, 24, 20, 32); x.strokeStyle = '#b8820a'; for (const px of [26, 36, 46]) { x.beginPath(); x.moveTo(px, 24); x.lineTo(px, 56); x.stroke(); } },
  pearl(x) { x.fillStyle = radial(x, 36, 36, 20, '#ffffff', '#ff9a3a'); x.beginPath(); x.arc(36, 36, 17, 0, 7); x.fill(); x.fillStyle = 'rgba(255,200,80,0.35)'; x.beginPath(); x.arc(36, 36, 26, 0, 7); x.fill(); },
  radio(x) { x.fillStyle = '#8a3a2a'; x.fillRect(10, 24, 52, 34); x.fillStyle = '#e8d8b0'; x.beginPath(); x.arc(28, 41, 11, 0, 7); x.fill(); x.fillStyle = '#d8a020'; x.beginPath(); x.arc(50, 34, 4, 0, 7); x.fill(); x.beginPath(); x.arc(50, 48, 4, 0, 7); x.fill(); x.strokeStyle = '#ccc'; x.lineWidth = 2; x.beginPath(); x.moveTo(52, 24); x.lineTo(60, 6); x.stroke(); },
};
const cache = {};
const USE = new Set(['penguin', 'protect', 'conch', 'lantern']);
export function itemIcon(kind) {
  if (cache[kind]) return cache[kind];
  const [c, x] = ctx();
  (DRAW[kind] || DRAW.part)(x);
  return (cache[kind] = c.toDataURL());
}

export class Inventory {
  constructor(game) {
    this.game = game;
    this.el = document.querySelector('#inventory');
    this.open = false;
  }
  // everything Twinsen carries, from the hero state and story flags
  items() {
    const g = this.game, h = g.hero, f = g.flags;
    const out = [];
    const add = (id, icon, n) => out.push({ id, icon, n });
    add('medallion', 'medallion');
    if (h.hasBall) { add('ball', 'ball', h.magicLevel); add('holomap', 'holomap'); }
    for (const it of g.story.items?.() ?? []) add(it.id, it.icon, it.n);
    // the arsenal: weapons, then the gadgets used from here (E)
    const a = h.arms || {};
    if (a.blowgun) add(a.blowtron ? 'blowtron' : 'blowgun', a.blowtron ? 'blowtron' : 'blowgun', a.darts);
    if (a.laser) add('laser', 'laser', a.charge);
    if (a.glove) add('glove', 'glove');
    if (a.lightning) add('lightning', 'lightning');
    if (a.protect) add('protect', 'protect');
    if (a.penguins > 0) add('penguin', 'penguin', a.penguins);
    if (a.conch) add('conch', 'conch');
    if (a.lantern) add('lantern', 'lantern', a.lanternOn ? t('it_on') : null);
    add('kashes', 'coin', h.coins);
    add('clovers', 'clover', h.clovers);
    const nc = g.crystalCount?.() || 0;
    if (nc) add('crystals', 'crystal', nc);
    return out;
  }
  // the selected item when it is a gadget used from here (main.js: E uses it), else null
  usable() {
    if (!this.open) return null;
    const it = this.items()[this.sel ?? 0];
    return it && USE.has(it.id) ? it.id : null;
  }
  show(on) {
    this.open = on;
    this.el.classList.toggle('hidden', !on);
    if (on) this.render();
  }
  render() {
    const g = this.game;
    const items = this.items();
    const grid = items.map((it, i) => `<button class="inv-item${i === this.sel ? ' sel' : ''}" data-i="${i}"><img src="${itemIcon(it.icon)}" alt=""><span>${t('it_' + it.id)}</span>${it.n != null ? `<em>${it.id === 'ball' ? t('it_level', { n: it.n }) : it.n}</em>` : ''}</button>`).join('');
    const sel = items[this.sel ?? 0];
    const journal = g.story.journal().map((c) => c.lines.length ? `<h3>${c.title}</h3><ul>${c.lines.map((l) => `<li class="${l.done ? 'done' : ''}">${t(l.key)}</li>`).join('')}</ul>` : '').join('');
    this.el.innerHTML = `<div class="inv-panel lba-frame">
      <section class="inv-items"><h2>${t('inv_title')}</h2><div class="inv-grid">${grid}</div><p class="inv-desc">${sel ? t('itd_' + sel.id) + (USE.has(sel.id) ? ' <b>' + t('it_use_hint') + '</b>' : '') : ''}</p></section>
      <section class="inv-journal"><h2>${t('journal_title')}</h2><div class="inv-obj">${g.story.objective()}</div>${journal}</section>
      <div class="inv-hint">${t('inv_hint')}</div></div>`;
    this.el.querySelectorAll('.inv-item').forEach((b) => b.addEventListener('click', () => { this.sel = +b.dataset.i; this.render(); }));
  }
  nav(input) {
    const n = this.items().length;
    this.sel ??= 0;
    if (input.pressed('right')) { this.sel = (this.sel + 1) % n; this.render(); }
    if (input.pressed('left')) { this.sel = (this.sel + n - 1) % n; this.render(); }
    if (input.pressed('down')) { this.sel = Math.min(n - 1, this.sel + 4); this.render(); }
    if (input.pressed('up')) { this.sel = Math.max(0, this.sel - 4); this.render(); }
  }
}
