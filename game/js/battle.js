/* המשמרת — battles: the clinical encounter as a Gen-3 style fight.
   Enemy = the clinical problem (its HP = how unresolved it is).
   Hero plate = patient stability (HP) and time for assessment (AP).
   Commands: assess (notice), decide (interpret → goal → act → reassess), chart, items, consult, leave. */
'use strict';

let battle = null;
const disp = { ehp: 1, ehpG: 1, hp: 1, hpG: 1, ap: 1 };

const DIFF = {
  learner: { name: 'מתלמד/ת', wrong: 12, sure: 16, noise: 3, start: 100, time: 100 },
  normal: { name: 'רגיל', wrong: 18, sure: 26, noise: 5, start: 100, time: 80 },
  expert: { name: 'מומחה/ית', wrong: 26, sure: 36, noise: 8, start: 100, time: 60 },
};
const diff = () => DIFF[S.difficulty] || DIFF.normal;

// Logical height taken by the command box (measured, eased, capped) so the nurse and her plate stay visible.
let msgHs = 112;
function msgH() {
  const sa = $('screen-area'), m = $('msg');
  if (sa.clientHeight && m.classList.contains('show') && !m.classList.contains('tall')) {
    const want = clamp(m.offsetHeight * VH / sa.clientHeight + 4, 90, VH * .5);
    msgHs = lerp(msgHs, want, .15);
  }
  return msgHs;
}
function battleFrame() {
  // plate / sprite anchors in logical units
  const narrow = VW < 560;
  return {
    foe: { x: narrow ? VW * .28 : VW * .3, y: VH * .2 + 8 + (VH - 320) * .3 },
    hero: { x: VW * .81, y: Math.max(VH * .5, VH - msgH() - 2) },
  };
}

/* ---------- rendering ---------- */
function renderBattle(dt) {
  const B = battle; if (!B) return;
  const F = battleFrame();
  ctx.save();
  if (FX.shake > 0) ctx.translate(Math.sin(clock * .11) * 4 * FX.shake / 300, Math.cos(clock * .13) * 3 * FX.shake / 300);
  Art.battleBackdrop(B.scene, B.patient);
  const intro = 1 - easeOut(clamp(B.introT / 520, 0, 1));
  const ec = (TYPES[B.enemy.type] || TYPES.meds).color;
  Art.platform(F.foe.x, F.foe.y + 44, 70, 15, ec + '');
  Art.platform(F.hero.x, F.hero.y + 2, 58, 12, '#7aa4b8');
  // enemy
  const e = B.enemy;
  let fx = F.foe.x - intro * 280, fy = F.foe.y;
  if (B.foeAnim) { const k = attack(B.foeAnim.t / B.foeAnim.dur); fx += (F.hero.x - F.foe.x) * .3 * k; fy += (F.hero.y - F.foe.y) * .3 * k; }
  if (e.person) {
    const sh = e.shake > 0 && !reduceFx() ? Math.sin(clock * .09) * 4 : 0;
    Art.drawPerson(ctx, fx + sh, fy + 44, e.person, { size: 84, dir: 'right', flash: e.flash > 0 && (e.flash % 100) > 50, alpha: 1 - (e.dying || 0), seed: 3 });
  } else Art.drawCreature(ctx, e, fx, fy, .9);
  // hero (the nurse, facing the problem)
  let hx = F.hero.x + intro * 260, hy = F.hero.y;
  if (B.heroAnim) { const k = attack(B.heroAnim.t / B.heroAnim.dur); if (B.heroAnim.type === 'lunge') { hx += (F.foe.x - F.hero.x) * .22 * k; hy += (F.foe.y - F.hero.y) * .22 * k; } else hx += 10 * Math.sin(Math.PI * clamp(B.heroAnim.t / B.heroAnim.dur, 0, 1)); }
  Art.drawPerson(ctx, hx, hy, S.player.look, { size: 74, dir: 'left', walking: !!B.heroAnim, phase: clock / 90, flash: B.heroFlash > 0 && (B.heroFlash % 100) > 50, bob: Math.sin(clock / 420) * 1.2 });
  renderFx();
  ctx.restore();
  // low stability: a slow red pulse at the edges, like a monitor alarm
  if (B.hp / B.maxHp <= .3 && !reduceFx()) { const a = .10 + .08 * Math.sin(clock / 260); ctx.fillStyle = rad(VW / 2, VH / 2, VH * .35, VW * .7, [[0, 'rgba(224,82,82,0)'], [1, 'rgba(224,82,82,' + a + ')']]); ctx.fillRect(0, 0, VW, VH); }
  drawPlates(B, F);
}
const attack = t => { t = clamp(t, 0, 1); if (t < .18) return -.07 * Math.sin(t / .18 * Math.PI / 2); if (t < .5) return lerp(-.07, 1, easeOut((t - .18) / .32)); return 1 - easeInOut((t - .5) / .5); };

const hpCol = v => v > .5 ? '#22a35a' : v > .25 ? '#e0a514' : '#e05252';
function drawPlates(B, F) {
  const e = B.enemy, T = TYPES[e.type] || TYPES.meds;
  const s = clamp(VW / 560, .9, 1.08);
  const INK = '#13304a', MUTED = '#5d7488', BG = 'rgba(255,255,255,.94)', EDGE = '#b9cbda';
  // enemy plate — top right (RTL: the problem is introduced where reading starts)
  ctx.save(); ctx.translate(VW - 10, 10); ctx.scale(s, s);
  const W = 236, H = 60;
  ctx.save(); ctx.shadowColor = 'rgba(30,60,90,.18)'; ctx.shadowBlur = 10; ctx.fillStyle = BG; roundRect(ctx, -W, 0, W, H, 9); ctx.fill(); ctx.restore();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1; roundRect(ctx, -W, 0, W, H, 9); ctx.stroke();
  ctx.fillStyle = T.color; roundRect(ctx, -5, 8, 3, H - 16, 1.5); ctx.fill();
  heText(e.name, -12, 19, { size: 14, bold: true, maxWidth: 168, color: INK });
  ctx.fillStyle = T.color + '2a'; roundRect(ctx, -W + 6, 7, 66, 16, 5); ctx.fill(); ctx.strokeStyle = T.color; ctx.lineWidth = 1; roundRect(ctx, -W + 6, 7, 66, 16, 5); ctx.stroke();
  heText(T.icon + ' ' + T.name, -W + 68, 19, { size: 10, bold: true, color: INK, maxWidth: 60 });
  bar(-W + 10, 28, W - 22, 9, disp.ehpG, '#fde68a', '#e3ecf3');
  ctx.fillStyle = hpCol(disp.ehp); if (disp.ehp > 0) { roundRect(ctx, -W + 10 + (1 - disp.ehp) * (W - 22), 28, Math.max(9, disp.ehp * (W - 22)), 9, 4.5); ctx.fill(); }
  heText(e.barLabel || 'חומרה', -12, 52, { size: 10, bold: true, color: MUTED });
  numText(Math.max(0, Math.round(e.hp)) + ' / ' + e.maxHp, -W + 10, 52, { size: 10, color: MUTED });
  if (e.sub) heText(e.sub, -64, 52, { size: 10, bold: true, color: '#b26c06', maxWidth: 110 });
  ctx.restore();

  // hero plate — bottom left, above the command box
  const W2 = 196, H2 = 66;
  const top = VH - msgH() - 8 - H2 * s;
  ctx.save(); ctx.translate(Math.min(VW * .7, VW - 120 * s), Math.max(VH * .3, top)); ctx.scale(s, s);
  ctx.save(); ctx.shadowColor = 'rgba(30,60,90,.18)'; ctx.shadowBlur = 10; ctx.fillStyle = BG; roundRect(ctx, -W2, 0, W2, H2, 9); ctx.fill(); ctx.restore();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1; roundRect(ctx, -W2, 0, W2, H2, 9); ctx.stroke();
  heText(B.heroLabel || S.player.name, -10, 16, { size: 13, bold: true, maxWidth: 120, color: INK });
  numText('Lv.' + levelOf(S.xp), -W2 + 8, 16, { size: 11, bold: true, color: '#b26c06' });
  bar(-W2 + 8, 22, W2 - 16, 9, disp.hpG, '#fca5a5', '#e3ecf3');
  ctx.fillStyle = hpCol(disp.hp); if (disp.hp > 0) { roundRect(ctx, -W2 + 8 + (1 - disp.hp) * (W2 - 16), 22, Math.max(9, disp.hp * (W2 - 16)), 9, 4.5); ctx.fill(); }
  if (B.time != null) { bar(-W2 + 8, 36, W2 - 16, 7, 0, '#38bdf8', '#e3ecf3'); ctx.fillStyle = '#2b9fd8'; if (disp.ap > 0) { roundRect(ctx, -W2 + 8 + (1 - disp.ap) * (W2 - 16), 36, Math.max(7, disp.ap * (W2 - 16)), 7, 3.5); ctx.fill(); } }
  heText((B.hpLabel || 'יציבות') + ' ' + Math.max(0, Math.round(B.hp)) + (B.time != null ? '  ·  ⏱ זמן ' + Math.max(0, Math.round(B.time)) : ''), -10, 58, { size: 10, bold: true, color: MUTED });
  ctx.restore();
}

function stepBattle(dt) {
  const B = battle; if (!B) return;
  B.introT += dt;
  const e = B.enemy;
  ['flash', 'shake'].forEach(k => { if (e[k] > 0) e[k] -= dt; });
  if (e.recoilT > 0) { e.recoilT -= dt; e.recoil = Math.sin(Math.PI * (1 - e.recoilT / 260)); } else e.recoil = 0;
  if (B.heroFlash > 0) B.heroFlash -= dt;
  if (e.dyingT != null) { e.dyingT += dt; e.dying = clamp(e.dyingT / 700, 0, 1); }
  ['heroAnim', 'foeAnim'].forEach(k => { if (B[k]) { B[k].t += dt; if (B[k].t >= B[k].dur) B[k] = null; } });
  const tE = clamp(e.hp / e.maxHp, 0, 1), tH = clamp(B.hp / B.maxHp, 0, 1);
  disp.ehp = lerp(disp.ehp, tE, .12); disp.hp = lerp(disp.hp, tH, .12);
  disp.ehpG = disp.ehpG > disp.ehp ? Math.max(disp.ehp, disp.ehpG - dt / 1800) : disp.ehp;
  disp.hpG = disp.hpG > disp.hp ? Math.max(disp.hp, disp.hpG - dt / 1800) : disp.hp;
  if (B.time != null) disp.ap = lerp(disp.ap, clamp(B.time / B.maxTime, 0, 1), .12);
}

/* ---------- animation beats ---------- */
async function heroStrike(big) {
  const B = battle, F = battleFrame(), e = B.enemy;
  B.heroAnim = { type: 'lunge', t: 0, dur: 520 };
  await sleep(240);
  e.flash = 300; e.shake = 260; e.recoilT = 260;
  screenShake(big ? 260 : 150);
  const col = (TYPES[e.type] || TYPES.meds).color;
  addRing(F.foe.x, F.foe.y, { maxR: big ? 96 : 62, color: col, width: big ? 5 : 3 });
  addParticles(F.foe.x, F.foe.y, big ? 26 : 14, { color: [col, '#fde68a', '#fff'], speed: big ? 190 : 130, life: 650, size: 3.5, lift: 40, star: big });
  if (big) { screenFlash('#fde68a', 110); Sound.crit(); addFloater(F.foe.x, F.foe.y - 96, '⚡ יעיל במיוחד!', { color: '#fde68a', size: 17, life: 1200 }); } else Sound.hit();
  buzz(big ? [20, 30, 40] : 20);
  await sleep(320);
}
async function foeStrike(dmg) {
  const B = battle, F = battleFrame();
  B.foeAnim = { t: 0, dur: 520 };
  await sleep(250);
  B.heroFlash = 300; B.heroAnim = { type: 'hurt', t: 0, dur: 300 };
  screenShake(200); Sound.bad(); buzz([60, 40, 60]);
  addParticles(F.hero.x, F.hero.y - 40, 12, { color: ['#f87171', '#fca5a5'], speed: 120, life: 500, size: 3 });
  addFloater(F.hero.x, F.hero.y - 100, '-' + dmg, { color: '#fca5a5', size: 22 });
  await sleep(300);
}
function healFx(n) {
  const F = battleFrame();
  addParticles(F.hero.x, F.hero.y - 50, 14, { color: ['#4ade80', '#bbf7d0'], speed: 80, life: 800, size: 3, lift: 90, star: true });
  addFloater(F.hero.x, F.hero.y - 100, '+' + n, { color: '#4ade80', size: 22 });
  Sound.heal();
}

/* ---------- shared helpers ---------- */
function startBattle(cfg) {
  battle = Object.assign({ introT: 0, hp: 100, maxHp: 100, time: null, maxTime: 100, stage: 0, stages: null, xp: 0, coins: 0, firstTry: 0, used: {}, log: [] }, cfg);
  battle.enemy = Object.assign({ hp: 100, maxHp: 100, seed: Math.random() * 6, flash: 0, shake: 0, recoilDir: -1 }, cfg.enemy);
  disp.ehp = disp.ehpG = 1; disp.hp = disp.hpG = battle.hp / battle.maxHp; disp.ap = 1;
  UI.mode('battle'); UI.stripe = (TYPES[battle.enemy.type] || TYPES.meds).color;
  Game.state = 'BATTLE';
  Game.uncover();
  Music.play(cfg.music || 'battle');
  document.body.classList.add('in-battle');
}
function endBattle() {
  battle = null; UI.stripe = null; UI.hide(); UI.mode('world');
  document.body.classList.remove('in-battle');
  Game.state = 'OVERWORLD';
  Music.play(MAPS[S.map].music);
  Game.refresh();
}
async function battleTransition(kind) {
  Sound.encounter();
  await Game.transition(kind === 'boss' ? 'boss' : 'battle');
}
/* The step bar and the one-line "what now" guidance shown above every battle message. */
function stepsHTML(B, hint) {
  const names = B.kind === 'episode' ? ['🔍 אומדן'].concat(STAGES.map(st => st.name)) : B.stages ? B.stages.map(st => st.name) : [];
  const off = B.kind === 'episode' ? 1 : 0;
  const cur = B.kind === 'episode' ? (B.stage === 0 && !B.found.size ? 0 : B.stage + 1) : B.stage;
  const done = i => B.kind === 'episode' ? (i === 0 ? B.found.size > 0 : i - off < B.stage) : i < B.stage;
  const bar = names.length ? '<div class="bsteps">' + names.map((n, i) => `<span class="${done(i) ? 'done' : ''}${i === cur ? ' cur' : ''}">${done(i) ? '✓ ' : (i + 1) + ' · '}${esc(n)}</span>`).join('<i>‹</i>') + '</div>' : '';
  const tags = [B.exposed && '🔍 הבעיה חשופה — ההחלטה הבאה תפגע חזק', B.shield && '🛡️ מוגן מטעות אחת', B.guide && '📘 שתי תשובות יוסרו'].filter(Boolean);
  return bar + (hint ? `<div class="bhint">👉 ${esc(hint)}${tags.length ? `<span class="btags">${tags.map(t => `<span>${t}</span>`).join('')}</span>` : ''}</div>` : '');
}
function episodeHint(B) {
  const st = STAGES[B.stage];
  if (B.stage === 0 && B.found.size === 0) return 'התחל/י ב-🔍 אומדן: בחר/י ממצא לבדוק. ★ ממצא קריטי חושף את הבעיה.';
  if (B.stage === 0 && B.found.size < 2) return 'עוד ממצא אחד או שניים — או, אם התמונה ברורה, 🧠 החלטה.';
  return 'שלב ' + (B.stage + 1) + ' מתוך 4: לחץ/י 🧠 החלטה — ' + st.prompt;
}
/* A lab test mentioned in a finding → its short explanation from the Labdex (and mark it seen). */
const LAB_ALIAS = { creat: ['CR', 'CREATININE'], hba1c: ['A1C', 'HBA1C'], troponin: ['TROPONIN', 'HS-TN'], glucose: ['GLUCOSE'], phos: ['PHOS'], co2: ['HCO3'], paco2: ['PACO2'], ph: ['PH'], ldl: ['LDL'], egfr: ['EGFR'], bun: ['BUN'], retic: ['RETIC', 'RETICULOCYTES'], ddimer: ['D-DIMER'], tsat: ['TSAT'], ca: ['CA', 'CALCIUM'], plt: ['PLT'], wbc: ['WBC'], anc: ['ANC'] };
function labKeys(l) { const k = [l.en.toUpperCase().replace(/[₀-₉]/g, d => '0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(d)]).split(/[\s/(]/)[0].replace(/[^A-Z0-9-]/g, '')].concat(LAB_ALIAS[l.id] || []); return k.filter(x => x); }
/* A lab test mentioned in a finding → its short explanation from the Labdex (and mark it seen). */
function labInfo(text) {
  const T = ' ' + String(text).toUpperCase().replace(/[₀-₉]/g, d => '0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(d)]) + ' ';
  const hit = k => new RegExp('[^A-Z0-9]' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^A-Z0-9]').test(T);
  const l = C.labs.find(x => labKeys(x).some(hit));
  if (!l) return '';
  if (!S.dex[l.id]) S.dex[l.id] = 1;
  return '\n📖 ' + l.en + ' — ' + l.what + (l.range ? ' (טווח: ' + l.range + ' ' + l.unit + ')' : '');
}
function chipsHTML(list, cls) { return `<div class="chips ${cls || ''}">` + list.map(c => typeof c === 'string' ? `<span>${esc(c)}</span>` : `<span class="${c.cls || ''}">${esc(c.t)}</span>`).join('') + '</div>'; }

function invOptions() {
  return Object.keys(ITEMS).map(k => ({ k, icon: ITEMS[k].icon, label: ITEMS[k].name + ' ×' + (S.inv[k] || 0), sub: ITEMS[k].desc, disabled: !(S.inv[k] > 0), tint: ITEMS[k].tint }));
}

/* Decision helper with elimination: wrong picks stay visible and greyed; returns {first, conf, fail}. */
async function decide(prompt, options, correct, o) {
  const B = battle;
  const order = shuffle(options.map((_, i) => i));
  const gone = new Set(o.eliminated || []);
  if (B.guide) { shuffle(order.filter(i => i !== correct && !gone.has(i))).slice(0, 2).forEach(i => gone.add(i)); B.guide = false; }
  if (B.cut) { shuffle(order.filter(i => i !== correct && !gone.has(i))).slice(0, B.cut).forEach(i => gone.add(i)); B.cut = 0; }
  let first = true, conf = { value: 'maybe' }, firstConf = null;
  for (;;) {
    const opts = order.map(i => ({ label: options[i], disabled: gone.has(i), mark: gone.has(i) ? '✗' : '', cls: gone.has(i) ? 'gone' : '' }));
    const pickI = await UI.ask(prompt, opts, { two: true, name: o.name, cancel: o.cancel && first, conf: o.conf && first ? conf : null, tall: true, extra: o.extra });
    if (pickI < 0) return { cancelled: true };
    const idx = order[pickI];
    if (first) firstConf = conf.value;
    const ok = idx === correct;
    await UI.mark(pickI, ok);
    if (ok) return { first, conf: firstConf };
    gone.add(idx);
    if (o.onWrong) { const r = await o.onWrong(first, firstConf, options[idx]); if (r === 'fail') return { fail: true, first: false, conf: firstConf }; }
    first = false;
  }
}

function recordConf(conf, ok) {
  if (!conf) return;
  const c = S.calib[conf] || (S.calib[conf] = { right: 0, wrong: 0 });
  ok ? c.right++ : c.wrong++;
}
function domain(key, got, total) { const d = S.domains[key] || (S.domains[key] = [0, 0]); d[0] += got; d[1] += total; }

async function useItemMenu(ctxKind) {
  const opts = invOptions();
  const i = await UI.ask('🎒 ציוד — מה להשתמש?', opts, { cancel: true, name: 'ציוד' });
  if (i < 0) return false;
  const k = opts[i].k, B = battle;
  if (k === 'coffee' && B.time == null) { await UI.say('אין כאן אומדן מבוסס זמן — הקפה יחכה.'); return false; }
  if (k === 'torch' && !B.ep) { await UI.say('הפנס עוזר באומדן ליד המיטה. כאן אין ממצאים לחשוף.'); return false; }
  S.inv[k]--; Game.save();
  if (k === 'coffee') { B.time = Math.min(B.maxTime, B.time + 40); healFx(40); await UI.say('☕ לגימה של קפה — יש לך עוד 40 זמן לאומדן.'); }
  if (k === 'calm') { const n = Math.min(25, B.maxHp - B.hp); B.hp += n; healFx(n); await UI.say('🤝 ישבת רגע ליד המיטה והסברת מה קורה. היציבות משתפרת (+' + n + ').'); }
  if (k === 'shield') { B.shield = true; Sound.reveal(); await UI.say('🛡️ בדיקה כפולה: הטעות הבאה לא תפגע ביציבות.'); }
  if (k === 'guide') { B.guide = true; Sound.reveal(); await UI.say('📘 מדריך הכיס פתוח — בהחלטה הבאה יוסרו שתי תשובות שגויות.'); }
  if (k === 'torch') {
    let n = 0; B.ep.c.forEach((c, j) => { if (c[2] === 2 && !B.found.has(j)) { B.found.add(j); n++; } });
    B.exposed = B.exposed || n > 0; Sound.reveal();
    await UI.say(n ? '🔦 הפנס חשף ' + n + ' ממצאים קריטיים: ' + B.ep.c.filter(c => c[2] === 2).map(c => c[0] + ' — ' + c[1]).join(' · ') : '🔦 כבר מצאת את כל הממצאים הקריטיים.');
  }
  return true;
}

/* ============ 1. Clinical episode (patient) ============ */
async function episodeBattle(ep, opts) {
  opts = opts || {};
  const pt = C.patients[ep.p], type = episodeType(ep), D = diff();
  await battleTransition();
  startBattle({ kind: 'episode', ep, patient: ep.p, scene: 'room', time: D.time, maxTime: D.time, stages: STAGES, found: new Set(),
    enemy: { name: ep.t, type, icon: TYPES[type].icon, sub: pt.n, barLabel: 'חומרה' }, hpLabel: 'יציבות', heroLabel: S.player.name + ' · ' + pt.n.split(',')[0] });
  const B = battle;
  B.scoreClues = 0;
  const vit = (hint, bare) => (bare ? (hint ? '<div class="bhint">💡 ' + esc(hint) + '</div>' : '') : stepsHTML(B, hint)) + chipsHTML(ep.v.map(t => ({ t: '📈 ' + t, cls: 'vit' })).concat([...B.found].map(j => ({ t: (ep.c[j][2] === 2 ? '★ ' : ep.c[j][2] === 1 ? '◆ ' : '· ') + ep.c[j][0] + ': ' + ep.c[j][1], cls: 'r' + ep.c[j][2] }))));
  await sleep(520);
  const actEps = C.episodes.filter(e => e.a === ep.a), idxInAct = actEps.indexOf(ep) + 1;
  const prev = C.episodes.filter(e => e.p === ep.p && S.episodes[e.id] && e.id !== ep.id).pop();
  await UI.say(pick(BATTLE_INTROS).replace('{n}', /^[“"]/.test(ep.t) ? ep.t : '“' + ep.t + '”'), { name: 'פרק ' + (ep.a + 1) + ' · ' + ACTS[ep.a].name + ' · אירוע ' + idxInAct + '/' + actEps.length, extra: vit() });
  if (prev) await UI.say('בפעם הקודמת אצל ' + pt.n.split(',')[0] + ': “' + prev.t + '” — ' + prev.r[prev.rc] + '.', { name: '📖 עד עכשיו בסיפור', extra: vit() });
  await UI.say(pt.n + ' — ' + ep.st, { name: 'סיפור המקרה', extra: vit() });
  if (!S.flags.battleTut) {
    S.flags.battleTut = 1; Game.save();
    const coach = t => UI.say(t, { name: '🎓 רבקה מסבירה', extra: vit() });
    await coach('למעלה מימין — הבעיה הקלינית. כל החלטה נכונה מורידה את ה“חומרה” שלה. כשהיא מגיעה לאפס — פתרת את האירוע.');
    await coach('למטה משמאל — המטופל/ת: “יציבות” יורדת כשטועים, ו“⏱ זמן” מתבזבז על כל בדיקה באומדן.');
    await coach('הסדר תמיד זהה, כמו בפס השלבים: קודם 🔍 אומדן (2–3 ממצאים), ואז 🧠 ארבע החלטות. השורה עם 👉 תגיד לך מה עכשיו.');
  }
  const critTotal = ep.c.filter(c => c[2] === 2).length;
  let result = null;
  while (!result) {
    const st = STAGES[B.stage];
    const startHere = B.stage === 0 && B.found.size < 2;
    const cells = [
      { icon: '🔍', label: 'אומדן', sub: 'לבדוק ממצא · ⏱12', cls: 'primary' + (startHere ? ' gold' : '') },
      { icon: '🧠', label: 'החלטה', sub: 'שלב ' + (B.stage + 1) + ': ' + st.name, cls: 'primary' + (startHere ? '' : ' gold') },
      { icon: '📋', label: 'תיק', cls: 'mini' },
      { icon: '🎒', label: 'ציוד', cls: 'mini' },
      { icon: '👥', label: 'צוות', cls: 'mini' },
      { icon: '🏃', label: 'יציאה', cls: 'mini' },
    ];
    const c = await UI.ask('', cells, { grid: true, extra: stepsHTML(B, episodeHint(B)) });
    if (c === 0) await assess();
    else if (c === 1) {
      const r = await decide(st.prompt, ep[st.key], ep[st.ck], {
        name: 'שלב ' + (B.stage + 1) + ' · ' + st.name, cancel: true, conf: true, extra: vit(STAGE_TIP[st.key], true),
        onWrong: async (first, conf) => {
          if (first) { recordConf(conf, false); domain(st.dom, 0, 1); }
          B.combo = 0;
          if (B.shield) { B.shield = false; await UI.say('🛡️ הבדיקה הכפולה תפסה את הטעות לפני שהגיעה למטופל. ' + STAGE_HINT[st.key]); return; }
          const dmg = conf === 'sure' && first ? D.sure : D.wrong;
          await foeStrike(dmg); B.hp = Math.max(0, B.hp - dmg);
          if (B.hp <= 0) return 'fail';
          await UI.say('✗ לא מדויק — ' + pt.n.split(',')[0] + ' מחמיר/ה. ' + (first && conf === 'sure' ? 'ביטחון-יתר עולה ביוקר. ' : '') + STAGE_HINT[st.key], { extra: vit() });
        },
      });
      if (r.cancelled) continue;
      if (r.fail) { result = 'fail'; break; }
      if (r.first) { recordConf(r.conf, true); domain(st.dom, 1, 1); B.firstTry++; }
      const big = r.first && (B.exposed || r.conf === 'sure');
      await heroStrike(big);
      B.enemy.hp = Math.round(100 * (1 - (B.stage + 1) / 4));
      B.combo = r.first ? (B.combo || 0) + 1 : 0;
      const gain = (r.first ? (big ? 16 : 12) : 5) + (B.combo >= 2 ? (B.combo - 1) * 3 : 0); B.xp += gain;
      if (B.combo >= 2) { addFloater(battleFrame().hero.x, battleFrame().hero.y - 110, '🔥 רצף ×' + B.combo, { color: '#fb923c', size: 18, life: 1300 }); Sound.coin(); }
      addFloater(battleFrame().foe.x, battleFrame().foe.y - 70, '+' + gain + ' XP', { color: '#fde68a', size: 16 });
      const right = ep[st.key][ep[st.ck]];
      await UI.say((r.first ? (big ? '✓ יעיל במיוחד! ' : '✓ נכון. ') : '✓ הגעת לזה. ') + right, { extra: vit() });
      B.exposed = false; B.stage++;
      if (B.stage >= 4) result = 'win';
    }
    else if (c === 2) await UI.say('📋 ' + pt.n + ': ' + pt.s + (ep.tags ? ' · תגיות: ' + ep.tags.join(', ') : ''), { name: 'תיק המטופל', extra: vit(), tall: true });
    else if (c === 3) await useItemMenu('episode');
    else if (c === 4) {
      const crit = ep.c.filter(cc => cc[2] === 2).map(cc => cc[0]);
      await teamMenu(st.key === 'q' ? 'תסתכל/י על: ' + crit.join(', ') + '. מה מחבר ביניהם?' : STAGE_HINT[st.key], vit);
    }
    else if (c === 5) { const sure = await UI.ask('לצאת מהאירוע? אפשר לחזור אליו מאוחר יותר (ההתקדמות באירוע לא נשמרת).', [{ label: 'כן, אחזור אחר כך' }, { label: 'לא, ממשיכים' }]); if (sure === 0) result = 'leave'; }
  }

  async function assess() {
    const list = ep.c.map((cc, j) => B.found.has(j) ? { label: cc[0] + ': ' + cc[1], mark: cc[2] === 2 ? '★' : cc[2] === 1 ? '◆' : '·', disabled: true, cls: 'r' + cc[2] } : { label: cc[0], sub: '⏱ 12', mark: '?' });
    const j = await UI.ask('איזה ממצא לבדוק? כל בדיקה עולה ⏱12 (נשאר ' + Math.round(B.time) + ')', list, { cancel: true, name: '🔍 אומדן', extra: vit('★ קריטי = חושף את הבעיה · ◆ תומך · · רעש שמבזבז זמן') });
    if (j < 0) return;
    if (B.time < 12) { await UI.say('⏱ נגמר הזמן לאומדן. עכשיו צריך להחליט עם מה שיש (או ☕ קפה).'); return; }
    B.time -= 12; B.found.add(j);
    const cc = ep.c[j];
    if (cc[2] === 2) {
      B.exposed = true; B.scoreClues++; B.xp += 5; Sound.reveal();
      addParticles(battleFrame().foe.x, battleFrame().foe.y, 10, { color: ['#a3e635', '#fde68a'], speed: 90, star: true });
      await UI.say('★ ממצא קריטי! ' + cc[0] + ': ' + cc[1] + ' — זה ממצא שמשנה את ההחלטה. הבעיה נחשפת, וההחלטה הבאה תפגע חזק יותר.' + labInfo(cc[0] + ' ' + cc[1]), { extra: vit(), tall: true });
    } else if (cc[2] === 1) { Sound.blip(); await UI.say('◆ ממצא תומך: ' + cc[0] + ': ' + cc[1] + ' — מחזק את התמונה, אבל לבד לא היה משנה את ההחלטה.' + labInfo(cc[0] + ' ' + cc[1]), { extra: vit(), tall: true }); }
    else {
      await foeStrike(D.noise); B.hp = Math.max(1, B.hp - D.noise);
      await UI.say('· ' + cc[0] + ': ' + cc[1] + ' — רעש: נכון, אבל לא קשור לשאלה הקלינית. בגריאטריה קל לטבוע בנתונים — המיומנות היא לבחור מה לבדוק.' + labInfo(cc[0] + ' ' + cc[1]), { extra: vit(), tall: true });
    }
  }

  // ---- outcome ----
  if (result === 'leave') { Sound.back(); endBattle(); return; }
  domain('noticing', Math.min(B.scoreClues, Math.min(3, critTotal)), Math.min(3, critTotal));
  if (result === 'win') {
    B.enemy.dyingT = 0; Sound.good();
    await UI.say('המצב של ' + pt.n.split(',')[0] + ' מתייצב. “' + ep.t + '” נפתר!');
    const stars = B.hp >= 85 ? 3 : B.hp >= 55 ? 2 : 1;
    const rec = S.episodes[ep.id];
    const replay = !!rec;
    const xp = Math.round((B.xp + 20 + stars * 10) * (replay ? .5 : 1)), coins = (replay ? 5 : 12) + stars * 3;
    Game.recordEpisode(ep, stars, B);
    endBattle();
    await Game.reward(xp, coins);
    await Game.debrief(ep, { stars, win: true, xp, coins, hp: B.hp });
  } else {
    Sound.bad(); screenFlash('#ef4444', 300);
    await UI.say('🚨 קוד! היציבות קרסה — צוות ההחייאה בדרך. זה לא סוף הלמידה: בוא/י נראה מה פספסנו.');
    S.stats.codes = (S.stats.codes || 0) + 1;
    endBattle();
    await Game.debrief(ep, { stars: 0, win: false, xp: 0, coins: 0, hp: 0 });
  }
}

/* ============ 2. Grand rounds (the act's boss) ============ */
async function bossBattle(act) {
  const A = ACTS[act], D = diff();
  const eps = shuffle(C.episodes.filter(e => e.a === act));
  const qs = [];
  eps.forEach((e, i) => { const st = STAGES[i % 4]; qs.push({ e, st }); });
  while (qs.length < 7) { const e = pick(eps); qs.push({ e, st: pick(STAGES) }); }
  await battleTransition('boss');
  startBattle({ kind: 'boss', scene: 'conf', music: 'boss', hpLabel: 'ביטחון', heroLabel: S.player.name,
    enemy: { name: A.leader, type: ACT_TYPE[act], person: A.look, sub: A.role, barLabel: 'שכנוע' } });
  const B = battle;
  await sleep(520);
  await UI.say(A.leader + ': “ביקור רופאים גדול — ' + A.name + '. אני אציג מקרים מהמחלקה. תשכנע/י אותי שאת/ה מוכן/ה ל' + A.badgeName + '.”', { name: A.leader });
  let qi = 0, result = null;
  while (!result) {
    const c = await UI.ask('', [
      { icon: '🧠', label: 'להשיב', sub: 'שאלה ' + (qi + 1), cls: 'primary gold' },
      { icon: '🎒', label: 'ציוד', cls: 'mini' },
      { icon: '👥', label: 'צוות', cls: 'mini' },
      { icon: '🏳️', label: 'דחייה', cls: 'mini' },
    ], { grid: true, extra: '<div class="bhint">👉 5 תשובות נכונות מנצחות · 3 טעויות — נחזור לזה בהמשך</div>' });
    if (c === 3) { result = 'leave'; break; }
    if (c === 1) { await useItemMenu('boss'); continue; }
    if (c === 2) { await teamMenu(STAGE_HINT.q); continue; }
    const q = qs[qi++ % qs.length], e = q.e, st = q.st, pt = C.patients[e.p];
    const extra = chipsHTML(e.v.map(t => ({ t: '📈 ' + t, cls: 'vit' })));
    await UI.say(pt.n + ': ' + e.st, { name: A.leader + ' מציג/ה', extra });
    const r = await decide(st.prompt, e[st.key], e[st.ck], {
      name: st.name, extra,
      onWrong: async (first) => {
        if (B.shield) { B.shield = false; await UI.say('🛡️ עצרת לבדוק שוב — הטעות לא עלתה לך בביטחון.'); return; }
        await foeStrike(34); B.hp = Math.max(0, B.hp - 34);
        if (B.hp <= 0) return 'fail';
        await UI.say(A.leader + ': “לא בדיוק. ' + STAGE_HINT[st.key] + '”', { extra });
      },
    });
    if (r.fail) { result = 'fail'; break; }
    await heroStrike(r.first);
    B.enemy.hp = Math.max(0, B.enemy.hp - (r.first ? 20 : 10));
    await UI.say((r.first ? '✓ ' : '✓ בסוף הגעת לזה. ') + e[st.key][e[st.ck]] + ' — ' + e.pe + (EP_EVIDENCE[e.id] ? '\n📚 ' + EP_EVIDENCE[e.id].k : ''), { extra, tall: true });
    if (B.enemy.hp <= 0) result = 'win';
  }
  if (result === 'leave') { endBattle(); return; }
  if (result === 'win') {
    B.enemy.dyingT = null;
    Sound.badge(); screenFlash('#fde68a', 260);
    await UI.say(A.leader + ': “שכנעת אותי. זה ' + A.badgeName + ' — הרווחת אותו ליד המיטה.”', { name: A.leader });
    endBattle();
    await Game.awardBadge(act);
  } else {
    await UI.say(A.leader + ': “עוד לא. תחזור/י למטופלים — ואז נדבר.” (הביטחון יחזור אחרי מנוחה קצרה.)', { name: A.leader });
    endBattle();
  }
}

/* ============ 3. Critical lab rounds ============ */
async function labBattle(idx) {
  const cs = C.labRounds[idx], D = diff();
  const STEP_NAMES = { Pattern: 'Pattern', Mechanism: 'מנגנון', 'Drug link': 'קשר לתרופות/נתון', Reassess: 'הערכה חוזרת' };
  await battleTransition();
  startBattle({ kind: 'lab', scene: 'lab', music: 'battle', hpLabel: 'יציבות', stages: cs.steps.map(s => ({ name: STEP_NAMES[s[3]] || s[3] })),
    enemy: { name: cs.t, type: 'labs', icon: '🧪', sub: 'סבב מעבדה ' + (idx + 1) + '/' + C.labRounds.length, barLabel: 'תעלומה' } });
  const B = battle;
  const labChips = chipsHTML(cs.labs.map(t => ({ t: '🧪 ' + t, cls: 'lab' })));
  let extra = stepsHTML(B, 'קרא/י את הפאנל וענה/י על כל שלב.') + labChips;
  await sleep(520);
  await UI.say('טל: “' + cs.st + '” — הפאנל על המסך.', { name: 'סבב מעבדה קריטי', extra });
  let result = null;
  for (let i = 0; i < cs.steps.length && !result; i++) {
    const s = cs.steps[i];
    extra = stepsHTML(B) + labChips;
    const r = await decide(s[0], s[1], s[2], {
      name: 'שלב ' + (i + 1) + ' · ' + (STEP_NAMES[s[3]] || s[3]), extra, conf: true,
      onWrong: async (first, conf) => {
        if (first) recordConf(conf, false);
        if (B.shield) { B.shield = false; await UI.say('🛡️ הבדיקה הכפולה תפסה את זה.'); return; }
        const dmg = conf === 'sure' && first ? D.sure : D.wrong;
        await foeStrike(dmg); B.hp = Math.max(0, B.hp - dmg); if (B.hp <= 0) return 'fail';
        await UI.say('✗ לא זה. תסתכל/י שוב על הפאנל — מה ה-trend ומה ההקשר?', { extra });
      },
    });
    if (r.fail) { result = 'fail'; break; }
    if (r.first) { recordConf(r.conf, true); B.firstTry++; }
    await heroStrike(r.first && r.conf === 'sure');
    B.enemy.hp = Math.round(100 * (1 - (i + 1) / cs.steps.length)); B.stage = i + 1;
    await UI.say('✓ ' + s[1][s[2]] + '\n💡 ' + s[4], { extra, tall: true });
  }
  if (!result) result = 'win';
  if (result === 'win') {
    B.enemy.dyingT = 0; Sound.good();
    const stars = B.firstTry >= 4 ? 3 : B.firstTry >= 3 ? 2 : 1;
    const prev = S.labRounds[idx] || 0;
    S.labRounds[idx] = Math.max(prev, stars);
    const xp = Math.round((30 + B.firstTry * 10) * (prev ? .5 : 1)), coins = prev ? 4 : 12;
    await UI.say('התעלומה נפתרה! ' + '★'.repeat(stars) + '☆'.repeat(3 - stars) + '\n📚 מבוסס על: ' + LAB_ROUND_SOURCES[idx].map(id => SOURCES[id].t).join(' · '));
    Game.markLabsSeen(cs.labs.join(' '));
    Game.dailyTick('lab');
    endBattle();
    await Game.reward(xp, coins);
    if (Object.keys(S.labRounds).length === C.labRounds.length && !S.labBadge) { S.labBadge = true; Game.save(); Sound.badge(); UI.toast('🧪', 'תג המעבדה', 'סיימת את כל 12 סבבי המעבדה הקריטיים'); }
  } else {
    await UI.say('🚨 המטופל הידרדר בזמן שהפאנל חיכה. נחזור לזה — כל שלב מסביר את עצמו.');
    endBattle();
  }
}

/* ============ 4. Quick calls: pager (wild) and trainers ============ */
const PILLAR_TYPE = { cardio: 'cardio', neuro: 'neuro', pharm: 'meds', geron: 'func' };
function knowQ(K) { return { title: PILLARS[K.p].icon + ' ' + PILLARS[K.p].full, story: 'בדיקת ידע · ' + PILLARS[K.p].full, v: [], q: K.q, opts: K.a, c: K.c, explain: K.e, type: PILLAR_TYPE[K.p], src: K.s, kid: K.id }; }
function quickQuestion() {
  if (Math.random() < .65) return knowQ(Core.pickItem(Math.random() < .5 ? Core.weakest() : null));
  const unlocked = Game.unlockedAct();
  const pool = [];
  C.events.forEach(ev => { if (ev.act <= unlocked) pool.push({ kind: 'event', ev }); });
  Object.keys(S.episodes).forEach(id => { const e = C.episodes.find(x => x.id === id); if (e) pool.push({ kind: 'ep', e }); });
  const q = pick(pool) || { kind: 'event', ev: C.events[0] };
  if (q.kind === 'event') return { title: q.ev.title, story: q.ev.story, v: q.ev.v, q: q.ev.q, opts: q.ev.a, c: q.ev.c, explain: q.ev.e, type: ACT_TYPE[q.ev.act] || 'meds', src: EVENT_SOURCES[C.events.indexOf(q.ev)] };
  const st = pick(STAGES), e = q.e;
  return { title: e.t, story: C.patients[e.p].n + ': ' + e.st, v: e.v, q: st.prompt, opts: e[st.key], c: e[st.ck], explain: e.pe + (EP_EVIDENCE[e.id] ? '\n📚 ' + EP_EVIDENCE[e.id].k : ''), type: episodeType(e), epId: e.id, src: EP_EVIDENCE[e.id] && EP_EVIDENCE[e.id].s };
}
async function quickBattle(o) {
  const Q = quickQuestion(), D = diff();
  await battleTransition();
  const room = 1 + Math.floor(Math.random() * 4);
  startBattle({ kind: 'quick', scene: 'hall', hpLabel: 'יציבות', heroLabel: S.player.name,
    enemy: o.trainer ? { name: o.trainer.name, person: o.trainer.look, type: Q.type, sub: o.trainer.role, barLabel: 'ספק' } : { name: o.community ? 'שיחה מהקהילה' : 'קריאה מחדר ' + room, type: 'pager', ringing: true, sub: Q.title, barLabel: 'דחיפות' } });
  const B = battle;
  const extra = chipsHTML((Q.v || []).map(t => ({ t: '📈 ' + t, cls: 'vit' })));
  await sleep(520);
  await UI.say(o.trainer ? o.trainer.name + ': “' + pick(TRAINER_LINES[o.trainer.id].intro) + '”' : o.community ? pick(COMMUNITY_INTROS) : pick(PAGER_INTROS).replace('{r}', room), { name: o.trainer ? o.trainer.name : o.community ? '📞 מהקהילה' : '📟' });
  if (!Q.kid) await UI.say(Q.story, { name: Q.title, extra });
  const r = await decide(Q.q, Q.opts, Q.c, { name: Q.title, conf: true, extra,
    onWrong: async (first, conf) => {
      if (first) recordConf(conf, false);
      if (B.shield) { B.shield = false; return; }
      await foeStrike(20); B.hp = Math.max(10, B.hp - 20);
      await UI.say('✗ לא זה. נסה/י שוב — מה הכי מסוכן כאן עכשיו?', { extra });
    } });
  if (r.first) recordConf(r.conf, true);
  if (Q.kid) Core.record(Q.kid, r.first);
  await heroStrike(r.first); B.enemy.hp = 0; B.enemy.dyingT = 0; Sound.good();
  await UI.say('✓ ' + Q.opts[Q.c] + '\n💡 ' + Q.explain + (Q.src ? '\n— ' + Q.src.map(id => SOURCES[id].t).join(' · ') : ''), { extra, tall: true });
  if (o.trainer) await UI.say(o.trainer.name + ': “' + pick(TRAINER_LINES[o.trainer.id].win) + '”', { name: o.trainer.name });
  endBattle();
  await Game.reward(r.first ? 18 : 8, r.first ? 6 : 3);
}


/* ============ 5. The team: interdisciplinary "party" moves ============ */
const teamMax = m => m.evo ? 3 : 2;
const teamRole = m => TEAM[m.id].role + (m.evo ? ' מומחה/ית' : '');
async function teamMenu(rivkaHint, vit) {
  const B = battle, type = B.enemy.type;
  const extra = vit ? vit() : '';
  const opts = [{ k: 'rivka', icon: '📞', label: 'רבקה — האחות האחראית', sub: B.used.consult ? 'כבר עזרה בקרב הזה' : 'פעם אחת בכל קרב · מסירה תשובה שגויה אחת', disabled: !!B.used.consult }];
  (S.team || []).forEach(m => { const T = TEAM[m.id], eff = T.strong.includes(type);
    opts.push({ k: m.id, icon: T.icon, label: T.name + ' · ' + teamRole(m), sub: (eff ? '⚡ יעיל/ה במיוחד נגד ' + TYPES[type].name : 'יעילות רגילה') + ' · “' + T.move + '” · PP ' + m.pp + '/' + teamMax(m), disabled: m.pp <= 0, cls: eff ? 'gold' : '' }); });
  if (!(S.team || []).length) opts.push({ label: 'עוד אין חברי צוות — הם מחכים במחלקה, במבואה, בשיקום ובבית המרקחת', disabled: true });
  const i = await UI.ask('👥 למי לקרוא? כל איש/אשת מקצוע חזק/ה נגד סוגי בעיות אחרים.', opts, { cancel: true, name: 'הצוות הבין-מקצועי', extra, tall: true });
  if (i < 0 || !opts[i].k) return false;
  const k = opts[i].k;
  if (k === 'rivka') { B.used.consult = true; B.cut = (B.cut || 0) + 1; Sound.reveal(); await UI.say('📞 רבקה: “' + rivkaHint + '” — ותשובה שגויה אחת ירדה מהשולחן.', { name: 'רבקה', extra: vit ? vit() : '' }); return true; }
  const m = S.team.find(x => x.id === k), T = TEAM[k], eff = T.strong.includes(type);
  m.pp--; m.bond = (m.bond || 0) + 1;
  B.cut = (B.cut || 0) + (eff ? 2 : 1);
  if (eff) {
    const n = Math.min(10, B.maxHp - B.hp); B.hp += n; if (n) healFx(n);
    if (B.ep) { const j = B.ep.c.findIndex((cc, jj) => cc[2] === 2 && !B.found.has(jj)); if (j >= 0) { B.found.add(j); B.exposed = true; } }
    addParticles(battleFrame().foe.x, battleFrame().foe.y, 16, { color: ['#fde047', '#ffffff', (TYPES[type] || TYPES.meds).color], speed: 120, star: true });
    Sound.crit();
  } else Sound.reveal();
  await UI.say(T.icon + ' ' + T.name + ' משתמש/ת ב“' + T.move + '”! ' + (eff ? '⚡ יעיל במיוחד! שתי תשובות שגויות ירדו' + (B.ep ? ', ממצא קריטי נחשף' : '') + ' והיציבות עלתה.' : 'תשובה שגויה אחת ירדה.') + '\n📚 ' + T.fact,
    { name: T.name + ' · ' + teamRole(m), extra: vit ? vit() : '', tall: true });
  if (!m.evo && m.bond >= 4) {
    m.evo = 1; m.pp = teamMax(m); Sound.levelUp(); screenFlash('#fde68a', 200);
    await UI.say('✨ ' + T.name + ' התפתח/ה! עכשיו: ' + teamRole(m) + ' — PP מקסימלי 3.', { name: 'התפתחות' });
  }
  Game.save();
  return true;
}

function questionsFrom(acts, n, types) {
  let eps = C.episodes.filter(e => acts.includes(e.a) && (!types || types.includes(episodeType(e))));
  if (!eps.length) eps = C.episodes.filter(e => acts.includes(e.a));
  eps = shuffle(eps);
  const out = [];
  for (let i = 0; out.length < n; i++) out.push({ e: eps[i % eps.length], st: STAGES[(i + Math.floor(Math.random() * 4)) % 4] });
  return out;
}

/* A panel-style battle (rival, recruitment, council): answer until the opponent is convinced or confidence runs out. */
async function panelBattle(cfg) {
  await battleTransition(cfg.boss ? 'boss' : 'battle');
  startBattle({ kind: 'panel', scene: cfg.scene || 'conf', music: cfg.music || 'battle', hpLabel: 'ביטחון', heroLabel: S.player.name, hp: cfg.hp == null ? 100 : cfg.hp,
    enemy: Object.assign({ barLabel: 'שכנוע' }, cfg.enemy) });
  const B = battle, per = Math.ceil(100 / cfg.need);
  await sleep(520);
  await UI.say(cfg.enemy.name + ': “' + cfg.intro + '”', { name: cfg.enemy.name + ' · ' + cfg.enemy.sub });
  let qi = 0, result = null, rights = 0;
  while (!result) {
    const c = await UI.ask('', [
      { icon: '🧠', label: 'להשיב', sub: 'שאלה ' + (qi + 1) + ' · ' + rights + '/' + cfg.need + ' נכונות', cls: 'primary gold' },
      { icon: '🎒', label: 'ציוד', cls: 'mini' },
      { icon: '👥', label: 'צוות', cls: 'mini' },
      { icon: '🏳️', label: cfg.noLeave ? '—' : 'פרישה', cls: 'mini', disabled: !!cfg.noLeave },
    ], { grid: true, extra: '<div class="bhint">👉 ' + cfg.need + ' תשובות נכונות מנצחות · כל טעות מורידה ' + cfg.loss + ' ביטחון</div>' });
    if (c === 3) { result = 'leave'; break; }
    if (c === 1) { await useItemMenu('boss'); continue; }
    if (c === 2) { await teamMenu(STAGE_HINT.q); continue; }
    const q = cfg.qs[qi++ % cfg.qs.length], K = q.k;
    let e, st, extra, hintT, prompt, opts, ck, sname;
    if (K) { extra = ''; hintT = 'חשוב/י על ההנחיה, לא על האינטואיציה.'; prompt = K.q; opts = K.a; ck = K.c; sname = 'בדיקת ידע · ' + PILLARS[K.p].icon + ' ' + PILLARS[K.p].full; }
    else {
      e = q.e; st = q.st; const pt = C.patients[e.p];
      extra = chipsHTML(e.v.map(t => ({ t: '📈 ' + t, cls: 'vit' }))); hintT = STAGE_HINT[st.key]; prompt = st.prompt; opts = e[st.key]; ck = e[st.ck]; sname = st.name;
      await UI.say(pt.n + ': ' + e.st, { name: cfg.enemy.name + ' מציג/ה', extra });
    }
    const r = await decide(prompt, opts, ck, { name: sname, extra: K ? '' : extra + '<div class="bhint">💡 ' + esc(STAGE_TIP[st.key]) + '</div>', conf: true,
      onWrong: async (first, conf) => {
        if (first) recordConf(conf, false);
        if (B.shield) { B.shield = false; await UI.say('🛡️ עצרת לבדוק שוב — הטעות לא עלתה בביטחון.'); return; }
        const dmg = conf === 'sure' && first ? cfg.loss + 8 : cfg.loss;
        await foeStrike(dmg); B.hp = Math.max(0, B.hp - dmg);
        if (B.hp <= 0) return 'fail';
        await UI.say(cfg.enemy.name + ': “לא בדיוק. ' + hintT + '”', { extra });
      } });
    if (r.fail) { if (K) Core.record(K.id, false); result = 'fail'; break; }
    if (K) Core.record(K.id, !!r.first);
    if (r.first) { recordConf(r.conf, true); rights++; }
    B.combo = r.first ? (B.combo || 0) + 1 : 0;
    if (B.combo >= 2) { addFloater(battleFrame().hero.x, battleFrame().hero.y - 110, '🔥 רצף ×' + B.combo, { color: '#fb923c', size: 18, life: 1300 }); Sound.coin(); }
    await heroStrike(r.first);
    B.enemy.hp = Math.max(0, B.enemy.hp - (r.first ? per : Math.ceil(per / 2)));
    await UI.say('✓ ' + opts[ck] + (K ? '\n📚 ' + K.e + ' — ' + K.s.map(id => SOURCES[id].t).join(' · ') : EP_EVIDENCE[e.id] ? '\n📚 ' + EP_EVIDENCE[e.id].k : '\n💡 ' + e.pe), { extra, tall: true });
    if (B.enemy.hp <= 0) result = 'win';
  }
  const hp = B.hp;
  if (result === 'win') { Sound.good(); B.enemy.dyingT = null; }
  endBattle();
  return { result, hp };
}

/* Recruiting a team member: one case from their field. */
async function recruitBattle(id) {
  const T = TEAM[id], info = NPC_INFO[id];
  const r = await panelBattle({ enemy: { name: T.name, person: info.look, type: T.strong[0], sub: T.role }, scene: 'hall', need: 2, loss: 25,
    intro: 'רוצה שאצטרף לצוות שלך? תראה/י לי שאת/ה חושב/ת גם כמו ' + T.role + '. שני מקרים מהתחום שלי.', qs: questionsFrom([0, 1, 2, 3, 4, 5, 6].filter(a => a <= Game.unlockedAct()), 4, T.strong) });
  if (r.result !== 'win') { await UI.say(T.name + ': “עוד לא — תחזור/י אליי כשתרגיש/י מוכן/ה.”', { name: T.name }); return false; }
  S.team = S.team || []; S.team.push({ id, pp: 2, bond: 0, evo: 0 }); Game.save();
  Sound.badge(); UI.toast(T.icon, T.name + ' הצטרף/ה לצוות!', T.role + ' · “' + T.move + '”');
  await UI.say('🎉 ' + T.name + ' הצטרף/ה לצוות! בקרב: 👥 צוות → ' + T.name + '. ⚡ ' + T.name + ' יעיל/ה במיוחד נגד: ' + T.strong.map(t => TYPES[t].icon + ' ' + TYPES[t].name).join(', ') + '.\n📚 ' + T.fact, { name: '👥 הצוות שלך', tall: true });
  await Game.reward(30, 10);
  return true;
}
