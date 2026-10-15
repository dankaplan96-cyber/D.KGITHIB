// DOM-based HUD: stats, behaviour selector, prompts, toasts, dialogue,
// shop, minimap and the full-screen Holomap.
import { t, getLang } from './i18n.js';
import { BEHAVIOURS } from './actors.js';
import { PATHS } from './world.js';
import { Color, Vector3 } from 'three';
import { WEAPON_INFO } from './combat.js';
import { keyFor, keyLabel } from '../engine/input.js';
import { regionOf, planetOf, PLANETS, lastOutdoorPos } from './travel.js';

const $ = (s) => document.querySelector(s);

// the Holomap's regions and planets (CONNECT, VP-9)
const MODE_COLOR = { ferry: '#5ab0ff', glider: '#ffd860', shuttle: '#ff9ad0', ship: '#ffffff' };
const REGION_SIZE = { zeelich: 150, desert: 250, hamalayi: 230 };
const REGION_SHIFT = { zeelich: [0, 10] };
// where each place sits on the planet's little globe (unit radius; Zeelich's islands round its spaceport island)
const PLANET_POS = { citadel: [-0.38, 0.22], desert: [0.42, 0.42], hamalayi: [0.08, -0.56], zeelich: [0, 0] };
PLANETS.zeelich.slice(1).forEach((id, i, a) => { const ang = (i / a.length) * Math.PI * 2 - Math.PI / 2; PLANET_POS[id] = [Math.cos(ang) * 0.66, Math.sin(ang) * 0.66]; });
const REGION_NAME = (r) => ({ citadel: 'map_citadel', desert: 'map_desert', hamalayi: 'map_hamalayi', zeelich: 'isle_zeelich' }[r] || r);
const SHORT_NAME = (r) => ({ citadel: 'map_citadel_s', desert: 'map_desert_s', hamalayi: 'map_hamalayi_s', zeelich: 'map_zeelich_s' }[r] || r);

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
    $('#holomap .title').textContent = t('map_title'); this._holoTitle = null;
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

  // the weapon in hand (and the ball's readiness / the pulse tool's recharge)
  weapon(h) {
    const el = $('#weapon'); if (!el) return;
    const c = h.combat, w = c.weapon, g = this.game;
    const wn = this.wpName(h, w);
    if (this._w !== w || this._wn !== wn) { this._w = w; this._wn = wn; el.querySelector('.ico').textContent = WEAPON_INFO[w]?.icon || ''; el.querySelector('.name').textContent = wn; this.weaponShowT = 2.5; }
    // ammunition: darts, the pistol's crystal charge (or its magic cost), the spell's magic cost
    const a = h.arms || {};
    const ammo = w === 'blowgun' ? `${a.darts}` : w === 'laser' ? (a.charge > 0 ? `◆${a.charge}` : '✦2') : w === 'lightning' ? '✦3' : '';
    let ae = el.querySelector('.ammo');
    if (!ae) { ae = document.createElement('span'); ae.className = 'ammo'; ae.style.cssText = 'font-weight:800;color:#ffe35a;font-size:13px;min-width:1ch'; el.querySelector('.name').after(ae); }
    if (this._ammo !== ammo) { this._ammo = ammo; ae.textContent = ammo; ae.style.display = ammo ? '' : 'none'; }
    const alt = h.prevWeapon && c.has(h.prevWeapon) && h.prevWeapon !== w ? h.prevWeapon : null;
    const altTxt = alt ? `${keyLabel(keyFor('swap'))}: ${t('wp_' + alt)}` : '';
    if (this._alt !== altTxt) { this._alt = altTxt; el.querySelector('.alt').textContent = altTxt; }
    const r = el.querySelector('.ready');
    const ballOut = h.hasBall && !g.ball.ready;
    r.classList.toggle('out', w === 'ball' && ballOut);
    const shoot = w === 'blowgun' || w === 'laser' || w === 'lightning';
    r.classList.toggle('cool', w === 'pulse' && c.pulseCool > 0 || shoot && (c.shotCool > 0 || !!g.weapons?.short(w)));
    if (w === 'pulse') r.style.setProperty('--k', `${100 * (1 - c.pulseCool / 5)}%`);
    else if (shoot) r.style.setProperty('--k', g.weapons?.short(w) ? '0%' : `${100 * (1 - c.shotCool / (g.weapons?.def(w)?.cool || 1))}%`);
    r.style.display = w === 'ball' || w === 'pulse' || shoot ? '' : 'none';
    this.weaponShowT = Math.max(0, (this.weaponShowT || 0) - 1 / 60);
    const engaged = c.busy || g.targeting?.lock || g.combat > 0.3;
    el.classList.toggle('show', this.weaponShowT > 0 || !!engaged);
    if (this.flashT > 0) { this.flashT -= 1 / 60; if (this.flashT <= 0) el.classList.remove('flash'); }
  }
  wpName(h, w) { return t(w === 'blowgun' && h.arms?.blowtron ? 'wp_blowtron' : 'wp_' + w); }
  weaponFlash() { const el = $('#weapon'); el?.classList.add('flash'); this.flashT = 0.25; this.weaponShowT = 1.5; }
  // the selector ring: open while held; returns the chosen weapon when it closes
  weaponSelect(open, h, input) {
    const el = $('#wsel'); if (!el) return null;
    // eight slots: the four first weapons on the axes, the arsenal's four (weapons.js) on the diagonals
    const DIRS = { up: 'ball', right: 'sword', down: 'pulse', left: 'fists', ur: 'blowgun', dr: 'laser', dl: 'glove', ul: 'lightning' };
    const ANG = { up: 0, ur: 1, right: 2, dr: 3, down: 4, dl: 5, left: 6, ul: 7 };   // (eighths of a turn, clockwise from up)
    if (open) {
      if (!this.wselOpen) {
        this.wselOpen = true; this.wselPick = h.combat.weapon; el.classList.remove('hidden');
        if (!el.querySelector('.slot[data-dir="ur"]')) {
          // a wider ring of eight (the four axis slots are re-placed on it too)
          for (const d of ['ur', 'dr', 'dl', 'ul']) { const s = document.createElement('div'); s.className = 'slot'; s.dataset.dir = d; el.insertBefore(s, el.querySelector('.mid')); }
          Object.assign(el.style, { width: '300px', height: '300px', margin: '-150px 0 0 -150px' });
          for (const s of el.querySelectorAll('.slot')) { const k = ANG[s.dataset.dir] * Math.PI / 4; Object.assign(s.style, { width: '66px', height: '66px', right: 'auto', bottom: 'auto', left: `${117 + Math.sin(k) * 108}px`, top: `${117 - Math.cos(k) * 108}px`, fontSize: '22px' }); }
          Object.assign(el.querySelector('.mid').style, { left: '130px', top: '130px' });
        }
        for (const s of el.querySelectorAll('.slot')) { const w = DIRS[s.dataset.dir], has = h.combat.has(w); s.classList.toggle('empty', !has); s.innerHTML = has ? `${WEAPON_INFO[w].icon}<small>${this.wpName(h, w)}</small>` : ''; }
      }
      const mv = input.move();
      if (Math.hypot(mv.x, mv.y) > 0.5) {
        const e8 = (Math.round(Math.atan2(mv.x, mv.y) / (Math.PI / 4)) + 8) % 8;
        const dir = Object.keys(ANG).find((k) => ANG[k] === e8);
        if (h.combat.has(DIRS[dir]) && this.wselPick !== DIRS[dir]) { this.wselPick = DIRS[dir]; this.game.audio.play('blip'); }
      }
      if (input.wheelSteps) { const own = h.combat.owned(); const i = own.indexOf(this.wselPick); this.wselPick = own[(i + (input.wheelSteps > 0 ? 1 : own.length - 1)) % own.length]; }
      for (const s of el.querySelectorAll('.slot')) s.classList.toggle('sel', DIRS[s.dataset.dir] === this.wselPick);
      return null;
    }
    this.wselOpen = false; el.classList.add('hidden');
    return this.wselPick;
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
    (this.floats ??= []).push({ d, p: new Vector3(pos.x, pos.y, pos.z), t: 0 });
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

  // out of play (dialogue, shop, inventory, holomap, pause, cut-scenes): the play-only overlays step aside — the
  // interaction prompt and the weapon pill would otherwise stay frozen under the dialogue box and the menus. Back in
  // play, updatePlay sets the prompt again on its first frame.
  busy(on) {
    this.el.classList.toggle('busy', on);
    if (!on) return;
    this.prompt(null);
    if (this.wselOpen) { this.wselOpen = false; $('#wsel')?.classList.add('hidden'); }
  }

  prompt(text) {
    if (!text) { if (this._prompt) { this.promptEl.classList.remove('show'); this._prompt = ''; } return; }
    const html = `<kbd>${this.game.input.label('interact')}</kbd> ${text}`;
    if (html !== this._prompt) { this.promptEl.innerHTML = html; this._prompt = html; }
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
  // (the story times the card in game time when a first line waits for it: Story.holdForCard)
  chapterCardHold() { clearTimeout(this._chT); }
  chapterCardHide() {
    clearTimeout(this._chT);
    document.querySelector('#chapter').classList.remove('show');
  }

  toast(key, vars) {
    const msg = t(key, vars);
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    this.toastEl.appendChild(d);
    (this.toastLog ||= []).push(msg); if (this.toastLog.length > 12) this.toastLog.shift();   // (recent toasts, for tests: they fade after 2.8 s of real time)
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
    this.game.audio.babble?.start(nameKey);
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
      this.game.audio.babble?.stop();
      const cb = D.done; D.done = null;
      cb?.();
    } else this._line();
  }
  updateDialog(dt) {
    const D = this.dialog;
    if (!this.talking || D.shown >= D.full.length) return;
    const before = Math.floor(D.shown);
    D.shown = Math.min(D.full.length, D.shown + dt * (this.textRate ?? 50));
    const now = Math.floor(D.shown);
    if (now !== before) {
      D.text.textContent = D.full.slice(0, now);
      // the speaker babbles along (voice.js); narration, signs and notes keep the typing blip
      if (!this.game.audio.babble?.chars(D.full, before, now) && now % 3 === 0) this.game.audio.play('blip');
    }
  }

  // ---------------- shop ----------------
  openShop(items, onBuy, onClose, titleKey = 'shop_title') {
    const el = $('#shop');
    el.dir = getLang() === 'he' ? 'rtl' : 'ltr';
    const render = () => {
      el.innerHTML = `<h2>${t(titleKey)}</h2><div class="coins">◆ ${this.game.hero.coins}</div>` +
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
  // a list of choices in the shop's panel (Hesk's glider): items [{key, note?, disabled?}]
  openMenu(titleKey, items, onPick, onClose) {
    const el = $('#shop');
    el.dir = 'ltr';
    const close = () => { el.classList.add('hidden'); this.shopOpen = false; onClose(); };
    const render = () => {
      el.innerHTML = `<h2>${t(titleKey)}</h2>` +
        items.map((it, i) => `<button class="item" data-i="${i}" ${it.disabled ? 'disabled' : ''}><span>${t(it.key)}</span><b>${it.note ? t(it.note) : ''}</b></button>`).join('') +
        `<button class="leave">${t('menu_cancel')}</button>`;
      el.querySelectorAll('.item').forEach((b) => b.addEventListener('click', () => { const it = items[+b.dataset.i]; if (it.disabled) return; el.classList.add('hidden'); this.shopOpen = false; onPick(it); }));
      el.querySelector('.leave').addEventListener('click', close);
      this._shopFocus();
    };
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
    const X0 = terrain.x0, Z0 = terrain.z0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const wx = X0 + (i / N) * terrain.size, wz = Z0 + (j / N) * terrain.size;
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
    const toPx = (v, o) => ((v - o) / terrain.size) * N;
    for (const p of PATHS) { x.beginPath(); p.forEach(([px, pz], i) => (i ? x.lineTo(toPx(px, X0), toPx(pz, Z0)) : x.moveTo(toPx(px, X0), toPx(pz, Z0)))); x.stroke(); }
    this.mapImg = c;
    this.mapX0 = X0; this.mapZ0 = Z0;
    this.mapSize = terrain.size;
  }

  _markers() { return this.game.mapMarkers(); }

  drawMinimap() {
    const ctx = this.miniCtx, W = this.mini.width;
    const hero = this.game.mapHero();
    const view = 70;
    const s = this.mapSize, X0 = this.mapX0, Z0 = this.mapZ0;
    const k = 256 / s;
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2); ctx.clip();
    const sx = (hero.pos.x - view / 2 - X0) * k, sz = (hero.pos.z - view / 2 - Z0) * k;
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

  // The Holomap shows the planet he is on (VP-9, CONNECT): the region he is in (Citadel's map, or the region's own
  // ground sampled from the game's physics), his dot on it whenever he is outdoors there (indoors: where he went
  // in), the markers that fall on it, and an inset of the planet — Twinsun or Zeelich — with its places and the
  // travel links open now (ferry, glider, Esmer shuttle; the spaceship leaves the planet).
  drawHolomap(time) {
    const ctx = this.holoCtx, W = this.holo.width, g = this.game;
    const region = regionOf(g), planet = planetOf(region);
    const B = region === 'citadel' ? { img: this.mapImg, X0: this.mapX0, Z0: this.mapZ0, s: this.mapSize } : this._regionMap(region);
    if (this._holoTitle !== region) { this._holoTitle = region; $('#holomap .title').textContent = t('map_holo') + ' · ' + t('map_' + planet) + ' · ' + t(REGION_NAME(region)); }
    const s = B.s, X0 = B.X0, Z0 = B.Z0;
    ctx.fillStyle = '#04121c';
    ctx.fillRect(0, 0, W, W);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(B.img, 0, 0, W, W);
    ctx.globalAlpha = 1;
    // holo scanlines + tint
    ctx.fillStyle = planet === 'zeelich' ? 'rgba(255,120,220,0.08)' : 'rgba(40,200,255,0.10)'; ctx.fillRect(0, 0, W, W);
    for (let y = (time * 40) % 4; y < W; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y, W, 1); }
    const toPx = (x, z) => [((x - X0) / s) * W, ((z - Z0) / s) * W];
    const inMap = (x, y) => x >= 0 && y >= 0 && x <= W && y <= W;
    const pts = this._markers().filter((m) => !m.minimapOnly).map((m) => { const [x, y] = toPx(m.x, m.z); return { m, x, y, r: (m.r || 4) * 1.8 }; }).filter((o) => inMap(o.x, o.y) && (region === 'citadel' ? true : !o.m.label || o.m.kind === 'star'));
    for (const o of pts) this._marker(ctx, o.x, o.y, o.m, 1.8);
    // the travel points of this region (a small diamond each)
    for (const p of Object.values(g.travel?.points || {})) {
      if (p.region !== region) continue;
      const [x, y] = toPx(p.x, p.z); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = MODE_COLOR[p.mode]; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10); ctx.restore();
    }
    const hero = region === 'citadel' ? g.mapHero() : (g.room?.outdoor ? g.hero : { pos: lastOutdoorPos() || { x: X0 + s / 2, z: Z0 + s / 2 } });
    const [hx, hy] = toPx(hero.pos.x, hero.pos.z);
    const pulse = 8 + Math.sin(time * 5) * 3;
    ctx.strokeStyle = '#7ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
    this.holoHero = { x: hx, y: hy, region, planet };
    // (Twinsen's ring is kept clear of labels too; and the planet's inset in the top-left corner)
    const IN = Math.round(W * 0.34);
    this.holoLabels = this._placeLabels(ctx, [...pts, { m: {}, x: hx, y: hy, r: 11 }, { m: {}, x: IN / 2, y: IN / 2, r: IN / 2 + 4 }], W);
    this._planetInset(ctx, IN, planet, region, time);
  }

  // the region's own map: its ground sampled from the physics (terrain and walkable bricks), cached
  _regionMap(region) {
    this._rmaps ||= {};
    if (this._rmaps[region]) return this._rmaps[region];
    const g = this.game, R = g.rooms[region], P = g.physics;
    const c0 = R.group.position, size = REGION_SIZE[region] || Math.max(...(R.size || [120, 120])) + 24;
    const cx = c0.x + (REGION_SHIFT[region]?.[0] || 0), cz = c0.z + (REGION_SHIFT[region]?.[1] || 0);
    const N = 160, X0 = cx - size / 2, Z0 = cz - size / 2, zee = planetOf(region) === 'zeelich';
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), img = x.createImageData(N, N), H = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = P.groundAt(X0 + ((i + 0.5) / N) * size, Z0 + ((j + 0.5) / N) * size, 80);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const h = H[j * N + i], k = (j * N + i) * 4; let r, gg, b;
      if (h < -0.3) { if (zee) { r = 70; gg = 50; b = 90; } else { const d = Math.min(1, -h / 6); r = 20; gg = 90 - d * 50; b = 150 - d * 60; } }
      else if (h < 1) { r = 190; gg = 175; b = 120; }
      else { const v = Math.min(1, h / 20); if (zee) { r = 150 + v * 80; gg = 130 + v * 70; b = 110 + v * 90; } else { r = 60 + v * 110; gg = 130 + v * 70; b = 60 + v * 90; } }
      const e = i > 0 && j > 0 ? Math.max(Math.abs(h - H[j * N + i - 1]), Math.abs(h - H[(j - 1) * N + i])) : 0;
      if (h > -0.3 && e > 1.2) { r *= 0.7; gg *= 0.7; b *= 0.7; }
      if (h > 0 && Math.abs((h % 2) - 1) < 0.08) { r *= 0.85; gg *= 0.85; b *= 0.85; }
      img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return (this._rmaps[region] = { img: c, X0, Z0, s: size });
  }

  // the planet: its places at their places on a schematic globe, the open travel links between them
  _planetInset(ctx, S, planet, region, time) {
    const g = this.game, T = g.travel;
    ctx.save();
    ctx.fillStyle = 'rgba(2,10,20,0.82)'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(160,240,255,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, S - 2, S - 2);
    const cx = S / 2, cy = S / 2 + 8, R0 = S * 0.36;
    const grd = ctx.createRadialGradient(cx - R0 * 0.3, cy - R0 * 0.3, R0 * 0.1, cx, cy, R0);
    if (planet === 'zeelich') { grd.addColorStop(0, '#f8d8ec'); grd.addColorStop(1, '#8a5a8a'); } else { grd.addColorStop(0, '#7ad0ff'); grd.addColorStop(1, '#1a4a7a'); }
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.fill();
    const at = (id) => { const p = PLANET_POS[id]; return p ? [cx + p[0] * R0, cy + p[1] * R0] : null; };
    // the open links
    const fs = Math.max(10, Math.round(S / 20));
    ctx.font = `600 ${fs}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const r of T?.routes || []) {
      if (!r.gate(g.story)) continue;
      const A = T.points[r.a], Bp = T.points[r.b];
      if (r.mode === 'ship') {   // off the planet
        const here = planetOf(A.region) === planet ? A : Bp, p = at(here.region); if (!p) continue;
        ctx.strokeStyle = MODE_COLOR.ship; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(S - 14, 16); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(t(planet === 'zeelich' ? 'map_to_twinsun' : 'map_to_zeelich'), S - 8, 30); ctx.textAlign = 'center';
        continue;
      }
      if (planetOf(A.region) !== planet) continue;
      if (r.mode === 'shuttle' && A.id !== 'zeelich_shuttle' && Bp.id !== 'zeelich_shuttle') continue;   // (drawn as a star from the spaceport island)
      const a = at(A.region), b = at(Bp.region); if (!a || !b) continue;
      ctx.strokeStyle = MODE_COLOR[r.mode]; ctx.lineWidth = 2; ctx.setLineDash(r.mode === 'glider' ? [5, 3] : []);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.2, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.2, b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
    }
    // the places
    for (const id of PLANETS[planet]) {
      const p = at(id); if (!p || !g.rooms[id] && id !== 'citadel') continue;
      ctx.fillStyle = id === region ? '#fff' : '#cfeeff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], id === region ? 4.5 : 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (id === region) { ctx.strokeStyle = '#7ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 7 + Math.sin(time * 5) * 2, 0, Math.PI * 2); ctx.stroke(); }
      if (planet === 'twinsun' || id === region || id === 'zeelich') { ctx.fillStyle = '#e8fbff'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3; const ly = p[1] + (PLANET_POS[id][1] < 0 ? -10 : 11); const tx = t(SHORT_NAME(id)); ctx.strokeText(tx, p[0], ly); ctx.fillText(tx, p[0], ly); }
    }
    ctx.fillStyle = '#f0c040'; ctx.font = `700 ${fs + 2}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillText(t('map_' + planet).toUpperCase(), 8, 12);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // Holomap labels, drawn after every marker and placed so that none overprints another label or a marker (two
  // places close together read "ToThe wellre" when both were centred above their points). The objective's star
  // chooses first; each label tries above its marker, then below, right, left, then further out, kept inside the
  // map; a place label that finds no free spot is left out rather than drawn over another (a star's always shows).
  // The font is scaled so a label reads at about 13 px however small the map is shown (960×540: the canvas is
  // drawn at 0.6×).
  _placeLabels(ctx, pts, W) {
    const shown = this.holo.clientWidth || W;
    const fs = Math.round(Math.max(15, (13 * W) / shown));
    ctx.font = `600 ${fs}px Rubik, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const blocks = pts.map((o) => ({ x: o.x - o.r - 1, y: o.y - o.r - 1, w: 2 * o.r + 2, h: 2 * o.r + 2 }));
    const placed = [], seen = new Set();
    const order = pts.filter((o) => o.m.label).sort((a, b) => (b.m.kind === 'star') - (a.m.kind === 'star'));
    for (const o of order) {
      const text = o.m.label;
      if (seen.has(text)) continue;
      seen.add(text);
      const w = ctx.measureText(text).width + 8, h = fs + 4, gx = o.r + 4 + w / 2, gy = o.r + 3 + h / 2;
      const tries = [[0, -gy], [0, gy], [gx, 0], [-gx, 0], [gx, -h], [-gx, -h], [gx, h], [-gx, h], [0, -gy - h], [0, gy + h]];
      let at = null;
      for (const [dx, dy] of tries) {
        const cx = Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, o.x + dx)), cy = Math.min(W - h / 2 - 2, Math.max(h / 2 + 2, o.y + dy));
        const b = { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
        if (!placed.some((p) => hit(p, b)) && !blocks.some((p) => hit(p, b))) { at = b; break; }
      }
      if (!at) {
        if (o.m.kind !== 'star') continue;
        const cx = Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, o.x)), cy = Math.max(h / 2 + 2, o.y - gy);
        at = { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
      }
      placed.push(at);
      ctx.fillStyle = '#e8fbff'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 4;
      ctx.strokeText(text, at.cx, at.cy); ctx.fillText(text, at.cx, at.cy);
      at.text = text; at.font = fs;
    }
    ctx.textBaseline = 'alphabetic';
    return placed;
  }
}
