/* המשמרת — HTML layer: HUD, message box (dialogue / battle commands), panels, toasts. */
'use strict';
const $ = id => document.getElementById(id);

const UI = {
  active: null,          // the current say/ask request
  typing: null,

  /* ---------- message box ---------- */
  box() { return $('msg'); },
  mode(m) { const b = this.box(); b.classList.toggle('battle', m === 'battle'); },
  _type(el, text, done) {
    clearInterval(this.typing && this.typing.timer);
    const speed = S.settings.textSpeed == null ? 1 : S.settings.textSpeed;
    const chars = Array.from(text);
    $('msg-sr').textContent = text;
    if (!speed || reduceFx()) { el.textContent = text; this.typing = null; done && done(); return; }
    let i = 0; el.textContent = '';
    const step = speed === 1 ? 2 : 1;
    this.typing = { finish: () => { clearInterval(this.typing.timer); el.textContent = text; this.typing = null; done && done(); } };
    this.typing.timer = setInterval(() => {
      i = Math.min(chars.length, i + step); el.textContent = chars.slice(0, i).join('');
      if (i % 6 === 0) Sound.talk();
      if (i >= chars.length) this.typing.finish();
    }, speed === 1 ? 14 : 26);
  },
  _open(name, text, extra) {
    const b = this.box();
    b.classList.add('show');
    $('msg-name').textContent = name || '';
    $('msg-name').style.display = name ? '' : 'none';
    $('msg-extra').innerHTML = extra || '';
    $('msg-opts').innerHTML = '';
    $('msg-opts').className = '';
    b.classList.remove('has-opts', 'tall');
    if (this.stripe) b.style.setProperty('--stripe', this.stripe);
    this._type($('msg-text'), text || '');
  },
  hide() { this.box().classList.remove('show', 'has-opts', 'tall'); this.active = null; },

  say(text, o) {
    o = o || {};
    return new Promise(res => {
      this._open(o.name, text, o.extra);
      $('msg-text').style.display = '';
      this.box().classList.toggle('tall', !!o.tall);
      $('msg-next').style.display = '';
      this.active = { kind: 'say', res, auto: o.auto };
      if (o.auto) setTimeout(() => { if (this.active && this.active.res === res) this.advance(); }, o.auto);
    });
  },
  advance() {
    const a = this.active; if (!a) return;
    if (this.typing) { this.typing.finish(); return; }
    if (a.kind === 'say') { this.active = null; Sound.blip(); a.res(); }
  },

  /* options: [{label, sub, icon, disabled, mark, cls}]; o.grid → command grid; o.cancel → B returns -1 */
  ask(text, options, o) {
    o = o || {};
    return new Promise(res => {
      this._open(o.name, text, o.extra);
      $('msg-text').style.display = text ? '' : 'none';
      const b = this.box(), wrap = $('msg-opts');
      b.classList.add('has-opts'); b.classList.toggle('tall', !!o.tall);
      wrap.className = o.grid ? 'grid' : 'list' + (o.two ? ' two' : '');
      $('msg-next').style.display = 'none';
      let html = '';
      if (o.conf) html += '<div class="conf-row" role="group" aria-label="רמת ביטחון"><span class="conf-l">ביטחון:</span>' + [['guess', '🤔 ניחוש'], ['maybe', '🙂 סביר'], ['sure', '😎 בטוח/ה']].map(([k, l]) => `<button type="button" class="conf${k === o.conf.value ? ' on' : ''}" data-conf="${k}">${l}</button>`).join('') + '<small class="conf-n">בטוח/ה ונכון = פגיעה חזקה · בטוח/ה וטועה = נזק גדול יותר</small></div>';
      html += options.map((op, i) => `<button type="button" class="opt ${op.cls || ''}${op.disabled ? ' dis' : ''}" data-i="${i}" ${op.disabled ? 'aria-disabled="true"' : ''} style="${op.tint ? '--tint:' + op.tint : ''}">
        ${op.icon ? `<span class="o-ico">${op.icon}</span>` : ''}<span class="o-txt"><b>${esc(op.label)}</b>${op.sub ? `<small>${op.sub}</small>` : ''}</span>${op.mark ? `<span class="o-mark">${op.mark}</span>` : ''}</button>`).join('');
      if (o.cancel) html += `<button type="button" class="opt back" data-i="-1"><span class="o-txt"><b>↩ חזרה</b></span></button>`;
      wrap.innerHTML = html;
      const btns = [...wrap.querySelectorAll('.opt')];
      const a = this.active = { kind: 'ask', res, btns, sel: Math.max(0, btns.findIndex(x => !x.classList.contains('dis'))), cancel: !!o.cancel, grid: !!o.grid, two: !!o.two && innerWidth >= 600, conf: o.conf };
      wrap.querySelectorAll('[data-conf]').forEach(cb => cb.onclick = () => { o.conf.value = cb.dataset.conf; wrap.querySelectorAll('[data-conf]').forEach(x => x.classList.toggle('on', x === cb)); Sound.blip(); });
      btns.forEach((bt, k) => {
        bt.onclick = ev => { ev.stopPropagation(); a.sel = k; this.choose(); };
        bt.onpointerenter = () => { if (matchMedia('(hover:hover)').matches) { a.sel = k; this.paint(); } };
      });
      this.paint();
    });
  },
  paint() {
    const a = this.active; if (!a || a.kind !== 'ask') return;
    a.btns.forEach((b, k) => b.classList.toggle('sel', k === a.sel));
    const s = a.btns[a.sel]; if (s && document.activeElement !== s && S.padUsed) s.focus({ preventScroll: true });
    if (s) s.scrollIntoView({ block: 'nearest' });
  },
  choose() {
    const a = this.active; if (!a || a.kind !== 'ask') return;
    if (this.typing) this.typing.finish();
    const b = a.btns[a.sel]; if (!b) return;
    if (b.classList.contains('dis')) { Sound.back(); return; }
    const i = +b.dataset.i;
    this.active = null; i < 0 ? Sound.back() : Sound.select();
    a.res(i);
  },
  move(d) {
    const a = this.active; if (!a || a.kind !== 'ask') return;
    const n = a.btns.length; let k = a.sel;
    const wide = a.grid || a.two, cols = wide ? 2 : 1;
    const cycleConf = step => { const order = ['guess', 'maybe', 'sure']; a.conf.value = order[(order.indexOf(a.conf.value) + step + 3) % 3]; this.box().querySelectorAll('[data-conf]').forEach(x => x.classList.toggle('on', x.dataset.conf === a.conf.value)); Sound.blip(); };
    if (a.two && a.conf && d === 'up' && a.sel < 2) return cycleConf(1);   // above the top row sits the confidence picker
    const delta = d === 'up' ? -cols : d === 'down' ? cols : d === 'left' ? (wide ? 1 : 0) : d === 'right' ? (wide ? -1 : 0) : 0;
    if (!delta) { if (a.conf && (d === 'left' || d === 'right')) { const order = ['guess', 'maybe', 'sure']; let ci = order.indexOf(a.conf.value) + (d === 'left' ? 1 : -1); ci = clamp(ci, 0, 2); a.conf.value = order[ci]; this.box().querySelectorAll('[data-conf]').forEach(x => x.classList.toggle('on', x.dataset.conf === a.conf.value)); Sound.blip(); } return; }
    for (let tries = 0; tries < n; tries++) { k = (k + delta + n) % n; if (!a.btns[k].classList.contains('dis')) break; }
    a.sel = k; Sound.blip(); this.paint();
  },
  // Visual result on the list after a decision (kept short; no extra tap).
  async mark(i, ok, correctIdx) {
    const wrap = $('msg-opts'), btns = [...wrap.querySelectorAll('.opt')];
    btns.forEach(b => b.classList.add('locked'));
    if (btns[i]) btns[i].classList.add(ok ? 'right' : 'wrong');
    if (ok == null && correctIdx != null && btns[correctIdx]) btns[correctIdx].classList.add('right');
    this.box().classList.add('show', 'has-opts');
    await sleep(reduceFx() ? 250 : 650);
  },
  handle(act) {
    const a = this.active;
    if (!a) return false;
    if (act === 'a') { a.kind === 'say' ? this.advance() : this.choose(); return true; }
    if (act === 'b') {
      if (a.kind === 'say') { this.advance(); return true; }
      if (a.cancel) { a.sel = a.btns.length - 1; this.choose(); }
      return true;
    }
    if (['up', 'down', 'left', 'right'].includes(act)) { this.move(act); return true; }
    return true;
  },

  /* ---------- HUD ---------- */
  hud() {
    if (!S.player) return;
    $('ui-name').textContent = S.player.name;
    $('ui-lvl').textContent = levelOf(S.xp);
    $('ui-day').textContent = S.shift;
    $('ui-coins').textContent = '🪙 ' + S.coins;
    $('ui-streak').textContent = '🔥 ' + (S.streak || 0);
    const L = levelOf(S.xp), a = xpFor(L), b = xpFor(L + 1);
    $('ui-xp-fill').style.width = clamp((S.xp - a) / (b - a), 0, 1) * 100 + '%';
    $('ui-badges').innerHTML = ACTS.map((A, i) => `<i class="${S.badges.includes(i) ? 'on' : ''}" title="${A.badgeName}">${A.badge}</i>`).join('');
  },
  quest(text) { $('quest-text').textContent = text || ''; $('quest-box').style.display = text ? '' : 'none'; },
  location(name, sub) {
    const el = $('loc-label'); $('loc-name').textContent = name; $('loc-sub').textContent = sub || '';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  saveMark() { const m = $('save-mark'); m.style.opacity = 1; setTimeout(() => m.style.opacity = 0, 900); },

  toast(icon, title, sub, mini) {
    const t = $('ach-toast');
    t.className = mini ? 'mini' : '';
    t.innerHTML = `<span class="ach-ico">${icon}</span><span><small>${mini ? '' : 'הישג'}</small><b>${esc(title)}</b>${sub ? `<em>${esc(sub)}</em>` : ''}</span>`;
    void t.offsetWidth; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 2600);
  },
};

/* ---------- panels (the reference's window language: header ✕, dimmed world) ---------- */
const Panel = {
  stack: [],
  open(title, html, o) {
    o = o || {};
    const p = $('panel');
    $('panel-title').innerHTML = title;
    $('panel-body').innerHTML = html;
    p.className = 'panel' + (o.cls ? ' ' + o.cls : '');
    p.style.display = 'flex';
    document.body.classList.add('panel-open');
    this.onClose = o.onClose || null;
    this.isOpen = true;
    $('panel-x').style.display = o.noClose ? 'none' : '';
    this.noClose = !!o.noClose;
    $('panel-body').scrollTop = 0;
    if (o.bind) o.bind($('panel-body'));
    setTimeout(() => { const f = p.querySelector('[autofocus]') || (S.padUsed ? p.querySelector('button:not([disabled])') : null); if (f) f.focus({ preventScroll: true }); }, 30);
    Sound.select();
  },
  close(silent) {
    if (!this.isOpen) return;
    if (document.activeElement && $('panel').contains(document.activeElement)) document.activeElement.blur();
    $('panel').style.display = 'none';
    document.body.classList.remove('panel-open');
    this.isOpen = false;
    const cb = this.onClose; this.onClose = null;
    if (!silent) Sound.back();
    if (cb) cb();
  },
  handle(act) {
    if (!this.isOpen) return false;
    const p = $('panel');
    const btns = [...p.querySelectorAll('button:not([disabled]),input,select')].filter(b => b.offsetParent);
    let k = btns.indexOf(document.activeElement);
    if (act === 'b') { if (!this.noClose) this.close(); return true; }
    if (act === 'menu') { if (!this.noClose) this.close(); return true; }
    if (act === 'a') { if (k >= 0) btns[k].click(); else if (btns[0]) btns[0].focus(); return true; }
    if (['up', 'down', 'left', 'right'].includes(act)) {
      S.padUsed = true;
      if (!btns.length) { $('panel-body').scrollTop += act === 'down' ? 60 : act === 'up' ? -60 : 0; return true; }
      k = k < 0 ? 0 : (k + (act === 'down' || act === 'left' ? 1 : -1) + btns.length) % btns.length;
      btns[k].focus(); btns[k].scrollIntoView({ block: 'nearest' }); Sound.blip();
      return true;
    }
    return true;
  },
};

// A tap anywhere on the message box advances plain dialogue.
document.addEventListener('DOMContentLoaded', () => {
  $('msg').addEventListener('click', e => { if (UI.active && UI.active.kind === 'say') UI.advance(); else if (UI.typing) UI.typing.finish(); });
  $('panel-x').onclick = () => Panel.close();
  $('scrim').onclick = () => { if (!Panel.noClose) Panel.close(); };
});
