/* המשמרת — the ward: movement, NPCs, interaction, encounters, camera, rendering. */
'use strict';

const hero = { x: 3, y: 4, dir: 'down', px: 0, py: 0, move: null, phase: 0, path: null, after: null };
let npcs = [];
let encSteps = 0;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const cam = { x: 0, y: 0 };

function curMap() { return MAPS[S.map]; }
function tileAt(x, y) { const g = curMap().grid; return (g[y] && g[y][x]) || '#'; }
function npcAt(x, y) { return npcs.find(n => n.x === x && n.y === y && !n.hidden); }
function barrierClosed(x, y) { const b = curMap().barriers; return !!(b && b[x + ',' + y] && (S.council || 0) < b[x + ',' + y]); }
function blocked(x, y) { const t = tileAt(x, y); if (t === 'G') return barrierClosed(x, y) || !!npcAt(x, y); return BLOCK.has(t) || !!npcAt(x, y); }
function bedAt(x, y) {
  const beds = curMap().beds; if (!beds) return undefined;
  if (Object.prototype.hasOwnProperty.call(beds, x + ',' + y)) return { key: x + ',' + y, who: beds[x + ',' + y] };
  if (tileAt(x, y) === 'b' && Object.prototype.hasOwnProperty.call(beds, x + ',' + (y - 1))) return { key: x + ',' + (y - 1), who: beds[x + ',' + (y - 1)] };
  return undefined;
}

function loadMap(mi, x, y, dir) {
  S.map = mi; hero.x = x; hero.y = y; hero.dir = dir || hero.dir; hero.move = null; hero.path = null; hero.after = null;
  hero.px = x * TILE + TILE / 2; hero.py = y * TILE + TILE;
  const m = MAPS[mi];
  npcs = (m.npcs || []).map(n => {
    const info = n.id === 'leader' ? { name: ACTS[Game.bossAct()].leader, role: ACTS[Game.bossAct()].role, look: ACTS[Game.bossAct()].look } : NPC_INFO[n.id];
    return Object.assign({}, n, info, { home: { x: n.x, y: n.y }, px: n.x * TILE + TILE / 2, py: n.y * TILE + TILE, move: null, next: 1500 + Math.random() * 2500, seed: Math.random() * 9 });
  });
  encSteps = 0;
  Music.play(m.music);
  UI.location(m.name, m.sub);
  S.visited[mi] = 1;
  Game.refresh();
}

/* ---------- movement ---------- */
function tryMove(dir) {
  hero.dir = dir;
  const [dx, dy] = DIRS[dir], nx = hero.x + dx, ny = hero.y + dy;
  if (blocked(nx, ny)) return false;
  const door = curMap().doors[nx + ',' + ny];
  if (door && door.boss && !Game.bossReady()) { Game.lockedConference(); return false; }
  if (door && door.needBadges && S.badges.length < door.needBadges) { Game.lockedDoor(door); return false; }
  if (door && door.elite && S.badges.length < ACTS.length) { Game.lockedDoor(door); return false; }
  const run = Input.run || S.settings.autoRun;
  hero.move = { fx: hero.x, fy: hero.y, tx: nx, ty: ny, t: 0, dur: run ? 125 : 210 };
  hero.x = nx; hero.y = ny;
  return true;
}
function onTileEntered() {
  S.stats.steps++;
  const m = curMap(), door = m.doors[hero.x + ',' + hero.y];
  if (door) { Sound.door(); Game.goTo(door.to, door.x, door.y, door.dir); return; }
  if (checkTrainers()) return;
  if (m.encounters === 'grass') {   // like tall grass: only the long grass rustles with calls from the community
    if (tileAt(hero.x, hero.y) === ';' && Game.tutorialDone() && S.settings.pager !== false && ++encSteps > 3 && Math.random() < .22) {
      encSteps = 0; hero.path = null; Sound.pager(); addParticles(hero.px - cam.x, hero.py - cam.y - 10, 8, { color: ['#5fb35a', '#a7dc93'], speed: 70, life: 450 });
      Game.run(() => quickBattle({ community: true }));
    }
  } else if (m.encounters && Game.tutorialDone() && S.settings.pager !== false) {
    encSteps++;
    if (encSteps > 16 && Math.random() < .07) { encSteps = 0; hero.path = null; Sound.pager(); Game.run(() => quickBattle({})); }
  }
}

function checkTrainers() {
  for (const n of npcs) {
    if (!n.trainer || S.trainers[n.id] === S.shift || !Game.tutorialDone()) continue;
    const [dx, dy] = DIRS[n.dir];
    for (let k = 1; k <= n.sight; k++) {
      const tx = n.x + dx * k, ty = n.y + dy * k;
      if (BLOCK.has(tileAt(tx, ty))) break;
      if (tx === hero.x && ty === hero.y) { hero.path = null; Game.run(() => trainerSpotted(n, k)); return true; }
    }
  }
  return false;
}
async function trainerSpotted(n, dist) {
  n.bubble = '!'; Sound.encounter(); await sleep(600); n.bubble = null;
  const [dx, dy] = DIRS[n.dir];
  for (let k = 1; k < dist; k++) { n.move = { fx: n.x, fy: n.y, tx: n.x + dx, ty: n.y + dy, t: 0, dur: 200 }; n.x += dx; n.y += dy; await sleep(210); }
  hero.dir = Object.keys(DIRS).find(d => DIRS[d][0] === -dx && DIRS[d][1] === -dy);
  await quickBattle({ trainer: n });
  S.trainers[n.id] = S.shift; Game.save();
}

function stepNpcs(dt) {
  for (const n of npcs) {
    if (n.move) { n.move.t += dt; const k = clamp(n.move.t / n.move.dur, 0, 1); n.px = lerp(n.move.fx, n.move.tx, k) * TILE + TILE / 2; n.py = lerp(n.move.fy, n.move.ty, k) * TILE + TILE; n.phase = (n.phase || 0) + dt / 60; if (k >= 1) n.move = null; continue; }
    n.px = n.x * TILE + TILE / 2; n.py = n.y * TILE + TILE;
    if (!n.wander || Game.state !== 'OVERWORLD' || UI.active) continue;
    n.next -= dt;
    if (n.next > 0) continue;
    n.next = 1800 + Math.random() * 3000;
    const d = pick(Object.keys(DIRS)), [dx, dy] = DIRS[d], nx = n.x + dx, ny = n.y + dy, [x1, y1, x2, y2] = n.wander;
    n.dir = d;
    if (nx < x1 || nx > x2 || ny < y1 || ny > y2 || blocked(nx, ny) || (nx === hero.x && ny === hero.y) || curMap().doors[nx + ',' + ny]) continue;
    n.move = { fx: n.x, fy: n.y, tx: nx, ty: ny, t: 0, dur: 320 }; n.x = nx; n.y = ny;
  }
}

function stepWorld(dt) {
  stepNpcs(dt);
  if (hero.move) {
    hero.move.t += dt;
    const k = clamp(hero.move.t / hero.move.dur, 0, 1);
    hero.px = lerp(hero.move.fx, hero.move.tx, k) * TILE + TILE / 2; hero.py = lerp(hero.move.fy, hero.move.ty, k) * TILE + TILE;
    hero.phase += dt / (hero.move.dur / 3.1);
    if (k >= 1) { hero.move = null; if (S.stats.steps % 2) Sound.step(); onTileEntered(); }
    return;
  }
  hero.px = hero.x * TILE + TILE / 2; hero.py = hero.y * TILE + TILE;
  if (Game.state !== 'OVERWORLD' || UI.active || Panel.isOpen || Game.busy) return;
  let dir = Input.heldDir() || Touch.steer;
  if (dir) { hero.path = null; hero.after = null; if (!tryMove(dir) && !hero.move) { /* bump */ } return; }
  if (hero.path && hero.path.length) {
    const [nx, ny] = hero.path.shift(), d = Object.keys(DIRS).find(k => DIRS[k][0] === nx - hero.x && DIRS[k][1] === ny - hero.y);
    if (!d || !tryMove(d)) hero.path = null;
    return;
  }
  if (hero.after) { const a = hero.after; hero.after = null; hero.dir = a.dir; interact(); }
}

/* ---------- tap to walk (BFS) ---------- */
function planPath(tx, ty) {
  const g = curMap().grid, W = g[0].length, H = g.length;
  const goalBlocked = blocked(tx, ty) || BLOCK.has(tileAt(tx, ty));
  const goals = goalBlocked ? Object.values(DIRS).map(([dx, dy]) => [tx + dx, ty + dy]).filter(([x, y]) => !blocked(x, y)) : [[tx, ty]];
  if (!goals.length) return null;
  const key = (x, y) => y * W + x, prev = new Map([[key(hero.x, hero.y), null]]), q = [[hero.x, hero.y]];
  while (q.length) {
    const [x, y] = q.shift();
    if (goals.some(([gx, gy]) => gx === x && gy === y)) {
      const path = []; let k = key(x, y);
      while (prev.get(k) != null) { path.unshift([k % W, Math.floor(k / W)]); k = prev.get(k); }
      return { path, end: [x, y], face: goalBlocked ? Object.keys(DIRS).find(d => DIRS[d][0] === tx - x && DIRS[d][1] === ty - y) : null };
    }
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(key(nx, ny)) || blocked(nx, ny)) continue;
      const door = curMap().doors[nx + ',' + ny];
      if (door && !(nx === tx && ny === ty)) continue;
      prev.set(key(nx, ny), key(x, y)); q.push([nx, ny]);
    }
  }
  return null;
}
const Touch = { steer: null, down: null };
function tapWorld(lx, ly) {
  const tx = Math.floor((lx + cam.x) / TILE), ty = Math.floor((ly + cam.y) / TILE);
  if (tx === hero.x && ty === hero.y) return;
  const p = planPath(tx, ty);
  if (!p) return;
  hero.path = p.path;
  hero.after = p.face ? { dir: p.face } : null;
  if (!p.path.length && p.face) { hero.dir = p.face; interact(); hero.after = null; }
  addRing(tx * TILE + TILE / 2 - cam.x, ty * TILE + TILE / 2 - cam.y, { maxR: 16, color: '#fbbf24', width: 2, life: 380 });
}
function setupTouch() {
  canvas.addEventListener('pointerdown', ev => {
    if (Game.state === 'TITLE') return;
    if (UI.active) { if (UI.active.kind === 'say') UI.advance(); return; }
    if (Game.state === 'CUTSCENE') { Game.cutNext(); return; }
    if (Game.state !== 'OVERWORLD' || Panel.isOpen) return;
    const p = eventToLogical(ev);
    Touch.down = { p, t: performance.now(), id: ev.pointerId };
    Touch.timer = setTimeout(() => { if (Touch.down) Touch.holding = true; }, 260);
  });
  const steer = ev => {
    if (!Touch.down || !Touch.holding) return;
    const p = eventToLogical(ev), hx = hero.px - cam.x, hy = hero.py - 20 - cam.y, dx = p.x - hx, dy = p.y - hy;
    Touch.steer = Math.hypot(dx, dy) < 18 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  };
  canvas.addEventListener('pointermove', steer);
  const up = ev => {
    clearTimeout(Touch.timer);
    if (Touch.down && !Touch.holding && Game.state === 'OVERWORLD' && !UI.active && !Panel.isOpen) { const p = eventToLogical(ev); tapWorld(p.x, p.y); }
    Touch.down = null; Touch.holding = false; Touch.steer = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', up);
}

/* ---------- interaction ---------- */
function interact() {
  if (hero.move || Game.busy) return;
  const [dx, dy] = DIRS[hero.dir];
  let tx = hero.x + dx, ty = hero.y + dy;
  const m = curMap();
  // talk across a counter, like at a nurses' station
  if (tileAt(tx, ty) === 'C' && npcAt(tx + dx, ty + dy)) { tx += dx; ty += dy; }
  const n = npcAt(tx, ty);
  if (n) { n.dir = Object.keys(DIRS).find(d => DIRS[d][0] === -dx && DIRS[d][1] === -dy) || n.dir; Game.run(() => Game.talk(n)); return; }
  const bed = bedAt(tx, ty);
  if (bed !== undefined) { Game.run(() => Game.visitPatient(bed.who)); return; }
  const hid = m.hidden && m.hidden[tx + ',' + ty];
  if (hid && !S.found[S.map + ':' + tx + ',' + ty]) { Game.run(() => Game.findHidden(tx, ty, hid)); return; }
  const hs = m.hotspots && m.hotspots[tx + ',' + ty];
  if (hs) { Game.run(() => Game.hotspot(hs)); return; }
  const t = tileAt(tx, ty);
  const FLAVOR = { O: 'מבעד לחלון: שמש של בוקר. אור יום עוזר לשמור על מחזור שינה-ערות ומפחית דליריום.', P: 'עציץ. מישהו מהלילה משקה אותו בסתר.', w: 'כיסא גלגלים. הבלמים — נעולים. ככה צריך.', y: 'זהירות, רצפה רטובה. מניעת נפילות מתחילה בשלט.', c: 'עגלת תרופות. נעולה. הכל מתועד.', I: 'עמוד עירוי. המשאבה מתקתקת בשקט.', k: 'כיור. רחיצת ידיים — 20 שניות, ולא פחות.', H: 'מתקן חיטוי. לחיצה אחת לפני ואחרי כל מטופל.', A: 'פוסטר: “קום לאט — 3 שלבים: לשבת, לחכות, לעמוד”.', Q: 'השעון מראה 07:12. סבב בוקר — שעון גלוי ואוריינטציה הם חלק ממניעת דליריום.', m: 'מוניטור. סינוס, 76 לדקה. בינתיים.', T: 'שולחן. ערימת תיקים ותה שהתקרר.', h: 'כיסא. לא עכשיו — יש משמרת.', F: 'מקרר דגימות. 4°C. בלי אוכל!', L: 'שולחן מעבדה נקי ומסודר.', S: 'ספה. אפשר לנוח כאן ולסיים משמרת.', J: 'מסך הקרנה. השקף האחרון: “מה המטרה של המטופל?”' };
  if (FLAVOR[t]) Game.run(() => UI.say(FLAVOR[t]));
}

/* ---------- rendering ---------- */
function renderWorld() {
  const m = curMap(), W = m.grid[0].length * TILE, H = m.grid.length * TILE;
  cam.x = W <= VW ? -(VW - W) / 2 : clamp(hero.px - VW / 2, 0, W - VW);
  cam.y = H <= VH ? -(VH - H) / 2 : clamp(hero.py - 20 - VH / 2, 0, H - VH);
  cam.x = Math.round(cam.x); cam.y = Math.round(cam.y);
  ctx.fillStyle = lin(0, 0, 0, VH, [[0, '#e6f0f6'], [1, '#d3e2ec']]); ctx.fillRect(0, 0, VW, VH);
  if (W < VW || H < VH) { ctx.fillStyle = 'rgba(30,60,90,.10)'; roundRect(ctx, -cam.x - 5, -cam.y - 2, W + 10, H + 12, 8); ctx.fill(); ctx.fillStyle = 'rgba(30,60,90,.10)'; roundRect(ctx, -cam.x - 2, -cam.y, W + 4, H + 6, 6); ctx.fill(); }
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  ctx.drawImage(Art.mapLayer(S.map), 0, 0, W, H);
  Art.mapAnim(ctx, S.map, clock);
  Art.sunlight(ctx, S.map, clock);
  // door plates
  if (m.labels) for (const k in m.labels) {
    const [x, y] = k.split(',').map(Number), cx = x * TILE + TILE / 2, cy = y === 0 ? y * TILE + 12 : y * TILE + 20;
    const locked = m.doors[k] && m.doors[k].boss && !Game.bossReady();
    setFont(9, true); const tw = ctx.measureText(m.labels[k]).width + 10;
    ctx.fillStyle = locked ? 'rgba(254,226,226,.97)' : 'rgba(255,255,255,.95)'; roundRect(ctx, cx - tw / 2, cy - 8, tw, 14, 4); ctx.fill();
    ctx.strokeStyle = locked ? '#e05252' : '#0e8f86'; ctx.lineWidth = 1; roundRect(ctx, cx - tw / 2, cy - 8, tw, 14, 4); ctx.stroke();
    heText((locked ? '🔒 ' : '') + m.labels[k], cx, cy + 3, { size: 9, bold: true, color: locked ? '#9b1c1c' : '#0b5f59', align: 'center' });
    const pid = Object.keys(PATIENT_ROOM).filter(p => MAPS[PATIENT_ROOM[p] + 1] && m.doors[k].to === PATIENT_ROOM[p] + 1);
    if (pid.some(p => Game.availableEpisode(p))) drawBubble(cx + tw / 2 + 4, cy + 10, '!');
  }
  // patients in beds
  if (m.beds) for (const k in m.beds) {
    const who = m.beds[k]; if (!who) continue;
    const [x, y] = k.split(',').map(Number);
    const has = Game.availableEpisode(who);
    Art.drawPatientInBed(ctx, x * TILE, y * TILE, who, clock, { sleep: !has });
    if (has) drawBubble(x * TILE + TILE / 2, y * TILE + 2, '!');
  }
  // council barriers and hidden-item sparkles
  if (m.barriers) for (const k in m.barriers) { const [x, y] = k.split(',').map(Number); if (!barrierClosed(x, y)) continue;
    const px = x * TILE, py = y * TILE; ctx.fillStyle = '#64748b'; ctx.fillRect(px + 2, py + 4, 36, 4); ctx.fillRect(px + 2, py + 30, 36, 4);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#94a3b8'; ctx.fillRect(px + 4 + i * 7.5, py + 4, 3, 30); }
    ctx.fillStyle = '#c27c0e'; circle(ctx, px + 20, py + 19, 6, '#fde68a'); heText(m.barriers[k], px + 20, py + 23, { size: 9, bold: true, color: '#7a4b04', align: 'center', ltr: true }); }
  if (m.hidden) for (const k in m.hidden) { if (S.found[S.map + ':' + k]) continue; const [x, y] = k.split(',').map(Number), ph = (clock / 1400 + x * .37 + y * .21) % 1;
    if (ph < .18) { const a = Math.sin(ph / .18 * Math.PI); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fffbe6'; const cx = x * TILE + 20, cy = y * TILE + 20; ctx.fillRect(cx - 5, cy - .8, 10, 1.6); ctx.fillRect(cx - .8, cy - 5, 1.6, 10); ctx.restore(); } }
  // people, sorted by depth
  const ents = npcs.filter(n => !n.hidden).map(n => ({ y: n.py, draw: () => {
    Art.drawPerson(ctx, n.px, n.py, n.look, { dir: n.dir, walking: !!n.move, phase: n.phase || 0, seed: n.seed });
    const b = n.bubble || Game.npcBubble(n);
    if (b) drawBubble(n.px, n.py - 52, b);
  } }));
  ents.push({ y: hero.py + .1, draw: () => {
    Art.drawPerson(ctx, hero.px, hero.py, S.player.look, { dir: hero.dir, walking: !!hero.move, phase: hero.phase });
    if (tileAt(Math.floor(hero.px / TILE), Math.round((hero.py - TILE) / TILE)) === ';') {   // wading through tall grass
      for (let i = 0; i < 7; i++) { const h = 7 + (i * 5) % 6 + (hero.move ? Math.sin(clock / 70 + i) * 1.5 : 0); ctx.fillStyle = i % 2 ? '#3f9b4a' : '#58b85f'; ctx.fillRect(hero.px - 15 + i * 4.6, hero.py - h + 2, 3, h); }
    }
  } });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  // tap path dots
  if (hero.path && hero.path.length) hero.path.forEach(([x, y], i) => circle(ctx, x * TILE + TILE / 2, y * TILE + TILE / 2, 2.5, 'rgba(14,143,134,' + (.6 - i * .03) + ')'));
  // the guide arrow: a small chevron circling the hero that points at the next goal; a bouncing marker when it is close
  const gt = Game.state === 'OVERWORLD' && !UI.active && !Panel.isOpen ? Game.guideTarget() : null;
  if (gt) {
    const tx = gt.x * TILE + TILE / 2, ty = gt.y * TILE + TILE / 2, dx = tx - hero.px, dy = ty - (hero.py - TILE / 2), d = Math.hypot(dx, dy);
    if (d > TILE * 2.4) {
      const a = Math.atan2(dy, dx), r = 34 + Math.sin(clock / 200) * 3;
      ctx.save(); ctx.translate(hero.px + Math.cos(a) * r, hero.py - 24 + Math.sin(a) * r); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -7); ctx.lineTo(-2, 0); ctx.lineTo(-5, 7); ctx.closePath();
      ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.fillStyle = '#f2a516'; ctx.fill(); ctx.restore();
    } else if (gt.door) {
      const by = Math.sin(clock / 180) * 3; ctx.save(); ctx.translate(tx, ty - 26 + by + (gt.y === 0 ? 30 : 0));
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(-7, -3); ctx.lineTo(7, -3); ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.fillStyle = '#f2a516'; ctx.fill(); ctx.restore();
    }
  }
  // outdoors: drifting cloud shadows and a few leaves on the wind
  if (m.floor === 'grass' && !reduceFx()) {
    for (let i = 0; i < 3; i++) { const cx = ((clock / (38 + i * 9) + i * 420) % (W + 500)) - 250, cy = H * (.2 + i * .3); ctx.fillStyle = 'rgba(30,70,90,.07)'; ctx.beginPath(); ctx.ellipse(cx, cy, 150 + i * 30, 46 + i * 8, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 9; i++) { const k = (clock / (5200 + i * 310) + i * .173) % 1, lx = (i * 197 % W) + k * 160, ly = k * (H + 40) - 20 + Math.sin(clock / 500 + i) * 10;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(clock / 400 + i); ctx.fillStyle = i % 3 ? 'rgba(120,190,90,.85)' : 'rgba(244,170,60,.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  ctx.restore();
  renderFx();
  // soft daylight vignette
  ctx.fillStyle = rad(VW / 2, VH / 2, VH * .45, VW * .75, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(110,140,160,.16)']]); ctx.fillRect(0, 0, VW, VH);
}
function drawBubble(x, y, kind) {
  const b = Math.sin(clock / 220) * 2.5;
  ctx.save(); ctx.translate(x, y - 8 + b);
  ctx.fillStyle = '#fff'; roundRect(ctx, -8, -18, 16, 16, 5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(0, 3); ctx.lineTo(3, -3); ctx.fill();
  ctx.strokeStyle = 'rgba(15,23,42,.6)'; ctx.lineWidth = 1; roundRect(ctx, -8, -18, 16, 16, 5); ctx.stroke();
  heText(kind, 0, -5, { size: 12, bold: true, color: kind === '!' ? '#dc2626' : kind === '?' ? '#2563eb' : '#0f172a', align: 'center', ltr: true });
  ctx.restore();
}
