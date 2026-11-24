// BEHAVIOUR-MODES (P125, the user's pick 24.11, proposal 6): "?" then "!" over a watching enemy. A guard, a drone, a dog
// (and a sentry, a waking mite) shows a small "?" while it is starting to notice Twinsen, and a "!" for a moment when it
// has seen him. No gameplay rule changes here: the "?" reads the enemy's own sight test with its range stretched
// (NEAR_K): Twinsen would be seen if he were a little more visible (a step closer, out of Discreet, into the cone). Its
// strength rises while that holds and falls away when he slips out of it; the "!" is the enemy's own alert (its state
// turning to alerted / warn / chase), the same moment its alert sound plays.
//
// One sprite per enemy, made the first time it is needed, sharing two textures (the look of the old Sentinel's icon:
// a bold yellow "?" and a red "!" with a dark outline). Depth-tested: a mark never shows an enemy through a wall. Each
// enemy draws its mark from its own update (draw()); tick() (once a frame, main.js) hides every mark whose enemy did
// not update this frame: dead, knocked out, not present, another area, out of play (a dialogue, a menu).
// Cost: per enemy in a calm state, one distance test a frame and, within the stretched range, its own sight test
// (line of sight) every SCAN s. No scene search.
import * as THREE from 'three';

export const NEAR_K = 1.5;    // the "?" band: seen if his visibility were this much higher
const SCAN = 0.15;            // s between two "?" sight tests of one enemy
const RISE = 2.2, FALL = 1.4; // the "?" strength's rise and fall per s
const SHOW_Q = 0.18;          // strength at which the "?" shows
const E_TIME = 1.3;           // s the "!" stays
const SIZE = 0.65;            // m (the Sentinel's 0.8 read as a sign over a small mite)

let TEX = null;
function tex(ch, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.font = 'bold 54px system-ui, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = '#111';
  x.strokeText(ch, 32, 36);
  x.fillStyle = color; x.fillText(ch, 32, 36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// the two textures (the Sentinel's icon uses them too: actors.js)
export function markTex() {
  if (!TEX && typeof document !== 'undefined') TEX = { q: tex('?', '#ffd23a'), e: tex('!', '#ff3a2a') };
  return TEX;
}

const LIVE = new Set();
let frame = 0;

function state(a) { return (a._nm ??= { a, q: 0, eT: 0, scanT: Math.random() * SCAN, near: false, spr: null, f: -1 }); }

// a frame of the "?" band: near() is the enemy's sight test at the stretched range (called only every SCAN s)
export function suspect(a, dt, near) {
  const m = state(a);
  if ((m.scanT -= dt) <= 0) { m.scanT = SCAN; m.near = !!near(); }
  m.q = Math.max(0, Math.min(1, m.q + (m.near ? RISE : -FALL) * dt));
}
// nothing to suspect this frame (a fight under way, a calm watch): the "?" fades
export function calm(a, dt) { const m = a._nm; if (m) { m.near = false; m.q = Math.max(0, m.q - FALL * 2 * dt); } }
// it has seen him: the "!"
export function seen(a) {
  const m = state(a); m.eT = E_TIME; m.q = 0; m.near = false;
  // (raised after its own update this frame — the depot's watch, a watcher spotting her — it shows at once: a dialogue
  //  may follow and the enemy not update again for a while: tick() keeps it its time)
  const S = sprite(m, a);
  if (!S) return;
  S.material.map = TEX.e; S.material.needsUpdate = true; S.material.opacity = 1; S.scale.setScalar(SIZE * 1.35);
  S.position.set(a.pos.x, a.pos.y + (m.y ?? (a.markY ?? 1.8) + 0.5), a.pos.z); S.visible = true; m.f = frame;
}
function sprite(m, a) {
  if (m.spr) return m.spr;
  if (!markTex() || !a.game?.scene) return null;
  m.spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.q, transparent: true, depthWrite: false, fog: false }));
  m.spr.scale.setScalar(SIZE); m.spr.renderOrder = 12; m.spr.name = 'noticeMark'; m.spr.visible = false;
  a.game.scene.add(m.spr);
  LIVE.add(m);
  return m.spr;
}

// draw the mark over the enemy (y: the mark's height over its feet), from its update
export function draw(a, y, dt) {
  const m = a._nm;
  if (!m) return;
  if (m.eT > 0) m.eT -= dt;
  const show = m.eT > 0 || m.q > SHOW_Q;
  if (!show && !m.spr?.visible) return;
  const S = sprite(m, a), T = TEX;
  if (!S) return;
  m.y = y;
  S.visible = show;
  if (!show) return;
  m.f = frame;
  const e = m.eT > 0, M = S.material;
  if (M.map !== (e ? T.e : T.q)) { M.map = e ? T.e : T.q; M.needsUpdate = true; }
  M.opacity = e ? Math.min(1, m.eT / 0.25) : 0.35 + 0.65 * Math.min(1, (m.q - SHOW_Q) / (1 - SHOW_Q) * 1.6);
  // ("!" pops in a touch larger, then settles; "?" bobs gently)
  const k = e ? 1 + 0.35 * Math.max(0, (m.eT - (E_TIME - 0.18)) / 0.18) : 1;
  S.scale.setScalar(SIZE * k);
  S.position.set(a.pos.x, a.pos.y + y + (e ? 0 : Math.sin(a.game.time * 4) * 0.04), a.pos.z);
}

// once a frame (main.js): hide the marks of enemies that did not update this frame. A "!" just raised stays its time
// over one still standing (a watcher who spotted her stops updating as he speaks: chapter1.js zoeSpotted)
export function tick(dt) {
  for (const m of LIVE) {
    if (!m.spr.visible || m.f === frame) continue;
    if (m.eT > 0 && m.a.alive !== false && m.a.present !== false) { m.eT -= dt; m.spr.material.opacity = Math.min(1, m.eT / 0.25); continue; }
    m.spr.visible = false;
  }
  frame++;
}
// for tests: the marks up now ({ who, kind })
export function shown(enemies) {
  const out = [];
  for (const e of enemies || []) { const m = e._nm; if (m?.spr?.visible) out.push({ id: e.id, kind: m.eT > 0 ? '!' : '?', q: +m.q.toFixed(2) }); }
  return out;
}
