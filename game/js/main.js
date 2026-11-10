/* המשמרת — game director: state, progression, NPCs, menus, title, loop. */
'use strict';

const SAVE_KEY = 'hamishmeret_save_v1';
const levelOf = xp => 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 30));
const xpFor = L => 30 * (L - 1) * (L - 1);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function freshState() {
  return { v: 1, player: null, difficulty: 'normal', map: 0, x: 5, y: 5, dir: 'up', xp: 0, coins: 30, shift: 1, streak: 0, lastDay: '',
    badges: [], labBadge: false, episodes: {}, labRounds: {}, dex: {}, inv: { coffee: 0, calm: 1, torch: 0, guide: 0, shield: 0 },
    domains: {}, calib: {}, flags: {}, trainers: {}, visited: {}, daily: null, shiftLog: { eps: 0, xp: 0 },
    know: {}, team: [], found: {}, hazards: {}, council: 0, councilHP: 100, rival: 0, stats: { steps: 0, codes: 0 }, settings: { guide: true, sound: true, musicVol: .6, sfxVol: .8, textSpeed: 1, reduceFx: false, hc: false, zoom: 1, haptics: true, pager: true, autoRun: false } };
}
let S = freshState();
window.S = S;

const Game = {
  state: 'BOOT', busy: false, trans: null, titleT: 0, cut: null,

  /* ---------- save ---------- */
  save() { try { S.x = hero.x; S.y = hero.y; S.dir = hero.dir; localStorage.setItem(SAVE_KEY, JSON.stringify(S)); UI.saveMark(); } catch (e) {} },
  readSave() { try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const d = JSON.parse(raw); return d && d.player ? d : null; } catch (e) { return null; } },
  adopt(d) {
    const base = freshState();
    S = Object.assign(base, d); S.settings = Object.assign(base.settings, d.settings || {}); S.inv = Object.assign(base.inv, d.inv || {}); S.stats = Object.assign(base.stats, d.stats || {});
    window.S = S; applySettings();
  },

  /* ---------- progression ---------- */
  tutorialDone() { return !!S.flags.tutorial; },
  unlockedAct() { return Math.min(S.badges.length, ACTS.length - 1); },
  bossAct() { for (let i = 0; i < ACTS.length; i++) if (!S.badges.includes(i)) return i; return ACTS.length - 1; },
  actEps(a) { return C.episodes.filter(e => e.a === a); },
  actProgress(a) { const eps = this.actEps(a); return { done: eps.filter(e => S.episodes[e.id]).length, total: eps.length, need: Math.ceil(eps.length * BOSS_NEED) }; },
  bossReady() { if (S.badges.length >= ACTS.length) return true; const p = this.actProgress(this.bossAct()); return this.tutorialDone() && p.done >= p.need; },
  availableEpisode(pid) {
    if (!this.tutorialDone()) return null;
    const u = this.unlockedAct();
    return C.episodes.filter(e => e.p === pid && e.a <= u && !S.episodes[e.id]).sort((a, b) => a.a - b.a)[0] || null;
  },
  npcBubble(n) {
    if (n.id === 'rivka') return !this.tutorialDone() ? '!' : null;
    if (n.id === 'leader') return this.bossReady() && !S.badges.includes(this.bossAct()) ? '!' : null;
    if (n.id === 'tal') return this.tutorialDone() && Object.keys(S.labRounds).length < C.labRounds.length ? '?' : null;
    if (TEAM[n.id]) return this.tutorialDone() && !(S.team || []).some(m => m.id === n.id) ? '?' : null;
    if (n.id === 'michal') return Object.keys(S.hazards || {}).length < 5 ? '!' : null;
    if (n.id === 'rachel') return !S.flags.teachback ? '!' : null;
    if (/^judge|^champion/.test(n.id)) { const i = n.id === 'champion' ? 4 : +n.id.slice(5); return (S.council || 0) === i ? '!' : null; }
        return null;
  },
  questText() {
    const f = S.flags;
    if (!f.tutorial) {
      const n = ['locker', 'board', 'coffee'].filter(k => f['intro_' + k]).length;
      return n < 3 ? `התכונן/י למשמרת: לוקר, לוח משמרת וקפה (${n}/3)` : 'צא/י למסדרון ודבר/י עם רבקה בעמדת האחיות';
    }
    const u = this.unlockedAct();
    const names = Object.keys(C.patients).filter(p => this.availableEpisode(p)).map(p => C.patients[p].n.split(',')[0]);
    const bossA = this.bossAct(), pr = this.actProgress(bossA);
    if (S.badges.length < ACTS.length && pr.done >= pr.need && !S.badges.includes(bossA)) {
      const extra = names.length ? ` · או עוד מטופלים (${names.slice(0, 2).join(', ')})` : '';
      return `${ACTS[bossA].badge} הביקור הגדול מחכה בחדר הישיבות — ${ACTS[bossA].leader}${extra}`;
    }
    if (names.length) return `פרק ${u + 1} · ${ACTS[u].name}: בקר/י את ${names.slice(0, 3).join(', ')} (${pr.done}/${pr.need} לביקור הגדול)`;
    if (S.badges.length >= ACTS.length) return S.flags.champion ? '🏆 אלוף/ת המועצה! משמרות חופשיות, מעבדון וצוות מלא' : '🏆 שבעה תגים! מועצת המומחים מחכה — הדלת המזרחית במבואה';
    return 'דבר/י עם רבקה — היא תכוון אותך';
  },
  refresh() { UI.hud(); UI.quest(this.state === 'OVERWORLD' || this.state === 'BATTLE' ? this.questText() : ''); },

  /* ---------- flow helpers ---------- */
  async run(fn) {
    if (this.busy) return;
    this.busy = true;
    try { await fn(); } catch (e) { console.error(e); }
    finally { this.busy = false; if (this.state === 'OVERWORLD') UI.hide(); this.refresh(); }
  },
  cover(kind) { return new Promise(res => { this.trans = { kind, phase: 'out', t: 0, dur: kind === 'fade' ? 260 : kind === 'boss' ? 1000 : 760, res }; }); },
  uncover() { if (this.trans) { this.trans = { kind: this.trans.kind, phase: 'in', t: 0, dur: 320 }; } },
  async transition(kind) { await this.cover(kind); },
  async goTo(mi, x, y, dir) {
    this.busy = true; await this.cover('fade');
    if (MAPS[mi].id === 'council' && MAPS[S.map].id !== 'council') { S.council = 0; S.councilHP = 100; }   // the council restarts every visit
    loadMap(mi, x, y, dir); this.save();
    this.uncover(); this.busy = false;
    this.roomIntro();
    setTimeout(() => this.checkRival(), 700);
  },
  async checkRival() {
    const id = MAPS[S.map].id, n = S.rival || 0, b = S.badges.length;
    const due = (n === 0 && id === 'lobby' && this.tutorialDone()) || (n === 1 && id === 'street' && b >= 3) || (n === 2 && id === 'lobby' && b >= ACTS.length);
    if (!due || this.busy || UI.active || Panel.isOpen || this.state !== 'OVERWORLD') return;
    await this.run(async () => {
      const L = RIVAL_LINES[n], info = NPC_INFO.ido;
      const spot = [[hero.x + 2, hero.y], [hero.x - 2, hero.y], [hero.x, hero.y + 2], [hero.x, hero.y - 2]].find(([x, y]) => !blocked(x, y) && !blocked((x + hero.x) / 2, (y + hero.y) / 2)) || [hero.x + 1, hero.y];
      const r = { id: 'ido', x: spot[0], y: spot[1], dir: 'down', name: info.name, role: info.role, look: info.look, px: spot[0] * TILE + TILE / 2, py: spot[1] * TILE + TILE, bubble: '!', seed: 2 };
      npcs.push(r); Sound.encounter(); await sleep(700); r.bubble = null;
      const dx = Math.sign(hero.x - r.x), dy = Math.sign(hero.y - r.y);
      if (Math.abs(hero.x - r.x) + Math.abs(hero.y - r.y) > 1) { r.move = { fx: r.x, fy: r.y, tx: r.x + dx, ty: r.y + dy, t: 0, dur: 220 }; r.x += dx; r.y += dy; await sleep(240); }
      r.dir = Object.keys(DIRS).find(d => DIRS[d][0] === Math.sign(hero.x - r.x) && DIRS[d][1] === Math.sign(hero.y - r.y)) || 'down';
      hero.dir = Object.keys(DIRS).find(d => DIRS[d][0] === -Math.sign(hero.x - r.x) && DIRS[d][1] === -Math.sign(hero.y - r.y)) || hero.dir;
      await UI.say('עידו: “' + L.intro + '”', { name: 'עידו · היריב/ה שלך' });
      const res = await panelBattle({ enemy: { name: 'עידו', person: 'ido', type: 'meds', sub: 'אח חדש · היריב' }, scene: MAPS[S.map].floor === 'grass' ? 'street' : 'hall', need: 3, loss: 30, music: 'battle',
        intro: 'שלושה מקרים. מי שמשכנע ראשון — מנצח.', qs: Core.questions(null, 8, this.unlockedAct()) });
      S.rival = n + 1;
      await UI.say('עידו: “' + (res.result === 'win' ? L.win : L.lose) + '”', { name: 'עידו' });
      if (res.result === 'win') await this.reward(60 + n * 30, 25 + n * 10);
      npcs = npcs.filter(x => x !== r); this.save();
    });
  },
  /* Where the story wants you next — the tile in this map to walk to (a person, a bed, or the door that leads there). */
  guideTarget() {
    if (!S.settings.guide) return null;
    if (this._gt && clock - this._gt.t < 500 && this._gt.map === S.map) return this._gt.v;
    const findNpc = id => { for (let i = 0; i < MAPS.length; i++) { const n = (MAPS[i].npcs || []).find(q => q.id === id); if (n) return { map: i, x: n.x, y: n.y }; } return null; };
    let goal = null;
    if (!this.tutorialDone()) goal = findNpc('rivka');
    else if (S.badges.length < ACTS.length && this.bossReady()) goal = findNpc('leader');
    else {
      const p = Object.keys(PATIENT_ROOM).find(q => this.availableEpisode(q));
      if (p) { const mi = PATIENT_ROOM[p] + 1, k = Object.keys(MAPS[mi].beds).find(q => MAPS[mi].beds[q] === p), xy = k.split(',').map(Number); goal = { map: mi, x: xy[0], y: xy[1] }; }
      else if (S.badges.length >= ACTS.length && !S.flags.champion) goal = findNpc('judge' + Math.min(3, S.council || 0)) || null;
    }
    let v = null;
    if (goal && goal.map === S.map) v = { x: goal.x, y: goal.y };
    else if (goal) {   // breadth-first over the doors: which door of this map starts the shortest way there?
      const seen = { [S.map]: 1 }, q = Object.keys(MAPS[S.map].doors || {}).map(k => ({ m: MAPS[S.map].doors[k].to, first: k }));
      while (q.length && !v) { const c = q.shift(); if (seen[c.m]) continue; seen[c.m] = 1;
        if (c.m === goal.map) { const xy = c.first.split(',').map(Number); v = { x: xy[0], y: xy[1], door: true }; }
        else Object.keys(MAPS[c.m].doors || {}).forEach(k => q.push({ m: MAPS[c.m].doors[k].to, first: c.first })); }
    }
    this._gt = { t: clock, map: S.map, v };
    return v;
  },
  async lockedDoor(door) {
    if (this.busy) return;
    this.run(() => UI.say(door.elite ? '🔒 גיל, שומר המועצה: “מועצת המומחים מקבלת רק מי שאסף/ה את שבעת התגים. יש לך ' + S.badges.length + '/7.”'
      : '🔒 ' + (door.needBadges === 1 ? 'היציאה לקהילה נפתחת אחרי התג הראשון — קודם מכירים את המחלקה.' : 'ביקור הבית הזה נפתח אחרי ' + door.needBadges + ' תגים (יש לך ' + S.badges.length + ').')));
  },
  async findHidden(x, y, item) {
    S.found[S.map + ':' + x + ',' + y] = 1; S.inv[item] = (S.inv[item] || 0) + 1; this.save();
    Sound.coin(); addParticles(x * TILE + 20 - cam.x, y * TILE + 20 - cam.y, 14, { color: ['#fde047', '#ffffff'], speed: 90, star: true });
    await UI.say('✨ מצאת משהו מוסתר: ' + ITEMS[item].icon + ' ' + ITEMS[item].name + '! (' + ITEMS[item].desc + ')');
  },
  roomIntro() {
    const id = MAPS[S.map].id, kind = id.startsWith('room') ? 'room1' : id, key = 'room_' + kind;
    if (!ROOM_INTRO[kind] || S.flags[key] || (kind === 'staff' && !this.tutorialDone())) return;
    setTimeout(() => {
      if (this.busy || UI.active || Panel.isOpen || this.state !== 'OVERWORLD') return;   // try again on the next visit
      this.run(async () => { S.flags[key] = 1; await UI.say('📍 ' + ROOM_INTRO[kind], { name: MAPS[S.map].name }); });
    }, 600);
  },

  /* ---------- rewards & records ---------- */
  async reward(xp, coins) {
    const before = levelOf(S.xp);
    S.xp += xp; S.coins += coins; S.shiftLog.xp += xp;
    if (xp) addFloater(hero.px - cam.x, hero.py - cam.y - 60, '+' + xp + ' XP', { color: '#fde68a', size: 17 });
    if (coins) Sound.coin();
    const after = levelOf(S.xp);
    if (after > before) { Sound.levelUp(); screenFlash('#fde68a', 200); UI.toast('⬆️', 'עלית לרמה ' + after + '!', titleFor(after)); }
    this.save(); this.refresh();
  },
  recordEpisode(ep, stars, B) {
    const r = S.episodes[ep.id];
    const first = !r;
    S.episodes[ep.id] = { stars: Math.max(stars, r ? r.stars : 0), plays: (r ? r.plays : 0) + 1, last: S.shift };
    S.shiftLog.eps++;
    this.markLabsSeen(ep.v.join(' ') + ' ' + ep.c.map(c => c[0] + ' ' + c[1]).join(' '));
    this.dailyTick(first ? 'new' : 'review');
    this.save();
  },
  markLabsSeen(text) {
    const T = ' ' + String(text).toUpperCase() + ' ';
    C.labs.forEach(l => { const en = l.en.toUpperCase().split(/[\s/(]/)[0]; if (en.length >= 2 && new RegExp('[^A-Z0-9]' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^A-Z0-9]').test(T) && !S.dex[l.id]) S.dex[l.id] = 1; });
  },
  async awardBadge(act) {
    if (!S.badges.includes(act)) S.badges.push(act);
    S.badges.sort((a, b) => a - b);
    await this.reward(150, 40);
    const A = ACTS[act], next = ACTS[act + 1];
    UI.toast(A.badge, A.badgeName, 'ביקור גדול: ' + A.leader);
    const all = S.badges.length >= ACTS.length;
    await new Promise(res => Panel.open('🏅 תג חדש', `
      <div class="badge-hero"><div class="badge-big">${A.badge}</div><div><b>${A.badgeName}</b><small>${esc(A.name)} — ${esc(A.leader)}, ${esc(A.role)}</small></div></div>
      ${next && !all ? `<div class="menu-context"><small>נפתח פרק חדש</small><div>פרק ${act + 2}: <b>${esc(next.name)}</b> — ${this.actEps(act + 1).length} אירועים חדשים אצל המטופלים. סימני ❗ יראו לך לאן ללכת.</div></div>` : ''}
      <div class="badge-row big">${ACTS.map((B, i) => `<i class="${S.badges.includes(i) ? 'on' : ''}">${B.badge}</i>`).join('')}</div>
      <button class="btn-main" data-act="ok">${all ? 'לתעודה 🎓' : 'ממשיכים ←'}</button>`, { onClose: res, bind: el => el.querySelector('[data-act=ok]').onclick = () => Panel.close() }));
    if (all && !S.flags.finale) { S.flags.finale = true; this.save(); await this.certificate(); }
    else if (next) await chapterCard(act + 1);
    loadMap(S.map, hero.x, hero.y, hero.dir);
  },
  certificate() {
    const eps = Object.keys(S.episodes).length;
    return new Promise(res => Panel.open('🎓 תעודת סיום', `
      <div class="cert"><small>המחלקה הגריאטרית · משמרת ${S.shift}</small><h2>${esc(S.player.name)}</h2>
      <p>השלים/ה את שבעת הביקורים הגדולים והוכיח/ה חשיבה קלינית ברמת <b>אח/ות מומחה/ית קליני/ת בגריאטריה</b>: לשים לב, לפרש, לפעול ולהעריך מחדש — ליד המיטה.</p>
      <div class="badge-row big">${ACTS.map(A => `<i class="on">${A.badge}</i>`).join('')}</div>
      <small>${eps}/${C.episodes.length} אירועים · רמה ${levelOf(S.xp)} · ${Object.values(S.dex).filter(v => v === 2).length}/${C.labs.length} במעבדון</small></div>
      <p class="muted">המשחק ממשיך: משמרות חופשיות, שיפור כוכבים, סבבי מעבדה ומעבדון.</p>
      <button class="btn-main" data-act="ok">חזרה למחלקה</button>`, { onClose: res, bind: el => el.querySelector('[data-act=ok]').onclick = () => Panel.close() }));
  },

  /* Debrief after an episode: answers, pearl, risk and an SBAR handover. */
  debrief(ep, r) {
    const pt = C.patients[ep.p];
    const stars = r.win ? '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars) : '🚨';
    const crit = ep.c.filter(c => c[2] === 2);
    const html = `
      <div class="db-top ${r.win ? 'win' : 'lose'}"><div class="db-stars">${stars}</div><div><b>${esc(ep.t)}</b><small>${esc(pt.n)} · ${esc(ACTS[ep.a].name)}${r.win ? ` · +${r.xp} XP · +${r.coins} 🪙` : ' · קוד — נלמד מזה'}</small></div></div>
      ${r.win ? `<div class="story-next"><b>📖 המשך הסיפור</b>${esc(ep.r[ep.rc])}.${(() => { const nx = this.availableEpisode(ep.p); return nx ? ` <span>הבא אצל ${esc(pt.n.split(',')[0])}: “${esc(nx.t)}”.</span>` : ''; })()}<span class="jr">${journeyLine()}</span></div>` : ''}
      <div class="pl-row"><small>תחומי ליבה:</small>${Core.chips(ep)}</div>
      <div class="pg-section">ארבע ההחלטות</div>
      ${STAGES.map(st => `<div class="db-row"><span>${st.name}</span><b>${esc(ep[st.key][ep[st.ck]])}</b></div>`).join('')}
      <div class="pg-section">★ ממצאים קריטיים</div>
      <div class="chips">${crit.map(c => `<span class="r2">${esc(c[0])}: ${esc(c[1])}</span>`).join('')}</div>
      ${EP_EVIDENCE[ep.id] ? `<div class="journal-entry evid"><b>📚 מה אומרות ההנחיות</b>${esc(EP_EVIDENCE[ep.id].k)}<div class="srcs">${srcLinks(EP_EVIDENCE[ep.id].s)}</div></div>` : ''}
      <div class="journal-entry"><b>💡 פנינה קלינית</b>${esc(ep.pe)}</div>
      <div class="journal-entry warn"><b>⚠️ מה היה קורה אם מפספסים</b>${esc(ep.risk)}</div>
      <div class="journal-entry sbar"><b>📝 מסירה (SBAR)</b>
        <div><i>S</i> ${esc(ep.t)} — ${esc(ep.st)}</div><div><i>B</i> ${esc(pt.s)}</div>
        <div><i>A</i> ${esc(ep.q[ep.qc])}</div><div><i>R</i> ${esc(ep.x[ep.xc])} · מעקב: ${esc(ep.r[ep.rc])}</div></div>
      <div class="db-btns">${r.win ? '' : '<button class="btn-main" data-act="retry">🔁 לנסות שוב</button>'}<button class="${r.win ? 'btn-main' : 'system-btn'}" data-act="ok">${r.win ? 'ממשיכים ←' : 'אחר כך'}</button></div>`;
    return new Promise(res => {
      let retry = false;
      Panel.open('סיכום אירוע', html, { cls: 'wide', onClose: () => res(retry ? episodeBattle(ep) : null), bind: el => {
        el.querySelector('[data-act=ok]').onclick = () => Panel.close();
        const rb = el.querySelector('[data-act=retry]'); if (rb) rb.onclick = () => { retry = true; Panel.close(); };
      } });
    });
  },

  /* ---------- shift tasks (daily) ---------- */
  makeDaily() {
    const done = Object.keys(S.episodes);
    const tasks = [{ kind: 'new', label: 'לטפל באירוע חדש אצל מטופל/ת' }];
    tasks.push(done.length ? { kind: 'review', label: 'סימולציה חוזרת לאירוע (בעמדת האחיות או ליד המיטה)' } : { kind: 'new', label: 'לטפל באירוע חדש נוסף' });
    tasks.push(Math.random() < .5 ? { kind: 'lab', label: 'לפתור סבב מעבדה קריטי אצל טל' } : { kind: 'dex', label: 'לזהות בדיקה חדשה במעבדון' });
    S.daily = { shift: S.shift, tasks: tasks.map(t => Object.assign(t, { done: false })), paid: false };
  },
  dailyTick(kind) {
    if (!S.daily || S.daily.shift !== S.shift) this.makeDaily();
    const t = S.daily.tasks.find(x => !x.done && x.kind === kind);
    if (!t) return;
    t.done = true;
    UI.toast('📋', 'משימת משמרת הושלמה', t.label, true);
    if (S.daily.tasks.every(x => x.done) && !S.daily.paid) { S.daily.paid = true; S.xp += 40; S.coins += 20; setTimeout(() => { Sound.badge(); UI.toast('🌟', 'כל משימות המשמרת!', '+40 XP · +20 🪙'); this.refresh(); }, 2700); }
    this.save();
  },
  touchDay() {
    const d = today();
    if (S.lastDay === d) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    S.streak = S.lastDay === yd ? (S.streak || 0) + 1 : 1; S.lastDay = d;
  },

  /* ---------- NPCs ---------- */
  async talk(n) {
    const say = (t, o) => UI.say(t, Object.assign({ name: n.name + ' · ' + n.role }, o));
    if (n.id === 'rivka') {
      if (!this.tutorialDone()) return this.tutorial(n);
      const c = await UI.ask('רבקה: “מה צריך?”', [{ icon: '💬', label: 'עצה למשמרת', sub: 'לאן עכשיו?' }, { icon: '📋', label: 'משימות המשמרת' }, { icon: '🧭', label: 'איפה אני חלש/ה?', sub: 'לפי הביצועים שלך' }, { icon: '❓', label: 'איך זה עובד?' }, { icon: '🔬', label: 'על מה זה מבוסס?' }], { name: 'רבקה · האחות האחראית', cancel: true });
      if (c === 0) await say('“' + this.questText() + '.” ' + pick(COFFEE_PEARLS));
      if (c === 1) openDaily();
      if (c === 2) await say(weakAdvice());
      if (c === 3) await this.explainLoop(say);
      if (c === 4) openEvidence();
    } else if (n.id === 'shula') {
      openShop();
    } else if (n.id === 'tal') {
      if (!this.tutorialDone()) return say('“היי! אחרי המסירה של רבקה תבוא/י — יש לי פאנלים שמחכים.”');
      const solved = Object.keys(S.labRounds).length;
      const c = await UI.ask('טל: “המעבדה פתוחה. מה בא לך?”', [
        { icon: '🧪', label: 'סבב מעבדה קריטי', sub: `${solved}/${C.labRounds.length} נפתרו` },
        { icon: '🎯', label: 'זיהוי בדיקה למעבדון', sub: `${Object.values(S.dex).filter(v => v === 2).length}/${C.labs.length} זוהו` },
        { icon: '📖', label: 'לעיין במעבדון' }], { name: 'טל · המעבדה', cancel: true });
      if (c === 0) await chooseLabRound();
      if (c === 1) await dexQuiz();
      if (c === 2) openDex();
    } else if (n.id === 'omer') {
      const l = pick(C.labs);
      await say('“' + pick(['טיפ מהרוקחות: ', 'רגע לפני שאת/ה הולך/ת: ', 'משהו שאני רואה כל שבוע: ']) + l.name + ' (' + l.en + ') — ' + l.pit + '”');
      if (!S.dex[l.id]) S.dex[l.id] = 1;
    } else if (n.id === 'hana') {
      const lines = ['“אמא שלי אומרת שהיא בסדר, אבל היא לא אוכלת כמו פעם. זה חשוב?” — כן. שינוי מה-baseline הוא תמיד מידע.', '“בבית היא הייתה הולכת לבד. פה היא כל הזמן במיטה...” — מוביליזציה מוקדמת מונעת דקונדישנינג ודליריום.', '“הסבירו לי את התרופות כל כך מהר.” — Teach-back: לבקש להסביר במילים שלה. אם לא עבר — זה עלינו.', '“בלילה היא לא מזהה אותי, ביום כן.” — תנודתיות בהכרה היא סימן היכר של דליריום. לדווח.'];
      await say(pick(lines));
    } else if (n.trainer) {
      if (!this.tutorialDone()) return say('“אחרי המסירה — נדבר.”');
      if (S.trainers[n.id] === S.shift) return say(TRAINER_LINES[n.id].done);
      await quickBattle({ trainer: n }); S.trainers[n.id] = S.shift; this.save();
    } else if (TEAM[n.id]) {
      const T = TEAM[n.id], m = (S.team || []).find(x => x.id === n.id);
      if (!this.tutorialDone()) return say('“נדבר אחרי המסירה של רבקה.”');
      if (m) return say('“' + T.fact + '” — ' + T.icon + ' “' + T.move + '” · PP ' + m.pp + '/' + teamMax(m) + (m.evo ? ' · מומחה/ית ✨' : ' · קשר ' + (m.bond || 0) + '/4 להתפתחות'));
      if (n.id === 'omer') {
        const c = await UI.ask('עומר: “בית המרקחת פתוח. מה צריך?”', [{ icon: '🤝', label: 'להצטרף לצוות?', sub: 'מקרה אחד או שניים מהתחום שלו' }, { icon: '🛒', label: 'לקנות ציוד' }, { icon: '💊', label: 'טיפ תרופתי' }], { name: n.name + ' · ' + n.role, cancel: true });
        if (c === 1) return openShop();
        if (c === 2) return say('“' + T.fact + '”');
        if (c !== 0) return;
      } else {
        await say('“' + T.fact + '”');
        const c = await UI.ask('לגייס את ' + T.name + ' לצוות? (' + T.role + ' · ⚡ חזק/ה נגד ' + T.strong.map(t => TYPES[t].icon + ' ' + TYPES[t].name).join(', ') + ')', [{ icon: '🤝', label: 'כן — אני מוכן/ה למקרה מהתחום' }, { label: 'אחר כך' }], { name: T.name });
        if (c !== 0) return;
      }
      await recruitBattle(n.id);
    } else if (n.id === 'liat') {
      const c = await UI.ask('ליאת: “ברוך/ה הבא/ה למבואה! אפשר לתת לצוות שלך הפסקה קצרה.”', [{ icon: '🔄', label: 'מנוחה לצוות', sub: 'מחזיר את כל ה-PP' }, { icon: '🗺️', label: 'מה יש כאן?' }], { name: n.name + ' · ' + n.role, cancel: true });
      if (c === 0) { (S.team || []).forEach(m => { m.pp = teamMax(m); }); Sound.heal(); this.save(); await say('“הצוות שלך נח ומוכן! 💚” — ' + ((S.team || []).length ? S.team.map(m => TEAM[m.id].icon).join(' ') + ' מלאים.' : 'עוד אין לך צוות — אנשי המקצוע מחכים בשיקום, בבית המרקחת, כאן במבואה ובמחלקה.')); }
      if (c === 1) await say('“צפונה: מכון השיקום ובית המרקחת. דרומה: היציאה לקהילה וביקורי בית. מזרחה: מועצת המומחים — רק עם שבעה תגים.”');
    } else if (n.id === 'gil') {
      await say(S.badges.length >= ACTS.length ? '“שבעה תגים. המועצה מחכה. זכור/זכרי: ארבעה שופטים ויו״רית ברצף — הביטחון לא מתמלא בין הסבבים, אבל מותר להשתמש בציוד ובצוות.”' : '“המועצה פתוחה רק עם שבעה תגים. יש לך ' + S.badges.length + '. בהצלחה במחלקה!”');
    } else if (n.id === 'cohen') {
      await say(pick(['“אחרי השבר אמרו לי לנוח. הפיזיותרפיסטית אמרה דווקא לקום — וצדקה.”', '“אני עושה תרגילי שיווי משקל כל יום. אומרים שזה מוריד נפילות בכמעט רבע.”', '“הכי קשה זה לקום מהכיסא. מאיה בודקת לי את זה עם שעון — Timed Up and Go.”']));
    } else if (n.id === 'neighbor') {
      await say(pick(['“הבת שלי שמה לי פס מדבקה זוהר בדרך לשירותים. בלילה זה מציל.”', '“אמרו לי להוריד את השטיחים הקטנים. כמעט נפלתי על אחד בשבוע שעבר.”', '“אני יודעת בדיוק אילו כדורים אני לוקחת — יש לי דף אחד, מעודכן.”']));
    } else if (n.id === 'michal') {
      const k = Object.keys(S.hazards || {}).length;
      await say(k >= 5 ? '“הבית מוכן. תודה — אמא תחזור למקום בטוח יותר.”' : '“אמא חוזרת הביתה בקרוב, ואני מפחדת שתיפול. תעזור/י לי למצוא את מה שמסוכן? (' + k + '/5 — גש/י לחפצים בבית)”');
    } else if (n.id === 'rachel') {
      if (S.flags.teachback) return say('“אני יודעת בדיוק מה הוא לוקח ומתי. תודה שהסברת — ושביקשת שאסביר בחזרה.”');
      await say('“אברהם חוזר עם שלוש רשימות תרופות ואני מבולבלת. תסביר/י לי?” — זה הזמן ל-Teach-back: מסבירים, ואז מבקשים ממנה להסביר בחזרה.');
      const r = await panelBattle({ enemy: { name: 'רחל', person: 'rachel', type: 'goals', sub: 'מטפלת עיקרית' }, scene: 'home', need: 2, loss: 25,
        intro: 'בוא/י נעבור על זה יחד. אני רוצה להבין באמת.', qs: shuffle(C.episodes.filter(e => ['med-reconciliation', 'caregiver-capacity', 'discharge', 'goals-hf'].includes(e.id))).map((e, i) => ({ e, st: STAGES[(i + 1) % 4] })) });
      if (r.result === 'win') { S.flags.teachback = 1; Sound.badge(); await say('“עכשיו אני מבינה — ואני יכולה להסביר לבד.” 🎉 📚 Teach-back מאמת הבנה בפועל, לא חתימה על דף (AHRQ).'); await this.reward(80, 30); this.save(); }
    } else if (/^judge|^champion/.test(n.id)) {
      await this.councilTalk(n);
    } else if (n.id === 'leader') {
      const a = this.bossAct();
      if (S.badges.length >= ACTS.length) {
        const c = await UI.ask('פרופ׳ אלון: “כל התגים אצלך. רוצה ביקור חוזר על פרק?”', ACTS.map((A, i) => ({ icon: A.badge, label: A.name, sub: A.leader })), { cancel: true, name: 'ביקור חוזר' });
        if (c >= 0) await bossBattle(c);
        return;
      }
      const ok = await UI.ask(ACTS[a].leader + ': “ביקור רופאים גדול על ' + ACTS[a].name + '. 5 תשובות נכונות מנצחות; 3 טעויות — ונחזור לזה מחר. מוכן/ה?”', [{ label: '🏅 בוא/י נתחיל' }, { label: 'עוד לא' }], { name: ACTS[a].leader + ' · ' + ACTS[a].role });
      if (ok === 0) await bossBattle(a);
    }
  },
  async explainLoop(say) {
    await say('“כל מטופל/ת מסתירים בעיה קלינית. כשאת/ה ניגש/ת למיטה — זה קרב: הבעיה מולך, ולמטה יש לך את יציבות המטופל וזמן לאומדן.”');
    await say('“🔍 אומדן — בוחרים ממצאים לבדוק. ★ קריטי חושף את הבעיה, ◆ תומך, ו-· רעש שגוזל זמן. 🧠 החלטה — ארבעה שלבים: פרשנות, מטרה, התערבות והערכה חוזרת.”');
    await say('“לפני כל החלטה בוחרים רמת ביטחון. בטוח/ה ונכון? פגיעה חזקה. בטוח/ה וטועה? המטופל משלם יותר. זה כיול — בדיוק כמו בחיים.”');
    await say('“אם היציבות מגיעה לאפס — קוד. לא נורא: מקבלים סיכום מלא ומנסים שוב. 60% מהאירועים בפרק פותחים את הביקור הגדול בחדר הישיבות — ושם מרוויחים תג.”');
    await say('“וחשוב: כל אירוע מקושר להנחיות עדכניות — Beers, NICE, KDIGO, AHA, Surviving Sepsis ועוד. בסיכום של כל מקרה תראה/י ‘מה אומרות ההנחיות’ וקישור למקור.”');
  },
  async tutorial(n) {
    const say = t => UI.say(t, { name: 'רבקה · האחות האחראית' });
    await say('“' + S.player.name + '! טוב שהגעת. משמרת בוקר, מחלקה מלאה, ואני צריכה מישהו/י עם עיניים טובות.”');
    await this.explainLoop(say);
    await say('“ותדע/י למה את/ה כאן: המטרה היא להגיע לרמת אח/ות מומחה/ית קליני/ת בגריאטריה. ארבעה תחומי ליבה ייבחנו לאורך כל הדרך — 🫀 קרדיולוגיה, 🧓 גרונטולוגיה, 🧠 נוירולוגיה ו-💊 פרמקולוגיה. בסוף, מועצת המומחים תבחן כל אחד מהם.”');
    await say('“הנה — שני ☕ קפה ו-🔦 פנס לדרך. ותזכור/י: בגריאטריה “חולשה” היא תיאור, לא אבחנה.”');
    S.inv.coffee += 2; S.inv.torch += 1; S.flags.tutorial = true;
    if (!S.daily) this.makeDaily();
    await say('“המשימה הראשונה: לאה בחדר 1. היא כמעט נפלה בקימה לשירותים. לכי/לך — ה-❗ יראה לך לאן.”');
    this.save();
    await chapterCard(0);
  },

  async visitPatient(who) {
    if (!who) return UI.say('המיטה ריקה, מוצעת ומוכנה לקבלה הבאה.');
    const pt = C.patients[who];
    if (!this.tutorialDone()) return UI.say(pt.n.split(',')[0] + ' ישנ/ה. קודם מסירה מרבקה בעמדת האחיות.');
    const ep = this.availableEpisode(who);
    const mine = C.episodes.filter(e => e.p === who), doneN = mine.filter(e => S.episodes[e.id]).length;
    const card = `<div class="pt-card"><canvas class="pt-face" data-who="${who}" width="120" height="120"></canvas><div><b>${esc(pt.n)}</b><small>${esc(pt.s)}</small><div class="pg-bar"><div style="width:${doneN / mine.length * 100}%;background:linear-gradient(90deg,#299b75,#68cf9c)"></div></div><small>${doneN}/${mine.length} אירועים בסיפור שלה/ו</small></div></div>`;
    setTimeout(paintFaces, 0);
    if (ep) {
      const c = await UI.ask('אירוע חדש: “' + ep.t + '”', [{ icon: '🩺', label: 'לגשת למיטה', sub: 'פרק ' + (ep.a + 1) + ' · ' + ACTS[ep.a].name, cls: 'gold' }, { icon: '⏳', label: 'לא עכשיו' }], { name: pt.n, extra: card });
      if (c === 0) await episodeBattle(ep);
      return;
    }
    const locked = mine.filter(e => e.a > this.unlockedAct());
    const done = mine.filter(e => S.episodes[e.id]).sort((a, b) => S.episodes[a.id].stars - S.episodes[b.id].stars);
    const opts = [];
    if (done.length) opts.push({ icon: '🔁', label: 'סימולציה חוזרת: ' + done[0].t, sub: '★'.repeat(S.episodes[done[0].id].stars) + ' · לשפר כוכבים' });
    opts.push({ icon: '💬', label: 'לשבת רגע ולדבר' });
    const lockTxt = locked.length ? 'האירוע הבא של ' + pt.n.split(',')[0] + ' ייפתח אחרי ' + ACTS[this.unlockedAct()].badge + ' ' + ACTS[this.unlockedAct()].badgeName + '.' : 'הסיפור של ' + pt.n.split(',')[0] + ' הושלם. 🌙';
    const c = await UI.ask(lockTxt, opts, { name: pt.n, extra: card, cancel: true });
    if (c < 0) return;
    if (opts[c].icon === '🔁') await episodeBattle(done[0]);
    else await UI.say(pick(['“תודה שבאת. כשמסבירים לי מה קורה, פחות מפחיד.”', '“הבת שלי תבוא בבוקר. תגיד/י לה שאני בסדר?”', '“פעם הייתי אח/ות בעצמי, את/ה יודע/ת?”', '“רק אל תשכח/י את המשקפיים שלי על השידה.”']), { name: pt.n });
  },

  async councilTalk(n) {
    const i = n.id === 'champion' ? 4 : +n.id.slice(5), cfg = COUNCIL[i], info = NPC_INFO[n.id];
    if ((S.council || 0) > i) return UI.say('“כבר שכנעת אותי. המשך/המשיכי.”', { name: info.name });
    if ((S.council || 0) < i) return UI.say('“קודם השופט/ת הקודם/ת.”', { name: info.name });
    const r = await panelBattle({ enemy: { name: info.name, person: cfg.id, type: ACT_TYPE[cfg.acts[cfg.acts.length - 1]], sub: info.role }, scene: 'council', music: 'boss', boss: true,
      hp: S.councilHP, need: i === 4 ? 5 : 4, loss: 22, noLeave: true, intro: cfg.intro, qs: Core.questions(cfg.pillar, 12) });
    if (r.result === 'win') {
      S.council = i + 1; S.councilHP = r.hp; this.save();
      if (i < 4) { Sound.badge(); await UI.say(info.name + ': “עברת את ' + PILLARS[cfg.pillar].icon + ' ' + PILLARS[cfg.pillar].full + '. השער נפתח — הביטחון שלך נשאר ' + Math.round(r.hp) + '. השופט/ת הבא/ה מחכה.”', { name: info.name }); }
      else await this.hallOfFame();
    } else {
      S.council = 0; S.councilHP = 100; this.save();
      await UI.say(info.name + ': “הביטחון נגמר. המועצה מתחילה מחדש בכל ביקור — תחזור/י כשתהיה/י מוכן/ה.”', { name: info.name });
      await this.goTo(8, 14, 4, 'left');
    }
  },
  async hallOfFame() {
    S.flags.champion = 1; this.save(); Sound.badge(); screenFlash('#fde68a', 400);
    await UI.say('פרופ׳ דבורה אלמוג: “זה רשמי. את/ה אח/ות מומחה/ית קליני/ת בגריאטריה — ואלוף/ת מועצת המומחים.” 🏆', { name: 'היכל התהילה' });
    await this.reward(300, 100);
    await new Promise(res => Panel.open('🏆 היכל התהילה', `<div class="cert"><small>מועצת המומחים · משמרת ${S.shift}</small><h2>${esc(S.player.name)}</h2>
      <p>אח/ות מומחה/ית קליני/ת בגריאטריה: עבר/ה את ארבעת שופטי המועצה — קרדיולוגיה, נוירולוגיה, פרמקולוגיה וגרונטולוגיה — ואת היו״רית.</p>
      <div class="pl-row">${PILLAR_ORDER.map(p => `<span class="pl-chip" style="--pc:${PILLARS[p].color}">${PILLARS[p].icon} ${PILLARS[p].name} ${Core.mastery(p)}%</span>`).join('')}</div>
      <div class="badge-row big">${ACTS.map(A => `<i class="on">${A.badge}</i>`).join('')}</div>
      <div class="pg-section">הצוות</div><div class="hof-team">${(S.team || []).map(m => `<span>${TEAM[m.id].icon} ${esc(TEAM[m.id].name)} · ${esc(teamRole(m))}</span>`).join('') || '<span>סולו — בלי צוות. מרשים.</span>'}</div>
      <small>${Object.keys(S.episodes).length}/${C.episodes.length} אירועים · ${Object.values(S.dex).filter(v => v === 2).length}/${C.labs.length} במעבדון · רמה ${levelOf(S.xp)}</small></div>
      <button class="btn-main" data-act="ok">חזרה לבית החולים</button>`, { cls: 'wide', onClose: res, bind: el => el.querySelector('[data-act=ok]').onclick = () => Panel.close() }));
    await this.goTo(8, 14, 4, 'left');
  },
  async hotspot(kind) {
    const f = S.flags;
    if (kind.startsWith('hz_')) {
      const H = HAZARDS[kind];
      if (!S.hazards[kind]) { S.hazards[kind] = 1; Sound.reveal(); addParticles(hero.px - cam.x, hero.py - cam.y - 50, 10, { color: ['#fde047', '#fb923c'], speed: 80, star: true }); }
      const n = Object.keys(S.hazards).length;
      await UI.say('⚠️ מפגע ' + n + '/5: ' + H.t + '\n✅ ' + H.fix, { name: 'סיור בטיחות בבית', tall: true });
      if (n === 5 && !f.hazardsDone) {
        f.hazardsDone = 1; S.inv.shield = (S.inv.shield || 0) + 1; Sound.badge();
        await UI.say('מיכל: “מצאת את כל החמישה! אני אסדר את זה לפני שאמא חוזרת הביתה.” 🎉\n📚 הערכת מפגעים בבית והפחתתם מונעת כ-343 נפילות לכל 1,000 מבוגרים בסיכון בשנה (Cochrane 2023). קיבלת 🛡️ בדיקה כפולה.', { name: 'מיכל', tall: true });
        await this.reward(80, 30);
      }
      this.save(); return;
    }
    if (kind === 'locker') {
      if (!f.intro_locker) { f.intro_locker = 1; S.inv.torch++; await UI.say('בלוקר: סטטוסקופ, פנס עט ופנקס כיס עם הערות מהמשמרת הקודמת. קיבלת 🔦 פנס בדיקה.'); }
      else await UI.say('הלוקר שלך. על הדלת: תמונה של כל הצוות מהמסיבה. כולם נראים עייפים ומאושרים.');
    } else if (kind === 'board') {
      if (!f.intro_board) { f.intro_board = 1; await UI.say('לוח המשמרת: 7 מטופלים, 4 חדרים, ומשפט בכתב של רבקה: “לשים לב → לפרש → לפעול → להעריך מחדש”.'); if (!S.daily) this.makeDaily(); }
      openDaily();
    } else if (kind === 'coffee') {
      if (!f.intro_coffee) { f.intro_coffee = 1; S.inv.coffee += 2; Sound.coin(); await UI.say('☕ המכונה מגרגרת. קפה ראשון של המשמרת — ועוד שניים לדרך (☕ ×2). בקרב: +40 זמן לאומדן.'); }
      else await UI.say('☕ ' + pick(COFFEE_PEARLS) + ' (שולה מוכרת ציוד — תדבר/י איתה.)');
    } else if (kind === 'library') {
      const c = await UI.ask('📚 ספריית הידע המלאה: כל המודולים, המעבדה, התרופות והסימולטורים מגרסת הלימוד הקודמת. לפתוח בלשונית חדשה?', [{ label: '📖 לפתוח את הספרייה' }, { label: 'לא עכשיו' }]);
      if (c === 0) window.open('library/index.html', '_blank', 'noopener');
    } else if (kind === 'sofa') {
      if (!this.tutorialDone()) return UI.say('הספה מזמינה. אבל המשמרת עוד לא התחילה.');
      const c = await UI.ask('לסיים את המשמרת ולנוח? (השמירה אוטומטית. מתחילה משמרת חדשה עם משימות חדשות.)', [{ label: '😴 לסיים משמרת' }, { label: 'עוד קצת' }]);
      if (c === 0) await this.endShift();
    } else if (kind === 'review') openReview();
    else if (kind === 'labdex') openDex();
    else if (kind === 'microscope') { const l = pick(C.labs); await UI.say('🔬 מתחת למיקרוסקופ — ' + l.name + ' (' + l.en + '): ' + l.what); }
  },
  async endShift() {
    const log = S.shiftLog;
    await this.cover('fade');
    S.shift++; S.shiftLog = { eps: 0, xp: 0 }; (S.team || []).forEach(m => { m.pp = teamMax(m); }); this.touchDay(); this.makeDaily();
    loadMap(0, 2, 5, 'up'); this.uncover();
    Sound.heal();
    await UI.say('🌅 משמרת חדשה. סיכום המשמרת הקודמת: ' + log.eps + ' אירועים, +' + log.xp + ' XP. משמרת ' + S.shift + ' מתחילה — משימות חדשות על הלוח.');
    this.save();
  },
  lockedConference() {
    if (this.busy) return;
    const a = this.bossAct(), p = this.actProgress(a);
    this.run(() => UI.say(this.tutorialDone() ? `🔒 חדר הישיבות סגור. הביקור הגדול על “${ACTS[a].name}” ייפתח אחרי ${p.need} אירועים בפרק (${p.done}/${p.need}).` : '🔒 חדר הישיבות סגור. קודם מסירה מרבקה.'));
  },

  /* ---------- title / new game / cutscene ---------- */
  showTitle() {
    this.state = 'TITLE'; this.titleT = 0; document.body.classList.add('on-title');
    const has = !!this.readSave();
    $('btn-continue').style.display = has ? '' : 'none';
    if (has) { const d = this.readSave(); $('cont-sub').textContent = d.player.name + ' · רמה ' + levelOf(d.xp) + ' · ' + d.badges.length + '/7 תגים'; }
    Music.play('title');
    setTimeout(() => $('title-modal').classList.remove('title-hidden'), 900);
  },
  hideTitle() { $('title-modal').classList.add('title-hidden'); document.body.classList.remove('on-title'); },
  newGameDialog() {
    let look = 'nurseF', dif = 'normal';
    const html = `<p class="muted">משמרת במחלקה גריאטרית: 7 מטופלים, 58 אירועים קליניים, 7 ביקורים גדולים — כל אירוע מקושר להנחיות קליניות עדכניות. ההתקדמות נשמרת במכשיר.</p>
      <div class="pg-section">הדמות שלך</div>
      <div class="ng-looks">${['nurseF', 'nurseM'].map(k => `<button class="ng-look${k === look ? ' diff-sel' : ''}" data-look="${k}"><canvas width="90" height="110" data-draw="${k}"></canvas><b>${k === 'nurseF' ? 'אחות' : 'אח'}</b></button>`).join('')}</div>
      <label class="ng-name">שם: <input id="ng-name" maxlength="14" value="" placeholder="לא חובה" enterkeyhint="done" autocomplete="off"></label>
      <div class="pg-section">רמת קושי</div>
      <div class="ng-diff">${Object.entries(DIFF).map(([k, d]) => `<button class="diff-card${k === dif ? ' diff-sel' : ''}" data-diff="${k}"><span>${k === 'learner' ? '🌱' : k === 'normal' ? '⚖️' : '🔥'}</span><b>${d.name}</b><small>${k === 'learner' ? 'טעויות עולות פחות, יותר זמן לאומדן' : k === 'normal' ? 'האיזון שהמשחק נבנה סביבו' : 'פחות זמן, כל טעות מורגשת'}</small></button>`).join('')}</div>
      <div class="db-btns"><button class="btn-main" data-act="go">להתחיל משמרת ←</button></div>`;
    Panel.open('🩺 משמרת חדשה', html, { bind: el => {
      el.querySelector('#ng-name').value = '';
      el.querySelectorAll('[data-draw]').forEach(cv => drawLookPreview(cv, cv.dataset.draw));
      el.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { look = b.dataset.look; el.querySelectorAll('[data-look]').forEach(x => x.classList.toggle('diff-sel', x === b)); Sound.blip(); });
      el.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { dif = b.dataset.diff; el.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('diff-sel', x === b)); Sound.blip(); });
      el.querySelector('[data-act=go]').onclick = () => {
        const name = (el.querySelector('#ng-name').value || '').trim() || (look === 'nurseF' ? 'נועה' : 'נועם');
        const keep = S.settings;
        S = freshState(); S.settings = keep; window.S = S;
        S.player = { name, look }; S.difficulty = dif; this.touchDay();
        Panel.close(true); this.hideTitle(); this.startCutscene();
      };
    } });
  },
  startCutscene() {
    this.state = 'CUTSCENE'; document.body.classList.add('on-cutscene');
    this.cut = { i: 0, t: 0, pages: ['בוקר. העיר מתעוררת.', 'בקומה השלישית של בית החולים, המחלקה הגריאטרית כבר בתנועה.', 'שבעה מטופלים. שבעה סיפורים. כל שינוי קטן — מספר משהו גדול.', 'כל החלטה במשמרת מבוססת על הנחיות קליניות ומחקר עדכני.', S.player.name + ', המשמרת שלך מתחילה עכשיו.'] };
    Music.play('title');
  },
  cutNext() { if (!this.cut) return; this.cut.i++; this.cut.t = 0; Sound.blip(); if (this.cut.i >= this.cut.pages.length) this.endCutscene(); },
  async endCutscene() {
    this.cut = null; document.body.classList.remove('on-cutscene');
    await this.cover('fade');
    this.enterWorld();
    this.uncover();
    setTimeout(() => this.run(() => UI.say('חדר הצוות. לפני שיוצאים למחלקה: לבדוק את הלוקר, את לוח המשמרת ואת מכונת הקפה. (חיצים/WASD או הקשה על המסך כדי ללכת · Z/רווח או הקשה כדי לדבר)')), 500);
  },
  enterWorld() {
    this.state = 'OVERWORLD'; document.body.classList.remove('on-title');
    loadMap(S.map, S.x, S.y, S.dir);
    if (S.daily && S.daily.shift !== S.shift) this.makeDaily();
    this.save(); this.refresh();
    this.roomIntro(); setTimeout(() => this.checkRival(), 900);
  },
  continueGame() {
    const d = this.readSave(); if (!d) return;
    this.adopt(d); this.touchDay(); this.hideTitle(); this.enterWorld();
  },
};

/* ---------- small helpers used by panels ---------- */
function titleFor(L) { let t = LEVEL_TITLES[0][1]; LEVEL_TITLES.forEach(([l, n]) => { if (L >= l) t = n; }); return t; }
function weakAdvice() {
  const names = { noticing: 'לשים לב (אומדן)', interpreting: 'לפרש', responding: 'לפעול', reflecting: 'להעריך מחדש' };
  const rows = Object.keys(names).map(k => { const d = S.domains[k] || [0, 0]; return { k, pct: d[1] ? d[0] / d[1] : null }; }).filter(r => r.pct != null).sort((a, b) => a.pct - b.pct);
  const wp = Core.weakest(), wpT = ' ותחום הליבה שהכי צריך חיזוק: ' + PILLARS[wp].icon + ' ' + PILLARS[wp].full + ' (' + Core.mastery(wp) + '%) — יש תרגול ממוקד בתפריט 🎓.';
  if (!rows.length) return '“עוד אין לי מספיק נתונים על החשיבה הקלינית שלך.' + wpT + '”';
  const w = rows[0], s = S.calib.sure;
  let t = `“החוליה הכי חלשה כרגע: ${names[w.k]} (${Math.round(w.pct * 100)}% בניסיון ראשון).`;
  if (w.k === 'noticing') t += ' לפני החלטה — בדוק/י 2-3 ממצאים. ★ קריטי חושף את הבעיה.';
  if (w.k === 'interpreting') t += ' חפש/י מה השתנה מה-baseline ואיך הממצאים מתחברים למנגנון אחד.';
  if (w.k === 'responding') t += ' פעולה טובה = טיפול בגורם + בטיחות + תכנית מעקב.';
  if (w.k === 'reflecting') t += ' הצלחה היא שיפור קליני ותפקודי מתועד.';
  if (s && s.wrong > s.right / 3 && s.wrong >= 2) t += ' ועוד משהו: כש“בטוח/ה” — טעית ' + s.wrong + ' פעמים. כדאי לכייל.';
  return t + wpT + '”';
}
function drawLookPreview(cv, look) {
  const c = cv.getContext('2d'); const k = 2; cv.width = 90 * k; cv.height = 110 * k; c.scale(k, k);
  Art.drawPerson(c, 45, 100, look, { size: 84, dir: 'down', shadow: true });
}
function paintFaces() {
  document.querySelectorAll('canvas.pt-face').forEach(cv => { const c = cv.getContext('2d'); c.clearRect(0, 0, 120, 120); c.fillStyle = '#16263a'; c.fillRect(0, 0, 120, 120); Art.drawBust(c, 60, 76, cv.dataset.who, 1.9); });
  document.querySelectorAll('canvas.npc-face').forEach(cv => { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); Art.drawPerson(c, cv.width / 2, cv.height * 1.55, cv.dataset.look, { size: cv.height * 1.7, dir: 'down', shadow: false }); });
}

/* ---------- menus ---------- */
function openMenu() {
  if (Game.state !== 'OVERWORLD' || Game.busy) return;
  const cards = [['expert', '🎓', 'ליבת המומחיות', PILLAR_ORDER.map(p => PILLARS[p].icon + Core.mastery(p) + '%').join(' ')], ['journey', '🗺️', 'מפת המסע', 'פרקים, מטרות ותגים'], ['team', '👥', 'הצוות שלי', (S.team || []).length + '/6 אנשי מקצוע'], ['status', '📋', 'כרטיס אח/ות', 'רמה, תחומים, כיול'], ['inv', '🎒', 'ציוד', Object.values(S.inv).reduce((a, b) => a + b, 0) + ' פריטים'], ['patients', '🛏️', 'תיק מטופלים', Object.keys(S.episodes).length + '/' + C.episodes.length + ' אירועים'],
    ['journal', '📖', 'יומן', 'פנינות ומסירות'], ['dex', '🧪', 'מעבדון', Object.values(S.dex).filter(v => v === 2).length + '/' + C.labs.length], ['daily', '🗓️', 'משימות המשמרת', 'משמרת ' + S.shift],
    ['map', '🚪', 'מעבר מהיר', 'בין חדרי המחלקה'], ['settings', '⚙️', 'הגדרות', 'סאונד, טקסט, נגישות'], ['save', '💾', 'שמירה וגיבוי', 'ייצוא / ייבוא'],
    ['evidence', '🔬', 'בסיס מחקרי', 'הנחיות ומקורות'], ['library', '📚', 'ספריית הידע', 'הגרסה המלאה'], ['help', '❓', 'עזרה', 'מקשים ומהלך'], ['title', '🏠', 'למסך הפתיחה', 'נשמר אוטומטית']];
  Panel.open('☰ תפריט', `<div class="menu-context"><small>המשימה</small><div>${esc(Game.questText())}</div></div>
    <div class="game-menu-grid">${cards.map(c => `<button class="game-menu-card" data-m="${c[0]}"><b>${c[1]} ${c[2]}</b><small>${c[3]}</small></button>`).join('')}</div>
    <div class="menu-footer"><span>${esc(S.player.name)} · ${titleFor(levelOf(S.xp))}</span><span>משמרת ${S.shift} · ${DIFF[S.difficulty].name}</span></div>`, { cls: 'game-menu-panel', bind: el => {
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      const m = b.dataset.m;
      ({ expert: openExpertise, team: openTeam, journey: () => openJourney(), evidence: openEvidence, status: openStatus, inv: openInventory, patients: openPatients, journal: openJournal, dex: openDex, daily: openDaily, map: openMap, settings: openSettings, save: openSave, help: openHelp,
        library: () => { window.open('library/index.html', '_blank', 'noopener'); },
        title: () => { Game.save(); Panel.close(true); Game.state = 'TITLE'; UI.hide(); UI.quest(''); Game.showTitle(); } })[m]();
    });
  } });
}
const back = () => openMenu();
const backBtn = '<button class="close-btn" data-back>↩ חזרה לתפריט</button>';
function bindBack(el) { const b = el.querySelector('[data-back]'); if (b) b.onclick = back; }

function openStatus() {
  const L = levelOf(S.xp), a = xpFor(L), b = xpFor(L + 1);
  const names = { noticing: '🔍 לשים לב', interpreting: '🧠 לפרש', responding: '💉 לפעול', reflecting: '📋 להעריך' };
  const dom = Object.keys(names).map(k => { const d = S.domains[k] || [0, 0], p = d[1] ? d[0] / d[1] : 0; return `<div class="st-meter"><span>${names[k]}</span><div class="pg-bar"><div style="width:${p * 100}%;background:linear-gradient(90deg,#258fbb,#7edcf0)"></div></div><b>${d[1] ? Math.round(p * 100) + '%' : '—'}</b></div>`; }).join('');
  const cal = [['guess', '🤔 ניחוש'], ['maybe', '🙂 סביר'], ['sure', '😎 בטוח/ה']].map(([k, n]) => { const c = S.calib[k] || { right: 0, wrong: 0 }, t = c.right + c.wrong; return `<span>${n}: ${t ? Math.round(c.right / t * 100) + '% נכון (' + t + ')' : '—'}</span>`; }).join('');
  const stars = Object.values(S.episodes).reduce((s, e) => s + e.stars, 0);
  Panel.open('📋 ' + esc(S.player.name), `
    <div class="st-top"><canvas class="npc-face" data-look="${S.player.look}" width="64" height="64"></canvas><div class="st-lv"><small>רמה</small><b>${L}</b></div><div class="st-meters"><b class="st-title">${titleFor(L)}</b>
      <div class="st-meter"><span>XP</span><div class="pg-bar"><div style="width:${clamp((S.xp - a) / (b - a), 0, 1) * 100}%;background:linear-gradient(90deg,#d5ab62,#f1d49b)"></div></div><b>${S.xp - a}/${b - a}</b></div></div></div>
    <div class="st-grid"><div class="st-stat"><small>אירועים</small><b>${Object.keys(S.episodes).length}</b><em>/${C.episodes.length}</em></div><div class="st-stat"><small>כוכבים</small><b>${stars}</b><em>/${C.episodes.length * 3}</em></div>
      <div class="st-stat"><small>סבבי מעבדה</small><b>${Object.keys(S.labRounds).length}</b><em>/${C.labRounds.length}</em></div><div class="st-stat"><small>מעבדון</small><b>${Object.values(S.dex).filter(v => v === 2).length}</b><em>/${C.labs.length}</em></div><div class="st-stat"><small>קודים</small><b>${S.stats.codes || 0}</b><em>ולמדנו</em></div></div>
    <div class="pg-section">ליבת המומחיות</div>${PILLAR_ORDER.map(p => `<div class="st-meter"><span>${PILLARS[p].icon} ${PILLARS[p].name}</span><div class="pg-bar"><div style="width:${Core.mastery(p)}%;background:${PILLARS[p].color}"></div></div><b>${Core.mastery(p)}%</b></div>`).join('')}
    <div class="pg-section">חשיבה קלינית — ניסיון ראשון</div>${dom}
    <div class="pg-section">כיול ביטחון</div><div class="st-chips">${cal}</div>
    <div class="pg-section">תגים</div><div class="badge-row big">${ACTS.map((A, i) => `<i class="${S.badges.includes(i) ? 'on' : ''}" title="${A.badgeName}">${A.badge}</i>`).join('')}<i class="${S.labBadge ? 'on' : ''}" title="תג המעבדה">🧪</i></div>
    ${backBtn}`, { bind: el => { bindBack(el); paintFaces(); } });
}
function openInventory() {
  Panel.open('🎒 ציוד', `<div class="menu-context"><small>שימוש</small><div>פריטים משתמשים בהם בזמן קרב (🎒 ציוד). קונים אצל שולה בחדר הצוות. יש לך 🪙 ${S.coins}.</div></div>
    <div class="shop-grid">${Object.entries(ITEMS).map(([k, it]) => `<div class="shop-card" style="--tint:${it.tint}"><span class="shop-ico">${it.icon}</span><span class="shop-name">${it.name} <em>×${S.inv[k] || 0}</em></span><span class="shop-fx">${it.desc}</span></div>`).join('')}</div>${backBtn}`, { bind: bindBack });
}
function openShop() {
  const lines = ['“קפה טרי, פנסים, ומדריכים. מה תיקח/י היום?”', '“משמרת ארוכה. קח/י משהו לדרך.”', '“אחות טובה לא הולכת למיטה בלי פנס.”'];
  const render = (msg) => `<div class="shop-counter"><canvas class="npc-face shop-face" data-look="shula" width="74" height="74"></canvas><div class="shop-bubble"><b>שולה · קפיטריית הצוות</b>${msg || pick(lines)}</div><span class="shop-wallet">🪙 ${S.coins}</span></div>
    <div class="shop-grid">${Object.entries(ITEMS).map(([k, it]) => `<button class="shop-card ${S.coins < it.price ? 'poor' : ''}" data-buy="${k}" style="--tint:${it.tint}"><span class="shop-price">${it.price}</span><span class="shop-ico">${it.icon}</span><span class="shop-name">${it.name} <em>יש: ${S.inv[k] || 0}</em></span><span class="shop-fx">${it.desc}</span></button>`).join('')}</div>`;
  const bind = el => {
    paintFaces();
    el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const k = b.dataset.buy, it = ITEMS[k];
      if (S.coins < it.price) { Sound.back(); el.innerHTML = render('“חסרים לך ' + (it.price - S.coins) + ' 🪙. אירוע או שניים — וזה שלך.”'); bind(el); return; }
      S.coins -= it.price; S.inv[k] = (S.inv[k] || 0) + 1; Sound.coin(); Game.save(); Game.refresh();
      el.innerHTML = render('“' + it.icon + ' בבקשה! ' + pick(['שיהיה בהצלחה.', 'תשמור/י על עצמך.', 'משמרת שקטה.']) + '”'); bind(el);
      const card = el.querySelector(`[data-buy="${k}"]`); if (card) card.classList.add('bought');
    });
  };
  Panel.open('🛒 הקפיטריה', render(), { bind });
}
function openPatients() {
  const html = Object.keys(C.patients).map(pid => {
    const pt = C.patients[pid], mine = C.episodes.filter(e => e.p === pid).sort((a, b) => a.a - b.a);
    const done = mine.filter(e => S.episodes[e.id]).length;
    return `<div class="pg-ch${Game.availableEpisode(pid) ? ' current' : ''}"><div class="pg-ch-head"><b>${esc(pt.n)}</b><span class="pg-tag ${done === mine.length ? 'done' : ''}">${done}/${mine.length} · חדר ${PATIENT_ROOM[pid]}</span></div>
      <span class="pg-sub">${esc(pt.s)}</span>
      <div class="pg-steps">${mine.map(e => { const r = S.episodes[e.id]; return `<span class="${r ? 'ok' : ''}">${e.a > Game.unlockedAct() ? '🔒' : r ? '★'.repeat(r.stars) : '◻'} ${esc(e.t)}</span>`; }).join('')}</div></div>`;
  }).join('');
  Panel.open('🛏️ תיק מטופלים', `<div class="panel-list">${html}</div>${backBtn}`, { cls: 'wide', bind: bindBack });
}
function openJournal(tab) {
  tab = tab || 'pearls';
  const eps = C.episodes.filter(e => S.episodes[e.id]);
  let body = '';
  if (tab === 'pearls') body = eps.length ? eps.map(e => `<div class="journal-entry"><b>💡 ${esc(e.t)} · ${esc(C.patients[e.p].n)}</b>${esc(e.pe)}${EP_EVIDENCE[e.id] ? `<div class="evid-k">📚 ${esc(EP_EVIDENCE[e.id].k)}</div><div class="srcs">${srcLinks(EP_EVIDENCE[e.id].s)}</div>` : ''}</div>`).join('') : '<p class="muted">עוד אין פנינות. כל אירוע שתסיים/י ישאיר כאן את הלקח שלו.</p>';
  if (tab === 'sbar') body = eps.length ? eps.map(e => `<div class="journal-entry sbar"><b>📝 ${esc(e.t)}</b><div><i>S</i> ${esc(e.st)}</div><div><i>A</i> ${esc(e.q[e.qc])}</div><div><i>R</i> ${esc(e.x[e.xc])}</div></div>`).join('') : '<p class="muted">המסירות שלך יופיעו כאן.</p>';
  if (tab === 'lab') { const done = Object.keys(S.labRounds).map(Number); body = done.length ? done.map(i => { const c = C.labRounds[i]; return `<div class="journal-entry"><b>🧪 ${esc(c.t)}</b>${c.steps.map(s => `<div>• ${esc(s[4])}</div>`).join('')}<div class="srcs">${srcLinks(LAB_ROUND_SOURCES[i])}</div></div>`; }).join('') : '<p class="muted">סבבי המעבדה שתפתור/י אצל טל יופיעו כאן.</p>'; }
  Panel.open('📖 יומן', `<div class="j-tabs">${[['pearls', '💡 פנינות', eps.length], ['sbar', '📝 מסירות', eps.length], ['lab', '🧪 מעבדה', Object.keys(S.labRounds).length]].map(t => `<button class="system-btn${t[0] === tab ? ' diff-sel' : ''}" data-tab="${t[0]}">${t[1]} <small>${t[2]}</small></button>`).join('')}</div><div class="panel-list">${body}</div>${backBtn}`,
    { cls: 'wide', bind: el => { bindBack(el); el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openJournal(b.dataset.tab)); } });
}
function openDaily() {
  if (!S.daily || S.daily.shift !== S.shift) Game.makeDaily();
  const d = S.daily;
  Panel.open('🗓️ משימות משמרת ' + S.shift, `<div class="dl-card${d.paid ? ' done' : ''}"><div class="dl-head"><b>לוח המשמרת</b><small>🔥 רצף ימים: ${S.streak || 0}</small></div>
    <div class="dl-body">${d.tasks.map(t => `<div>${t.done ? '✅' : '⬜'} ${esc(t.label)}</div>`).join('')}</div>
    <small class="muted">${d.paid ? 'הכל הושלם — בונוס התקבל.' : 'השלמת כל השלוש: +40 XP ו-20 🪙.'} סיום משמרת: הספה בחדר הצוות.</small></div>${Game.state === 'OVERWORLD' ? backBtn : ''}`, { bind: bindBack });
}
function openReview() {
  const eps = C.episodes.filter(e => S.episodes[e.id]).sort((a, b) => S.episodes[a.id].stars - S.episodes[b.id].stars || S.episodes[a.id].last - S.episodes[b.id].last);
  if (!eps.length) return Game.run(() => UI.say('🖥️ מערכת הסימולציות: עוד אין אירועים לחזרה. אחרי שתטפל/י במטופלים — הם יופיעו כאן.'));
  Panel.open('🖥️ סימולציות חוזרות', `<div class="menu-context"><small>חזרה מרווחת</small><div>הכי פחות כוכבים והכי מזמן — למעלה. חזרה נותנת חצי XP ומשפרת כוכבים.</div></div>
    <div class="panel-list">${eps.map(e => `<div class="panel-item"><span><b>${esc(e.t)}</b><br><small>${esc(C.patients[e.p].n)} · ${'★'.repeat(S.episodes[e.id].stars)}${'☆'.repeat(3 - S.episodes[e.id].stars)} · משמרת ${S.episodes[e.id].last}</small></span><button class="system-btn" data-ep="${e.id}">▶ סימולציה</button></div>`).join('')}</div>`,
    { cls: 'wide', bind: el => el.querySelectorAll('[data-ep]').forEach(b => b.onclick = () => { const e = C.episodes.find(x => x.id === b.dataset.ep); Panel.close(true); Game.run(() => episodeBattle(e)); }) });
}
function openMap() {
  const rows = MAPS.map((m, i) => `<div class="panel-item"><span><b>${esc(m.name)}</b><br><small>${esc(m.sub)}</small></span><button class="system-btn" data-go="${i}" ${S.visited[i] && i !== S.map && !(i === 7 && !Game.bossReady()) && m.id !== 'council' ? '' : 'disabled'}>${i === S.map ? '📍 כאן' : S.visited[i] ? 'ללכת' : '—'}</button></div>`).join('');
  Panel.open('🗺️ מפת המחלקה', `<div class="panel-list">${rows}</div>${backBtn}`, { bind: el => { bindBack(el); el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const i = +b.dataset.go, m = MAPS[i]; const d = Object.values(m.doors)[0]; const back = MAPS[d.to].doors; const k = Object.keys(back).find(k2 => back[k2].to === i);
    const ent = k ? back[k] : { x: 2, y: 2, dir: 'down' }; Panel.close(true); Game.goTo(i, ent.x, ent.y, ent.dir);
  }); } });
}
function openSettings() {
  const st = S.settings;
  const row = (k, label, desc, opts) => `<div class="panel-item settings-row"><div><b>${label}</b><div class="settings-desc">${desc}</div></div><div class="diff-row">${opts.map(([v, l]) => `<button class="system-btn diff-opt${st[k] === v ? ' diff-sel' : ''}" data-set="${k}" data-v='${JSON.stringify(v)}'>${l}</button>`).join('')}</div></div>`;
  Panel.open('⚙️ הגדרות', `<div class="panel-list">
    ${row('sound', '🔊 סאונד', 'מוזיקה ואפקטים — הכל מסונתז', [[true, 'פועל'], [false, 'כבוי']])}
    ${row('musicVol', '🎵 מוזיקה', 'עוצמת המוזיקה', [[0, '0'], [.3, '30%'], [.6, '60%'], [1, '100%']])}
    ${row('sfxVol', '🔔 אפקטים', 'עוצמת האפקטים', [[.3, '30%'], [.6, '60%'], [.8, '80%'], [1, '100%']])}
    ${row('textSpeed', '💬 מהירות טקסט', 'הקלדה הדרגתית או מיידית', [[2, 'רגיל'], [1, 'מהיר'], [0, 'מיידי']])}
    ${row('zoom', '🔠 גודל טקסט', 'בתיבות ובחלונות', [[1, 'רגיל'], [1.15, 'גדול'], [1.3, 'גדול מאוד']])}
    ${row('hc', '◐ ניגודיות גבוהה', 'רקעים כהים לגמרי וקווים בהירים', [[false, 'כבוי'], [true, 'פועל']])}
    ${row('reduceFx', '✨ הפחתת אפקטים', 'פחות רעידות, הבזקים ותנועה', [[false, 'כבוי'], [true, 'פועל']])}
    ${row('guide', '🧭 חץ הכוונה', 'חץ קטן שמצביע ליעד הבא', [[true, 'פועל'], [false, 'כבוי']])}
    ${row('pager', '📟 קריאות ביפר', 'אירועים מהירים אקראיים במסדרון', [[true, 'פועל'], [false, 'כבוי']])}
    ${row('autoRun', '🏃 ריצה אוטומטית', 'הליכה מהירה תמיד (או Shift)', [[false, 'כבוי'], [true, 'פועל']])}
    ${row('haptics', '📳 רטט', 'במכשירים שתומכים', [[true, 'פועל'], [false, 'כבוי']])}
    </div>${Game.state === 'OVERWORLD' ? backBtn : ''}`, { bind: el => { bindBack(el); el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { st[b.dataset.set] = JSON.parse(b.dataset.v); applySettings(); Game.save(); openSettings(); }); } });
}
function applySettings() {
  const st = S.settings;
  document.body.classList.toggle('hc', !!st.hc);
  document.documentElement.style.setProperty('--ui-zoom', st.zoom || 1);
  Sound.apply();
}
function openSave() {
  Panel.open('💾 שמירה וגיבוי', `<div class="menu-context"><small>שמירה</small><div>המשחק נשמר אוטומטית במכשיר (localStorage) אחרי כל אירוע ומעבר חדר. גיבוי מאפשר להעביר את ההתקדמות למכשיר אחר.</div></div>
    <div class="tw-actions"><button class="btn-main" data-a="export">⬇️ ייצוא גיבוי</button><button class="system-btn" data-a="import">⬆️ ייבוא גיבוי</button><button class="system-btn danger-btn" data-a="reset">🗑️ איפוס התקדמות</button></div>
    <div id="save-note" class="settings-desc"></div>${backBtn}`, { bind: el => {
    bindBack(el);
    el.querySelector('[data-a=export]').onclick = () => { Game.save(); const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hamishmeret-' + today() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); el.querySelector('#save-note').textContent = 'הקובץ הורד.'; };
    el.querySelector('[data-a=import]').onclick = () => $('save-file').click();
    let armed = false;
    el.querySelector('[data-a=reset]').onclick = ev => { if (!armed) { armed = true; ev.target.textContent = '⚠️ ללחוץ שוב לאישור'; return; } localStorage.removeItem(SAVE_KEY); location.reload(); };
  } });
}
$('save-file').onchange = ev => {
  const f = ev.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result); if (!d.player) throw 0; Game.adopt(d); Game.save(); Panel.close(true); Game.hideTitle(); Game.enterWorld(); UI.toast('💾', 'הגיבוי נטען', d.player.name, true); } catch (e) { alert('הקובץ אינו גיבוי תקין של המשמרת.'); } };
  r.readAsText(f); ev.target.value = '';
};
function openHelp() {
  Panel.open('❓ עזרה', `<div class="panel-list">
    <div class="journal-entry"><b>🎮 שליטה</b>חיצים / WASD — הליכה · Shift — ריצה · Z / רווח / Enter — פעולה ודיבור · X / Esc — חזרה · M — תפריט.<br>במגע: הקשה על משבצת = הליכה אליה (ואם זה אדם או מיטה — גם פנייה אליו). החזקה = היגוי. הקשה על תיבת הטקסט = המשך.</div>
    <div class="journal-entry"><b>🩺 האירוע הקליני</b>מול המיטה מופיעה הבעיה הקלינית. 🔍 אומדן חושף ממצאים (★ קריטי · ◆ תומך · · רעש). 🧠 החלטה עוברת ארבעה שלבים: פרשנות → מטרה → התערבות → הערכה חוזרת. לפני כל החלטה בוחרים ביטחון: “בטוח/ה” מכה חזק כשצודקים — ופוגע יותר כשטועים.</div>
    <div class="journal-entry"><b>🏅 התקדמות</b>7 פרקים, 7 תגים. 60% מהאירועים בפרק פותחים את הביקור הגדול בחדר הישיבות. תג פותח את הפרק הבא אצל כל המטופלים.</div>
    <div class="journal-entry"><b>🧪 המעבדה</b>טל מריצה 12 סבבי מעבדה קריטיים (Pattern → מנגנון → קשר לתרופות → הערכה חוזרת) ואת המעבדון: 78 בדיקות לזהות.</div>
    <div class="journal-entry"><b>📟 במסדרון</b>קריאות ביפר וצוות שעוצר אותך עם שאלה — חזרה מרווחת על מה שכבר למדת.</div>
    <div class="journal-entry warn"><b>⚠️ חשוב</b>כלי למידה בלבד. אינו מחליף טווחי מעבדה מקומיים, פרוטוקול מוסדי או שיקול דעת קליני בזמן אמת.</div>
    </div>${Game.state === 'OVERWORLD' ? backBtn : ''}`, { bind: bindBack });
}

/* ---------- expertise profile: the four pillars ---------- */
function openExpertise() {
  const wp = Core.weakest(), all = Core.overall();
  const cards = PILLAR_ORDER.map(p => { const P = PILLARS[p], m = Core.mastery(p), eps = Core.episodes(p), its = Core.items(p);
    const epDone = eps.filter(e => S.episodes[e.id]).length, kDone = its.filter(k => Core.mastered(k.id)).length;
    return `<div class="pl-card${p === wp ? ' weak' : ''}" style="--pc:${P.color}"><div class="pl-head"><span class="pl-ico">${P.icon}</span><div><b>${P.full}</b><small>${Core.level(m)}${p === wp ? ' · הכי צריך חיזוק' : ''}</small></div><em>${m}%</em></div>
      <div class="pg-bar"><div style="width:${m}%;background:${P.color}"></div></div>
      <small class="pl-scope">${esc(P.scope)}</small>
      <div class="pl-stats"><span>🩺 מקרים ${epDone}/${eps.length}</span><span>📚 בדיקות ידע ${kDone}/${its.length}</span></div>
      <button class="system-btn" data-drill="${p}">🎯 תרגול ממוקד מול ${esc(P.who)}</button></div>`; }).join('');
  Panel.open('🎓 ליבת המומחיות', `<div class="menu-context"><small>מטרת המשחק</small><div>להגיע לרמת אח/ות מומחה/ית קליני/ת בגריאטריה בארבעה תחומי ליבה. ציון התחום = חצי מקרים קליניים (כוכבים) + חצי בדיקות ידע שנענו נכון בפעם האחרונה. בדיקות שנכשלו חוזרות מוקדם יותר (חזרה מרווחת). מועצת המומחים בוחנת כל תחום בנפרד.</div></div>
    <div class="pl-overall"><b>${all}%</b><span>שליטה כוללת · ${Core.level(all)}</span></div>
    <div class="pl-grid">${cards}</div>${Game.state === 'OVERWORLD' ? backBtn : ''}`, { cls: 'wide', bind: el => { bindBack(el); el.querySelectorAll('[data-drill]').forEach(b => b.onclick = () => { Panel.close(true); drillPillar(b.dataset.drill); }); } });
}
function drillPillar(p) {
  Game.run(async () => {
    const P = PILLARS[p], look = NPC_INFO[P.examiner] ? NPC_INFO[P.examiner].look : P.examiner;
    const before = Core.mastery(p);
    const r = await panelBattle({ enemy: { name: P.who, person: look, type: { cardio: 'cardio', neuro: 'neuro', pharm: 'meds', geron: 'func' }[p], sub: 'תרגול · ' + P.full },
      scene: 'conf', need: 4, loss: 20, intro: 'תרגול ממוקד ב' + P.full + '. ארבע תשובות נכונות — ואת/ה מוכן/ה יותר למועצה.', qs: Core.questions(p, 10, Game.unlockedAct()) });
    const after = Core.mastery(p);
    await UI.say((r.result === 'win' ? '🎯 תרגול הושלם! ' : '📖 התרגול נעצר — כל טעות היא חזרה שתחזור מוקדם יותר. ') + P.icon + ' ' + P.full + ': ' + before + '% → ' + after + '%.', { name: 'ליבת המומחיות' });
    if (r.result === 'win') await Game.reward(40, 12);
    Game.save();
  });
}

/* ---------- the team (party screen) ---------- */
function openTeam() {
  const cards = TEAM_ORDER.map(id => { const T = TEAM[id], m = (S.team || []).find(x => x.id === id);
    if (!m) return `<div class="tm-card locked"><canvas class="npc-face" data-look="${NPC_INFO[id].look}" width="64" height="64"></canvas><div><b>??? · ${esc(T.role)}</b><small>מחכה ל/ה במקום: ${esc(T.where)}. דבר/י איתו/ה ופתור/י מקרה מהתחום.</small></div></div>`;
    return `<div class="tm-card"><canvas class="npc-face" data-look="${NPC_INFO[id].look}" width="64" height="64"></canvas><div><b>${T.icon} ${esc(T.name)} · ${esc(teamRole(m))}${m.evo ? ' ✨' : ''}</b>
      <small>“${esc(T.move)}” · ⚡ חזק/ה נגד ${T.strong.map(t => TYPES[t].icon + ' ' + TYPES[t].name).join(', ')}</small>
      <div class="tm-meters"><span>PP</span><div class="pg-bar"><div style="width:${m.pp / teamMax(m) * 100}%;background:linear-gradient(90deg,#2b9fd8,#7edcf0)"></div></div><b>${m.pp}/${teamMax(m)}</b>
      <span>קשר</span><div class="pg-bar"><div style="width:${Math.min(1, (m.bond || 0) / 4) * 100}%;background:linear-gradient(90deg,#f0b232,#f7d27a)"></div></div><b>${m.evo ? 'מומחה/ית' : (m.bond || 0) + '/4'}</b></div>
      <div class="evid-k">📚 ${esc(T.fact)}</div><div class="srcs">${srcLinks(T.src)}</div></div></div>`; }).join('');
  Panel.open('👥 הצוות שלי', `<div class="menu-context"><small>איך זה עובד</small><div>בקרב: 👥 צוות → איש/אשת מקצוע. נגד בעיה מהתחום שלהם — ⚡ יעיל במיוחד (מסירים 2 תשובות שגויות, חושפים ממצא ומחזקים יציבות). PP מתחדש בסיום משמרת או אצל ליאת במבואה. אחרי 4 שימושים — התפתחות למומחה/ית.</div></div>
    <div class="panel-list">${cards}</div>${Game.state === 'OVERWORLD' ? backBtn : ''}`, { cls: 'wide', bind: el => { bindBack(el); paintFaces(); } });
}

/* ---------- the journey ---------- */
function journeyLine() {
  if (S.badges.length >= ACTS.length) return '';
  const a = Game.bossAct(), p = Game.actProgress(a);
  return p.done >= p.need ? ` 🏅 הביקור הגדול של פרק ${a + 1} פתוח!` : ` 🗺️ פרק ${a + 1}: עוד ${p.need - p.done} אירועים לביקור הגדול.`;
}
function actSources(a) { const ids = []; Game.actEps(a).forEach(e => (EP_EVIDENCE[e.id] ? EP_EVIDENCE[e.id].s : []).forEach(id => { if (!ids.includes(id)) ids.push(id); })); return ids; }
function chapterHTML(a) {
  const A = ACTS[a], I = ACT_INFO[a], p = Game.actProgress(a);
  const pts = [...new Set(Game.actEps(a).map(e => e.p))];
  return `<div class="ch-head"><div class="ch-medal">${A.badge}</div><div><small>פרק ${a + 1} מתוך ${ACTS.length}</small><b>${esc(A.name)}</b><span>${esc(I.story)}</span></div></div>
    <div class="pg-section">🎯 מה תלמד/י בפרק</div><ul class="ch-goals">${I.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
    <div class="pg-section">🛏️ המטופלים בפרק</div><div class="ch-pts">${pts.map(id => `<span><canvas class="pt-face" data-who="${id}" width="120" height="120"></canvas>${esc(C.patients[id].n)}</span>`).join('')}</div>
    <div class="pg-section">🏅 בסוף הפרק</div><div class="menu-context"><div>${p.total} אירועים. אחרי ${p.need} נפתח הביקור הגדול עם ${esc(A.leader)} (${esc(A.role)}) — ניצחון מעניק את ${A.badge} ${esc(A.badgeName)}.</div></div>
    <div class="pg-section">📚 ההנחיות שעליהן הפרק בנוי</div><div class="srcs">${srcLinks(actSources(a))}</div>`;
}
function chapterCard(a) {
  return new Promise(res => Panel.open('📖 פרק חדש במסע', chapterHTML(a) + '<div class="db-btns"><button class="btn-main" data-act="ok">יוצאים לדרך ←</button><button class="system-btn" data-act="map">🗺️ מפת המסע</button></div>',
    { cls: 'wide', onClose: res, bind: el => { paintFaces(); el.querySelector('[data-act=ok]').onclick = () => Panel.close(); el.querySelector('[data-act=map]').onclick = () => { Panel.onClose = null; openJourney(a); res(); }; } }));
}
function openJourney(sel) {
  const cur = Game.bossAct(), all = S.badges.length >= ACTS.length;
  sel = sel == null ? cur : sel;
  const W = 700, H = 150, pts = ACTS.map((_, i) => ({ x: W - 88 - i * ((W - 176) / 6), y: i % 2 ? 105 : 45 }));
  const path = pts.map((q, i) => (i ? 'L' : 'M') + q.x + ' ' + q.y).join(' ');
  const done = i => S.badges.includes(i), locked = i => !all && i > cur;
  const reach = pts.slice(0, Math.min(cur, 6) + 1).map((q, i) => (i ? 'L' : 'M') + q.x + ' ' + q.y).join(' ');
  const nodes = ACTS.map((A, i) => { const pr = Game.actProgress(i);
    return `<g class="jn ${done(i) ? 'done' : locked(i) ? 'locked' : 'cur'}${i === sel ? ' sel' : ''}" data-act="${i}" transform="translate(${pts[i].x} ${pts[i].y})" tabindex="0" role="button" aria-label="פרק ${i + 1}">
      <circle r="24" class="jr-bg"/><circle r="24" class="jr-ring" style="stroke-dasharray:${Math.round(pr.done / pr.total * 151)} 151"/><text class="je" y="7">${locked(i) ? '🔒' : A.badge}</text>
      <text class="jt" y="${i % 2 ? 44 : -34}">${i + 1}. ${esc(A.name)}</text></g>`; }).join('');
  const total = Object.keys(S.episodes).length;
  Panel.open('🗺️ מפת המסע', `<div class="menu-context"><small>ההתקדמות</small><div>${S.badges.length}/7 תגים · ${total}/${C.episodes.length} אירועים · רמה ${levelOf(S.xp)} — ${esc(titleFor(levelOf(S.xp)))}. ${esc(Game.questText())}</div></div>
    <svg class="jmap" viewBox="0 0 ${W} ${H}" role="group" aria-label="מפת הפרקים"><path d="${path}" class="jpath"/><path d="${reach}" class="jpath reach"/>${nodes}</svg>
    <div class="jdetail">${chapterHTML(sel)}</div>${Game.state === 'OVERWORLD' ? backBtn : ''}`, { cls: 'wide', bind: el => {
    bindBack(el); paintFaces();
    el.querySelectorAll('.jn').forEach(n => { const go = () => openJourney(+n.dataset.act); n.onclick = go; n.onkeydown = e => { if (e.key === 'Enter') go(); }; });
  } });
}

/* ---------- research basis ---------- */
function openEvidence(tab) {
  tab = tab || 'game';
  let body = '';
  if (tab === 'game') body = `<div class="menu-context"><small>למה המשחק בנוי כך</small><div>כל מכניקה במשחק מבוססת על מחקר בחינוך קליני. התוכן הקליני מקושר להנחיות עדכניות — המקורות מופיעים בסיכום כל אירוע, בסבבי המעבדה ובמעבדון.</div></div>` +
    PEDAGOGY.map(p => `<div class="journal-entry evid"><b>${p.icon} ${esc(p.t)}</b><div class="evid-g">במשחק: ${esc(p.g)}</div>${esc(p.why)}<div class="srcs">${srcLinks(p.s)}</div></div>`).join('');
  else {
    const groups = [['גריאטריה, תרופות ותפקוד', ['beers2023', 'stopp2023', 'scott2015', 'falls2022', 'freeman2011', 'nice_delirium', 'tieges2021', 'inouye1999', 'npiap2019', 'nice_cg124', 'nice_ng27', 'who_toc2019', 'ahrq_teachback']],
      ['נוירולוגיה', ['aha_stroke2019', 'trinka2015', 'nice_ng232']],
      ['לב וריאות', ['acls2020', 'af2023', 'hf2022', 'esc_htn2024', 'thygesen2018', 'esc_pe2019', 'righini2014', 'drew2010', 'gold2025', 'bts_o2_2017', 'mandell2019']],
      ['כליה ומטבוליזם', ['ukka_k', 'kdigo_aki2012', 'kdigo_ckd2024', 'kdigo_anemia2026', 'spasovski2014', 'adrogue2000', 'ada2025', 'umpierrez2024', 'berend2014', 'nice_cg32', 'endo_ca2023']],
      ['זיהום והמטולוגיה', ['ssc2021', 'sepsis3', 'taylor2001', 'idsa_cdi2021', 'freifeld2011', 'mermel2009', 'aabb2023', 'bsh_atr2023', 'aga2020', 'devalia2014', 'acc_bleed2020', 'acg_ugib2021', 'merck_hemat']],
      ['כאב, ניתוח ופליאציה', ['cdc_opioid2022', 'boast_cs', 'wses_asbo', 'asco_dyspnea2021']],
      ['מעבדה', ['merck_labs']],
      ['חינוך קליני', ['tanner2006', 'lasater2007', 'ncjmm2019', 'kononowicz2019', 'gentry2019', 'hattie2007', 'berner2008', 'roediger2006', 'cepeda2006', 'muller2018']]];
    body = groups.map(([g, ids]) => `<div class="pg-section">${g}</div><ol class="biblio">${srcFull(ids)}</ol>`).join('');
  }
  Panel.open('🔬 בסיס מחקרי', `<div class="j-tabs">${[['game', '🎮 המכניקות והמחקר'], ['refs', '📚 רשימת מקורות']].map(t => `<button class="system-btn${t[0] === tab ? ' diff-sel' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div><div class="panel-list">${body}</div>
    <p class="muted">כלי למידה. אינו מחליף פרוטוקול מוסדי, טווחי מעבדה מקומיים או שיקול דעת קליני. הנחיות מתעדכנות — כדאי לבדוק את הגרסה העדכנית.</p>${Game.state === 'OVERWORLD' ? backBtn : ''}`,
    { cls: 'wide', bind: el => { bindBack(el); el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openEvidence(b.dataset.tab)); } });
}

/* ---------- labdex ---------- */
function openDex(cat) {
  const cats = [...new Set(C.labs.map(l => l.cat))];
  cat = cat || cats[0];
  const caught = Object.values(S.dex).filter(v => v === 2).length;
  const list = C.labs.map((l, i) => ({ l, i })).filter(x => x.l.cat === cat);
  Panel.open('🧪 מעבדון · ' + caught + '/' + C.labs.length, `<div class="j-tabs wrap">${cats.map(c => `<button class="system-btn${c === cat ? ' diff-sel' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="dex-grid">${list.map(({ l, i }) => { const s = S.dex[l.id] || 0; return `<button class="dex-card s${s}" data-lab="${l.id}" ${s === 2 ? '' : 'aria-disabled="true"'}><small>#${String(i + 1).padStart(3, '0')}</small><b>${s === 2 ? esc(l.en) : s === 1 ? esc(l.en) : '???'}</b><span>${s === 2 ? esc(l.name) : s === 1 ? 'נראה · טרם זוהה' : 'לא נתגלה'}</span></button>`; }).join('')}</div>
    <div class="tw-actions"><button class="btn-main" data-quiz>🎯 זיהוי בדיקה</button>${Game.state === 'OVERWORLD' ? backBtn : ''}</div>`, { cls: 'wide', bind: el => {
    bindBack(el);
    el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => openDex(b.dataset.cat));
    el.querySelector('[data-quiz]').onclick = () => { Panel.close(true); Game.run(dexQuiz); };
    el.querySelectorAll('[data-lab]').forEach(b => b.onclick = () => { const l = C.labs.find(x => x.id === b.dataset.lab); if (S.dex[l.id] !== 2) { Sound.back(); return; } dexEntry(l, cat); });
  } });
}
function dexEntry(l, cat) {
  Panel.open('🧪 ' + esc(l.en) + ' · ' + esc(l.name), `<div class="dex-entry"><div class="dex-range"><small>טווח</small><b>${esc(l.range)}</b><span>${esc(l.unit)}</span></div><div class="pg-tag">${esc(l.cat)}</div></div>
    <div class="journal-entry"><b>מה זה</b>${esc(l.what)}</div><div class="journal-entry"><b>⬆️ גבוה</b>${esc(l.high)}</div><div class="journal-entry"><b>⬇️ נמוך</b>${esc(l.low)}</div>
    <div class="journal-entry"><b>👵 בגריאטריה</b>${esc(l.geri)}</div><div class="journal-entry warn"><b>⚠️ מלכודת</b>${esc(l.pit)}</div>
    <div class="srcs"><span class="muted">📚 טווחים משתנים בין מעבדות — תמיד לפי הטווח המקומי.</span>${srcLinks((LAB_SOURCES[l.id] || []).concat('merck_labs'))}</div>
    <button class="close-btn" data-dex>↩ למעבדון</button>`, { bind: el => el.querySelector('[data-dex]').onclick = () => openDex(cat) });
}
async function dexQuiz() {
  const pool = C.labs.filter(l => S.dex[l.id] !== 2);
  if (!pool.length) return UI.say('🧪 זיהית את כל 78 הבדיקות. המעבדון שלם!');
  const seen = pool.filter(l => S.dex[l.id] === 1);
  const L = pick(seen.length && Math.random() < .7 ? seen : pool);
  const same = shuffle(C.labs.filter(x => x.cat === L.cat && x.id !== L.id));
  const others = same.length >= 3 ? same.slice(0, 3) : same.concat(shuffle(C.labs.filter(x => x.cat !== L.cat)).slice(0, 3 - same.length));
  const opts = shuffle([L].concat(others));
  const mask = s => { let t = s; [L.name, L.en].concat(L.en.split(/[\s/()]+/)).filter(w => w && w.length > 1).forEach(w => { t = t.split(w).join('▒▒▒'); }); return t; };
  Sound.reveal();
  const i = await UI.ask('🎯 איזו בדיקה זו? “' + mask(L.what) + '”', opts.map(o => ({ label: o.en + ' · ' + o.name })), { name: 'זיהוי למעבדון · ' + L.cat, tall: true, cancel: true });
  if (i < 0) return;
  const ok = opts[i].id === L.id;
  await UI.mark(i, ok, opts.indexOf(L));
  if (ok) {
    S.dex[L.id] = 2; Sound.good();
    await UI.say('✓ ' + L.en + ' נוסף/ה למעבדון! טווח: ' + L.range + ' ' + L.unit + '. 👵 ' + L.geri, { tall: true });
    Game.dailyTick('dex');
    await Game.reward(10, 4);
  } else {
    if (!S.dex[L.id]) S.dex[L.id] = 1; Sound.bad();
    await UI.say('✗ זו הייתה ' + L.en + ' (' + L.name + '). היא נשארת “נראתה” — נסה/י שוב בהמשך. 💡 ' + L.pit, { tall: true });
    Game.save();
  }
}
async function chooseLabRound() {
  const opts = C.labRounds.map((c, i) => ({ icon: S.labRounds[i] ? '★'.repeat(S.labRounds[i]) : '🧪', label: (i + 1) + '. ' + c.t, sub: c.st }));
  const next = C.labRounds.findIndex((_, i) => !S.labRounds[i]);
  const i = await UI.ask('איזה סבב? ' + (next >= 0 ? '(הבא בתור: ' + (next + 1) + ')' : '(כולם נפתרו — אפשר לשפר כוכבים)'), opts, { name: 'סבבי מעבדה קריטיים', cancel: true, tall: true });
  if (i >= 0) await labBattle(i);
}

/* ---------- render: title, cutscene, transitions ---------- */
function renderTitle(dt) { Game.titleT += dt; Art.title(Game.titleT); }
function renderCutscene(dt) {
  const c = Game.cut; if (!c) return;
  c.t += dt;
  Art.cutsceneBg(clock);
  const bar = VH * .11;
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(0, 0, VW, bar); ctx.fillRect(0, VH - bar, VW, bar);
  const a = clamp(c.t / 500, 0, 1);
  heText(c.pages[c.i] || '', VW - 24, VH - bar / 2 + 6, { size: 17, bold: true, color: '#13304a', alpha: a, maxWidth: VW - 60 });
  heText('▼', 22, VH - 12, { size: 10, color: '#c27c0e', alpha: .4 + .6 * Math.abs(Math.sin(clock / 300)), ltr: true, align: 'center' });
}
function renderTransition(dt) {
  const T = Game.trans; if (!T) return;
  T.t += dt;
  const k = clamp(T.t / T.dur, 0, 1);
  const cover = T.phase === 'out' ? k : 1 - k;
  if (T.kind === 'fade' || T.phase === 'in') { ctx.fillStyle = 'rgba(244,248,251,' + cover + ')'; ctx.fillRect(0, 0, VW, VH); }
  else {
    const n = 8, h = VH / n;
    for (let i = 0; i < n; i++) {
      const kk = clamp(k * 1.5 - i * .06, 0, 1), w = VW * easeIn(kk);
      ctx.fillStyle = T.kind === 'boss' ? (i % 2 ? '#f2b544' : '#ffe2a0') : (i % 2 ? '#0e8f86' : '#bfe9e3');
      if (i % 2) ctx.fillRect(VW - w, i * h, w, h + 1); else ctx.fillRect(0, i * h, w, h + 1);
    }
    if (k < .25) { ctx.fillStyle = 'rgba(255,255,255,' + (.5 * (1 - k / .25)) + ')'; ctx.fillRect(0, 0, VW, VH); }
    if (T.kind === 'boss' && k > .5) heText('ביקור גדול', VW / 2, VH / 2 + 10, { size: 30, bold: true, color: '#7a4b04', align: 'center', alpha: (k - .5) * 2, stroke: '#fff', strokeW: 6 });
  }
  if (k >= 1) { const r = T.res; if (T.phase === 'in') Game.trans = null; else { T.done = true; T.t = T.dur; } if (r) { T.res = null; r(); } }
}

/* ---------- main loop ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(50, now - last); last = now; clock += dt;
  // input
  while (Input.queue.length) {
    const act = Input.queue.shift();
    if (['up', 'down', 'left', 'right', 'a', 'b'].includes(act)) S.padUsed = true;
    if (Panel.isOpen) { Panel.handle(act); continue; }
    if (UI.active) { UI.handle(act); continue; }
    if (Game.state === 'TITLE') { if (act === 'a') { const b = [...document.querySelectorAll('#title-modal .btn-main')].find(x => x.offsetParent); if (b) b.click(); } continue; }
    if (Game.state === 'CUTSCENE') { if (act === 'a' || act === 'b') Game.cutNext(); continue; }
    if (Game.state === 'OVERWORLD' && !Game.busy) { if (act === 'a') interact(); else if (act === 'menu') openMenu(); }
  }
  if (Game.state === 'OVERWORLD') stepWorld(dt);
  if (Game.state === 'BATTLE') stepBattle(dt);
  stepFx(dt);
  // draw
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, VW, VH);
  if (Game.state === 'TITLE' || Game.state === 'BOOT') renderTitle(dt);
  else if (Game.state === 'CUTSCENE') renderCutscene(dt);
  else if (Game.state === 'BATTLE' && battle) renderBattle(dt);
  else if (S.player) renderWorld();
  renderScreenOverlay();
  renderTransition(dt);
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
function applyOrientation() {
  const w = window.innerWidth, h = window.innerHeight;
  document.documentElement.style.setProperty('--vw', w + 'px'); document.documentElement.style.setProperty('--vh', h + 'px');
  document.body.classList.add('force-land');
  document.body.classList.toggle('rotated', h > w);
  resizeCanvas(); Art.clearLayers();
}
function tryLockLandscape() {
  try { const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    const lock = () => { try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
    if (req && !document.fullscreenElement && matchMedia('(pointer:coarse)').matches) { const r = req.call(el); if (r && r.then) r.then(lock).catch(() => {}); } else lock();
  } catch (e) {}
}
function boot() {
  const d = Game.readSave(); if (d) Game.adopt(d); else applySettings();
  applyOrientation();
  window.addEventListener('resize', applyOrientation);
  window.addEventListener('orientationchange', () => setTimeout(applyOrientation, 200));
  setupTouch();
  $('menu-btn').onclick = () => openMenu();
  $('quest-box').onclick = () => { if (Game.state === 'OVERWORLD' && !Game.busy) openJourney(); };
  $('btn-new').onclick = () => { if (Game.readSave()) { Panel.open('⚠️ משמרת חדשה', '<p>יש שמירה קיימת. משחק חדש ימחק אותה (אפשר לייצא גיבוי קודם מהתפריט).</p><div class="db-btns"><button class="btn-main" data-a="y">כן, משמרת חדשה</button><button class="system-btn" data-a="n">ביטול</button></div>', { bind: el => { el.querySelector('[data-a=y]').onclick = () => { Panel.close(true); Game.newGameDialog(); }; el.querySelector('[data-a=n]').onclick = () => Panel.close(); } }); } else Game.newGameDialog(); };
  $('btn-continue').onclick = () => Game.continueGame();
  $('btn-settings').onclick = () => openSettings();
  $('skip-btn').onclick = () => { if (Game.state === 'CUTSCENE') Game.endCutscene(); };
  document.addEventListener('visibilitychange', () => { try { if (document.hidden) { Game.save(); Sound.ctx && Sound.ctx.suspend(); } else Sound.ctx && Sound.ctx.resume(); } catch (e) {} });
  const gate = $('boot-gate');
  const go = () => {
    gate.onclick = null;
    Sound.init(); try { Sound.ctx && Sound.ctx.resume(); } catch (e) {}
    tryLockLandscape();
    gate.style.opacity = '0'; setTimeout(() => gate.style.display = 'none', 360);
    MaeSplash.play($('mae-splash'), { audio: S.settings.sound !== false ? Sound.ctx : null, volume: S.settings.sfxVol, onDone: () => Game.showTitle() });
  };
  gate.onclick = go;
  gate.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') go(); };
  gate.focus();
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
boot();
