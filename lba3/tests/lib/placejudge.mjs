// PLACE-1, the judgement (Node side): from what tests/lib/placecollect.js gathered in one area, the pieces that are
// out of place. Pure: tests/place-scan.mjs runs it on the live game; `node tests/lib/placejudge.mjs dump.json` on a dump.
//   pieces     a room's placed pieces (k.at frames); a frame that only lays out others (the shell, a wing, a box larger
//              than 3.5 m both ways) is not a piece: its children are. Its parts are its own and its children's.
//   structure  the shell's and the loose parts (walls, floors, partitions) and the room's tall colliders
// Findings, each with the measure that found it:
//   inside     two pieces' drawn parts go into each other (SAT on the parts' turned footprints, and their heights) ≥ 4 cm
//   wall       a piece's parts go ≥ 8 cm into the room's walls or partitions
//   float      a standing piece's lowest part ≥ 5 cm over whatever is under its middle (the floor, a piece, a ledge)
//   sunk       a standing piece's lowest part ≥ 6 cm under the floor at its middle
//   back       a piece that belongs against a wall (bookcase, wardrobe, dresser, locker, cabinet, bed's head ...) with
//              its back ≥ 0.35 m from any wall while another side is nearer one (turned) or every side ≥ 0.6 m (adrift)
//   facing     a chair within 0.9 m of a table, desk or counter turned ≥ 100° away from it (its back to it)
//   door       a standing piece within 0.45 m of an exit's trigger circle
//   adrift     a storage piece (crate, barrel, chest, sack, case) ≥ 1.4 m from every wall and every other piece
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const WALLMOUNT = /^(frame|painting|wallShelf|wallSconce|wallClock|toolBoard|chalkboard|noticeBoard|hangingSign|pinnedSheet|gauge|cableTray|pipeline|valveWheel|hangingLamp|bulb|curtain|window|sign|banner|poster|plaque|paperRun|map|chart|shelfRow)$/i;
const FLAT = /^(rug|mat|carpet|decal|papers|ledger|pinnedSheet|stain|puddle|shadow|tile)s?$/i;
const BACKWALL = /^(cot|clothshelf|glassshelf|jarshelf|honeyshelf|lectern|altar|chalk|comb|wardrobe|bookcase|dresser|curioShelf|locker|filingCabinet|instrumentRack|transmitterCabinet|bed|goodsShelf|toolBoard|jukebox|slotMachine|coinMachine|aquarium|cupboard|cabinet|sideboard|hutch|shelves|shelf|rack|stove|range|oven|sink|piano|organ|dresserTall|chestOfDrawers|vitrine|bookshelf)$/i;
const SEAT = /^(chair|officeChair)$/i;
// what the room is made of, not furnished with: their joints and their roots in rock are meant
const ARCH = /^(rockWallRun|column|ibeam|beam|pillar|post|railing|gargoylePost|postLamp|arch|crystals|boulder|stalagmites|stalagmite|eggs|rock|rocks|wallLamp|signPlate|cableTray|pipeline|pipe|tilt|p|custom|gatePillar|hornedHead|bushUrn|wallRun)$/i;
const TABLE = /^(table|desk|workbench|draftingTable|mapTable|counter|radioDesk|bar|barCounter|diningTable|kitchenTable)$/i;
const FURN = /^(cot|bunk|shelf|clothshelf|glassshelf|jarshelf|honeyshelf|lectern|altar|filing|crates|bigcrates|barrels|sacks|boxes|plant|pews|pew|chair|officeChair|armchair|stool|bench|sofa|table|desk|workbench|counter|bed|wardrobe|bookcase|dresser|nightstand|sideTable|locker|filingCabinet|curioShelf|crate|barrel|chest|cargoCrate|stove|potStove|goodsShelf|shelves|cupboard|cabinet|floorLamp|coatStand|pottedPlant|waitingBench|deckChair|roundTable|barTable|displayTable)$/i;
const STORAGE = /^(crates|bigcrates|barrels|sacks|boxes|crate|barrel|chest|cargoCrate|sack|sacks|suitcaseStack|box|boxes|keg|basket|trunk)$/i;

export function nameOf(src) {
  // (PLACE-3: the Hamalayi's inline pieces: a dry-stone wall's coping, a snow drift)
  if (/coping === 'slate'/.test(src)) return 'wallCoping';
  if (/^\(\) => \{\s*K\.add\(driftGeo/.test(src)) return 'drift';
  let m = /^put:\(?(\w+)/.exec(src); if (m && m[1] !== 'k' && m[1] !== 'kk') return m[1];
  if ((m = /^put:\(kk?\)\s*=>\s*(?:P\.)?(\w+)/.exec(src))) return m[1];
  if ((m = /P\.(\w+)\(/.exec(src))) return m[1];
  if ((m = /\b(\w+)\(\s*kk?\b/.exec(src))) return m[1];
  return 'custom';
}

// --- 2D geometry on convex hulls
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
function axes(h) { const out = []; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length], e = sub(b, a), L = Math.hypot(e[0], e[1]); if (L > 1e-6) out.push([-e[1] / L, e[0] / L]); } return out; }
function proj(h, ax) { let lo = 1e9, hi = -1e9; for (const p of h) { const d = p[0] * ax[0] + p[1] * ax[1]; if (d < lo) lo = d; if (d > hi) hi = d; } return [lo, hi]; }
// penetration depth of two convex polygons (0 if apart): the least overlap over the separating axes
export function pen2(A, B) {
  if (A.length < 3 || B.length < 3) return 0;
  let best = 1e9;
  for (const ax of [...axes(A), ...axes(B)]) { const [a0, a1] = proj(A, ax), [b0, b1] = proj(B, ax); const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; if (o < best) best = o; }
  return best;
}
function inside(h, p) { if (h.length < 3) return false; let s = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (Math.abs(c) < 1e-12) continue; if (!s) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } return true; }
function distToHull(h, p) {
  if (inside(h, p)) return 0;
  let best = 1e9;
  for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length], e = sub(b, a), L2 = e[0] * e[0] + e[1] * e[1]; let t = L2 ? ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1]) / L2 : 0; t = Math.max(0, Math.min(1, t)); const q = [a[0] + e[0] * t, a[1] + e[1] * t]; best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1])); }
  return best;
}
function nearestOnHull(h, p) {
  let best = 1e9, bq = h[0];
  for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length], e = sub(b, a), L2 = e[0] * e[0] + e[1] * e[1]; let t = L2 ? ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1]) / L2 : 0; t = Math.max(0, Math.min(1, t)); const q = [a[0] + e[0] * t, a[1] + e[1] * t], d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best) { best = d; bq = q; } }
  return bq;
}
function mergeHull(list) { const pts = list.flatMap((p) => p[0]); return hullOf(pts); }
function hullOf(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-9) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 1e-9) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}

function colHull(c) {
  if (c.t === 'cyl') { const n = 12, h = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; h.push([c.x + Math.cos(a) * c.r, c.z + Math.sin(a) * c.r]); } return h; }
  const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0), out = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const lx = sx * c.hw, lz = sz * c.hd; out.push([c.x + lx * cs + lz * sn, c.z - lx * sn + lz * cs]); }
  return out;
}

export function pieces(A) {
  const F = new Map(A.frames.map((f) => [f.i, f]));
  const kids = new Map(); for (const f of A.frames) { if (!kids.has(f.p)) kids.set(f.p, []); kids.get(f.p).push(f); }
  const isContainer = (f) => /shell\(|wallRun|wing|paperRun|Wings\(|buildHouse/.test(f.src) || ((f.lb[3] - f.lb[0]) > 3.5 && (f.lb[5] - f.lb[2]) > 3.5);
  const structure = [...A.loose];
  const out = [];
  // (a named piece of furniture inside another piece — a set's chairs round its table, a recipe's bed — is a piece of
  //  its own; the parent keeps the rest)
  const own = (f) => FURN.test(nameOf(f.src));
  const allParts = (f) => { const ps = [...f.parts]; for (const c of kids.get(f.i) || []) if (!own(c)) ps.push(...allParts(c)); return ps; };
  const walk = (list) => {
    for (const f of list) {
      if (isContainer(f)) { structure.push(...f.parts); walk(kids.get(f.i) || []); continue; }
      const parts = allParts(f).filter((p) => p[0].length >= 3);
      if (parts.length) {
        const y0 = Math.min(...parts.map((p) => p[1])), y1 = Math.max(...parts.map((p) => p[2]));
        out.push({ f, name: nameOf(f.src), parts, y0, y1, hull: mergeHull(parts), mid: f.mid });
      }
      const sub = []; const look = (x) => { for (const c of kids.get(x.i) || []) { if (own(c)) sub.push(c); else look(c); } }; look(f);
      walk(sub);
    }
  };
  walk(kids.get(-1) || []);
  // (frames whose parent is not in this area: their own roots)
  for (const f of A.frames) if (f.p >= 0 && !F.has(f.p)) walk([f]);
  return { list: out, structure: structure.filter((p) => p[0].length >= 3) };
}

const yo = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
const r2 = (v) => Math.round(v * 100) / 100;
const deg = (v) => Math.round(v * 180 / Math.PI);

export function judge(id, A) {
  const { list, structure } = pieces(A);
  const find = [];
  const at = (P) => [r2(P.mid[0] - A.c[0]), r2(P.mid[1] - A.c[1])];
  const tag = (P) => `${P.name}#${P.f.i}`;
  const add = (kind, P, what, measure, extra = {}) => find.push({ room: id, kind, item: P.name, frame: P.f.i, at: at(P), world: [r2(P.mid[0]), r2(P.mid[1])], what, measure, ...extra });
  const flat = (P) => FLAT.test(P.name) || P.y1 - P.y0 < 0.03;
  const wallm = (P) => WALLMOUNT.test(P.name);
  const stands = (P) => !flat(P) && !wallm(P) && P.y0 < 1.2;
  const tall = A.cols.filter((c) => c.top - (c.bottom || 0) >= 1.9 && !c.ns && !c.st);
  const wallHulls = [...structure.filter((p) => p[2] - p[1] >= 1.2 && p[1] < 0.8 && p[2] > 1.2), ...tall.map((c) => [colHull(c), c.bottom || 0, c.top])];
  // (a tall piece behind another is a wall for it too: two bookcases back to back, a wardrobe against a cupboard)
  const tallPieces = list.filter((P) => P.y1 - P.y0 >= 1.2 && P.y0 < 0.5 && !ARCH.test(P.name) || BACKWALL.test(P.name) && P.y1 - P.y0 >= 0.8);
  // a wall: a structure part ≥ 1.5 m tall and at most 0.8 m thick
  const thin = (h) => { let w = 1e9; for (const ax of axes(h)) { const [a0, a1] = proj(h, ax); w = Math.min(w, a1 - a0); } return w; };
  const walls = structure.filter((p) => p[2] - p[1] >= 1.5 && thin(p[0]) <= 0.8);
  const nearWall = (P, d) => walls.some((w) => P.hull.some((p) => distToHull(w[0], p) < d) || pen2(P.hull, w[0]) > 0);
  const inFloor = (p) => !A.bounds?.length || A.bounds.some((b) => p[0] >= b.x0 - 0.02 && p[0] <= b.x1 + 0.02 && p[1] >= b.z0 - 0.02 && p[1] <= b.z1 + 0.02);
  // distance from p along dir to a wall (a tall structure part, a wall collider, or the floor's edge)
  const wallDist = (p, dir, self, max = 3) => {
    for (let t = 0; t <= max; t += 0.05) {
      const q = [p[0] + dir[0] * t, p[1] + dir[1] * t];
      if (!inFloor(q)) return t;
      for (const h of wallHulls) if (inside(h[0], q)) return t;
      if (t > 0.04) for (const Q of tallPieces) if (Q !== self && inside(Q.hull, q)) return t;
    }
    return max;
  };
  // 1. inside each other
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (flat(a) || flat(b)) continue;
    if (ARCH.test(a.name) && ARCH.test(b.name)) continue;
    if (/rock|boulder|stalag/i.test(a.name + b.name)) continue;   // (rock is irregular: its parts' boxes are far larger than it)
    if (yo(a.y0, a.y1, b.y0, b.y1) < 0.04 || pen2(a.hull, b.hull) < 0.04) continue;
    let best = 0, bp = null;
    for (const pa of a.parts) for (const pb of b.parts) {
      const dy = yo(pa[1], pa[2], pb[1], pb[2]); if (dy < 0.04) continue;
      const d = Math.min(pen2(pa[0], pb[0]), dy); if (d > best) { best = d; bp = [pa, pb]; }
    }
    if (best >= 0.04) {
      const P = a.y1 - a.y0 < b.y1 - b.y0 ? a : b, Q = P === a ? b : a;
      add('inside', P, `${P.name} goes into ${Q.name} (${tag(Q)} at ${at(Q).join(', ')})`, `parts overlap ${Math.round(best * 100)} cm (footprint SAT and height)`, { depth: r2(best), other: Q.f.i, otherItem: Q.name });
    }
  }
  // 2. into the walls
  for (const P of A.outdoor ? [] : list) {
    if (flat(P) || ARCH.test(P.name) || wallm(P)) continue;
    let best = 0;
    for (const pa of P.parts) for (const s of walls) { const dy = yo(pa[1], pa[2], s[1], s[2]); if (dy < 0.08) continue; const d = Math.min(pen2(pa[0], s[0]), dy); if (d > best) best = d; }
    if (best >= 0.1) add('wall', P, `${P.name} goes into the room's wall or partition`, `drawn parts ${Math.round(best * 100)} cm into a wall part`, { depth: r2(best) });
  }
  // 3. floating / sunk (standing pieces only; what is under its middle: the floor, other pieces' and structure tops)
  for (const P of list) {
    if (!stands(P) || P.f.g == null) continue;
    // (at its middle and halfway to each corner of its footprint: a basket bridging two folded cloths rests on both)
    let support = -1e9;
    for (const pt of [P.mid, ...P.hull.map((h) => [(h[0] + P.mid[0]) / 2, (h[1] + P.mid[1]) / 2])]) {
      let sp = P.f.g;
      for (const Q of list) { if (Q === P) continue; for (const q of Q.parts) if (q[2] <= P.y0 + 0.03 && q[2] > sp && inside(q[0], pt)) sp = q[2]; }
      for (const s of structure) if (s[2] <= P.y0 + 0.03 && s[2] > sp && inside(s[0], pt)) sp = s[2];
      support = Math.max(support, sp);
    }
    const gap = P.y0 - support;
    if (gap >= 0.05 && (nearWall(P, 0.12) || /hang|lamp|sconce|lantern|chandelier|bell|sign|shelf|rack|board|clock/i.test(P.name))) continue;
    if (gap >= 0.05) add('float', P, `${P.name} floats over what is under it`, `lowest part ${Math.round(gap * 100)} cm over the support at its middle (y ${r2(support)})`, { gap: r2(gap) });
    else if (P.y0 < P.f.g - 0.06 && P.y1 > P.f.g + 0.1 && !/crystal|boulder|rock|stalag|egg|spike|root|stone/i.test(P.name)) add('sunk', P, `${P.name} sinks into the floor`, `lowest part ${Math.round((P.f.g - P.y0) * 100)} cm under the floor (y ${r2(P.f.g)})`, { gap: r2(P.y0 - P.f.g) });
  }
  if (A.outdoor) return { id, pieces: list.length, structure: structure.length, find };
  // 4. back to the wall
  for (const P of list) {
    if (!BACKWALL.test(P.name) || !A.bounds?.length) continue;
    const { lb } = P.f, fw = P.f.fwd, rt = P.f.right, pos = P.f.pos;
    const L = (lx, lz) => [pos[0] + rt[0] * lx + fw[0] * lz, pos[2] + rt[1] * lx + fw[1] * lz];
    const mx = (lb[0] + lb[3]) / 2, mz = (lb[2] + lb[5]) / 2;
    const side = { back: wallDist(L(mx, lb[2] - 0.02), [-fw[0], -fw[1]], P), front: wallDist(L(mx, lb[5] + 0.02), fw, P), left: wallDist(L(lb[0] - 0.02, mz), [-rt[0], -rt[1]], P), right: wallDist(L(lb[3] + 0.02, mz), rt, P) };
    const near = Object.entries(side).sort((a, b) => a[1] - b[1])[0];
    if (process.env.PLACE_DEBUG) console.log('DEBUG back', id, P.name, P.f.i, at(P).join(','), JSON.stringify(side));
    const m = `wall distances back ${r2(side.back)}, front ${r2(side.front)}, left ${r2(side.left)}, right ${r2(side.right)} m (rays from each face to a wall part, a wall collider or the floor's edge)`;
    if (side.back >= 0.35 && near[0] !== 'back' && near[1] < side.back - 0.15) add('back', P, `${P.name} is turned: its ${near[0]} is to the wall, not its back${near[0] === 'front' ? ' (doors/face to the wall)' : ''}`, m, { side });
    else if (side.back >= 0.6 && near[1] >= 0.6) add('back', P, `${P.name} stands away from every wall`, m, { side });
  }
  // 5. chairs and their tables
  const tables = list.filter((P) => TABLE.test(P.name));
  for (const P of list) {
    if (!SEAT.test(P.name)) continue;
    let T = null, td = 1e9;
    for (const Q of tables) { const d = distToHull(Q.hull, P.mid); if (d < td) { td = d; T = Q; } }
    if (!T || td > 0.9) continue;
    const q = nearestOnHull(T.hull, P.mid), dir = td < 1e-3 ? sub(T.mid, P.mid) : sub(q, P.mid);
    const a = Math.acos(Math.max(-1, Math.min(1, (dir[0] * P.f.fwd[0] + dir[1] * P.f.fwd[1]) / (Math.hypot(dir[0], dir[1]) || 1))));
    if (deg(a) >= 100) add('facing', P, `${P.name} has its back to the ${T.name} (${tag(T)})`, `seat faces ${deg(a)}° away from the nearest point of the ${T.name}, ${r2(td)} m away`, { angle: deg(a), other: T.f.i });
  }
  // 6. in a door's way: the lane he walks in by, from the exit's trigger 1.6 m into the room (towards the room's
  //    landing spot, else its middle), 0.9 m wide
  for (const e of A.exits) {
    const to = A.spawn && Math.hypot(A.spawn[0] - e.x, A.spawn[1] - e.z) > 0.5 ? A.spawn : A.c;
    let d = sub(to, [e.x, e.z]); const L = Math.hypot(d[0], d[1]) || 1; d = [d[0] / L, d[1] / L];
    const n = [-d[1], d[0]], len = 1.6, hw = 0.45, a = [e.x - d[0] * 0.3, e.z - d[1] * 0.3];
    const lane = [[a[0] + n[0] * hw, a[1] + n[1] * hw], [a[0] - n[0] * hw, a[1] - n[1] * hw], [a[0] - n[0] * hw + d[0] * len, a[1] - n[1] * hw + d[1] * len], [a[0] + n[0] * hw + d[0] * len, a[1] + n[1] * hw + d[1] * len]];
    for (const P of list) {
      if (!stands(P) || P.y1 - P.y0 < 0.25 || ARCH.test(P.name) && P.name !== 'custom') continue;
      const pe = Math.max(0, ...P.parts.filter((q) => q[1] < 1.9 && q[2] > 0.1).map((q) => pen2(q[0], lane)));
      if (pe >= 0.06) add('door', P, `${P.name} stands in the way in from the door to ${e.to || '?'}`, `drawn parts ${Math.round(pe * 100)} cm into the 0.9 m lane from the exit 1.6 m into the room`, { d: r2(pe) });
    }
  }
  // 7. storage adrift in the open
  for (const P of list) {
    if (!STORAGE.test(P.name) || !A.bounds?.length) continue;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const dw = Math.min(...dirs.map((d) => wallDist(P.mid, d, P)));
    const dn = Math.min(...list.filter((Q) => Q !== P && !flat(Q) && !wallm(Q)).map((Q) => Math.max(0, Math.min(...P.hull.map((p) => distToHull(Q.hull, p))))), 9);
    if (dw >= 1.4 + Math.max(...P.hull.map((p) => Math.hypot(p[0] - P.mid[0], p[1] - P.mid[1]))) && dn >= 1.4) add('adrift', P, `${P.name} stands alone in the open`, `${r2(dw)} m from its middle to a wall, ${r2(dn)} m to the nearest piece`, { dw: r2(dw), dn: r2(dn) });
  }
  return { id, pieces: list.length, structure: structure.length, find };
}

// ================================================================== PLACE-2: outdoors
// The pieces of an outdoor area: the Kit's (as indoors) and those tests/lib/placeout.js grouped from what was built
// outside it. Findings, each with its measure:
//   inside   two pieces' drawn parts go ≥ 4 cm into each other (as indoors); a tree's trunk (a 0.2 m post at the middle
//            of a tree ≥ 2.5 m tall, its lowest 2 m) through a piece's parts
//   wall     a piece's parts go ≥ 12 cm into a building's wall (a structure's tall thin part) or a solid building
//            collider (≥ 1.9 m tall, ≥ 2.4 m long)
//   float    a standing piece's lowest part ≥ 5 cm over the ground (terrain, standable bricks, slabs, other pieces' tops)
//            at its middle and at every corner of its footprint (20 % in); or one side ≥ 15 cm over it while another
//            touches (on a slope); trees and bushes ≥ 10 cm
//   sunk     the ground ≥ 8 cm over its lowest part at its middle and at every corner (buried all round)
//   door     a standing piece ≥ 6 cm into a door's way (the 0.9 m lane 1.6 m out from a house's door, or within 0.5 m of
//            a door's trigger where the door's facing is not known)
//   stair    a standing piece ≥ 6 cm into a stair's brick, at the stair's height
//   walk     a standing piece in the middle of a walkway or bridge (a long, narrow standable brick ≥ 0.4 m over the
//            terrain: ≥ 6 cm into its middle, its width less 0.4 m each side)
//   path     a standing piece ≥ 0.25 m tall reaching within 0.5 m of a path's centre line (Citadel's paths: world.js
//            pathDist; elsewhere no path data)
//   bench    a bench whose seat faces a wall, a building or a tall piece less than 0.8 m before its front edge (its
//            facing: from its back, the highest part, to its middle)
//   sign     a sign's text side (a plane with a painted map) faces a wall less than 0.6 m off, or faces away from the
//            path it stands by (Citadel: the path's nearest point behind it, its back blank)
//   wallaway a piece that belongs on or against a wall (a shelf, a rack, a wall lamp, a cabinet ...) ≥ 0.35 m from every
//            wall, building and tall piece
const OUT_ARCH = /^(rockWallRun|column|ibeam|beam|pillar|railing|gargoylePost|arch|crystals|boulder|stalagmites|stalagmite|eggs|rock|rocks|wallLamp|signPlate|cableTray|pipeline|pipe|tilt|gatePillar|hornedHead|wallRun|fence|fenceRun|palisade|wall|kerb)$/i;
const OUT_HUNG = /hang|lamp|sconce|lantern|chandelier|bell|sign|shelf|rack|board|clock|banner|flag|bunting|wire|cable|line|washing|awning|canopy|sail|kite|bird|cloud|light|glow|mist|spark|beam|net|rope/i;
const OUT_JOINT = /^(railing|railRun|fence|post|pole|bannerPole|hangingLine|laundry|lamp|flagPole|meshFence|gateLeaf)$/i;
const OUT_BENCH = /^(bench|waitingBench|parkBench|seat|benches)$/i;
const OUT_SIGN = /sign|board|notice|plaque|timetable|placard|poster|menu|plate/i;
const OUT_WALLTYPE = /^(wallShelf|shelf|shelves|rack|toolRack|toolBoard|wallLamp|sconce|plaque|hangingSign|cupboard|cabinet|locker|wardrobe|bookcase|dresser|filingCabinet|goodsShelf)$/i;
// outdoor dressing (what this sweep is for); other pieces built outside the Kit are a building's or a site's fixtures
// (a pipe's valve, a window, a kerb): obstacles for the dressing, not judged themselves
export const OUT_DRESS = /bench|seat|crate|barrel|keg|sack|lamp|lantern|cart|stall|planter|tub$|^pot$|bin$|sign|board|^post$|pole|bollard|fence|jar|hive|tent|stool|table|chest|trough|basket|^box|wheel|^tools$|rug|firePit|trunk|spool|pickaxe|shovel|skiff|netRack|netHeap|laundry|hangingLine|flowerBed|flowerBox|fountain|^well$|bell|telescope|gasBottles|warnSign|kiosk|bannerPole|windsock|heatPosts|radio|chalk|mooring|barrier|bucket|ladder|cask|bale|pallet|^jars$|stand$|rack|shelf|cabinet|locker|booth|easel|poster|planks|canopy|ropeCoil|floodMast|cartWheel|staff/i;
// (PLACE-3: the Kit's buildings outdoors: their pieces are fixtures)
export const OUT_BUILDING = /^(house|hall|observatory|gate|lba1-gate|lba1-waystone)$/;
export const OUT_FIXTURE_SKIP = /^(_build|Terrain\._build|fieldRing|peek|update|curbs|kerb)$/;
export function judgeOut(id, A) {
  // (PLACE-3: a Kit piece of a building — a house's door and window frames, the observatory's windows and its telescope's
  //  barrel, the monastery's gate in its wall — is the building's fixture, as outside the Kit: an obstacle, not judged;
  //  so are a wall's coping and the snow drifts (ground, banked against walls by design))
  const FR = new Map(A.frames.map((f) => [f.i, f]));
  const fixture = (f) => { if (/^(wallCoping|drift\w*)$/.test(nameOf(f.src))) return true; for (let q = f; q; q = FR.get(q.p)) if (OUT_BUILDING.test(nameOf(q.src))) return true; return false; };
  const kit = pieces(A).list.map((P) => ({ name: P.name, parts: P.parts.map((p) => [p[0], p[1], p[2], null]), hull: P.hull, y0: P.y0, y1: P.y1, mid: P.mid, g: [P.f.g], kit: true, i: P.f.i, fwd: P.f.fwd, fix: fixture(P.f) }));
  const O = A.out || { pieces: [], walls: [], doors: [], stairs: [], walks: [], solid: [] };
  const own = O.pieces.filter((P) => !OUT_FIXTURE_SKIP.test(P.name)).map((P) => ({ ...P, i: 100000 + P.i, dress: !P.veg && OUT_DRESS.test(P.name) }));
  for (const P of kit) P.dress = !P.fix;
  const list = [...kit, ...own];
  const find = [];
  const at = (P) => [r2(P.mid[0] - A.c[0]), r2(P.mid[1] - A.c[1])];
  const add = (kind, P, what, measure, extra = {}) => find.push({ room: id, kind, item: P.name, frame: P.i, at: at(P), world: [r2(P.mid[0]), r2(P.mid[1])], what, measure, maker: P.maker || 'Kit', ...extra });
  const flat = (P) => FLAT.test(P.name) || P.y1 - P.y0 < 0.03;
  const hungN = (P) => WALLMOUNT.test(P.name) || OUT_HUNG.test(P.name);
  const ground = (P) => P.g.filter((v) => v != null);
  const gmid = (P) => P.g[0] ?? ground(P)[0] ?? null;
  const stands = (P) => !flat(P) && gmid(P) != null && P.y0 < gmid(P) + 1.2;
  const rad = (P) => Math.max(...P.hull.map((h) => Math.hypot(h[0] - P.mid[0], h[1] - P.mid[1])));
  // a grid of the pieces, for pairs
  const cell = 4, grid = new Map();
  list.forEach((P, k) => { P._k = k; P._r = rad(P); const gx = Math.floor(P.mid[0] / cell), gz = Math.floor(P.mid[1] / cell); const key = gx + ',' + gz; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(k); });
  const nearby = (P, d) => { const out = []; const gx = Math.floor(P.mid[0] / cell), gz = Math.floor(P.mid[1] / cell), n = Math.ceil((d + 3) / cell); for (let a = gx - n; a <= gx + n; a++) for (let b = gz - n; b <= gz + n; b++) for (const k of grid.get(a + ',' + b) || []) out.push(list[k]); return out; };
  const colH = (c) => colHull(c);
  const solids = (O.solid || []).map((c) => [colH(c), Math.max(c.bottom, -5), c.top, c]);
  const kitWalls = pieces(A).structure.filter((p) => p[2] - p[1] >= 1.5);
  const walls = [...(O.walls || []).map((w) => [w[0], w[1], w[2]]), ...kitWalls];
  // 1. inside each other (and trees' trunks through pieces)
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (const b of nearby(a, a._r + 3)) {
      if (b === a) continue;
      if (a.veg || b.veg) {
        const T = a.veg ? a : b, P = a.veg ? b : a; if (P.veg || !P.dress || flat(P) || T.y1 - T.y0 < 2.5 || /rock|boulder/i.test(T.name)) continue;
        const trunk = [[T.mid[0] - 0.1, T.mid[1] - 0.1], [T.mid[0] + 0.1, T.mid[1] - 0.1], [T.mid[0] + 0.1, T.mid[1] + 0.1], [T.mid[0] - 0.1, T.mid[1] + 0.1]];
        let best = 0; for (const p of P.parts) { if (p[0].length < 3 || yo(p[1], p[2], T.y0, T.y0 + 2) < 0.1) continue; best = Math.max(best, pen2(p[0], trunk)); }
        if (best >= 0.04 && !find.some((f) => f.kind === 'inside' && f.frame === P.i && f.other === T.i)) add('inside', P, `a tree's trunk (${T.name}) through ${P.name}`, `a 0.2 m trunk at the tree's middle ${Math.round(best * 100)} cm into its parts`, { depth: r2(best), other: T.i, otherItem: T.name });
        continue;
      }
      if (b._k < i) continue;
      if (!a.dress && !b.dress) continue;
      if (flat(a) || flat(b) || (OUT_ARCH.test(a.name) && OUT_ARCH.test(b.name))) continue;
      if (OUT_JOINT.test(a.name) && OUT_JOINT.test(b.name)) continue;   // (rails, fences, lines and the poles they run between meet by design)
      if (/rock|boulder|stalag|cliff/i.test(a.name + b.name)) continue;
      if (yo(a.y0, a.y1, b.y0, b.y1) < 0.04 || pen2(a.hull, b.hull) < 0.04) continue;
      let best = 0;
      for (const pa of a.parts) for (const pb of b.parts) { if (pa[0].length < 3 || pb[0].length < 3) continue; const dy = yo(pa[1], pa[2], pb[1], pb[2]); if (dy < 0.04) continue; const d = Math.min(pen2(pa[0], pb[0]), dy); if (d > best) best = d; }
      if (best >= 0.04) { const P = a.y1 - a.y0 < b.y1 - b.y0 ? a : b, Q = P === a ? b : a; add('inside', P, `${P.name} goes into ${Q.name} (#${Q.i} at ${at(Q).join(', ')})`, `parts overlap ${Math.round(best * 100)} cm (footprint SAT and height)`, { depth: r2(best), other: Q.i, otherItem: Q.name }); }
    }
  }
  // 2. into a building's wall
  for (const P of list) {
    if (!P.dress || flat(P) || OUT_ARCH.test(P.name) || hungN(P)) continue;
    let best = 0, what = '';
    for (const pa of P.parts) {
      if (pa[0].length < 3) continue;
      for (const s of walls) { const dy = yo(pa[1], pa[2], s[1], s[2]); if (dy < 0.08) continue; const d = Math.min(pen2(pa[0], s[0]), dy); if (d > best) { best = d; what = 'a wall part'; } }
      for (const s of solids) { const dy = yo(pa[1], pa[2], s[1], s[2]); if (dy < 0.08) continue; const d = Math.min(pen2(pa[0], s[0]), dy); if (d > best) { best = d; what = `a building's collider (${s[3].t} at ${r2(s[3].x)}, ${r2(s[3].z)})`; } }
    }
    if (best >= 0.12) add('wall', P, `${P.name} goes into a building's wall`, `drawn parts ${Math.round(best * 100)} cm into ${what}`, { depth: r2(best) });
  }
  // 3. float / sunk against the ground (terrain, bricks, slabs, other pieces' tops)
  const pts = (P) => [P.mid, ...P.hull.map((h) => [h[0] + (P.mid[0] - h[0]) * 0.2, h[1] + (P.mid[1] - h[1]) * 0.2])];
  for (const P of list) {
    if (!stands(P) || (hungN(P) && !P.veg) || (!P.dress && !P.veg) || (P.veg && P.y1 - P.y0 < 1.5)) continue;
    if (gmid(P) < -0.3) continue;   // (over the sea: boats, buoys)
    const S = pts(P), gs = P.kit ? S.map(() => P.g[0]) : P.g;
    const sup = S.map((pt, k) => {
      let sp = gs[k] ?? gmid(P);
      for (const Q of nearby(P, P._r + 2)) { if (Q === P) continue; for (const q of Q.parts) if (q[0].length >= 3 && q[2] <= P.y0 + 0.03 && q[2] > sp && inside(q[0], pt)) sp = q[2]; }
      for (const s of O.floors || []) if (s[2] <= P.y0 + 0.03 && s[2] > sp && inside(s[0], pt)) sp = s[2];
      return sp;
    });
    const gaps = sup.map((s) => P.y0 - s), lo = Math.min(...gaps), hi = Math.max(...gaps);
    const lim = P.veg ? 0.1 : 0.05;
    const m = `lowest part y ${r2(P.y0)}; the ground at its middle and corners ${sup.map(r2).join(' / ')} (terrain, bricks, slabs, pieces under it)`;
    // (hung on a wall: a window's flower box, a lamp on its bracket — over the ground by design, against a wall)
    if (lo >= lim && P.y0 - Math.max(...sup) >= 0.4 && P.hull.some((h) => walls.some((w) => w[1] < P.y1 && w[2] > P.y0 && distToHull(w[0], h) < 0.15) || solids.some((w) => w[1] < P.y1 && w[2] > P.y0 && distToHull(w[0], h) < 0.15)
      || nearby(P, 3).some((Q) => Q !== P && !Q.veg && Q.y1 - Q.y0 >= 1.2 && Q.y0 < P.y1 && Q.y1 > P.y0 && distToHull(Q.hull, h) < 0.15))) continue;
    // (buried whole: a dig's chest under the sand, by design)
    if (P.y1 < Math.min(...sup) + 0.1) continue;
    if (lo >= lim) add('float', P, `${P.name} floats over the ground`, `${Math.round(lo * 100)} cm over the ground everywhere under it — ${m}`, { gap: r2(lo) });
    else if (!P.veg && hi >= 0.15 && P.hull.length >= 3 && rad(P) > 0.2) add('float', P, `${P.name} stands with one side in the air (a slope)`, `one side ${Math.round(hi * 100)} cm over the ground, another touching — ${m}`, { gap: r2(hi), side: true });
    else if (!P.veg && -hi >= 0.08 && !/crystal|boulder|rock|stalag|egg|spike|root|stone|stump|pile|block|post|pole|laundry|line|lamp|mast|signpost|windsock/i.test(P.name)) add('sunk', P, `${P.name} sinks into the ground`, `${Math.round(-hi * 100)} cm under the ground everywhere under it — ${m}`, { gap: r2(hi) });
  }
  // (posts and poles are planted: not sunk)
  // 4. in a door's way, a stair, a walkway, a path
  const stood = (P) => stands(P) && P.dress && !OUT_ARCH.test(P.name) && P.y1 - P.y0 >= 0.25;
  for (const d of O.doors || []) {
    let lane;
    if (d.ry != null) {
      const dx = Math.sin(d.ry), dz = Math.cos(d.ry), nx = -dz, nz = dx, hw = 0.45, len = 1.6;
      lane = [[d.x + nx * hw, d.z + nz * hw], [d.x - nx * hw, d.z - nz * hw], [d.x - nx * hw + dx * len, d.z - nz * hw + dz * len], [d.x + nx * hw + dx * len, d.z + nz * hw + dz * len]];
    } else { const R = (d.r ?? 0.9) + 0.1; lane = []; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; lane.push([d.x + Math.cos(a) * R, d.z + Math.sin(a) * R]); } }
    for (const P of nearby({ mid: [d.x, d.z] }, 3)) {
      if (!stood(P)) continue;
      const pe = Math.max(0, ...P.parts.filter((q) => q[0].length >= 3 && q[1] < gmid(P) + 1.9 && q[2] > gmid(P) + 0.1).map((q) => pen2(q[0], lane)));
      if (pe >= 0.06) add('door', P, `${P.name} stands in the way to the door ${d.to || ''}`.trim(), `drawn parts ${Math.round(pe * 100)} cm into ${d.ry != null ? 'the 0.9 m lane 1.6 m out from the door' : `the door trigger's ring (${d.r} m + 0.1 m)`}`, { d: r2(pe), door: d.to });
    }
  }
  for (const s of O.stairs || []) {
    const h = colH(s);
    for (const P of nearby({ mid: [s.x, s.z] }, (s.hw ?? s.r ?? 1) + (s.hd ?? 0) + 2)) {
      if (!stood(P) || P.y0 > s.top + 0.3 || P.y0 < s.top - 2) continue;
      const pe = Math.max(0, ...P.parts.filter((q) => q[0].length >= 3).map((q) => pen2(q[0], h)));
      if (pe >= 0.06) add('stair', P, `${P.name} stands on a stair's step`, `drawn parts ${Math.round(pe * 100)} cm into the stair's brick at ${r2(s.x)}, ${r2(s.z)} (top ${r2(s.top)})`, { d: r2(pe) });
    }
  }
  for (const s of O.walks || []) {
    const narrow = s.hw < s.hd ? { ...s, hw: Math.max(0.05, s.hw - 0.4) } : { ...s, hd: Math.max(0.05, s.hd - 0.4) };
    const h = colH(narrow);
    for (const P of nearby({ mid: [s.x, s.z] }, Math.max(s.hw, s.hd) + 2)) {
      if (!stood(P) || Math.abs(P.y0 - s.top) > 0.3) continue;
      const pe = Math.max(0, ...P.parts.filter((q) => q[0].length >= 3).map((q) => pen2(q[0], h)));
      if (pe >= 0.06) add('walk', P, `${P.name} stands in the middle of a walkway or bridge`, `drawn parts ${Math.round(pe * 100)} cm into the middle of the walkway's brick at ${r2(s.x)}, ${r2(s.z)} (${r2(s.hw * 2)} × ${r2(s.hd * 2)} m, top ${r2(s.top)})`, { d: r2(pe) });
    }
  }
  for (const P of list) if (P.path != null && stood(P) && P.path < 0.5 && !hungN(P)) add('path', P, `${P.name} stands on a path`, `its footprint ${r2(P.path)} m from the path's centre line (world.js pathDist)`, { d: r2(P.path) });
  // walls, buildings and tall pieces round a point (for benches, signs, wall-type pieces)
  const blockAt = (q, y, self) => {
    for (const w of walls) if (w[1] < y + 1 && w[2] > y + 0.5 && inside(w[0], q)) return 'a wall';
    for (const s of solids) if (s[1] < y + 1 && s[2] > y + 0.5 && inside(s[0], q) && !(self && inside(s[0], self.mid))) return 'a building';
    for (const Q of nearby({ mid: q }, 2)) if (Q !== self && !Q.veg && Q.y1 - Q.y0 >= 1.2 && Q.y0 < y + 0.5 && !OUT_HUNG.test(Q.name) && inside(Q.hull, q)) return `a tall piece (${Q.name})`;
    return null;
  };
  const ray = (p, dir, y, self, max) => { for (let t = 0; t <= max; t += 0.05) { const b = blockAt([p[0] + dir[0] * t, p[1] + dir[1] * t], y, self); if (b) return [t, b]; } return [max, null]; };
  // 5. benches facing a wall
  for (const P of list) {
    if (!OUT_BENCH.test(P.name) || P.parts.length < 2) continue;
    const top = P.parts.reduce((a, p) => (p[2] > a[2] ? p : a));
    const tm = top[0].reduce((a, q) => [a[0] + q[0] / top[0].length, a[1] + q[1] / top[0].length], [0, 0]);
    let f = [P.mid[0] - tm[0], P.mid[1] - tm[1]], L = Math.hypot(f[0], f[1]);
    if (P.fwd && L < 0.05) { f = P.fwd; L = 1; }
    if (L < 0.05) continue;
    f = [f[0] / L, f[1] / L];
    const front = Math.max(...P.hull.map((h) => (h[0] - P.mid[0]) * f[0] + (h[1] - P.mid[1]) * f[1]));
    const p0 = [P.mid[0] + f[0] * (front + 0.02), P.mid[1] + f[1] * (front + 0.02)];
    const [t, b] = ray(p0, f, gmid(P) ?? P.y0, P, 0.8);
    if (b) add('bench', P, `${P.name} faces ${b} ${r2(t)} m before its seat`, `a ray from the seat's front edge along its facing (back → middle) meets ${b} at ${r2(t)} m (< 0.8 m)`, { d: r2(t) });
  }
  // 6. signs: the text side facing a wall, or away from the path
  for (const P of list) {
    if ((!OUT_SIGN.test(P.name) && !P.parts.some((p) => p[3]?.[2] === 1)) || /gate|leaf|door/i.test(P.name)) continue;
    const faces = P.parts.filter((p) => p[3] && p[3][2] === 1);
    if (!faces.length) continue;
    const ns = faces.map((p) => p[3]);
    for (const p of faces) {
      const n = p[3];
      if (ns.some((m) => m[0] * n[0] + m[1] * n[1] < -0.7)) continue;   // (two-sided: text on both faces)
      const c = p[0].reduce((a, q) => [a[0] + q[0] / p[0].length, a[1] + q[1] / p[0].length], [0, 0]);
      const [t, b] = ray([c[0] + n[0] * 0.05, c[1] + n[1] * 0.05], n, Math.max(gmid(P) ?? 0, p[1] - 1), P, 0.6);
      if (b) { add('sign', P, `${P.name}'s text faces ${b} ${r2(t)} m off`, `a ray from the text plane's middle along its normal meets ${b} at ${r2(t)} m (< 0.6 m)`, { d: r2(t) }); break; }
      if (P.toPath && Math.hypot(...P.toPath) > 0.5 && (n[0] * P.toPath[0] + n[1] * P.toPath[1]) / Math.hypot(...P.toPath) < -0.5) { add('sign', P, `${P.name}'s text faces away from the path`, `text normal ${n[0]}, ${n[1]}; the path's nearest point is ${r2(Math.hypot(...P.toPath))} m the other way (world.js pathDist)`, {}); break; }
    }
  }
  // 7. wall-type pieces away from every wall
  for (const P of list) {
    if (!OUT_WALLTYPE.test(P.name)) continue;
    let best = 9;
    for (const h of P.hull) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const [t, b] = ray(h, [Math.cos(a), Math.sin(a)], gmid(P) ?? P.y0, P, 0.6); if (b) best = Math.min(best, t); }
    if (best >= 0.35) add('wallaway', P, `${P.name} stands away from every wall`, `rays in 8 directions from its footprint's corners meet no wall, building or tall piece within ${best >= 9 ? 0.6 : r2(best)} m`, {});
  }
  return { id, pieces: list.length, own: own.length, kit: kit.length, dress: own.filter((P) => P.dress).length, veg: own.filter((P) => P.veg).length, find };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const D = JSON.parse(fs.readFileSync(process.argv[2]));
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  let n = 0;
  for (const [id, A] of Object.entries(D)) {
    if (only && !only.includes(id)) continue;
    const r = A.outdoor && A.out ? judgeOut(id, A) : judge(id, A); n += r.find.length;
    if (r.find.length || process.env.ALL) console.log(`AREA ${id}: ${r.pieces} pieces, ${r.find.length} findings`);
    for (const f of r.find) console.log(`  ${f.kind.padEnd(7)} ${f.item}#${f.frame} at ${f.at.join(', ')}: ${f.what} — ${f.measure}`);
  }
  console.log('total', n);
}
