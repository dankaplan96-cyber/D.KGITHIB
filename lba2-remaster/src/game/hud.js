// DOM-based HUD: stats, behaviour selector, prompts, toasts, dialogue,
// shop, minimap and the full-screen Holomap.
import { t, getLang } from './i18n.js';
import { BEHAVIOURS } from './actors.js';
import { PATHS } from './world.js';
import { Color } from 'three';

const $ = (s) => document.querySelector(s);

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = $('#hud');
    this.toastEl = $('#toast');
    this.promptEl = $('#prompt');
    this.toasts = [];
    this.mini = $('#minimap');
    this.miniCtx = this.mini.getContext('2d');
    this.holo = $('#holomap canvas');
    this.holoCtx = this.holo.getContext('2d');
    this.dialog = { el: $('#dialog'), name: $('#dialog .name'), text: $('#dialog .text'), lines: [], i: 0, shown: 0, done: null, full: '' };
    this.dialog.el.addEventListener('click', () => this.advance());
    this._buildBehaviourBar();
  }

  _buildBehaviourBar() {
    const bar = $('#behaviour');
    bar.innerHTML = '';
    BEHAVIOURS.forEach((b, i) => {
      const d = document.createElement('div');
      d.className = 'beh beh-' + b;
      d.dataset.b = b;
      d.innerHTML = `<span class="ico"></span><span class="k">${i + 1}</span><span class="lbl"></span>`;
      d.addEventListener('click', () => this.game.hero?.setBehaviour(b));
      bar.appendChild(d);
    });
  }

  refreshText() {
    document.querySelectorAll('#behaviour .beh').forEach((d) => { d.querySelector('.lbl').textContent = t('beh_' + d.dataset.b); });
    $('#bossbar span').textContent = t('boss_name');
    $('#holomap .title').textContent = t('map_title');
    $('#holomap .close').textContent = t('map_close');
  }

  show(on) { this.el.classList.toggle('hidden', !on); }

  behaviour(b) {
    document.querySelectorAll('#behaviour .beh').forEach((d) => d.classList.toggle('on', d.dataset.b === b));
  }
  wheel(on) { $('#behaviour').classList.toggle('wheel', on); }

  setStyle(lba) { this.lba = lba; document.body.classList.toggle('hud-lba', lba); }

  // In the LBA HUD the panel only "incrusts" for a few seconds when a value changes
  // (InitIncrustDisp(..., timeout) in the original), or while life is low.
  _incrust(h) {
    const key = [Math.ceil(h.hp), h.coins, h.clovers, h.hasKey, h.magicLevel, h.shards.join()].join('|');
    if (this._last !== undefined && key !== this._last) this.incrustT = 3;
    this._last = key;
    this.incrustT = Math.max(0, (this.incrustT || 0) - 1 / 60);
    const show = this.incrustT > 0 || h.hp <= h.maxHp * 0.3 || this.forceStats;
    $('#stats').classList.toggle('show', !!show);
  }

  stats(h) {
    this._incrust(h);
    $('#lifebar i').style.width = (100 * h.hp) / h.maxHp + '%';
    $('#magicbar i').style.width = (100 * h.mp) / h.mpMax + '%';
    $('#magicbar').dataset.level = h.magicLevel;
    $('#clovers b').textContent = h.clovers;
    $('#coins b').textContent = h.coins;
    $('#keyicon').classList.toggle('hidden', !h.hasKey);
    document.querySelectorAll('#shards i').forEach((e, i) => e.classList.toggle('got', h.shards[i]));
  }

  objective(html) {
    $('#objective').innerHTML = html;
    $('#pause-objective').innerHTML = html;
    $('#holomap .objective').innerHTML = html;
  }

  // Floating numbers at pickups (INCRUST_NUM in the original)
  float(text, pos, color = '#ffe35a') {
    const d = document.createElement('div');
    d.className = 'float';
    d.textContent = text;
    d.style.color = color;
    $('#floats').appendChild(d);
    (this.floats ??= []).push({ d, p: pos.clone(), t: 0 });
  }
  updateFloats(dt, camera) {
    if (!this.floats) return;
    const v = this._v ??= new camera.position.constructor();
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      v.copy(f.p); v.y += 0.6 + f.t * 1.2;
      v.project(camera);
      f.d.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
      f.d.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
      f.d.style.opacity = String(Math.min(1, 2.2 - f.t * 1.8));
      if (f.t > 1.2 || v.z > 1) { f.d.remove(); this.floats.splice(i, 1); }
    }
  }

  prompt(text) {
    if (!text) { this.promptEl.classList.remove('show'); return; }
    const key = this.game.input.lastDevice === 'pad' ? 'X' : this.game.input.lastDevice === 'touch' ? '✋' : 'E';
    this.promptEl.innerHTML = `<kbd>${key}</kbd> ${text}`;
    this.promptEl.classList.add('show');
  }

  // big chapter title that fades in and out over the game
  chapterCard(small, title) {
    const el = document.querySelector('#chapter');
    el.querySelector('small').textContent = small;
    el.querySelector('h2').textContent = title;
    el.classList.add('show');
    clearTimeout(this._chT);
    this._chT = setTimeout(() => el.classList.remove('show'), 3800);
  }

  toast(key, vars) {
    const msg = t(key, vars);
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    this.toastEl.appendChild(d);
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 2300);
    setTimeout(() => d.remove(), 2800);
  }

  hurt() {
    const v = $('#vignette');
    v.classList.remove('hit'); void v.offsetWidth; v.classList.add('hit');
  }

  boss(frac) {
    const b = $('#bossbar');
    if (frac == null) { b.classList.add('hidden'); return; }
    b.classList.remove('hidden');
    b.querySelector('i').style.width = Math.max(0, frac * 100) + '%';
  }

  // ---------------- dialogue ----------------
  say(nameKey, lines, done, color = '#ffffff') {
    const D = this.dialog;
    D.lines = lines; D.i = 0; D.done = done;
    D.name.textContent = t(nameKey);
    // speaker colour gradient, like LBA2's per-actor dialogue colours
    const c = new Color(color);
    D.el.style.setProperty('--spk', '#' + c.getHexString());
    D.el.style.setProperty('--spk-hi', '#' + c.clone().lerp(new Color('#ffffff'), 0.55).getHexString());
    D.el.style.setProperty('--spk-lo', '#' + c.clone().multiplyScalar(0.6).getHexString());
    D.el.classList.remove('hidden');
    D.el.dir = getLang() === 'he' ? 'rtl' : 'ltr';
    this._line();
  }
  _line() {
    const D = this.dialog;
    D.full = D.lines[D.i];
    D.shown = 0;
    D.text.textContent = '';
  }
  get talking() { return !this.dialog.el.classList.contains('hidden'); }
  advance() {
    const D = this.dialog;
    if (!this.talking) return;
    if (D.shown < D.full.length) { D.shown = D.full.length; D.text.textContent = D.full; return; }
    D.i++;
    this.game.audio.play('select');
    if (D.i >= D.lines.length) {
      D.el.classList.add('hidden');
      const cb = D.done; D.done = null;
      cb?.();
    } else this._line();
  }
  updateDialog(dt) {
    const D = this.dialog;
    if (!this.talking || D.shown >= D.full.length) return;
    const before = Math.floor(D.shown);
    D.shown = Math.min(D.full.length, D.shown + dt * 55);
    const now = Math.floor(D.shown);
    if (now !== before) {
      D.text.textContent = D.full.slice(0, now);
      if (now % 3 === 0) this.game.audio.play('blip');
    }
  }

  // ---------------- shop ----------------
  openShop(items, onBuy, onClose) {
    const el = $('#shop');
    el.dir = getLang() === 'he' ? 'rtl' : 'ltr';
    const render = () => {
      el.innerHTML = `<h2>${t('shop_title')}</h2><div class="coins">◆ ${this.game.hero.coins}</div>` +
        items().map((it, i) => `<button class="item" data-i="${i}" ${it.disabled ? 'disabled' : ''}><span>${t(it.key)}</span><b>◆ ${it.price}</b></button>`).join('') +
        `<button class="leave">${t('shop_leave')}</button>`;
      el.querySelectorAll('.item').forEach((b) => b.addEventListener('click', () => { onBuy(items()[+b.dataset.i]); render(); }));
      el.querySelector('.leave').addEventListener('click', close);
      this.shopSel = Math.min(this.shopSel ?? 0, items().length);
      this._shopFocus();
    };
    const close = () => { el.classList.add('hidden'); this.shopOpen = false; onClose(); };
    this.shopRender = render;
    this.shopClose = close;
    this.shopSel = 0;
    this.shopOpen = true;
    el.classList.remove('hidden');
    render();
  }
  _shopFocus() {
    const btns = [...document.querySelectorAll('#shop button')];
    btns.forEach((b, i) => b.classList.toggle('sel', i === this.shopSel));
  }
  shopNav(input) {
    const btns = [...document.querySelectorAll('#shop button')];
    if (input.pressed('down')) { this.shopSel = (this.shopSel + 1) % btns.length; this._shopFocus(); this.game.audio.play('blip'); }
    if (input.pressed('up')) { this.shopSel = (this.shopSel + btns.length - 1) % btns.length; this._shopFocus(); this.game.audio.play('blip'); }
    if (input.pressed('interact') || input.pressed('action') || input.pressed('recenter')) btns[this.shopSel]?.click();
    if (input.pressed('pause') || input.pressed('ball')) this.shopClose();
  }

  // ---------------- maps ----------------
  buildMapImage(terrain) {
    const N = 256;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d');
    const img = x.createImageData(N, N);
    const half = terrain.half;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const wx = -half + (i / N) * terrain.size, wz = -half + (j / N) * terrain.size;
      const h = terrain.heightAt(wx, wz);
      const k = (j * N + i) * 4;
      let r, g, b;
      if (h < 0) { const d = Math.min(1, -h / 6); r = 20; g = 90 - d * 50; b = 150 - d * 60; }
      else if (h < 1) { r = 190; g = 175; b = 120; }
      else { const v = Math.min(1, h / 15); r = 60 + v * 90; g = 130 + v * 60; b = 60 + v * 70; }
      // contour lines
      if (h > 0 && Math.abs((h % 2) - 1) < 0.08) { r *= 0.8; g *= 0.8; b *= 0.8; }
      img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // paths
    x.strokeStyle = 'rgba(120,90,50,0.8)'; x.lineWidth = 1.5;
    const toPx = (v) => ((v + half) / terrain.size) * N;
    for (const p of PATHS) { x.beginPath(); p.forEach(([px, pz], i) => (i ? x.lineTo(toPx(px), toPx(pz)) : x.moveTo(toPx(px), toPx(pz)))); x.stroke(); }
    this.mapImg = c;
    this.mapHalf = half;
    this.mapSize = terrain.size;
  }

  _markers() { return this.game.mapMarkers(); }

  drawMinimap() {
    const ctx = this.miniCtx, W = this.mini.width;
    const hero = this.game.mapHero();
    const view = 70;
    const s = this.mapSize, half = this.mapHalf;
    const k = 256 / s;
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2); ctx.clip();
    const sx = (hero.pos.x - view / 2 + half) * k, sz = (hero.pos.z - view / 2 + half) * k;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mapImg, sx, sz, view * k, view * k, 0, 0, W, W);
    const toMini = (x, z) => [((x - hero.pos.x) / view + 0.5) * W, ((z - hero.pos.z) / view + 0.5) * W];
    for (const m of this._markers()) {
      let [mx, my] = toMini(m.x, m.z);
      const off = Math.hypot(mx - W / 2, my - W / 2) > W / 2 - 8;
      if (off) { if (!m.edge) continue; const a = Math.atan2(my - W / 2, mx - W / 2); mx = W / 2 + Math.cos(a) * (W / 2 - 10); my = W / 2 + Math.sin(a) * (W / 2 - 10); }
      this._marker(ctx, mx, my, m, 1);
    }
    // hero arrow
    ctx.translate(W / 2, W / 2);
    ctx.rotate(-hero.angle + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b4fb5'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2); ctx.stroke();
  }

  _marker(ctx, x, y, m, scale) {
    ctx.save();
    ctx.translate(x, y);
    const r = (m.r || 4) * scale;
    if (m.kind === 'star') {
      ctx.fillStyle = m.color; ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = m.color; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  drawHolomap(time) {
    const ctx = this.holoCtx, W = this.holo.width;
    const s = this.mapSize, half = this.mapHalf;
    ctx.fillStyle = '#04121c';
    ctx.fillRect(0, 0, W, W);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.mapImg, 0, 0, W, W);
    ctx.globalAlpha = 1;
    // holo scanlines + tint
    ctx.fillStyle = 'rgba(40,200,255,0.10)'; ctx.fillRect(0, 0, W, W);
    for (let y = (time * 40) % 4; y < W; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y, W, 1); }
    const toPx = (x, z) => [((x + half) / s) * W, ((z + half) / s) * W];
    ctx.font = '600 15px Rubik, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const m of this._markers()) {
      if (m.minimapOnly) continue;
      const [x, y] = toPx(m.x, m.z);
      this._marker(ctx, x, y, m, 1.8);
      if (m.label) {
        ctx.fillStyle = '#e8fbff'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 4;
        ctx.strokeText(m.label, x, y - 14); ctx.fillText(m.label, x, y - 14);
      }
    }
    const hero = this.game.mapHero();
    const [hx, hy] = toPx(hero.pos.x, hero.pos.z);
    const pulse = 8 + Math.sin(time * 5) * 3;
    ctx.strokeStyle = '#7ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
  }
}
