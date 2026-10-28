// DOM-based HUD: stats, behaviour selector, prompts, toasts, dialogue,
// shop, minimap and the full-screen Holomap.
import { t, getLang } from './i18n.js';
import { BEHAVIOURS } from './actors.js';
import { Color, Vector3 } from 'three';
import { WEAPON_INFO } from './combat.js';
import { keyFor, keyLabel, PAD_LABELS } from '../engine/input.js';
import { regionOf, planetOf, PLANETS } from './travel.js';
import { mapBuilder, regionPlaces, roomName, palOf } from './mapdraw.js';

const $ = (s) => document.querySelector(s);

// the Holomap's regions and planets (CONNECT, VP-9)
const MODE_COLOR = { ferry: '#5ab0ff', glider: '#ffd860', shuttle: '#ff9ad0', ship: '#ffffff' };
// where each place sits on the planet's little globe (unit radius; Zeelich's islands round its spaceport island)
const PLANET_POS = { citadel: [-0.38, 0.22], desert: [0.42, 0.42], hamalayi: [0.08, -0.56], zeelich: [0, 0] };
PLANETS.zeelich.slice(1).forEach((id, i, a) => { const ang = (i / a.length) * Math.PI * 2 - Math.PI / 2; PLANET_POS[id] = [Math.cos(ang) * 0.66, Math.sin(ang) * 0.66]; });
const REGION_NAME = (r) => ({ citadel: 'map_citadel', desert: 'map_desert', hamalayi: 'map_hamalayi', zeelich: 'isle_zeelich' }[r] || r);
const SHORT_NAME = (r) => ({ citadel: 'map_citadel_s', desert: 'map_desert_s', hamalayi: 'map_hamalayi_s', zeelich: 'map_zeelich_s' }[r] || r);

// CLAR-2 (the user: "still a lot of unnecessary text on screen"; LBA2 shows almost none). The objective panel comes up
// for a few seconds when the goal changes, then steps aside; it stays in the pause menu, the Holomap and the journal.
// A count in the goal ("(2/3)") is progress, told by its own short toast: it does not bring the panel back.
const OBJ_SHOW = 5;          // seconds of play the panel stays up after a new goal
const PROMPT_DWELL = 0.15;   // a target must stay in reach this long before its prompt shows (no flicker walking past)
const RUN_SPEED = 3.6;       // (Hero: faster than this is the run) running past things shows no prompt
const goalOf = (html) => {
  const d = document.createElement('div'); d.innerHTML = html || '';
  const b = d.querySelector('b');
  return (b || d).textContent.replace(/\s*\(\d+\s*\/\s*\d+\)/g, '').replace(/\s+/g, ' ').trim();
};

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
    this._wireMaps();
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
    const cl = $('#holomap .close'); cl.textContent = t('map_close_btn'); cl.title = `${keyLabel(keyFor('map'))} / ${keyLabel(keyFor('pause'))}`;
    const lg = $('#holomap .legend'); if (lg) lg.innerHTML = `<span class="lk star">★</span>${t('map_key_goal')} <span class="lk dia">◆</span>${t('map_key_travel')} <span class="lk door">▮</span>${t('map_key_door')}`;
    this._hintTxt = null;
  }

  show(on) { this.el.classList.toggle('hidden', !on); }

  behaviour(b) {
    // (the Always-on bar: icons and keys for all four, the name only under the one in use)
    document.querySelectorAll('#behaviour .beh').forEach((d) => { const on = d.dataset.b === b; d.classList.toggle('on', on); d.querySelector('.lbl').style.visibility = on ? '' : 'hidden'; });
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
    this._objTick();
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
    // (shown for a moment when the weapon changes; not for the one he already held when play starts or loads)
    if (this._w !== w || this._wn !== wn) { const first = this._w === undefined; this._w = w; this._wn = wn; el.querySelector('.ico').textContent = WEAPON_INFO[w]?.icon || ''; el.querySelector('.name').textContent = wn; if (!first) this.weaponShowT = 2.5; }
    // ammunition: darts, the pistol's crystal charge (or its magic cost), the spell's magic cost
    const a = h.arms || {};
    const ammo = w === 'blowgun' ? `${a.darts}` : w === 'laser' ? (a.charge > 0 ? `◆${a.charge}` : '✦2') : w === 'lightning' ? '✦3' : '';
    let ae = el.querySelector('.ammo');
    if (!ae) { ae = document.createElement('span'); ae.className = 'ammo'; ae.style.cssText = 'font-weight:800;color:#ffe35a;font-size:13px;min-width:1ch'; el.querySelector('.name').after(ae); }
    if (this._ammo !== ammo) { this._ammo = ammo; ae.textContent = ammo; ae.style.display = ammo ? '' : 'none'; }
    // the swap key and the last weapon: while the pill shows a change, not through a whole fight
    const alt = (this.weaponShowT || 0) > 0 && h.prevWeapon && c.has(h.prevWeapon) && h.prevWeapon !== w ? h.prevWeapon : null;
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
  // Baldino's hop-pack (jetpack.js): a slim charge gauge beside Twinsen while it is in use or refilling (blue; amber
  // when low; red and shaking when empty; a cross when it can't fire here). Out of play it steps aside (busy).
  jet(s) {
    let el = this._jetEl;
    if (!el) {
      el = this._jetEl = document.createElement('div');
      el.id = 'jetgauge';
      el.style.cssText = 'position:fixed;width:9px;height:46px;border:2px solid #2a1e10;border-radius:5px;background:rgba(20,16,10,.55);box-shadow:0 0 0 1px rgba(255,230,170,.5);pointer-events:none;opacity:0;transition:opacity .25s;z-index:5';
      el.innerHTML = '<i style="position:absolute;left:0;right:0;bottom:0;border-radius:3px;background:#4ab8ff"></i><b style="position:absolute;left:-14px;top:-18px;width:37px;text-align:center;font:800 13px sans-serif;color:#ff6a4a;text-shadow:0 1px 2px #000"></b>';
      this.el.appendChild(el);
    }
    const on = !!s?.show && !this.el.classList.contains('busy');
    if (on !== this._jetOn) { this._jetOn = on; el.style.opacity = on ? '1' : '0'; }
    if (!on) return;
    const v = (this._jv ??= new Vector3()).set(s.pos.x, s.pos.y + 1.1, s.pos.z).project(this.game.camera);
    el.style.left = Math.round(((v.x + 1) / 2) * innerWidth + 34) + 'px';
    el.style.top = Math.round(((1 - v.y) / 2) * innerHeight - 23) + 'px';
    const fill = el.firstChild, k = Math.max(0, Math.min(1, s.fuel));
    fill.style.height = (k * 100).toFixed(1) + '%';
    fill.style.background = k < 0.02 ? '#ff3a2a' : s.low ? '#ffa030' : '#4ab8ff';
    const shake = k < 0.02 && s.why === 'empty' ? Math.sin(performance.now() / 30) * 1.5 : 0;
    el.style.transform = shake ? 'translateX(' + shake.toFixed(1) + 'px)' : '';
    const mark = s.why === 'roof' || s.why === 'ground' ? '✕' : '';
    if (el.lastChild.textContent !== mark) el.lastChild.textContent = mark;
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
    // (the brief panel names the goal only; its steps, the "where" and "who" for a stuck player, wait in the
    //  pause menu, the Holomap and the journal: HINTS-LESS)
    const d = document.createElement('div'); d.innerHTML = html || '';
    const b = d.querySelector('b');
    $('#objective').innerHTML = b ? b.outerHTML : html;
    $('#pause-objective').innerHTML = html;
    $('#holomap .objective').innerHTML = html;
    const goal = goalOf(html);
    if (goal !== this._goal) { this._goal = goal; this.objT = goal ? OBJ_SHOW : 0; }
  }
  // the panel's few seconds, counted in play only (dialogue, menus and cut-scenes hold it: #hud.busy hides it)
  _objTick() {
    const now = this.game.time ?? 0, dt = Math.min(0.1, Math.max(0, now - (this._objAt ?? now)));
    this._objAt = now;
    if (this.objT > 0) this.objT = Math.max(0, this.objT - dt);
    const on = this.objT > 0;
    if (on !== this.objShown) { this.objShown = on; $('#objective').classList.toggle('show', on); }
  }
  // the key (or pad button) the player uses for an action, for hints; the behaviour keys (b1–b4) are the
  // behaviour menu (LT) on a pad
  key(a) {
    const I = this.game.input;
    if (/^b[1-4]$/.test(a) && I.lastDevice === 'pad') return PAD_LABELS.wheel;
    return I.label(a) || keyLabel(keyFor(a));
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
    if (this._jetOn) this.jet({ show: false });
    if (this.wselOpen) { this.wselOpen = false; $('#wsel')?.classList.add('hidden'); }
  }

  prompt(text) {
    const hide = () => { if (this._prompt) { this.promptEl.classList.remove('show'); this._prompt = ''; } };
    if (!text) { this._pFor = null; hide(); return; }
    // a target he only passes (in reach for a blink, or while he runs) gets no prompt
    const now = this.game.time ?? 0;
    if (this._pFor !== text) { this._pFor = text; this._pSince = now; }
    if (now - this._pSince < PROMPT_DWELL || (this.game.hero?.speed || 0) > RUN_SPEED) { hide(); return; }
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

  toast(key, vars, ms = 2300) {
    const msg = t(key, vars);
    // the same words already up (a repeated action), or the goal the objective panel shows: not again
    const up = [...this.toastEl.children].find((e) => e.textContent === msg && !e.classList.contains('out'));
    if (up || (this.objShown && msg === this._goal)) return;
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    this.toastEl.appendChild(d);
    (this.toastLog ||= []).push(msg); if (this.toastLog.length > 12) this.toastLog.shift();   // (recent toasts, for tests: they fade after 2.8 s of real time)
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
    setTimeout(() => d.classList.add('out'), ms);
    setTimeout(() => d.remove(), ms + 500);
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
    if (D.shown < D.full.length) { D.shown = D.full.length; D.text.textContent = D.full; this.game.audio.babble?.hush?.(); return; } // (the voice stops with the skipped text)
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
    if (this.talking) this.game.audio.babble?.pump?.();
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

  // ---------------- maps (MAP-1) ----------------
  // The base maps are drawn from the built world by src/game/mapdraw.js, once per region (and per room) into an
  // offscreen canvas, a few ms a frame in the background (mapTick), so the minimap's frame is one clipped drawImage
  // and a few markers. The Holomap draws the same base with zoom and pan.
  buildMapImage() {}   // (main.js's start-up call: nothing to do any more, the maps are built when first needed)

  _wireMaps() {
    this._bases = new Map(); this._views = {}; this._ptr = new Map(); this._wheel = null; this._drag = [0, 0]; this._pinch = 1; this._listeners = 0;
    this._places = {};
    this._rm = matchMedia?.('(prefers-reduced-motion: reduce)');
    const c = this.holo, on = (el, ev, f, o) => { if (!el) return; el.addEventListener(ev, f, o); this._listeners++; };
    on(c, 'wheel', (e) => { e.preventDefault(); const r = c.getBoundingClientRect(); const w = (this._wheel ||= { n: 0 }); w.n += Math.sign(e.deltaY); w.x = (e.clientX - r.left) / r.width; w.y = (e.clientY - r.top) / r.height; }, { passive: false });
    on(c, 'pointerdown', (e) => {
      try { c.setPointerCapture(e.pointerId); } catch { /* (a synthetic pointer) */ }
      this._ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.game.input.lastDevice = e.pointerType === 'touch' ? 'touch' : 'kbd';
    });
    on(c, 'pointermove', (e) => {
      const p = this._ptr.get(e.pointerId); if (!p) return;
      if (this._ptr.size >= 2) {   // a pinch: the distance between the first two fingers
        const [a, b] = [...this._ptr.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y);
        p.x = e.clientX; p.y = e.clientY;
        const d1 = Math.hypot(a.x - b.x, a.y - b.y);
        if (d0 > 4) this._pinch *= d1 / d0;
        return;
      }
      this._drag[0] += e.clientX - p.x; this._drag[1] += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e) => this._ptr.delete(e.pointerId);
    on(c, 'pointerup', up); on(c, 'pointercancel', up);
    on($('#holomap .close'), 'click', () => { this._closeReq = true; });
    on(window, 'resize', () => { this._miniSized = false; });
  }
  _still() { return !!this._rm?.matches || this.game.settings?.shake === 'off'; }

  // the base map of a region (or of a room), built in full now
  mapBase(region, room = null) { const B = this._base(region, room); B.finish(); return B; }
  _base(region, room = null) {
    const key = room ? 'room:' + room.id : region;
    let B = this._bases.get(key);
    if (B) { this._bases.delete(key); this._bases.set(key, B); return B; }
    B = room ? mapBuilder(this.game, null, room) : mapBuilder(this.game, region);
    this._bases.set(key, B);
    while (this._bases.size > 6) this._bases.delete(this._bases.keys().next().value);   // (about 2.4 MB each)
    return B;
  }

  // Each frame of play: where he is (outdoors), the door he went in by (kept in the save: flags.mapDoors), the
  // region's base map built a little further, and the minimap when the HUD shows it.
  mapTick() {
    const g = this.game, R = g.room, region = regionOf(g);   // (regionOf also keeps travel.js's last region current)
    if (!R || R.outdoor) this._out = { region, x: g.hero.pos.x, z: g.hero.pos.z };
    else if (!this._in && this._out && R.id !== 'arena') (g.flags.mapDoors ||= {})[R.id] = [this._out.region, +this._out.x.toFixed(1), +this._out.z.toFixed(1)];
    this._in = R && !R.outdoor ? R.id : null;
    // (PERF-HIGH: the slice is what the last frame's own work left of the frame (Game.spareMs, 0.5–2.5 ms): a map built
    //  after an arrival took a fixed 2.5 ms of every frame for 1–4 s (5.5 ms with the minimap's own 3 ms slice on top), which a
    //  frame already bound by the processor (the laptop on battery) paid in full; it now takes longer to finish there)
    if (!this._in) { const B = this._base(region); if (!B.done) { const t0 = performance.now(); B.step(g.spareMs ? g.spareMs(2.5) : 2.5); g._bgMs = (g._bgMs || 0) + performance.now() - t0; } }
    if (!this.lba && !this.el.classList.contains('hidden')) this.drawMinimap();
  }

  // where he is for the maps: the region, and his place on its map (indoors: the door he went in by)
  _where() {
    const g = this.game, R = g.room, region = regionOf(g), h = g.hero;
    if (!R || R.outdoor) return { region, x: h.pos.x, z: h.pos.z, inside: null };
    const d = g.flags.mapDoors?.[R.id];
    let p = d && d[0] === region ? { x: d[1], z: d[2] } : this._out?.region === region ? this._out : null;
    if (!p && region === 'citadel') p = g.mapHero().pos;
    return { region, x: p ? p.x : null, z: p ? p.z : null, inside: R };
  }
  _markers() { return this.game.mapMarkers(); }
  _doors(region) {
    const g = this.game, out = [], used = g.flags.mapDoors || {};
    for (const d of g.story.doors()) if ((d.region || 'citadel') === region) out.push({ x: d.x, z: d.z, room: d.room, used: !!used[d.room] });
    for (const [room, v] of Object.entries(used)) if (v[0] === region && !out.some((o) => o.room === room || Math.hypot(o.x - v[1], o.z - v[2]) < 3)) out.push({ x: v[1], z: v[2], room, used: true });
    return out;
  }
  _door(ctx, x, y, used, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = used ? '#ffb347' : 'rgba(10,20,30,0.85)'; ctx.strokeStyle = used ? '#2a1606' : '#ffffff'; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(-3.5 * s, 4.5 * s); ctx.lineTo(-3.5 * s, -1.5 * s); ctx.arc(0, -1.5 * s, 3.5 * s, Math.PI, 0); ctx.lineTo(3.5 * s, 4.5 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  _diamond(ctx, x, y, color, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = color; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5 * s;
    ctx.fillRect(-4.5 * s, -4.5 * s, 9 * s, 9 * s); ctx.strokeRect(-4.5 * s, -4.5 * s, 9 * s, 9 * s); ctx.restore();
  }
  _arrow(ctx, x, y, a, s, fill = '#ffffff', stroke = '#1b4fb5') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2 * s; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, -8 * s); ctx.lineTo(6 * s, 6 * s); ctx.lineTo(0, 3 * s); ctx.lineTo(-6 * s, 6 * s); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }

  // ---- the minimap: north-up, or turning with the camera (Settings → Minimap); his arrow in the middle
  miniToCanvas(x, z) {
    const M = this._mini; if (!M) return [0, 0];
    const dx = (x - M.cx) * M.k, dz = (z - M.cz) * M.k, c = Math.cos(M.phi), s = Math.sin(M.phi);
    return [M.W / 2 + dx * c - dz * s, M.W / 2 + dx * s + dz * c];
  }
  drawMinimap() {
    const g = this.game, ctx = this.miniCtx, h = g.hero, R = g.room;
    if (!this._miniSized) { const css = this.mini.clientWidth || 170, w = Math.max(190, Math.round(css * Math.min(2, devicePixelRatio || 1))); if (this.mini.width !== w) this.mini.width = this.mini.height = w; this._miniSized = true; }
    const W = this.mini.width, indoor = R && !R.outdoor, region = indoor ? null : regionOf(g);
    const B = indoor ? this.mapBase(null, R) : this._base(region);
    // (outdoors its base map is built by mapTick, which runs right before: PERF-HIGH)
    this.miniRoom = indoor ? R.id : null;
    const mode = this.miniMode = g.settings?.minimap === 'camera' ? 'camera' : 'north';
    const y = g.camRig?.yaw ?? 0, phi = mode === 'camera' ? -Math.PI / 2 - Math.atan2(-Math.cos(y), -Math.sin(y)) : 0;
    const view = indoor ? 24 : 70, k = W / view, sc = W / 190;
    this._mini = { cx: h.pos.x, cz: h.pos.z, k, phi, W };
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2); ctx.clip();
    const pal = indoor ? null : palOf(region);
    ctx.fillStyle = indoor ? '#161e28' : `rgb(${pal.deep.join(',')})`; ctx.fillRect(0, 0, W, W);
    if (B.done) {
      // only the part of the base around him (its corners reach out to the circle's when turned)
      const half = view * 0.72, s = B.N / B.s;
      const x0 = Math.max(B.X0, h.pos.x - half), z0 = Math.max(B.Z0, h.pos.z - half), x1 = Math.min(B.X0 + B.s, h.pos.x + half), z1 = Math.min(B.Z0 + B.s, h.pos.z + half);
      if (x1 > x0 && z1 > z0) {
        ctx.save(); ctx.translate(W / 2, W / 2); ctx.rotate(phi); ctx.scale(k, k); ctx.translate(-h.pos.x, -h.pos.z);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(B.canvas, (x0 - B.X0) * s, (z0 - B.Z0) * s, (x1 - x0) * s, (z1 - z0) * s, x0, z0, x1 - x0, z1 - z0);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#cfefff'; ctx.font = `600 ${Math.round(13 * sc)}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t('map_loading'), W / 2, W / 2 + 22 * sc);
    }
    const inB = (x, z) => x >= B.X0 && z >= B.Z0 && x <= B.X0 + B.s && z <= B.Z0 + B.s;
    const rim = (mx, my, edge) => { const off = Math.hypot(mx - W / 2, my - W / 2) > W / 2 - 8 * sc; if (!off) return [mx, my]; if (!edge) return null; const a = Math.atan2(my - W / 2, mx - W / 2); return [W / 2 + Math.cos(a) * (W / 2 - 10 * sc), W / 2 + Math.sin(a) * (W / 2 - 10 * sc)]; };
    if (indoor) {
      for (const e of R.exits || []) { const p = rim(...this.miniToCanvas(e.x, e.z), true); if (p) this._door(ctx, p[0], p[1], true, sc); }
    } else {
      for (const p of Object.values(g.travel?.points || {})) { if (p.region !== region) continue; const q = rim(...this.miniToCanvas(p.x, p.z), false); if (q) this._diamond(ctx, q[0], q[1], MODE_COLOR[p.mode], sc * 0.8); }
      for (const d of this._doors(region)) { const q = rim(...this.miniToCanvas(d.x, d.z), false); if (q) this._door(ctx, q[0], q[1], d.used, sc * 0.9); }
      for (const m of this._markers()) {
        if (!inB(m.x, m.z)) continue;
        const q = rim(...this.miniToCanvas(m.x, m.z), m.edge); if (!q) continue;
        this._marker(ctx, q[0], q[1], m, sc);
      }
    }
    this._arrow(ctx, W / 2, W / 2, -h.angle + Math.PI + phi, sc);
    if (indoor) {
      const name = roomName(R.id);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, W - 40 * sc, W, 40 * sc);
      ctx.fillStyle = '#e8fbff'; ctx.font = `600 ${Math.round(13 * sc)}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, W / 2, W - 24 * sc, W * 0.62);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2); ctx.stroke();
    // north on the rim (it turns with the map in "Turns with camera")
    const nx = W / 2 + Math.sin(phi) * (W / 2 - 11 * sc), ny = W / 2 - Math.cos(phi) * (W / 2 - 11 * sc);
    ctx.fillStyle = '#0b1a26'; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5 * sc;
    ctx.beginPath(); ctx.arc(nx, ny, 8 * sc, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe35a'; ctx.font = `800 ${Math.round(11 * sc)}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t('map_north'), nx, ny + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  _marker(ctx, x, y, m, scale) {
    ctx.save();
    ctx.translate(x, y);
    const r = (m.r || 4) * scale;
    if (m.kind === 'star') {
      ctx.fillStyle = m.color; ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5 * Math.max(1, scale / 1.5);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = m.color; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2 * Math.max(1, scale / 1.5);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // ---- the Holomap: the planet he is on (VP-9, CONNECT), the region he is in drawn from the world, zoom and pan
  openHolomap() {
    $('#holomap').classList.remove('hidden');
    this._closeReq = false; this._ptr.clear(); this._wheel = null; this._drag = [0, 0]; this._pinch = 1;
    this._holoSize();
    this._findHim = true;   // (the view is kept between openings; if he is out of it, it moves to him)
  }
  closeHolomap() { $('#holomap').classList.add('hidden'); this._ptr.clear(); this.holoRoom = null; }
  _holoSize() {
    const c = this.holo, r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(160, Math.min(2400, Math.round(r.width * dpr))), h = Math.max(120, Math.min(1600, Math.round(r.height * dpr)));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this._holoCss = r.width || w;
  }
  // input and drawing, each frame the map is open; true when it closes
  holomapUpdate(input, dt) {
    if (this._closeReq) { this._closeReq = false; return true; }
    if (input.pressed('map') || input.pressed('pause') || (input.lastDevice === 'pad' && input.pressed('dodge'))) return true;
    const c = this.holo;
    if (Math.abs(c.getBoundingClientRect().width - this._holoCss) > 1) this._holoSize();
    const w = this._where(), region = w.region, B = this.mapBase(region), W = c.width, H = c.height;
    const ct = B.content, cw = ct[2] - ct[0] + 12, ch = ct[3] - ct[1] + 12, inset = this._insetSize(W, H);
    // zoom 1 fits the region's land (beside the planet's inset when the map is wide)
    const wide = W > H * 1.25, fit = Math.min((W - (wide ? inset : 0)) / cw, H / ch);
    let V = this._views[region];
    if (V && (input.pressed('view') || input.keys.has('Home'))) V = null;   // the whole map again
    if (!V) V = this._views[region] = { zoom: 1, cx: (ct[0] + ct[2]) / 2 - (wide ? inset / 2 / fit : 0), cz: (ct[1] + ct[3]) / 2 };
    const K = input.keys;
    let z = V.zoom, anchor = null;
    if (K.has('Equal') || K.has('NumpadAdd') || K.has('PageUp') || input.down('weapons')) z *= Math.exp(1.8 * dt);
    if (K.has('Minus') || K.has('NumpadSubtract') || K.has('PageDown') || input.down('wheel')) z *= Math.exp(-1.8 * dt);
    if (input.pressed('focus')) z *= 1.5;
    if (input.pressed('swap')) z /= 1.5;
    if (this._wheel) { z *= Math.pow(1.25, -this._wheel.n); anchor = [this._wheel.x * W, this._wheel.y * H]; this._wheel = null; }
    if (this._pinch !== 1) { z *= this._pinch; this._pinch = 1; }
    z = Math.min(6, Math.max(0.6, z));
    if (anchor) {   // the point under the cursor stays put
      const p0 = fit * V.zoom, p1 = fit * z, wx = V.cx + (anchor[0] - W / 2) / p0, wz = V.cz + (anchor[1] - H / 2) / p0;
      V.cx = wx - (anchor[0] - W / 2) / p1; V.cz = wz - (anchor[1] - H / 2) / p1;
    }
    V.zoom = z;
    const ppm = fit * z;
    const mv = input.move(), sp = (Math.min(W, H) * 0.8 / ppm) * dt;
    V.cx += mv.x * sp; V.cz -= mv.y * sp;
    if (this._drag[0] || this._drag[1]) { const r = W / (this._holoCss || W); V.cx -= this._drag[0] * r / ppm; V.cz -= this._drag[1] * r / ppm; this._drag = [0, 0]; }
    if ((input.pressed('recenter') || input.pressed('recenterPad') || input.pressed('action')) && w.x != null) { V.cx = w.x; V.cz = w.z; V.zoom = Math.max(V.zoom, 2.5); }
    if (this._findHim && w.x != null) {
      const x = W / 2 + (w.x - V.cx) * ppm, y = H / 2 + (w.z - V.cz) * ppm;
      if (x < W * 0.1 || y < H * 0.1 || x > W * 0.9 || y > H * 0.9) { V.cx = w.x; V.cz = w.z; }
    }
    this._findHim = false;
    V.cx = Math.min(B.X0 + B.s, Math.max(B.X0, V.cx)); V.cz = Math.min(B.Z0 + B.s, Math.max(B.Z0, V.cz));
    this.holoView = { cx: V.cx, cz: V.cz, ppm: fit * V.zoom, W, H, zoom: V.zoom, region };
    this._hint(input);
    this._drawHolo(w, B, this.game.time);
    return false;
  }
  // (kept for callers that only want the picture: the current view, no input)
  drawHolomap(time) { if (!this.holoView) return; this._drawHolo(this._where(), this.mapBase(this._where().region), time); }
  _insetSize(W, H) { return Math.round(Math.min(W, H) * 0.27); }

  // the controls line: the keys in use (rebound keys by their names), the pad's buttons, or touch
  _hint(input) {
    const L = (a) => keyLabel(keyFor(a)), dev = input.lastDevice;
    const move = ['up', 'left', 'down', 'right'].map(L), mv = move.every((s) => s.length === 1) ? move.join('') : move.join('/');
    const txt = dev === 'pad' ? t('map_hint_pad') : dev === 'touch' ? t('map_hint_touch') : t('map_hint_kbd', { move: mv, zoom: '+/−', centre: L('recenter'), whole: L('view'), close: `${L('map')}/${L('pause')}` });
    if (txt !== this._hintTxt) { this._hintTxt = txt; $('#holomap .hint').textContent = txt; }
  }

  _drawHolo(w, B, time) {
    const g = this.game, ctx = this.holoCtx, V = this.holoView, { W, H, ppm } = V, region = w.region, planet = planetOf(region);
    const R = w.inside, key = region + '|' + (R?.id || '');
    if (this._holoTitle !== key) {
      this._holoTitle = key;
      $('#holomap .title').textContent = t('map_holo') + ' · ' + t('map_' + planet) + ' · ' + t(REGION_NAME(region)) + (R ? ` · ${t('map_inside')}: ${roomName(R.id)}` : '');
    }
    const sc = W / (this._holoCss || W), big = document.body.classList.contains('big-text') ? 1.2 : 1, still = this._still();
    const px = (x) => W / 2 + (x - V.cx) * ppm, pz = (z) => H / 2 + (z - V.cz) * ppm;
    const pal = palOf(region);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgb(${pal.deep.join(',')})`; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    if (B.done) ctx.drawImage(B.canvas, px(B.X0), pz(B.Z0), B.s * ppm, B.s * ppm);
    // the hologram: a faint tint and scanlines (still with reduced motion)
    ctx.fillStyle = planet === 'zeelich' ? 'rgba(255,120,220,0.05)' : 'rgba(40,200,255,0.06)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    const step = Math.max(3, Math.round(3 * sc));
    for (let y = still ? 0 : (time * 24 * sc) % step; y < H; y += step) ctx.fillRect(0, y, W, Math.max(1, sc * 0.7));
    const inV = (x, y, m = 0) => x >= -m && y >= -m && x <= W + m && y <= H + m;
    const pts = [];   // markers, for the labels to keep clear of
    const ms = sc * 1.5, ppc = ppm / sc;   // (screen px per metre: the smaller places are named once there is room)
    const minor = ppc >= 2.6 || V.zoom >= 1.7, doors = ppc >= 7;
    // places: a small dot where each is (the minor ones once zoomed in)
    const places = (this._places[region] ||= regionPlaces(g, region));
    for (const p of places) {
      if (p.prio > 1 && !minor) continue;
      const x = px(p.x), y = pz(p.z); if (!inV(x, y)) continue;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#102030'; ctx.lineWidth = 1.5 * sc;
      ctx.beginPath(); ctx.arc(x, y, 3 * sc, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      pts.push({ m: { label: p.label }, prio: p.prio, x, y, r: 4 * sc });
    }
    // doors (filled: one he went in by), travel points
    for (const d of this._doors(region)) {
      const x = px(d.x), y = pz(d.z); if (!inV(x, y)) continue;
      this._door(ctx, x, y, d.used, ms);
      pts.push({ m: { label: doors ? roomName(d.room) : null }, prio: 3, x, y, r: 6 * ms });
    }
    for (const p of Object.values(g.travel?.points || {})) {
      if (p.region !== region) continue;
      const x = px(p.x), y = pz(p.z); if (!inV(x, y)) continue;
      this._diamond(ctx, x, y, MODE_COLOR[p.mode], ms);
      pts.push({ m: { label: minor ? t('p_' + p.mode) : null }, prio: 2, x, y, r: 7 * ms });
    }
    // the story's markers (objective stars; people on Citadel); a star off the view gets an arrow at the edge
    const inB = (x, z) => x >= B.X0 && z >= B.Z0 && x <= B.X0 + B.s && z <= B.Z0 + B.s;
    for (const m of this._markers()) {
      if (m.minimapOnly || !inB(m.x, m.z)) continue;
      const x = px(m.x), y = pz(m.z);
      if (!inV(x, y)) { if (m.kind === 'star') this._edgeArrow(ctx, x, y, W, H, sc, m.color); continue; }
      const s = m.kind === 'star' ? ms * 1.3 : ms * 0.7;
      this._marker(ctx, x, y, m, s);
      pts.push({ m, prio: m.kind === 'star' ? 0 : 3, x, y, r: (m.r || 4) * s });
    }
    // Twinsen: his arrow shows his facing (indoors: a ring at the door he went in by)
    let hx = null, hy = null;
    if (w.x != null) {
      hx = px(w.x); hy = pz(w.z);
      const pulse = still ? 13 * sc : (12 + Math.sin(time * 5) * 3) * sc;
      ctx.strokeStyle = '#7ff'; ctx.lineWidth = 2.2 * sc;
      ctx.beginPath(); ctx.arc(hx, hy, pulse, 0, Math.PI * 2); ctx.stroke();
      if (R) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, 4.5 * sc, 0, Math.PI * 2); ctx.fill(); }
      else this._arrow(ctx, hx, hy, -g.hero.angle + Math.PI, sc * 1.25);
      if (!inV(hx, hy)) this._edgeArrow(ctx, hx, hy, W, H, sc, '#7ff');
    }
    this.holoHero = { x: hx, y: hy, region, planet, angle: g.hero.angle, inside: R?.id || null };
    // the corners: the planet (top-left), the compass (top-right), the scale (bottom-left), the room (bottom-right)
    const IN = this._insetSize(W, H), mg = Math.round(8 * sc);
    const rects = [{ x: 0, y: 0, w: IN + mg, h: IN + mg }];
    ctx.save(); ctx.translate(mg, mg); this._planetInset(ctx, IN, planet, region, still ? 0 : time); ctx.restore();
    const cr = 18 * sc, cxp = W - mg - cr, cyp = mg + 14 * sc + cr;
    this._compass(ctx, cxp, cyp, cr, sc);
    rects.push({ x: cxp - cr - 2, y: 0, w: W - (cxp - cr - 2), h: cyp + cr + 4 });
    rects.push(this._scaleBar(ctx, mg, H - mg, ppm, sc, big));
    this.holoRoom = null;
    if (R) rects.push(this._roomInset(ctx, R, W, H, mg, sc, big));
    if (hx != null) pts.push({ m: {}, prio: 9, x: hx, y: hy, r: 14 * sc });
    this.holoLabels = this._placeLabels(ctx, pts, W, H, rects, sc * big);
  }
  _edgeArrow(ctx, x, y, W, H, sc, color) {
    const a = Math.atan2(y - H / 2, x - W / 2), m = 18 * sc;
    const t0 = Math.min(Math.abs((W / 2 - m) / (Math.cos(a) || 1e-6)), Math.abs((H / 2 - m) / (Math.sin(a) || 1e-6)));
    const ex = W / 2 + Math.cos(a) * t0, ey = H / 2 + Math.sin(a) * t0;
    this._arrow(ctx, ex, ey, a + Math.PI / 2, sc * 1.1, color, '#111');
  }
  _compass(ctx, x, y, r, sc) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(2,10,20,0.78)'; ctx.strokeStyle = 'rgba(160,240,255,0.8)'; ctx.lineWidth = 1.5 * sc;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe35a'; ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.lineTo(r * 0.24, 0); ctx.lineTo(-r * 0.24, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9ab'; ctx.beginPath(); ctx.moveTo(0, r * 0.62); ctx.lineTo(r * 0.24, 0); ctx.lineTo(-r * 0.24, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 ${Math.round(11 * sc)}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t('map_north'), 0, -r - 7 * sc);   // (above the dial)
    ctx.restore();
  }
  _scaleBar(ctx, x, y, ppm, sc, big) {
    const want = 110 * sc / ppm, nice = [5, 10, 20, 25, 50, 100, 200].find((v) => v >= want * 0.6) || 200, len = nice * ppm;
    const fs = Math.round(12 * sc * big), h = fs + 14 * sc;
    ctx.save();
    ctx.fillStyle = 'rgba(2,10,20,0.7)'; ctx.fillRect(x, y - h, len + 16 * sc, h);
    ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.moveTo(x + 8 * sc, y - 8 * sc - 4 * sc); ctx.lineTo(x + 8 * sc, y - 8 * sc); ctx.lineTo(x + 8 * sc + len, y - 8 * sc); ctx.lineTo(x + 8 * sc + len, y - 12 * sc); ctx.stroke();
    ctx.fillStyle = '#e8fbff'; ctx.font = `600 ${fs}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(`${nice} m`, x + 8 * sc + len / 2, y - 11 * sc);
    ctx.restore();
    return { x, y: y - h, w: len + 16 * sc, h };
  }
  // indoors: the room's plan, his arrow in it, its doors
  _roomInset(ctx, R, W, H, mg, sc, big) {
    const B = this.mapBase(null, R), S = Math.round(Math.min(W, H) * 0.36), x0 = W - mg - S, fs = Math.round(13 * sc * big), th = fs + 10 * sc, y0 = H - mg - S - th;
    ctx.save();
    ctx.fillStyle = 'rgba(2,10,20,0.88)'; ctx.fillRect(x0, y0, S, S + th);
    ctx.strokeStyle = 'rgba(160,240,255,0.8)'; ctx.lineWidth = 2 * sc; ctx.strokeRect(x0 + 1, y0 + 1, S - 2, S + th - 2);
    ctx.fillStyle = '#ffe35a'; ctx.font = `700 ${fs}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(roomName(R.id), x0 + S / 2, y0 + th / 2 + 1, S - 12 * sc);
    const ct = B.content, cw = ct[2] - ct[0] + 2, ch = ct[3] - ct[1] + 2, k = (S - 16 * sc) / Math.max(cw, ch);
    const ox = x0 + S / 2 - ((ct[0] + ct[2]) / 2) * k, oz = y0 + th + S / 2 - ((ct[1] + ct[3]) / 2) * k;
    ctx.beginPath(); ctx.rect(x0 + 2, y0 + th, S - 4, S - 2); ctx.clip();
    ctx.drawImage(B.canvas, ox + B.X0 * k, oz + B.Z0 * k, B.s * k, B.s * k);
    for (const e of R.exits || []) this._door(ctx, ox + e.x * k, oz + e.z * k, true, sc * 1.3);
    const h = this.game.hero;
    this._arrow(ctx, ox + h.pos.x * k, oz + h.pos.z * k, -h.angle + Math.PI, sc * 1.2);
    ctx.restore();
    this.holoRoom = R.id;
    return { x: x0, y: y0, w: S, h: S + th };
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
      const p = at(id); if (!p || !g.regions.has(id) && id !== 'citadel') continue;
      ctx.fillStyle = id === region ? '#fff' : '#cfeeff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], id === region ? 4.5 : 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (id === region) { ctx.strokeStyle = '#7ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 7 + Math.sin(time * 5) * 2, 0, Math.PI * 2); ctx.stroke(); }
      if (id === region || (S >= 120 * (this.holo.width / (this._holoCss || this.holo.width)) && planet === 'twinsun')) { ctx.fillStyle = '#e8fbff'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3; const ly = p[1] + (PLANET_POS[id][1] < 0 ? -10 : 11); const tx = t(SHORT_NAME(id)); ctx.strokeText(tx, p[0], ly); ctx.fillText(tx, p[0], ly); }
    }
    ctx.fillStyle = '#f0c040'; ctx.font = `700 ${fs + 2}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillText(t('map_' + planet).toUpperCase(), 8, 12);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // Holomap labels, drawn after every marker and placed so that none overprints another label, a marker or a corner
  // panel (two places close together read "ToThe wellre" when both were centred above their points; VP-6). The
  // objective's star chooses first, then the main places, then the rest; each label tries above its marker, then
  // below, right, left, then further out, kept inside the map; a label that finds no free spot is left out rather
  // than drawn over another (a star's always shows). The font reads at about 13 px on screen however large the
  // canvas is (sc: canvas px per CSS px; × 1.2 with large text).
  _placeLabels(ctx, pts, W, H, rects, sc) {
    const fs = Math.round(Math.max(12, 13 * sc));
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const blocks = pts.map((o) => ({ x: o.x - o.r - 1, y: o.y - o.r - 1, w: 2 * o.r + 2, h: 2 * o.r + 2 })).concat(rects);
    const placed = [], seen = new Set();
    const order = pts.filter((o) => o.m.label).sort((a, b) => (a.prio ?? 3) - (b.prio ?? 3));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const o of order) {
      const text = o.m.label;
      if (seen.has(text)) continue;
      seen.add(text);
      const f = o.prio <= 1 ? Math.round(fs * 1.08) : fs;
      ctx.font = `${o.prio <= 1 ? 700 : 600} ${f}px Rubik, system-ui, sans-serif`;
      const w = ctx.measureText(text).width + 8 * sc, h = f + 4 * sc, gx = o.r + 4 * sc + w / 2, gy = o.r + 3 * sc + h / 2;
      const tries = [[0, -gy], [0, gy], [gx, 0], [-gx, 0], [gx, -h], [-gx, -h], [gx, h], [-gx, h], [0, -gy - h], [0, gy + h]];
      let at = null;
      for (const [dx, dy] of tries) {
        const cx = Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, o.x + dx)), cy = Math.min(H - h / 2 - 2, Math.max(h / 2 + 2, o.y + dy));
        const b = { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
        if (!placed.some((p) => hit(p, b)) && !blocks.some((p) => hit(p, b))) { at = b; break; }
      }
      if (!at) {
        if (o.m.kind !== 'star') continue;
        const cx = Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, o.x)), cy = Math.min(H - h / 2 - 2, Math.max(h / 2 + 2, o.y - gy));
        at = { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
      }
      placed.push(at);
      ctx.fillStyle = o.m.kind === 'star' ? '#ffe35a' : '#f2fcff'; ctx.strokeStyle = 'rgba(0,10,20,0.88)'; ctx.lineWidth = 4 * sc; ctx.lineJoin = 'round';
      ctx.strokeText(text, at.cx, at.cy); ctx.fillText(text, at.cx, at.cy);
      at.text = text; at.font = f;
    }
    ctx.textBaseline = 'alphabetic';
    return placed;
  }
}
