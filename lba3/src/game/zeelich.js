// Zeelich — the terminal island above the clouds (chapter 2). An outdoor region: a room flagged `outdoor`,
// shown with the LBA exterior camera and its own sky (Environment.setRegion), far from Citadel in the same
// scene. Walkable ground is physics bricks only: past the island's edge there is no floor (the terrain there
// is open sea, which actors may not enter), so nobody walks off into the clouds.
//
// CONTRACT used by src/game/story/chapter2.js (keep these names and meanings when rebuilding the art):
//   R.dock {x,z,a}            where the ferry ties up; R.ferry {group, x, z, setVisible(b)}
//   R.street {x,z}            Esmer street centre; R.npcSpots {esmer1, esmer2, esmer3, bee1, bee2, mole1, mole2, tri1, tri2, baldinoOut, doran, vesk, guard} {x,z,a}
//   R.workshopDoor {x,z}      door into Baldino's workshop (interior room 'workshop')
//   R.councilDoor {x,z}       the arcade house's door: the council house and its cloud lift (rooms 'upper', 'council', 'archive')
//   R.mills [{id, x, z, brake:{x,y,z}, spinning, setSpinning(b)}]  three wind-mills, a ball target (brake) each
//   R.millTop {x,y,z}         the cog on top of the old mill (reached by jumping up its stair-stones)
//   R.depot {x, z, patrol:[[x,z],...], locker:{x,z}}  the project depot (drones patrol it), locker holds the code cylinder
//   R.platform {x, z, gate:{x,z}, console:{x,z}, shield:{on, setOn(b)}, pad:{x,z}, lift:{lower(cb)}}
//   R.cloudY                  height of the cloud sea
//   R.life                    the street twelve years on (zeelife.js: the watch house bakery, heat posts, burrow, scaffold)
//   R.lift                    the Cistern Rise on Mill Lane: the freight lift, the cistern, Irsa's Pump Works (zlift.js; story/zeelift.js)
//
// Art pass: a floating island of Esmer architecture above a pink sea of clouds. West → east: the sky-ferry
// pier and a horseshoe gateway, the Esmer street (whitewashed and lilac houses with onion domes, an arcade,
// a fountain, a market stall, Baldino's cluttered workshop), three wind-mills with big sail wheels (the old
// north one can be climbed by its stair-stones), the fenced project depot, and the Joint Project's drill
// platform beyond a shielded gate. Everything is built in local coordinates inside R.group (which sits at
// ZEELICH); colliders and contract points are in world coordinates. Kit rules as in island.js: bevelled
// edges, real thickness, painted textures with world-scaled UVs, static parts merged per material.
//
// Heights the story may need: walking level Y0 = 6.0, platform deck DECK = 6.42 (both world y), cloud sea
// R.cloudY = -3. Mill brakes are 3.0 m above the ground; the old mill's balcony (R.millTop.y) is 8.75 m up.
import { placeTag } from '../engine/placetag.js';
import * as THREE from 'three';
import { fitAdd } from './worldfit.js';
import { esmerShuttle, shuttleTraffic } from './shuttle.js';
import { Dog, addDogs } from './dogs.js';
import { esmerBuilding, Place, setLook, glassM, tealGlassM, capParts, capSpike, capM, frondTree, goldPlant } from './props-esmer.js';
const MAT_PAD = () => new THREE.MeshStandardMaterial({ color: '#8a8f9a', roughness: 0.7, metalness: 0.2 });
import { textures, keyJSON } from '../engine/textures.js';
import { rng, lerp, smoothstep } from '../engine/math.js';
import { SpriteBatch } from '../engine/spritebatch.js';
import { rockGeometry, grassClumpGeometry, flowerGeometry } from './vegetation.js';
import { rugTex } from './props.js';
import { cullInstances } from './kit.js';
import { viewCull } from '../engine/viewinst.js';
import { buildZeelichLife, zlClear } from './zeelife.js';
import { roomOcc } from './roomocc.js';
import { buildCisternRise, liftClear } from './zlift.js';
import { touch } from './story/reach.js';

export const ZEELICH = { x: 2400, z: 0 };
const Y0 = 6.0;              // walking level of the island
const DECK = Y0 + 0.42;      // drill platform deck (one step up from the neck)
const CLOUD_Y = Y0 - 9;      // the sea of clouds

// ================================================================== layout (local coordinates)
// island outline (clockwise from the dock), smoothed before use
const OUTLINE = [
  [-50, -2.6], [-50, -7], [-48, -14], [-42, -21.5], [-32, -26.5], [-20, -28.5], [-8, -29.5], [4, -28.5], [16, -29.5], [26, -27],
  [33, -21], [36.2, -12.5], [36, -6], [40.4, -6], [40.4, 6], [36, 6], [36.2, 12.5], [33, 21], [26, 27.5], [16, 30], [4, 29], [-8, 30],
  [-20, 29], [-32, 27], [-42, 22], [-48, 14], [-50, 7], [-50, 2.6],
];
const PLATFORM = [[40, -7.5], [44, -11.5], [56, -11.5], [60.5, -7], [60.5, 7], [56, 11.5], [44, 11.5], [40, 7.5]];
const PAD = { x: 50, z: 0, r: 1.7 };
const SHAFT_R = 1.85;
const GATE = { x: 37.2, half: 2.75, wall: 6.6 };
const PIER = { x0: -64, x1: -49.4, hw: 2.25 };
const FERRY = { x: -57.6, z: 5.05 };
const DEPOT = { x0: 4, x1: 24, z0: 9, z1: 25.2, gate: [10.0, 14.0] };
const PLAZA = { x: -24, z: 0, r: 8.2 };
// the street's benches [x, z, ry] (local; ry: the way a sitter faces), for walkrounds.js too (BENCHES-1: the north row's two
// between the lamps, at −14.5 and 11 — they were at −17 and 14, on the lamps' line)
export const ZEELICH_SEATS = [[-31, -4.6, 0], [-14.5, 4.6, Math.PI], [3, -4.6, 0], [11, 4.6, Math.PI], [PLAZA.x - 7.0, PLAZA.z + 2.2, Math.PI / 2 + 0.25], [26, -4.6, 0]];
const MILLS = [
  { id: 'north', x: -2, z: -20, old: true, face: -0.95, brake: 0.0 },
  { id: 'east', x: 22, z: -17.5, face: -0.55, brake: 0.25 },
  { id: 'south', x: -2.5, z: 21.5, face: 2.45, brake: Math.PI },
];
// (ZEELICH-2, the user 4.11: "Zeelich doesn't look like LBA2's Zeelich": the street in LBA2's Esmer look, measured on
// the original's Otringal (zislands.js OTR_LBA2): taupe stucco, glass-block bands, teal glass, low faceted caps in aqua
// or gold with a gold spike, a plain coping; where it had cream and lilac walls under violet, teal, orange and rose
// onions with scalloped merlons. Each house keeps its place, size, door and role; the council's cap is the gold one.)
const HOUSES = [
  { x: -40.5, z: -10.2, ry: 0, w: 6.2, d: 5.2, h: 3.8, wall: '#e2d6cc', trim: '#3a7a8a', dome: ['#78a8ae', '#b4d8d8'], minaret: 1, seed: 1 },
  { x: -25.5, z: -13.3, ry: 0, w: 8.2, d: 5.6, h: 4.3, wall: '#d8cec8', trim: '#a87838', dome: ['#b0824a', '#e6c47e'], arcade: 3, seed: 2 },
  // (ZSTYLE-2: two street houses take LBA2's other Esmer bodies, at the same footprint, door and colliders: an octagonal hall
  // under a broad faceted cap (Otringal's body 9) and a barrel vault with gables (body 51))
  { x: -11, z: -10.6, ry: 0, w: 6.0, d: 5.0, h: 3.6, wall: '#e0d2c8', trim: '#3a6a80', dome: ['#6c9ea8', '#a8d0d4'], seed: 3, octa: 1.1 },
  { x: -38.5, z: 10.6, ry: Math.PI, w: 6.6, d: 5.4, h: 3.9, wall: '#e6dcd2', trim: '#2f7a84', dome: ['#82b0b4', '#c0e0de'], minaret: -1, seed: 4, vault: 1.5 },
  { x: -12, z: 12.2, ry: Math.PI, w: 7.6, d: 6.2, h: 4.0, wall: '#e4d4bc', trim: '#2f7a84', workshop: true, seed: 5, doorX: -1.5 },
];

// ================================================================== materials
const MC = new Map();
const TILE = { cliff: 4.5, stone: 1.8, plaster: 2.2, planks: 2.2, brass: 1.6, teal: 2.2, hazard: 0.9, deck: 2.0, cobble: 3.2, grass: 4.0, dirt: 3.0, rubble: 1.7, tiles: 1.0, concrete: 2.6, metal: 2.6, roof: 1.6 };
function tm(name, opts = {}) {
  const key = name + keyJSON(opts);
  if (MC.has(key)) return MC.get(key);
  const map = typeof name === 'string' ? textures()[name] : name;
  const m = new THREE.MeshStandardMaterial({ map, color: opts.color || '#ffffff', roughness: opts.rough ?? 0.88, metalness: opts.metal ?? 0, vertexColors: !!opts.vc, emissive: opts.emissive || '#000000', emissiveIntensity: opts.ei ?? 1, side: opts.side ?? THREE.FrontSide, transparent: !!opts.transparent, alphaTest: opts.alphaTest ?? 0 });
  MC.set(key, m);
  return m;
}
function pm(color, rough = 0.8, extra = {}) {
  const key = '_' + color + rough + keyJSON(extra);
  if (MC.has(key)) return MC.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
  MC.set(key, m);
  return m;
}
const VC = () => pm('#ffffff', 0.85, { vertexColors: true });
const brassM = () => tm('brass', { rough: 0.36, metal: 0.75 });
const tealM = () => tm('teal', { rough: 0.55, metal: 0.3 });
const darkSteel = () => pm('#3a4048', 0.5, { metalness: 0.55 });
const glowCyan = () => pm('#9ff4ff', 0.3, { emissive: '#35d8ff', emissiveIntensity: 2.4 });

// ================================================================== painted textures (Zeelich only)
const TC = new Map();
function ctex(key, w, h, draw, repeat = true) {
  if (TC.has(key)) return TC.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  TC.set(key, t);
  return t;
}
// the council house's notice (ZEELICH-DOORS)
const noticeTex = () => ctex('cnotice', 256, 180, (x, W, H) => {
  x.fillStyle = '#f2e8d4'; x.fillRect(0, 0, W, H); x.strokeStyle = '#7a5a2a'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = '#2a3a5a'; x.textAlign = 'center'; x.font = 'bold 30px serif'; x.fillText('COUNCIL', W / 2, 52);
  x.font = 'bold 22px sans-serif'; x.fillText('HEARINGS BY', W / 2, 96); x.fillText('PETITION ONLY', W / 2, 126);
  x.fillStyle = '#a8302a'; x.beginPath(); x.arc(W / 2, 156, 12, 0, 7); x.fill();
}, false);
const wrap9 = (S, fn) => { for (const a of [-S, 0, S]) for (const b of [-S, 0, S]) fn(a, b); };
// Esmer glazed tiles (4×4 per texture = 0.25 m tiles): an eight-point star per tile, quatrefoils at the corners
const tileTex = (a = '#2f8a9a', b = '#e8b84a', c = '#d8608a') => ctex('tiles' + a + b + c, 256, 256, (x, S) => {
  const r = rng(5);
  x.fillStyle = '#5a4a5a'; x.fillRect(0, 0, S, S);
  const t = S / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const x0 = i * t, y0 = j * t, k = 0.92 + r() * 0.12;
    x.fillStyle = `rgb(${244 * k | 0},${236 * k | 0},${222 * k | 0})`; x.beginPath(); x.roundRect(x0 + 2, y0 + 2, t - 4, t - 4, 4); x.fill();
    const cx = x0 + t / 2, cy = y0 + t / 2;
    x.fillStyle = a; x.beginPath();
    for (let q = 0; q < 16; q++) { const an = (q / 16) * Math.PI * 2, rr = q % 2 ? 11 : 26; x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); }
    x.closePath(); x.fill();
    x.fillStyle = b; x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill();
    x.fillStyle = c; for (const [qx, qy] of [[x0, y0], [x0 + t, y0], [x0, y0 + t], [x0 + t, y0 + t]]) { x.beginPath(); x.arc(qx, qy, 9, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(x0 + 6, y0 + 5, t - 20, 3);
  }
});
// fish-scale dome tiles with gilded ribs
export const domeTex = (base, hi) => ctex('dome' + base + hi, 256, 256, (x, S) => {
  const r = rng(base.length * 7 + 3);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  const cw = 32, ch = 22;
  for (let j = -1; j < S / ch + 1; j++) for (let i = -1; i < S / cw + 1; i++) {
    const cx = i * cw + (j % 2 ? cw / 2 : 0), cy = j * ch;
    const g = x.createRadialGradient(cx, cy + ch * 0.3, 2, cx, cy + ch * 0.6, cw * 0.62);
    g.addColorStop(0, hi); g.addColorStop(0.55, base); g.addColorStop(1, 'rgba(0,0,0,0.35)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, cw * 0.56, 0, Math.PI); x.fill();
    x.strokeStyle = 'rgba(40,20,50,0.45)'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, cw * 0.56, 0.1, Math.PI - 0.1); x.stroke();
    if (r() < 0.1) { x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.arc(cx - 4, cy + 8, 4, 0, 7); x.fill(); }
  }
  for (let i = 0; i < 4; i++) { x.fillStyle = '#e8c060'; x.fillRect(i * 64 - 2, 0, 4, S); x.fillStyle = 'rgba(120,80,20,0.5)'; x.fillRect(i * 64 + 2, 0, 1.5, S); }
});
// carved lattice screen over dark glass
const latticeTex = () => ctex('lattice', 128, 128, (x, S) => {
  x.fillStyle = '#2c2846'; x.fillRect(0, 0, S, S);
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, 'rgba(255,200,240,0.18)'); g.addColorStop(1, 'rgba(80,160,255,0.1)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.strokeStyle = '#f2e6d4'; x.lineWidth = 5;
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
    const cx = i * 64, cy = j * 64;
    x.beginPath(); for (let q = 0; q <= 8; q++) { const a = (q / 8) * Math.PI * 2 + Math.PI / 8; x.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); } x.stroke();
  }
  x.lineWidth = 4; x.beginPath(); for (const v of [32, 96]) { x.moveTo(v, 0); x.lineTo(v, S); x.moveTo(0, v); x.lineTo(S, v); } x.stroke();
});
// striped sail cloth (rose / cream) with seams
const sailTex = (a = '#f6eadc', b = '#e88aa4') => ctex('sail' + a + b, 128, 256, (x, W, H) => {
  const r = rng(11);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * W) / 8, 0, W / 8 + 1, H); }
  for (let i = 0; i < 400; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(90,60,40,0.06)'; x.fillRect(r() * W, r() * H, 2, 1 + r() * 6); }
  x.fillStyle = 'rgba(80,50,40,0.35)'; for (let i = 0; i <= 8; i++) x.fillRect((i * W) / 8 - 1, 0, 1.5, H);
  x.fillStyle = 'rgba(70,40,30,0.45)'; for (let j = 0; j < 4; j++) x.fillRect(0, (j * H) / 4, W, 2);
});
// SKY-9: a cloud texture in greys (its luminance, alpha kept), for a cloud sea whose colour is its tint alone (the
// Wannies' amber gas: the lavender billows came out pink and magenta under an amber tint)
const toGrey = (x, S) => { const im = x.getImageData(0, 0, S, S), d = im.data; for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722; d[i] = d[i + 1] = d[i + 2] = l; } x.putImageData(im, 0, 0); };
// soft cloud puffs, tileable, transparent (alpha) or on a solid ground; grey: in greys (above)
export const cloudTex = (solid, grey = false) => ctex('cloud' + solid + (grey ? 'g' : ''), 512, 512, (x, S) => {
  const r = rng(solid ? 77 : 78);
  if (solid) { x.fillStyle = '#d0a0cc'; x.fillRect(0, 0, S, S); } else x.clearRect(0, 0, S, S);
  // billows: a lavender shadow under each puff, then the sunlit puff with a soft rim
  for (let i = 0; i < (solid ? 46 : 26); i++) {
    const px = r() * S, py = r() * S, rr = 18 + r() * 36;
    const parts = [];
    for (let k = 0; k < 7; k++) parts.push([px + (r() - 0.5) * rr * 2.0, py + (r() - 0.5) * rr * 0.7, rr * (0.45 + r() * 0.45)]);
    for (const pass of [0, 1]) for (const [qx, qy, q] of parts) wrap9(S, (ox, oy) => {
      const cx = qx + ox, cy = qy + oy + (pass ? 0 : q * 0.28);
      const g = x.createRadialGradient(cx - q * 0.2, cy - q * 0.25, 0, cx, cy, q);
      if (!pass) { g.addColorStop(0, 'rgba(150,110,170,0.5)'); g.addColorStop(0.8, 'rgba(160,120,180,0.3)'); g.addColorStop(1, 'rgba(160,120,180,0)'); }
      else { g.addColorStop(0, 'rgba(255,253,250,1)'); g.addColorStop(0.55, 'rgba(255,242,248,0.95)'); g.addColorStop(0.85, 'rgba(244,214,236,0.55)'); g.addColorStop(1, 'rgba(240,210,236,0)'); }
      x.fillStyle = g; x.fillRect(cx - q, cy - q, q * 2, q * 2);
    });
  }
  if (grey) toGrey(x, S);
});
export const puffTex = (grey = false) => ctex('puff' + (grey ? 'g' : ''), 128, 128, (x, S) => {
  x.clearRect(0, 0, S, S);
  const r = rng(3);
  for (let k = 0; k < 9; k++) {
    const cx = 64 + (r() - 0.5) * 56, cy = 70 + (r() - 0.5) * 30, q = 22 + r() * 22;
    const g = x.createRadialGradient(cx, cy - q * 0.3, 0, cx, cy, q);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(255,238,246,0.6)'); g.addColorStop(1, 'rgba(255,238,246,0)');
    x.fillStyle = g; x.fillRect(cx - q, cy - q, q * 2, q * 2);
  }
  // SKY-9: faded out before the texture's border (some billows reached past it: a puff showed its quad's straight edges)
  const e = x.createRadialGradient(64, 64, 40, 64, 64, 64); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-in'; x.fillStyle = e; x.fillRect(0, 0, S, S); x.globalCompositeOperation = 'source-over';
  if (grey) toGrey(x, S);
}, false);
// ZSTYLE-1: the island's rock, LBA2's Zeelich ground (measured on the original's Otringal, Knartas and the Platform:
// grey granite #62625c–#aaa19a with pale #d6d1d4 lights, no lawn): a neutral speckled grey, lit planes and fine cracks
const graniteTex = () => ctex('zgranite', 512, 512, (x, S) => {
  const r = rng(91);
  x.fillStyle = '#c4c0b8'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 220; i++) {
    const px = r() * S, py = r() * S, w = 18 + r() * 60, h = 10 + r() * 30, t = r(), rot = r() * 3;
    x.fillStyle = t < 0.45 ? 'rgba(236,234,230,0.2)' : t < 0.75 ? 'rgba(128,126,118,0.13)' : 'rgba(150,152,140,0.14)';
    wrap9(S, (a, b) => { x.beginPath(); x.ellipse(px + a, py + b, w / 2, h / 2, rot, 0, 7); x.fill(); });
  }
  x.strokeStyle = 'rgba(84,82,76,0.28)'; x.lineWidth = 1.2;
  for (let i = 0; i < 36; i++) {
    let px = r() * S, py = r() * S; const pts = [[px, py]];
    for (let k = 0; k < 5; k++) { px += 10 + r() * 22; py += (r() - 0.5) * 12; pts.push([px, py]); }
    wrap9(S, (a, b) => { x.beginPath(); pts.forEach(([u, v], k) => (k ? x.lineTo(u + a, v + b) : x.moveTo(u + a, v + b))); x.stroke(); });
  }
  for (let i = 0; i < 2400; i++) { const t = r(); x.fillStyle = t < 0.45 ? '#f2f0ec' : t < 0.8 ? '#6e6c64' : '#808676'; x.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
});
// ZSTYLE-2: ribbed (corrugated) metal sheet, as LBA2's Esmer sheds and the Grand Hall's flanks (Otringal's bodies 0, 69):
// eight ribs to the tile, each lit on one side, a seam and some run-off streaks
const ribTex = () => ctex('zrib', 128, 128, (x, S) => {
  const r = rng(53), n = 8, q = S / n;
  for (let i = 0; i < n; i++) {
    const g = x.createLinearGradient(i * q, 0, (i + 1) * q, 0);
    g.addColorStop(0, '#8e9494'); g.addColorStop(0.35, '#e6eaea'); g.addColorStop(0.6, '#c4caca'); g.addColorStop(1, '#7c8282');
    x.fillStyle = g; x.fillRect(i * q, 0, q, S);
  }
  x.fillStyle = 'rgba(40,44,44,0.5)'; x.fillRect(0, S - 3, S, 3);
  for (let i = 0; i < 14; i++) { x.fillStyle = r() < 0.5 ? 'rgba(150,104,64,0.16)' : 'rgba(60,64,62,0.14)'; x.fillRect(r() * S, r() * S * 0.5, 2 + r() * 3, 20 + r() * 50); }
});
// ZSTYLE-2: LBA2's Zeelich paving (LBA2_VISUAL_NOTES: lavender-grey paving with lighter borders; the original's Otringal
// paving #d3ced9 / #afa5ad): pale lavender-grey flags in staggered rows, thin joints; it was the dark grey cobble
const paveTex = () => ctex('zpave', 256, 256, (x, S) => {
  const r = rng(61), cols = 4, rows = 6, cw = S / cols, rh = S / rows;
  x.fillStyle = '#a49fac'; x.fillRect(0, 0, S, S);
  for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
    const x0 = i * cw + (j % 2 ? cw / 2 : 0) + 1.5, y0 = j * rh + 1.5, k = 0.94 + r() * 0.1;
    x.fillStyle = `rgb(${212 * k | 0},${207 * k | 0},${221 * k | 0})`; x.fillRect(x0, y0, cw - 3, rh - 3);
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(x0, y0, cw - 3, 2);
  }
  for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(120,114,130,0.22)' : 'rgba(250,248,252,0.3)'; x.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5); }
});
// the borders' kerb stone: a pale lavender-white with fine speckle and a joint each metre (lighter than the flags)
const kerbTex = () => ctex('zkerb', 128, 128, (x, S) => {
  const r = rng(71);
  x.fillStyle = '#f2eff6'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(150,144,160,0.2)' : 'rgba(255,255,255,0.5)'; x.fillRect(r() * S, r() * S, 1 + r(), 1 + r()); }
  x.fillStyle = 'rgba(150,144,160,0.55)'; x.fillRect(0, 0, 2, S);
});
// fine gravel for the tracks to the mills (grey with ochre and pale stones), where it was brown earth
const gravelTex = () => ctex('zgravel', 256, 256, (x, S) => {
  const r = rng(67);
  x.fillStyle = '#a8a092'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 1500; i++) {
    const t = r(), px = r() * S, py = r() * S, rr = 1.2 + r() * 2.6;
    x.fillStyle = t < 0.4 ? '#d4cec2' : t < 0.7 ? '#7c766a' : t < 0.88 ? '#c2a87c' : '#ece8e0';
    wrap9(S, (a, b) => { x.beginPath(); x.ellipse(px + a, py + b, rr, rr * 0.75, r() * 3, 0, 7); x.fill(); });
  }
});
// hexagonal energy field
const shieldTex = () => ctex('shield', 256, 256, (x, S) => {
  x.clearRect(0, 0, S, S);
  const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(120,240,255,0.18)'); g.addColorStop(1, 'rgba(120,240,255,0.32)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  const R = 16, w = Math.sqrt(3) * R;
  x.strokeStyle = 'rgba(190,255,255,0.95)'; x.lineWidth = 2.2;
  for (let j = -1; j < S / (1.5 * R) + 1; j++) for (let i = -1; i < S / w + 1; i++) {
    const cx = i * w + (j % 2 ? w / 2 : 0), cy = j * 1.5 * R;
    x.beginPath(); for (let q = 0; q <= 6; q++) { const a = (q / 6) * Math.PI * 2 + Math.PI / 6; x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } x.stroke();
  }
});
const bullseyeTex = () => ctex('bull', 128, 128, (x, S) => {
  const cols = ['#c8302a', '#f4eee0', '#c8302a', '#f4eee0', '#e8b84a'];
  cols.forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - i * 12, 0, 7); x.fill(); });
  x.strokeStyle = 'rgba(60,20,10,0.6)'; x.lineWidth = 2; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(S / 2, S / 2, S / 2 - i * 12 - 1, 0, 7); x.stroke(); }
}, false);
// Baldino's sign: a cog, a spanner and a light bulb (language-free)
const workshopSignTex = () => ctex('wsign', 256, 160, (x, W, H) => {
  x.fillStyle = '#2f7a84'; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, 18); x.fill();
  x.strokeStyle = '#e8c060'; x.lineWidth = 8; x.beginPath(); x.roundRect(8, 8, W - 16, H - 16, 14); x.stroke();
  const cx = 92, cy = 80;
  x.fillStyle = '#f4e6c4'; x.beginPath();
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, rr = i % 2 ? 40 : 52; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
  x.fillStyle = '#2f7a84'; x.beginPath(); x.arc(cx, cy, 18, 0, 7); x.fill();
  x.save(); x.translate(176, 82); x.rotate(-0.7); x.fillStyle = '#e8c060'; x.fillRect(-6, -38, 12, 64); x.beginPath(); x.arc(0, -42, 16, 0, 7); x.fill();
  x.fillStyle = '#2f7a84'; x.fillRect(-6, -60, 12, 20); x.restore();
  x.fillStyle = '#fff2a8'; x.beginPath(); x.arc(212, 44, 14, 0, 7); x.fill(); x.fillStyle = '#c8a040'; x.fillRect(206, 56, 12, 8);
}, false);
// awning stripes
const stripeTex = (a, b) => ctex('stripe' + a + b, 64, 64, (x, S) => { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * S) / 4, 0, S / 4, S); } const r = rng(a.length + 9); x.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 40; i++) x.fillRect(r() * S, r() * S, 1, 4); });

// ================================================================== geometry helpers (as island.js)
const GC = new Map();
const cached = (key, fn) => { if (!GC.has(key)) GC.set(key, fn()); return GC.get(key); };
function scaleUV(geo, s) { const uv = geo.attributes.uv; if (!uv) return geo; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / s, uv.getY(i) / s); uv.needsUpdate = true; return geo; }
function bbox(w, h, d, r = 0.03, tile = 1) {
  return cached(`bb${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${r},${tile}`, () => {
    r = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
    const sw = w - 2 * r, sh = h - 2 * r, rc = Math.min(r * 0.6, sw / 2.2, sh / 2.2);
    const s = new THREE.Shape();
    s.moveTo(-sw / 2 + rc, -sh / 2); s.lineTo(sw / 2 - rc, -sh / 2); s.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + rc);
    s.lineTo(sw / 2, sh / 2 - rc); s.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - rc, sh / 2); s.lineTo(-sw / 2 + rc, sh / 2);
    s.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - rc); s.lineTo(-sw / 2, -sh / 2 + rc); s.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + rc, -sh / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: r > 0.001, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 2 });
    g.translate(0, 0, -(d - 2 * r) / 2);
    return boxUV(g, tile);
  });
}
function boxUV(geo, tile = 1) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay > ax && ay > az) { u = p.getX(i); v = p.getZ(i); } else if (ax > az) { u = p.getZ(i) * Math.sign(n.getX(i) || 1); v = p.getY(i); } else { u = -p.getX(i) * Math.sign(n.getZ(i) || 1); v = p.getY(i); }
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
  return geo;
}
function lathe(pts, seg = 16, tile = 0, phiStart = 0, phiLen = Math.PI * 2) {
  const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(Math.max(0.0001, a), b)), seg, phiStart, phiLen);
  if (tile) {
    const uv = g.attributes.uv, pos = g.attributes.position;
    let rmax = 0; for (const [a] of pts) rmax = Math.max(rmax, a);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * phiLen * rmax) / tile, pos.getY(i) / tile);
  }
  return g;
}
function cyl(rt, rb, h, seg = 12, tile = 0, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  if (tile) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * 2 * Math.max(rt, rb)) / tile, (uv.getY(i) * h) / tile); }
  return g;
}
function tube(points, r, seg = 8, tile = 1, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.1);
  const len = curve.getLength();
  const g = new THREE.TubeGeometry(curve, Math.max(2, Math.ceil(len * 3)), r, seg, closed);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * len) / tile, (uv.getY(i) * Math.PI * 2 * r) / tile);
  return g;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
class Batch {
  constructor(parent, { cast = true, receive = true } = {}) { this.parent = parent; this.items = new Map(); this.cast = cast; this.receive = receive; }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
    return this.addM(geo, mat, _m4.clone());
  }
  // (PLACE-2: tests/place-scan.mjs measures each part; unset in play, where this costs one property read)
  addM(geo, mat, m) { if (globalThis.__PLACE_REC) globalThis.__PLACE_REC.bpart(this, geo, m, mat); if (!this.items.has(mat)) this.items.set(mat, []); this.items.get(mat).push([geo, m]); return this; }
  build() {
    const out = [];
    for (const [mat, list] of this.items) {
      const mesh = new THREE.Mesh(mergeGeos(list, !!mat.vertexColors), mat);
      mesh.castShadow = this.cast && !mat.transparent; mesh.receiveShadow = this.receive;
      this.parent.add(mesh); out.push(mesh);
    }
    this.items.clear();
    return out;
  }
}
function mergeGeos(list, withColor) {
  let nv = 0, ni = 0;
  for (const [g] of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = withColor ? new Float32Array(nv * 3) : null;
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const nm = new THREE.Matrix3(), p = new THREE.Vector3();
  let vo = 0, io = 0;
  for (const [g, m] of list) {
    nm.getNormalMatrix(m);
    const flip = m.determinant() < 0;
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i).applyMatrix4(m); pos[(vo + i) * 3] = p.x; pos[(vo + i) * 3 + 1] = p.y; pos[(vo + i) * 3 + 2] = p.z;
      if (N) { p.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = p.x; nor[(vo + i) * 3 + 1] = p.y; nor[(vo + i) * 3 + 2] = p.z; }
      if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      if (col) { if (C) { col[(vo + i) * 3] = C.getX(i); col[(vo + i) * 3 + 1] = C.getY(i); col[(vo + i) * 3 + 2] = C.getZ(i); } else col.fill(1, (vo + i) * 3, (vo + i) * 3 + 3); }
    }
    if (g.index) { for (let i = 0; i < g.index.count; i += 3) { idx[io + i] = g.index.getX(i) + vo; idx[io + i + 1] = g.index.getX(flip ? i + 2 : i + 1) + vo; idx[io + i + 2] = g.index.getX(flip ? i + 1 : i + 2) + vo; } }
    else for (let i = 0; i < P.count; i += 3) { idx[io + i] = i + vo; idx[io + i + 1] = (flip ? i + 2 : i + 1) + vo; idx[io + i + 2] = (flip ? i + 1 : i + 2) + vo; }
    vo += P.count; io += g.index ? g.index.count : P.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
function compose(parts, withColor = false) { return mergeGeos(parts.map(([g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx]) => [g, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz))]), withColor); }
function tint(geo, color) {
  const g = geo.clone(), c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function instances(parent, geo, mat, list, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const o = new THREE.Object3D();
  list.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z); o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ');
    if (it.s != null) o.scale.setScalar(it.s); else o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    if (it.color) im.setColorAt(i, new THREE.Color(it.color));
  });
  im.count = list.length; im.castShadow = cast; im.receiveShadow = receive;
  parent.add(im);
  return im;
}
function mesh(parent, geo, mat, x = 0, y = 0, z = 0, ry = 0, { cast = true, rx = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, 'YXZ');
  m.castShadow = cast; m.receiveShadow = true;
  parent.add(m);
  return m;
}
// local frame at (x,z) rotated ry → parent coordinates
const frame = (x, z, ry) => (lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
const _ux = new THREE.Vector3(1, 0, 0), _uy = new THREE.Vector3(0, 1, 0);
function member(B, a, b, w, mat, tile = 1, round = 0.02) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_ux, d.normalize());
  B.addM(bbox(+len.toFixed(2), w, w, round, tile), mat, new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}
function rod(B, a, b, r, mat, seg = 8) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_uy, d.normalize());
  B.addM(cyl(r, r, +len.toFixed(2), seg, 1), mat, new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}
// the Joint Project emblem (same design as on Citadel)
function emblemMaterial() {
  return cached('emblemMat', () => {
    const t = ctex('emblem', 128, 128, (x) => {
      x.clearRect(0, 0, 128, 128);
      x.strokeStyle = '#bff8ff'; x.fillStyle = '#bff8ff'; x.lineWidth = 11;
      x.beginPath(); x.arc(64, 70, 34, 0, Math.PI * 2); x.stroke();
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(64 + s * 26, 46); x.quadraticCurveTo(64 + s * 46, 30, 64 + s * 44, 8); x.quadraticCurveTo(64 + s * 36, 30, 64 + s * 16, 40); x.fill(); }
      x.beginPath(); x.moveTo(64, 50); x.quadraticCurveTo(80, 74, 64, 86); x.quadraticCurveTo(48, 74, 64, 50); x.fill();
    }, false);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#3fe6ff', emissiveIntensity: 2.2, color: '#9ff0ff', transparent: true, alphaTest: 0.3, depthWrite: false, roughness: 0.4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, forceSinglePass: true });   // (PERF-CALLS: flat decals on solid things — never a front and a back face on one pixel: both sides in one draw, the same pixels)
  });
}
const emq = () => cached('emq', () => new THREE.PlaneGeometry(1, 1));

// Openings: polyline from bottom-left, up the left jamb, over the arch, down to bottom-right.
// o = {x, y, w, h, horse|arch|round}; g grows the outline (for frames).
function openingPts(o, g = 0, n = 14) {
  const hw = o.w / 2 + g, pts = [[o.x - hw, o.y]];
  if (o.horse) {
    const R0 = (o.w / 2) * 1.16, yc = o.y + o.h - R0, R = R0 + g;
    const b = Math.sqrt(Math.max(0, R * R - hw * hw)), beta = Math.atan2(b, hw);
    for (let i = 0; i <= n; i++) { const a = Math.PI + beta - (i / n) * (Math.PI + 2 * beta); pts.push([o.x + Math.cos(a) * R, yc + Math.sin(a) * R]); }
  } else if (o.arch) {
    const yc = o.y + o.h - o.w / 2;
    for (let i = 0; i <= n; i++) { const a = Math.PI - (i / n) * Math.PI; pts.push([o.x + Math.cos(a) * hw, yc + Math.sin(a) * hw]); }
  } else pts.push([o.x - hw, o.y + o.h + g], [o.x + hw, o.y + o.h + g]);
  pts.push([o.x + hw, o.y]);
  return pts;
}
const toPath = (p, pts) => { pts.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b))); p.closePath(); return p; };
// wall panel in XY (x along, y up) extruded toward +z by t, with openings
function panelGeo(len, h, t, holes = [], tile = TILE.plaster) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h); s.lineTo(-len / 2, 0);
  for (const o of holes) {
    const p = new THREE.Path();
    if (o.round) p.absarc(o.x, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2, true);
    else toPath(p, openingPts(o));
    s.holes.push(p);
  }
  return boxUV(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 16 }), tile);
}
// U-shaped frame around an opening (outline grown by `ring`), `depth` thick
function frameGeo(o, ring, depth, tile = 1) {
  return cached('fr' + JSON.stringify(o) + ring + depth + tile, () => {
    const outer = openingPts(o, ring), inner = openingPts(o, 0).reverse();
    const s = toPath(new THREE.Shape(), outer.concat(inner));
    return boxUV(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 }), tile);
  });
}
// flat filled opening (door leaf, lattice), slightly larger than the hole
function fillGeo(o, grow, depth, tile = 0.5) {
  return cached('fi' + JSON.stringify(o) + grow + depth + tile, () => {
    const s = toPath(new THREE.Shape(), openingPts(o, grow));
    const g = depth > 0 ? new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(s);
    return boxUV(g, tile);
  });
}

// ================================================================== polygon helpers
function chaikin(P, it = 2) {
  let pts = P;
  for (let k = 0; k < it; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}
function insidePoly(P, x, z) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i], [xj, zj] = P[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function zIntervals(P, x) {
  const zs = [];
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
    if ((ax <= x && bx > x) || (bx <= x && ax > x)) zs.push(az + ((x - ax) / (bx - ax)) * (bz - az));
  }
  zs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < zs.length; i += 2) out.push([zs[i], zs[i + 1]]);
  return out;
}
// distance from a point to the polygon edge (positive)
function edgeDist(P, x, z) {
  let d = 1e9;
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}
// resample a closed polygon every ~step metres
function resample(P, step) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
function shapeOf(P) { const s = new THREE.Shape(); P.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); s.closePath(); return s; }
// a flat horizontal slab from a polygon (top at y=0, `depth` thick), UVs in metres / tile
function slabGeo(P, depth, tile, holes = []) {
  const s = shapeOf(P);
  for (const h of holes) s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  return boxUV(g, tile);
}

// ZSTYLE-2: a chamfered rectangle (half sizes a, b; chamfer c), grown by g, as [x, z] points
function octPoly(a, b, c, g = 0) {
  const A = a + g, Bz = b + g, cg = c + g * (Math.SQRT2 - 1);
  return [[A - cg, Bz], [A, Bz - cg], [A, -(Bz - cg)], [A - cg, -Bz], [-(A - cg), -Bz], [-A, -(Bz - cg)], [-A, Bz - cg], [-(A - cg), Bz]];
}
// a broad faceted cap over a polygon (LBA2's low Esmer cap, profile as props-esmer.js capParts): flat facets, eave at y 0
const CAPP = [[1, 0], [1, 0.07], [0.9, 0.16], [0.74, 0.4], [0.5, 0.66], [0.26, 0.87], [0.08, 0.97], [0, 1]];
function polyCap(P, H) {
  const pos = [], uv = [], n = P.length, at = (i, k) => [P[i % n][0] * CAPP[k][0], CAPP[k][1] * H, P[i % n][1] * CAPP[k][0]];
  for (let k = 0; k < CAPP.length - 1; k++) for (let i = 0; i < n; i++) {
    const a = at(i, k), b = at(i + 1, k), c = at(i + 1, k + 1), d = at(i, k + 1);
    for (const p of [a, c, b, a, d, c]) { pos.push(...p); uv.push(p[0] / 1.1, p[2] / 1.1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  // (the winding from the sloped facets near the top: the eave's first facets are near vertical)
  if (g.attributes.normal.getY(n * 6 * 4) < 0) { const p = g.attributes.position; for (let i = 0; i < p.count; i += 3) for (let j = 0; j < 3; j++) { const t = p.getComponent(i + 1, j); p.setComponent(i + 1, j, p.getComponent(i + 2, j)); p.setComponent(i + 2, j, t); } g.computeVertexNormals(); }
  return g;
}
// a segmental barrel vault across z (eaves at z = ±span, y 0, crown at y = rise), len long along x, its shell from the
// circle's radius + dIn to + dOut; seg flat facets. gable: the wall segment under it between z = ±half, t thick (x 0..t)
function vaultCircle(span, rise) { const Rr = (span * span + rise * rise) / (2 * rise); return { Rr, cy: rise - Rr, a0: Math.asin(span / Rr) }; }
function vaultGeo(span, rise, len, dIn, dOut, seg = 8) {
  const { Rr, cy, a0 } = vaultCircle(span, rise), s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) { const a = -a0 + (2 * a0 * i) / seg, u = Math.sin(a) * (Rr + dOut), v = cy + Math.cos(a) * (Rr + dOut); if (i) s.lineTo(u, v); else s.moveTo(u, v); }
  for (let i = seg; i >= 0; i--) { const a = -a0 + (2 * a0 * i) / seg; s.lineTo(Math.sin(a) * (Rr + dIn), cy + Math.cos(a) * (Rr + dIn)); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2);
  return boxUV(g, 1.1);
}
function gableGeo(span, rise, half, t, seg = 8) {
  const { Rr, cy } = vaultCircle(span, rise), s = new THREE.Shape();
  s.moveTo(-half, 0);
  for (let i = 0; i <= seg; i++) { const z = -half + (2 * half * i) / seg; s.lineTo(z, cy + Math.sqrt(Rr * Rr - z * z)); }
  s.lineTo(half, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  return boxUV(g, TILE.plaster);
}

// ================================================================== the region
export function* buildZeelichSteps(scene, physics) {
  const ox = ZEELICH.x, oz = ZEELICH.z;
  const group = new THREE.Group();
  group.name = 'zeelich';
  group.visible = false;
  group.position.set(ox, 0, oz);
  scene.add(group);
  const W = (x, z) => ({ x: ox + x, z: oz + z });
  const col = (c) => physics.add({ ...c, x: c.x + ox, z: c.z + oz });
  const updaters = [];
  const r = rng(2024);
  const ISL = chaikin(OUTLINE, 3);
  const onIsland = (x, z, pad = 0) => insidePoly(ISL, x, z) && edgeDist(ISL, x, z) > pad;
  // places kept clear of scattered grass/flowers/rocks/trees
  const clear = [];
  const keepClear = (x0, z0, x1, z1) => clear.push([x0, z0, x1, z1]);
  const isClear = (x, z, pad = 0) => !clear.some(([a, b, c, d]) => x > a - pad && x < c + pad && z > b - pad && z < d + pad);

  const B = new Batch(group);
  const crateSet = { C: null, items: [], em: [] };
  const R = {
    id: 'zeelich', outdoor: true, group, lights: [], exits: [], searches: [], ballTargets: [], updaters,
    music: 'zeelich', cloudY: CLOUD_Y,
    // (ZSTYLE-1, the user 7.11: "a new place on Zeelich, another city": no original layout, but Zeelich's light. LBA2's
    // Zeelich is overcast, misty and pale grey over a pale lavender-grey sea (LBA2_VISUAL_NOTES, Otringal's STYLE), where
    // this was a pink sky and fog, pink-white light and a rose cloud sea. A shade warmer and brighter than Otringal's:
    // the spaceport town on the sea's sunny side, the same sky)
    env: { fog: '#dcd9e0', sun: '#f4f0e8', hemiSky: '#e2e0e8', hemiGround: '#7e7a84', sunI: 2.15, hemiI: 1.35, fogRange: [80, 290] },
  };

  buildGround();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  buildPaths();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  buildPier();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  const ferry = buildFerry();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  buildGateway();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  const houses = HOUSES.map((h) => esmerHouse(h));
  buildPlaza();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  buildStreetFurniture();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  const mills = MILLS.map((m) => buildMill(m));
  const depot = buildDepot();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  const platform = buildPlatform();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  buildClouds();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  // ---------------------------------------------------------------- the Esmers' shuttles (src/game/shuttle.js)
  // (placed before the scatter, so no tree grows through the pad)
  // one landed on a pad by the dock (the first clear spot on the island), two more circling over the clouds
  {
    let pad = null;
    for (let k = 0; k < 40 && !pad; k++) {
      const a = k * 0.7, rr = 10 + k * 0.6, x = -48 + Math.cos(a) * rr, z = -6 + Math.sin(a) * rr;
      if (onIsland(x, z, 6.5) && isClear(x, z, 5)) pad = [x, z];
    }
    if (pad) {
      const [px, pz] = pad, gy = physics.groundAt(px + ox, pz + oz);
      const deckM = MAT_PAD();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.25, 24), deckM); disc.position.set(px, gy + 0.12, pz); disc.receiveShadow = true; group.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.08, 6, 32), new THREE.MeshStandardMaterial({ color: '#e8c040', roughness: 0.5 })); ring.rotation.x = Math.PI / 2; ring.position.set(px, gy + 0.26, pz); group.add(ring);
      const sh = esmerShuttle({ landed: true }); sh.position.set(px, gy + 0.25, pz); sh.rotation.y = 0.6; group.add(sh);
      col({ type: 'cyl', x: px, z: pz, r: 3.5, top: gy + 4.4, noStand: true });
      keepClear(px - 5, pz - 5, px + 5, pz + 5);
      R.shuttlePad = W(px, pz);
    }
    // (R.traffic: the story keeps them on the ground while the project grounds the shuttles, chapter 3: story/zeelife.js)
    R.traffic = shuttleTraffic(group, updaters, { cx: 0, cz: 0, y: 40, r: 110, n: 3, speed: 0.04 });
  }

  // ---------------------------------------------------------------- the dog-training yard (src/game/dogs.js)
  // After LBA2's yard: a palisade of planks round a bed of fallen leaves, a pale track looping round a stacked-block
  // tower on a red crate, a blue tunnel and two hurdles on the track, a hay bale and an A-frame. The project trains
  // its guard dogs here (LBA2's, bodies 51–53): two run the course, a third noses about; all three stop and bark
  // at Twinsen from behind the palisade. (The working ones guard the depots: src/game/guarddog.js.)
  const dogs = [];
  {
    // behind the north houses, toward the old mill (the shuttle pad has the south side)
    const yard = onIsland(-28, -21, 3) ? [-28, -21] : null;
    if (yard) {
      const [yx, yz] = yard, gy = physics.groundAt(yx + ox, yz + oz);
      const HW = 5.5, HD = 3.4;   // the palisade's half-size
      const flat = (w, d, hex, y, x = yx, z = yz, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), new THREE.MeshStandardMaterial({ color: hex, roughness: 0.95 })); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; group.add(m); return m; };
      flat(HW * 2, HD * 2, '#a8582a', gy + 0.02);
      // the track: a rounded loop of pale planks-and-sand, 1.1 m wide
      const path = [];
      const TW = HW - 1.6, TD = HD - 1.4;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
        const k = 0.35;   // squareness
        path.push([yx + Math.sign(c) * Math.pow(Math.abs(c), k) * TW, yz + Math.sign(sn) * Math.pow(Math.abs(sn), k) * TD]);
      }
      for (let i = 0; i < path.length; i++) {
        const [ax, az] = path[i], [bx, bz] = path[(i + 1) % path.length];
        flat(1.15, Math.hypot(bx - ax, bz - az) + 0.25, '#d4cec6', gy + 0.05, (ax + bx) / 2, (az + bz) / 2, Math.atan2(bx - ax, bz - az));
      }
      const wood = new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: 0.9 }), woodD = new THREE.MeshStandardMaterial({ color: '#5a3c24', roughness: 0.9 });
      const box = (w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; group.add(o); return o; };
      // hurdles on the two long straights (the dogs hop them), flagged on the path
      for (const i of [6, 18]) {
        const [hx, hz] = path[i], [nx, nz] = path[(i + 1) % path.length], ry = Math.atan2(nx - hx, nz - hz);
        for (const s of [-1, 1]) box(0.08, 0.55, 0.08, woodD, hx + Math.cos(ry) * s * 0.6, gy + 0.28, hz - Math.sin(ry) * s * 0.6);
        box(1.25, 0.07, 0.07, new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.6 }), hx, gy + 0.42, hz, ry);
        path[i] = [hx, hz, 1];
      }
      // the blue tunnel across the track at the west end
      {
        const [tx, tz] = path[12], [nx, nz] = path[13];
        const tun = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.7, 14, 1, true, 0, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: '#3a78c8', roughness: 0.5, side: THREE.DoubleSide }));
        tun.rotation.z = Math.PI / 2; tun.rotation.order = 'YXZ'; tun.rotation.y = Math.atan2(nx - tx, nz - tz) + Math.PI / 2; tun.rotation.x = -Math.PI * 0.15;
        tun.position.set(tx, gy + 0.36, tz); tun.castShadow = true; group.add(tun);
      }
      // the stacked-block tower on its red crate, the hay bale, an A-frame
      box(1.2, 0.8, 1.2, new THREE.MeshStandardMaterial({ color: '#8a3424', roughness: 0.8 }), yx + 0.6, gy + 0.4, yz);
      for (let i = 0; i < 6; i++) box(0.95, 0.36, 0.7, new THREE.MeshStandardMaterial({ color: i % 2 ? '#3a3c40' : '#2c2e32', roughness: 0.7 }), yx + 0.6, gy + 0.98 + i * 0.37, yz, i * 0.06);
      col({ type: 'box', x: yx + 0.6, z: yz, hw: 0.6, hd: 0.6, rot: 0, top: gy + 3.1 });
      box(1.4, 0.6, 0.8, new THREE.MeshStandardMaterial({ color: '#c8a050', roughness: 1 }), yx - 2.2, gy + 0.3, yz + 0.6, 0.3);
      col({ type: 'box', x: yx - 2.2, z: yz + 0.6, hw: 0.7, hd: 0.4, rot: 0.3, top: gy + 0.6 });
      for (const s of [-1, 1]) box(1.0, 0.06, 1.1, wood, yx - 2.4 + s * 0.42, gy + 0.36, yz - 1.2).rotation.z = -s * 0.75;
      // the palisade: planks of uneven height on all four sides, a gap for a gate on the near (south) side. (REVIEW-ZEELICH-ART (c),
      //  ISLES-BAR: the gap stood at the yard's middle, 1.5 m behind the council house's back wall, its roof 2 m before the gate;
      //  now GX m west, at the lane between Mr Pelleck's house and the council house, which leads up from the street)
      const GX = -4.0;
      const plank = (x, z, ry, h) => { const o = box(0.34, h, 0.08, (Math.round(x * 7 + z * 3) % 2) ? wood : woodD, x, gy + h / 2, z, ry); o.rotation.z = ((x * 13 + z * 7) % 1) * 0.08 - 0.04; };
      for (let x = -HW; x <= HW + 0.01; x += 0.36) { plank(yx + x, yz - HD, 0, 1.15 + Math.abs(Math.sin(x * 3.1)) * 0.25); if (Math.abs(x - GX) > 0.9) plank(yx + x, yz + HD, 0, 1.1 + Math.abs(Math.sin(x * 2.3)) * 0.25); }
      for (let z = -HD + 0.36; z < HD; z += 0.36) for (const s of [-1, 1]) plank(yx + s * HW, yz + z, Math.PI / 2, 1.15 + Math.abs(Math.sin(z * 2.7 + s)) * 0.25);
      col({ type: 'box', x: yx, z: yz - HD, hw: HW, hd: 0.1, rot: 0, top: gy + 1.2 });
      for (const s of [-1, 1]) {
        col({ type: 'box', x: yx + s * HW, z: yz, hw: 0.1, hd: HD, rot: 0, top: gy + 1.2 });
      }
      // (the south side either side of the gate's gap)
      for (const [a, b] of [[-HW, GX - 0.9], [GX + 0.9, HW]]) col({ type: 'box', x: yx + (a + b) / 2, z: yz + HD, hw: (b - a) / 2, hd: 0.1, rot: 0, top: gy + 1.2 });
      keepClear(yx - HW - 1, yz - HD - 1, yx + HW + 1, yz + HD + 1);
      const P = path.map(([x, z, hop]) => [x + ox, z + oz, hop]);
      dogs.push(new Dog({ parent: group, ox, oz, physics, coat: 'grey', x: P[0][0], z: P[0][1], path: P }));
      dogs.push(new Dog({ parent: group, ox, oz, physics, coat: 'brown', x: P[12][0], z: P[12][1], path: P }));
      dogs[1].s = dogs[1].len / 2;
      dogs.push(new Dog({ parent: group, ox, oz, physics, coat: 'greybrown', x: yx + ox - 2, z: yz + oz - 1.5, area: { x0: yx + ox - 3.5, z0: yz + oz - 1.6, x1: yx + ox + 3.5, z1: yz + oz + 1.6 } }));
      R.dogYard = { ...W(yx, yz), gate: W(yx + GX, yz + HD) };
    }
    addDogs(dogs, updaters);
    R.dogs = dogs;
  }

  // ---------------------------------------------------------------- the street twelve years on (src/game/zeelife.js)
  const life = buildZeelichLife({ group, col, W, updaters, domeTex, pelleck: houses[0].dome, occ: roomOcc(R, physics.terrain) });
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  // CAMPAIGN-3: the Cistern Rise on Mill Lane (the freight lift, the quarter's cistern, Irsa's Pump Works): src/game/zlift.js
  const lift = buildCisternRise({ group, col, W, updaters, Y0, mat: { stone: tm('stone', { color: '#d6d2cc' }), planks: tm('planks'), cobble: tm('cobble'), brass: brassM(), teal: tealM(), steel: darkSteel() } });
  yield;

  buildIslets();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  scatter();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  crateFlush();
  yield;   // (TITLE-LOAD: a step of the build: the loading card paints between steps, regions.js buildAsync)
  B.build();

  // ---------------------------------------------------------------- contract
  const ws = houses[4].door;
  Object.assign(R, {
    spawn: { ...W(-55.5, 0), a: Math.PI / 2 },
    dock: { ...W(-57.6, 1.3), a: 0 },
    street: W(-24, 0),
    workshopDoor: W(ws[0], ws[1]),
    councilDoor: W(houses[1].door[0], houses[1].door[1]),
    houseDoors: houses.filter((h) => h.door).map((h) => W(h.door[0], h.door[1])),   // (every house's door: tests/doorcull.mjs)
    houseFacing: HOUSES.map((h) => h.ry),   // (the way each house's door faces: zhomes.js leads him out that way)
    // (DOORS-1: a house door that leads nowhere says "Locked."; the council's and the workshop's are the story's
    // doors in their chapters, offered instead there: story/prologue.js)
    // (ZEELICH-DOORS, 7.11: every house's door is answered by story/zeelife.js now — own: three lead into their houses
    //  (zhomes.js), the workshop's in every chapter from 3, the council house's says why it is shut between hearings)
    shutDoors: houses.filter((h) => h.door).map((h, i) => ({ id: 'zeelich-house' + i, ...W(h.door[0], h.door[1]), y: Y0, own: true })),
    // the doors kept shut on purpose, each with its reason (story/zeelife.js closedDoors; not where a story door is live)
    closedDoors: [
      { id: 'council', ...W(houses[1].door[0], houses[1].door[1]), y: Y0, key: 'zh_closed_council' },
      ...mills.map((m) => ({ id: 'mill-' + m.api.id, ...m.api.door, y: Y0, key: m.api.id === 'north' ? 'zh_closed_mill_old' : 'zh_closed_mill' })),
      { id: 'depot-shed', ...W(21.2, 20.5), y: Y0, key: 'zh_closed_depot' },
      { id: 'control-hut', ...W(53.8, -6.2), y: DECK, key: 'zh_closed_hut' },
    ],
    npcSpots: {
      esmer1: { ...W(-34.5, -3.2), a: Math.PI / 2 },
      esmer2: { ...W(-24, 7.0), a: Math.PI },
      esmer3: { ...W(-15.5, -2.6), a: -2.2 },
      // the street's other folk: Mosquibees and burrowers, as on LBA2's Zeelich
      // (twelve years on, zeelife.js: Bzizz by the watch house he lands on, Mother Snuff at her bread hatch, Old Grumm
      // by the burrow hatch, Mr Pelleck under his scaffold)
      bee1: life.watch.bzizz,
      bee2: { ...W(-29.0, 5.6), a: Math.PI },
      mole1: life.grumm,
      mole2: life.watch.snuff,
      tri1: life.pelleck || { ...W(-31.5, -4.4), a: 0.2 },
      tri2: { ...W(-12.0, 3.0), a: -2.6 },
      baldinoOut: { ...W(ws[0] + 1.4, ws[1] - 0.4), a: Math.PI },
      doran: { ...W(-60.5, 0.9), a: Math.PI / 2 },
      vesk: { ...W(46.5, -4.5), a: -Math.PI / 2 },
      guard: { ...W(35.2, 3.6), a: -Math.PI / 2 },
    },
    mills: mills.map((m) => m.api),
    millTop: mills[0].top,
    depot,
    platform,
    ferry,
    life,
    lift,   // (CAMPAIGN-3: story/zeelift.js)
  });

  // VP-10 (the user, 7.11: "in Zeelich all the buildings disappear when you get close"): as on Citadel and in LBA2,
  // nothing on the street fades; the houses, mills and the watch house give the camera their shapes (R.occ, above and
  // zeelife.js; every other tall solid by regions.js → roomocc.js occAuto) and each new shot rises over what would hide
  // him. Only a porch roof he stands under fades (the council house's arcade), as Nell's lean-to on Citadel.
  R.occFloor = Y0 - 0.05;   // (the island's floor is bricks over the clouds: not scenery to rise over)
  const porches = houses.map((h) => h.arcade).filter(Boolean).map((A) => ({ ...A, fader: makeFader(A.group), f: 1 }));
  // (CUT-RESTORE: arriving on the street — a door, a shuttle, a load — the porch takes its state for where he lands at
  //  once: left faded while he went in under it, it stayed faded until he came back and eased in on the new shot)
  let snap = false;
  R.resetCut = () => { snap = true; };
  updaters.push((dt) => {
    const G = globalThis.game;
    if (!G || G.room !== R || !G.camera) return;
    if (snap) { snap = false; dt = 10; }
    const hx = G.hero.pos.x - ox, hz = G.hero.pos.z - oz;
    for (const A of porches) {
      const dx = hx - A.x, dz = hz - A.z, c = Math.cos(A.ry), sn = Math.sin(A.ry), lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      const under = Math.abs(lx) < A.hw && lz > A.lz0 && lz < A.lz1 && G.hero.pos.y < A.top;
      A.f += ((under ? 0.2 : 1) - A.f) * (1 - Math.exp(-dt * 8));
      const see = A.f < 0.98;
      for (const m of A.fader.mats) {
        if (m.userData.alwaysTransparent) { m.opacity = (m.userData.baseOpacity ?? 1) * (see ? A.f : 1); continue; }
        if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
        m.opacity = see ? A.f : 1; m.depthWrite = !see;
      }
    }
  });
  return R;

  // ================================================================ ground: island top, grassy lip, cliffs
  function buildGround() {
    const top = slabGeo(ISL, 0.6, TILE.grass);
    // (ZEELICH-2: pale granite as LBA2's Zeelich ground, which has no lawns: measured #a8a196 with #dbd3c9 lights)
    // (ZSTYLE-1: the speckled granite itself, where it was 4 m concrete flags with dark joints: a modern square)
    const ground = mesh(group, top, tm(graniteTex(), { color: '#eeeae4', rough: 0.95 }), 0, Y0 - 0.6, 0, 0, { cast: false });
    void ground;
    // cliff skirt: rings of the outline going down and in, a turf lip on top, strata of lilac-ochre rock
    const ring = resample(ISL, 1.6), n = ring.length;
    let cx = 0, cz = 0; for (const [x, z] of ISL) { cx += x; cz += z; } cx /= ISL.length; cz /= ISL.length;
    const nrm = ring.map((p, i) => {
      const a = ring[(i - 1 + n) % n], b = ring[(i + 1) % n];
      const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
      return [-tz / l, tx / l]; // outward for a clockwise (in x-z with z down) outline
    });
    // make sure normals point away from the centre
    if ((ring[0][0] - cx) * nrm[0][0] + (ring[0][1] - cz) * nrm[0][1] < 0) for (const q of nrm) { q[0] = -q[0]; q[1] = -q[1]; }
    const levels = [
      { y: 0, out: 0, s: 1, c: '#e0d8cc' }, { y: -0.3, out: 0.32, s: 1, c: '#d0c8bc' }, { y: -0.9, out: 0.18, s: 1, c: '#c0b8ac' },   // (ZEELICH-2: grey-white rock, not turf and lilac)
      { y: -2.6, out: -0.4, s: 0.99, c: '#d4ccc2' }, { y: -5.5, out: -1.4, s: 0.95, c: '#c4beb6' }, { y: -9, out: -1.0, s: 0.86, c: '#b6b0aa' },
      { y: -13, out: -2.0, s: 0.72, c: '#a8a4a0' }, { y: -19, out: -2.0, s: 0.5, c: '#9a9694' }, { y: -27, out: 0, s: 0.24, c: '#8c8888' },
    ];
    const pos = [], cols = [], uvs = [], idx = [];
    const c = new THREE.Color();
    let arc = 0;
    const arcs = ring.map((p, i) => { if (i) arc += Math.hypot(p[0] - ring[i - 1][0], p[1] - ring[i - 1][1]); return arc; });
    levels.forEach((L, li) => {
      for (let i = 0; i <= n; i++) {
        const k = i % n, [px, pz] = ring[k], [nx, nz] = nrm[k];
        const wob = li > 2 ? Math.sin(px * 0.31 + li * 1.7) * 0.6 + Math.sin(pz * 0.47 - li) * 0.5 : 0;
        const x = cx + (px - cx) * L.s + nx * (L.out + wob), z = cz + (pz - cz) * L.s + nz * (L.out + wob);
        const y = Y0 + L.y + (li > 2 ? Math.sin(px * 0.7 + pz * 0.5) * 0.35 * li * 0.3 : 0);
        pos.push(x, y, z);
        c.set(L.c); const band = li > 2 ? 0.92 + 0.12 * Math.sin(y * 2.3 + px * 0.05) : 1; c.multiplyScalar(band);
        cols.push(c.r, c.g, c.b);
        uvs.push((i === n ? arc + Math.hypot(ring[0][0] - ring[n - 1][0], ring[0][1] - ring[n - 1][1]) : arcs[k]) / TILE.cliff, y / TILE.cliff);
      }
    });
    const rowN = n + 1;
    for (let li = 0; li < levels.length - 1; li++) for (let i = 0; i < n; i++) {
      const a = li * rowN + i, b = a + 1, d = a + rowN, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    // check winding: the first ring's normals must face outward
    const nA = g.attributes.normal; const tst = new THREE.Vector3(nA.getX(rowN * 3), 0, nA.getZ(rowN * 3));
    if (tst.x * nrm[0][0] + tst.z * nrm[0][1] < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.computeVertexNormals(); }
    mesh(group, g, tm(graniteTex(), { vc: true, rough: 0.95 }), 0, 0, 0, 0, { cast: false });   // (ZSTYLE-1: grey granite strata; the cliff texture read violet)
    // walkable bricks: 1 m strips across the island, 0.4 m inside the edge
    stripBricks(ISL, 0.4, Y0);
    // a few big boulders hanging off the rim
    for (let i = 0; i < 12; i++) {
      const k = Math.floor(r() * n), [px, pz] = ring[k], [nx, nz] = nrm[k];
      if (px < -46 && Math.abs(pz) < 5) continue;
      if (px > 34 && Math.abs(pz) < 8) continue;
      const s = 0.8 + r() * 1.6;
      rimRocks.push({ x: px + nx * (0.2 + r() * 0.6), y: Y0 - 0.6 - r() * 1.2, z: pz + nz * (0.2 + r() * 0.6), ry: r() * 6, s, color: new THREE.Color('#eeece8').multiplyScalar(0.95 + r() * 0.15) });   // (ZSTYLE-1: grey, not lilac)
    }
  }
  function stripBricks(P, inset, top) {
    let x0 = Infinity, x1 = -Infinity;
    for (const [x] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let x = x0 + inset; x < x1 - inset; x += 1) {
      const xa = x + 0.005, xb = Math.min(x + 1, x1 - inset) - 0.005;
      if (xb - xa < 0.2) continue;
      const A = zIntervals(P, xa), Bz = zIntervals(P, xb), M = zIntervals(P, (xa + xb) / 2);
      for (const [m0, m1] of M) {
        let lo = m0, hi = m1;
        for (const S of [A, Bz]) { const o = S.find(([s0, s1]) => s1 > m0 && s0 < m1); if (!o) { hi = lo; break; } lo = Math.max(lo, o[0]); hi = Math.min(hi, o[1]); }
        lo += inset; hi -= inset;
        if (hi - lo < 0.4) continue;
        col({ type: 'box', x: (xa + xb) / 2, z: (lo + hi) / 2, hw: (xb - xa) / 2 + 0.08, hd: (hi - lo) / 2, rot: 0, top, seeThrough: true });
      }
    }
  }

  // ================================================================ paths: paved street + plaza, dirt tracks to the mills
  function buildPaths() {
    const cobble = tm(paveTex(), { color: '#ffffff', rough: 0.85 });   // (ZEELICH-2: lavender grey, as LBA2's Zeelich paving; ZSTYLE-2: its pale flags)
    const street = [[-49.6, -3.4], [-34, -3.6], [-16, -3.4], [0, -3.6], [16, -3.3], [30, -3.5], [36.2, -2.9], [36.2, 2.9], [30, 3.5], [16, 3.3], [0, 3.6], [-16, 3.4], [-34, 3.6], [-49.6, 3.4]];
    B.add(slabGeo(street, 0.05, TILE.cobble), cobble, 0, Y0, 0);
    const plaza = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; plaza.push([PLAZA.x + Math.sin(a) * PLAZA.r, PLAZA.z + Math.cos(a) * PLAZA.r]); }
    B.add(slabGeo(plaza, 0.065, TILE.cobble), tm(paveTex(), { color: '#f4f2f8', rough: 0.85 }), 0, Y0, 0);
    // ZSTYLE-2: the street's lighter borders, a pale kerb stone along both edges (under the plaza's paving where it crosses)
    {
      const N = street.slice(0, 6), Sd = street.slice(8);   // (the north edge west → east, the south edge east → west; not the gate's end)
      for (const [edge, s] of [[N, 1], [Sd, -1]]) B.add(slabGeo(edge.concat(edge.map(([x, z]) => [x, z + s * 0.5]).reverse()), 0.06, 1.0), tm(kerbTex(), { rough: 0.8 }), 0, Y0, 0);
    }
    // a mosaic star in the plaza
    const star = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 3.2 : 5.6; star.push([PLAZA.x + Math.sin(a) * rr, PLAZA.z + Math.cos(a) * rr]); }
    // (ZSTYLE-1: in pale border stone, LBA2's lavender-grey paving with lighter borders; it was rose and blue star tiles)
    B.add(slabGeo(star, 0.075, 1.0), tm(kerbTex(), { rough: 0.8 }), 0, Y0, 0);
    // kerb ring of the plaza
    B.add(lathe([[PLAZA.r - 0.05, 0], [PLAZA.r + 0.18, 0], [PLAZA.r + 0.18, 0.1], [PLAZA.r - 0.05, 0.1]], 48, 1.2), tm('stone', { color: '#f2f0f2' }), PLAZA.x, Y0, PLAZA.z);
    // depot spur and the drill-platform approach
    B.add(slabGeo([[DEPOT.gate[0] - 0.4, 3], [DEPOT.gate[1] + 0.4, 3], [DEPOT.gate[1] + 0.2, DEPOT.z0 + 0.3], [DEPOT.gate[0] - 0.2, DEPOT.z0 + 0.3]], 0.05, TILE.cobble), cobble, 0, Y0, 0);
    // dirt tracks to the mills
    const dirt = tm(gravelTex(), { color: '#ffffff', rough: 0.95 });   // (ZSTYLE-1/2: a grey-ochre gravel, not orange earth)
    const track = (pts, w) => {
      const L = [], Rr = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz);
        const ww = w * (0.9 + Math.sin(i * 2.1) * 0.12);
        L.push([pts[i][0] - (tz / l) * ww, pts[i][1] + (tx / l) * ww]); Rr.push([pts[i][0] + (tz / l) * ww, pts[i][1] - (tx / l) * ww]);
      }
      B.add(slabGeo(L.concat(Rr.reverse()), 0.035, TILE.dirt), dirt, 0, Y0, 0);
    };
    track([[-4, -3], [-3.6, -8], [-2.8, -12.5], [-2.2, -15.6]], 1.25);
    track([[19, -3], [20.2, -8], [21.4, -12.5], [21.9, -14.2]], 1.2);
    track([[-6.5, 3], [-5.6, 8], [-4.4, 13], [-3.4, 17.2]], 1.2);
    keepClear(-50, -4.2, 37, 4.2);
    keepClear(PLAZA.x - PLAZA.r, PLAZA.z - PLAZA.r, PLAZA.x + PLAZA.r, PLAZA.z + PLAZA.r);
    keepClear(-5.5, -17, -0.5, 3); keepClear(18, -16, 23.5, 3); keepClear(-8.5, 3, -2, 18.5);
  }

  // ================================================================ the sky-ferry pier
  function buildPier() {
    const { x0, x1, hw } = PIER, L = x1 - x0, cxp = (x0 + x1) / 2;
    const planks = tm('planks', { color: '#ecc8a8' });
    B.add(boxUV(bbox(L, 0.24, hw * 2, 0.04, 1), TILE.planks), planks, cxp, Y0 - 0.11, 0);   // (WORLD-FIX: 1 cm proud of the turf, whose plane its end shared)
    // stringers, cross beams and diagonal brass struts down into the cliff
    for (const s of [-1, 1]) B.add(boxUV(bbox(L + 0.2, 0.36, 0.26, 0.04, 1), TILE.teal), tealM(), cxp, Y0 - 0.38, s * (hw - 0.15));
    for (let x = x0 + 0.6; x < x1; x += 2.4) {
      B.add(boxUV(bbox(0.24, 0.3, hw * 2 + 0.2, 0.04, 1), TILE.teal), tealM(), x, Y0 - 0.6, 0);
      for (const s of [-1, 1]) member(B, [x, Y0 - 0.6, s * (hw - 0.2)], [Math.min(x + 6, x1 + 2), Y0 - 6.5, s * (hw - 0.6)], 0.16, brassM(), 1, 0.03);
    }
    // railings with brass rails, a gap on the south side where the ferry ties up
    const rail = (xa, xb, z) => {
      for (let x = xa; x <= xb + 0.01; x += (xb - xa) / Math.max(1, Math.round((xb - xa) / 1.6))) B.add(cached('rpost', () => lathe([[0.07, 0], [0.07, 0.9], [0.1, 0.95], [0.06, 1.05], [0, 1.08]], 8)), tealM(), x, Y0, z);
      B.add(cyl(0.045, 0.045, xb - xa, 6, 1).rotateZ(Math.PI / 2), brassM(), (xa + xb) / 2, Y0 + 1.0, z);
      B.add(cyl(0.03, 0.03, xb - xa, 6, 1).rotateZ(Math.PI / 2), brassM(), (xa + xb) / 2, Y0 + 0.55, z);
      col({ type: 'box', x: (xa + xb) / 2, z, hw: (xb - xa) / 2, hd: 0.1, rot: 0, top: Y0 + 1.05, noStand: true, seeThrough: true });
    };
    rail(x0 + 0.1, x1 - 0.3, -hw + 0.08);
    rail(x0 + 0.1, -61.8, hw - 0.08);
    rail(-53.4, x1 - 0.3, hw - 0.08);
    // end of the pier: a railing across and a brass lamp
    B.add(cyl(0.045, 0.045, hw * 2, 6, 1).rotateX(Math.PI / 2), brassM(), x0 + 0.1, Y0 + 1.0, 0);
    for (let z = -hw + 0.1; z <= hw; z += 1.1) B.add(cached('rpost', () => lathe([[0.07, 0], [0.07, 0.9], [0.1, 0.95], [0.06, 1.05], [0, 1.08]], 8)), tealM(), x0 + 0.1, Y0, z);
    col({ type: 'box', x: x0 + 0.1, z: 0, hw: 0.1, hd: hw, rot: 0, top: Y0 + 1.05, noStand: true, seeThrough: true });
    // mooring bollards at the gap and a coiled rope
    for (const x of [-61.2, -54.0]) {
      placeTag('bollard');   // (PLACE-2: names the piece for tests/place-scan.mjs; nothing in play)
      B.add(lathe([[0.2, 0], [0.2, 0.32], [0.14, 0.38], [0.14, 0.5], [0.24, 0.56], [0.22, 0.64], [0, 0.66]], 14), darkSteel(), x, Y0, hw - 0.35);
      col({ type: 'cyl', x, z: hw - 0.35, r: 0.25, top: Y0 + 0.66, noStand: true, seeThrough: true });
    }
    placeTag('ropeCoil');
    // (PLACE-2: 0.6 m off the lamp at −56, not against its foot)
    B.add(cached('coil', () => compose([0, 1, 2, 3].map((k) => [new THREE.TorusGeometry(0.32 - k * 0.05, 0.045, 6, 18).rotateX(Math.PI / 2), 0, 0.05 + k * 0.07, 0]))), pm('#c8a878', 0.9), -54.9, Y0, -1.2);
    placeTag(null);
    // cargo by the pier root
    techCrates([[-51.6, -1.5, 2, 0.9], [-52.6, -1.6, 1, 0.8]]);
    // walkable deck
    col({ type: 'box', x: cxp, z: 0, hw: L / 2, hd: hw - 0.15, rot: 0, top: Y0, seeThrough: true });
    lamps.push([-62.8, -hw + 0.35], [-56.8, -hw + 0.35], [-51, hw - 0.35]);   // (PLACE-2: the middle one between two railing posts, not on the one at −56.0)
    keepClear(-64, -4, -46, 4);
  }

  // Zeelich-tech cargo crates: teal steel, brass corners and the glowing emblem
  function techCrates(list) {
    const C = cached('techcrate', () => {
      const s = 1.0, h = s / 2, corners = [];
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (const yy of [0.06, s - 0.06]) corners.push([bbox(0.2, 0.14, 0.2, 0.03, 0.5), a * (h - 0.08), yy, b * (h - 0.08)]);
      for (const yy of [0.33, 0.66]) corners.push([bbox(s + 0.03, 0.05, s + 0.03, 0.015, 1), 0, yy, 0]);
      return { body: bbox(s - 0.02, s - 0.02, s - 0.02, 0.05, 1.1).clone().translate(0, h, 0), brass: compose(corners) };
    });
    // (PERF-CALLS: every stack of the island in the same three instanced meshes, made once at the end of the build
    //  (crateFlush): the pier's, the workshop's and the depot's were three sets — 9 draws, the emblems' two-sided
    //  see-through ones twice each; the same crates where they were)
    const items = crateSet.items, em = crateSet.em; crateSet.C = C;
    for (const [x, z, n = 1, s = 1] of list) {
      const ry = (r() - 0.5) * 0.6;
      for (let k = 0; k < n; k++) items.push({ x, y: Y0 + k * s, z, ry: ry + (r() - 0.5) * 0.15, s });
      em.push({ x: x + Math.sin(ry) * (s / 2 + 0.012), y: Y0 + s * 0.55, z: z + Math.cos(ry) * (s / 2 + 0.012), ry, s: s * 0.62 });
      col({ type: 'box', x, z, hw: s / 2, hd: s / 2, rot: ry, top: Y0 + n * s, seeThrough: n * s < 1.6 });
    }
  }
  function crateFlush() {
    const { C, items, em } = crateSet;
    if (!items.length) return;
    // (HEADING-LOAD-2: the bodies and brass culled per instance in each pass, kit.js cullInstances; the see-through
    //  emblems stay one InstancedMesh: a refill would move their place in the see-through draws' order)
    cullInstances(group, C.body, tealM(), items).userData.gpuGroup = 'scenery';   // (benchgpu.js: not the trees' group)
    cullInstances(group, C.brass, brassM(), items).userData.gpuGroup = 'scenery';
    instances(group, emq(), emblemMaterial(), em, { cast: false });
  }

  // ================================================================ the Joint Project sky-ferry
  function buildFerry() {
    const grp = new THREE.Group(); grp.position.set(FERRY.x, Y0 - 1.05, FERRY.z); group.add(grp);
    const bob = new THREE.Group(); grp.add(bob);
    const L = 12.0, Bm = 4.0, H0 = 1.25;
    const hb = (u) => (u < 0.55 ? (Bm / 2) * lerp(0.78, 1, smoothstep(0, 0.45, u)) : (Bm / 2) * Math.pow(Math.max(0, Math.cos(((u - 0.55) / 0.45) * Math.PI / 2)), 0.75));
    const dep = (u) => 1.9 * (0.82 + 0.18 * Math.sin(Math.PI * Math.min(1, u * 1.1)));
    const topf = (u) => 0.45 * Math.pow(Math.abs(2 * u - 1), 2) * (u > 0.5 ? 1.6 : 0.5);
    const hull = cached('skyhull', () => {
      const P = [], C = [], UV = [], I = [], nu = 30, nv = 14, cc = new THREE.Color();
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, w = Math.max(0.001, hb(u)), d = dep(u), y0 = topf(u);
        for (let j = 0; j <= nv; j++) {
          const v = -1 + (2 * j) / nv, a = (v * Math.PI) / 2;
          const x = L * (u - 0.5), y = y0 - d * Math.pow(Math.cos(a), 0.85), z = w * Math.sin(a);
          P.push(x, y, z); UV.push(x / 2.2, (v * (w + d)) / 2.2);
          cc.set(y > -0.3 ? (y > -0.12 ? '#e8c060' : '#c89a48') : y > -0.75 ? '#2f8c8a' : y > -0.9 ? '#f0e8d8' : '#8a86a8'); C.push(cc.r, cc.g, cc.b);
        }
      }
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
      const ci = P.length / 3; P.push(-L / 2, -0.4, 0); UV.push(0, 0); cc.set('#2f8c8a'); C.push(cc.r, cc.g, cc.b);
      for (let j = 0; j < nv; j++) I.push(ci, j + 1, j);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.setIndex(I); g.computeVertexNormals();
      return g;
    });
    const FB = new Batch(bob);
    FB.add(hull, tm('teal', { vc: true, rough: 0.5, metal: 0.25 }), 0, H0, 0);
    const deckY = H0 - 0.05;
    { const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([L * (u - 0.5), Math.max(0.02, hb(u) - 0.12)]); } for (let i = 20; i >= 0; i--) pts.push([pts[i][0], -pts[i][1]]); FB.add(slabGeo(pts.map(([a, b]) => [a, b]), 0.12, TILE.deck), tm('deck', { color: '#d4c8dc', rough: 0.7, metal: 0.2 }), 0, deckY, 0); }
    const white = tm('concrete', { color: '#f6f0ec', rough: 0.6 });
    // cabin with portholes and a brass roof, wheelhouse, keel fin
    FB.add(bbox(4.6, 1.8, 2.8, 0.14, 2), white, -1.4, deckY + 0.9, 0);
    FB.add(boxUV(bbox(4.9, 0.16, 3.1, 0.06, 1), 1.5), brassM(), -1.4, deckY + 1.86, 0);
    FB.add(bbox(4.65, 0.3, 2.85, 0.04, 1), tealM(), -1.4, deckY + 0.15, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      FB.add(cached('port', () => new THREE.TorusGeometry(0.2, 0.05, 8, 18)), brassM(), -2.8 + i * 1.3, deckY + 1.05, s * 1.42, 0, s > 0 ? 0 : Math.PI, 0);
      FB.add(cached('portg', () => new THREE.CircleGeometry(0.18, 16)), pm('#a8f0ff', 0.15, { emissive: '#3ad0ff', emissiveIntensity: 0.6 }), -2.8 + i * 1.3, deckY + 1.05, s * 1.415, 0, s > 0 ? 0 : Math.PI, 0);
    }
    FB.add(bbox(2.0, 1.3, 2.2, 0.1, 2), white, -0.6, deckY + 2.55, 0);
    FB.add(boxUV(bbox(2.3, 0.16, 2.5, 0.06, 1), 1.5), brassM(), -0.6, deckY + 3.25, 0);
    FB.add(bbox(0.05, 0.55, 1.8, 0.02, 1), pm('#2a5a70', 0.1, { metalness: 0.4, emissive: '#2a9ac0', emissiveIntensity: 0.3 }), 0.41, deckY + 2.7, 0);
    FB.add(boxUV(bbox(3.4, 1.0, 0.16, 0.06, 1), 1.5), tealM(), -1.0, -0.95, 0);
    // engine pods on outriggers with propellers
    const props = [];
    for (const s of [-1, 1]) {
      member(FB, [-2.4, deckY + 0.6, s * 1.7], [-2.4, deckY + 0.9, s * 3.1], 0.18, brassM(), 1, 0.04);
      member(FB, [0.4, deckY + 0.6, s * 1.6], [-1.9, deckY + 0.9, s * 3.1], 0.12, brassM(), 1, 0.03);
      FB.add(lathe([[0, 0], [0.35, 0.2], [0.48, 0.6], [0.5, 1.7], [0.42, 2.3], [0.2, 2.6], [0, 2.65]], 16, 1.2), tealM(), -1.2, deckY + 0.9, s * 3.25, 0, 0, Math.PI / 2);
      FB.add(cached('podband', () => new THREE.TorusGeometry(0.5, 0.06, 6, 20).rotateY(Math.PI / 2)), brassM(), -2.2, deckY + 0.9, s * 3.25);
      const pv = new THREE.Group(); pv.position.set(-3.95, deckY + 0.9, s * 3.25); bob.add(pv);
      const blades = cached('prop', () => compose([0, 1, 2, 3].map((k) => [bbox(0.08, 1.5, 0.22, 0.03, 1), 0, 0, 0, (k * Math.PI) / 4 * 0 + 0.3, 0, (k * Math.PI) / 2]).concat([[new THREE.SphereGeometry(0.16, 10, 8)]])));
      mesh(pv, blades, brassM());
      props.push(pv);
    }
    // gas envelope above, striped gores, rigging to the hull
    const env = cached('envelope', () => {
      const g = lathe([[0, -2.0], [0.9, -1.85], [1.6, -1.3], [1.95, -0.4], [2.0, 0.4], [1.8, 1.4], [1.3, 2.3], [0.7, 2.9], [0, 3.2]], 24);
      const c = [], p = g.attributes.position, cc = new THREE.Color();
      for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)); cc.set(Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % 2 ? '#f4ece4' : '#3a9a9c'); c.push(cc.r, cc.g, cc.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      g.rotateZ(-Math.PI / 2);
      return g;
    });
    FB.add(env, VC(), -0.8, deckY + 6.6, 0, 0, 0, 0, 1.6, 1, 1);
    FB.add(cached('envband', () => new THREE.TorusGeometry(2.03, 0.08, 6, 30).rotateY(Math.PI / 2)), brassM(), -0.8, deckY + 6.6, 0);
    FB.add(boxUV(bbox(1.4, 1.1, 0.12, 0.04, 1), 1), tealM(), -4.6, deckY + 6.6, 0);
    for (const [ax, az] of [[-3.6, -1.2], [-3.6, 1.2], [1.6, -1.2], [1.6, 1.2], [-1, -1.3], [-1, 1.3]]) rod(FB, [ax, deckY + 1.9, az], [ax * 0.95 - 0.2, deckY + 5.0, az * 1.3], 0.025, darkSteel(), 5);
    FB.add(emq(), emblemMaterial(), -0.8, deckY + 6.6, 2.05, 0, 0, 0, 1.4);
    FB.add(emq(), emblemMaterial(), -0.8, deckY + 6.6, -2.05, 0, Math.PI, 0, 1.4);
    // bow lamp and gangway
    rod(FB, [4.5, deckY + 0.4, 0], [4.7, deckY + 2.4, 0], 0.06, brassM());
    FB.add(cached('glb', () => new THREE.SphereGeometry(0.13, 12, 8)), glowCyan(), 4.72, deckY + 2.5, 0);
    FB.add(boxUV(bbox(1.0, 0.07, 1.6, 0.02, 1), TILE.planks), tm('planks', { color: '#d8c0a0' }), 2.0, deckY + 0.08, -2.3, 0.06);
    FB.build();
    // mooring ropes to the bollards (REVIEW-ZEELICH-ART d: in the ferry's own group, so they go with it: the story keeps
    //  the ferry away, and the ropes were left ending in the air beside the pier)
    const rope = pm('#c8a878', 0.9), rel = (p) => [p[0] - FERRY.x, p[1] - (Y0 - 1.05), p[2] - FERRY.z];
    for (const [bx, fx] of [[-61.2, -4.5], [-54.0, 3.2]]) mesh(grp, tube([[bx, Y0 + 0.55, PIER.hw - 0.35], [(bx + FERRY.x + fx) / 2, Y0 + 0.1, (PIER.hw + FERRY.z - 1.7) / 2], [FERRY.x + fx, Y0 + 0.35, FERRY.z - 1.75]].map(rel), 0.035, 5, 1), rope);
    updaters.push((dt, t) => {
      if (!grp.visible) return;
      bob.position.y = Math.sin(t * 0.8) * 0.12;
      bob.rotation.x = Math.sin(t * 0.6) * 0.02;
      for (const p of props) p.rotation.x += dt * 9;
    });
    return { group: grp, ...W(FERRY.x, FERRY.z), setVisible(b) { grp.visible = b; } };
  }

  // ================================================================ horseshoe gateway at the pier root
  function buildGateway() {
    const x = -47.2, half = 4.6, H = 5.6;
    const G = new THREE.Group(); G.position.set(x, Y0, 0); G.rotation.y = Math.PI / 2; group.add(G);
    const GB = new Batch(G);
    const o = { x: 0, y: 0.02, w: 5.0, h: 4.6, horse: true };
    GB.add(panelGeo(half * 2 + 1.0, H, 0.9, [o]), tm('plasterWall', { color: '#e2d6cc' }), 0, 0, -0.45);   // (ZEELICH-2: stucco, glass blocks)
    GB.add(frameGeo(o, 0.38, 1.0, 1), glassM(), 0, 0, -0.5);
    // alfiz (rectangular frame around the arch), cornice, merlons, brass finials
    const trim = tm('stone', { color: '#b8aca4' });
    for (const s of [-1, 1]) GB.add(bbox(0.22, 4.9, 0.14, 0.03, 1), trim, s * 3.05, 2.45, 0.5);
    GB.add(bbox(6.32, 0.22, 0.14, 0.03, 1), trim, 0, 4.95, 0.5);
    GB.add(bbox(6.32, 0.22, 0.14, 0.03, 1), trim, 0, 4.95, -0.5);
    for (const s of [-1, 1]) GB.add(bbox(0.22, 4.9, 0.14, 0.03, 1), trim, s * 3.05, 2.45, -0.5);
    GB.add(boxUV(bbox(half * 2 + 1.5, 0.3, 1.4, 0.06, 1), 1.6), tm('stone', { color: '#f4e8ee' }), 0, H + 0.12, 0);
    const merlon = cached('merlon', () => { const s = new THREE.Shape(); s.moveTo(-0.3, 0); s.lineTo(0.3, 0); s.lineTo(0.3, 0.3); s.quadraticCurveTo(0.3, 0.62, 0, 0.72); s.quadraticCurveTo(-0.3, 0.62, -0.3, 0.3); s.lineTo(-0.3, 0); return boxUV(new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 6 }), 1); });
    void merlon;   // (ZEELICH-2: no merlons)
    for (const s of [-1, 1]) {
      GB.add(lathe([[0.55, 0], [0.55, 0.3], [0.45, 0.4], [0.45, H + 0.6], [0.6, H + 0.75], [0.6, H + 0.95], [0, H + 0.95]], 8, 1.6, Math.PI / 8), tm('plasterWall', { color: '#d8cec8' }), s * (half + 0.4), 0, 0);
      GB.add(capParts(0.64, 1.3).shell, capM(['#78a8ae', '#b4d8d8']), s * (half + 0.4), H + 0.95, 0);
      GB.add(lathe([[0, 0], [0.06, 0], [0.06, 0.25], [0.12, 0.32], [0.03, 0.45], [0.02, 0.8], [0, 0.82]], 8), brassM(), s * (half + 0.4), H + 2.3, 0);
    }
    GB.build();
    for (const s of [-1, 1]) col({ type: 'box', x, z: s * (2.5 + 1.6), hw: 0.5, hd: 1.6, rot: 0, top: Y0 + H + 0.4 });
    keepClear(x - 1.2, -6, x + 1.2, 6);
  }

  // ================================================================ an Esmer house
  function esmerHouse(o) {
    const rr = rng(o.seed * 131 + 7);
    const G = new THREE.Group(); G.position.set(o.x, Y0, o.z); G.rotation.y = o.ry; group.add(G);
    const HB = new Batch(G), occ = roomOcc(R, physics.terrain);
    const { w, d, h } = o, t = 0.32, base = 0.32;
    const wallM = tm('plasterWall', { color: o.wall });
    const stoneM = tm('stone', { color: '#e4dcd8' });
    const tiles = glassM();   // (ZEELICH-2: glass blocks, as LBA2's Esmer walls)
    const trimM = tm('plasterWall', { color: o.trim });
    const f = frame(o.x, o.z, o.ry);
    // plinth
    HB.add(bbox(w + 0.4, base + 0.12, d + 0.4, 0.05, TILE.stone), stoneM, 0, base / 2 - 0.06, 0);
    // openings
    const doorX = o.doorX ?? 0;
    const door = { x: doorX, y: 0.02, w: 1.25, h: 2.35, horse: true, door: true };   // (WORLD-FIX: 2.45 put the arch's frame into the frieze of the 3.6 m house)
    const friezeY = h - 0.66 - base;   // (the tiled frieze's foot, in the walls' coordinates: nothing on a wall reaches above it)
    const holes = { front: [door], back: [], left: [], right: [], fl: [], fr: [], bl: [], br: [] };
    const winY = 1.15;
    const addWin = (side, x, ww = 0.82, hh = 1.25) => holes[side].push({ x, y: winY, w: ww, h: hh, horse: true });
    // (ZSTYLE-2: o.octa, an octagonal hall: the rectangle's corners chamfered by C; its straight faces fw and fd long)
    const C = o.octa || 0, fw = C ? w - 2 * C : w, fd = C ? d - 2 * C : d;
    if (o.workshop) {
      holes.front.push({ x: doorX + 2.6, y: 0.95, w: 1.9, h: 1.9, round: true, big: true });
      addWin('left', 0); addWin('right', -0.8); addWin('back', 1.5);
    } else {
      for (const xx of [doorX - 1.9, doorX + 1.9]) if (Math.abs(xx) < fw / 2 - 0.7) addWin('front', xx);
      if (fw > 7) addWin('front', doorX + 3.1 * Math.sign(doorX + 0.1) * -1);
      addWin('left', 0); addWin('right', 0.3); addWin('back', -0.9); addWin('back', 1.2);
    }
    const DIAG = [['fl', -1, 1], ['fr', 1, 1], ['bl', -1, -1], ['br', 1, -1]];
    const sides = C ? [
      { n: 'front', len: fw, pos: [0, base, d / 2 - t], ry: 0 },
      { n: 'back', len: fw, pos: [0, base, -d / 2 + t], ry: Math.PI },
      { n: 'left', len: fd, pos: [-w / 2 + t, base, 0], ry: -Math.PI / 2 },
      { n: 'right', len: fd, pos: [w / 2 - t, base, 0], ry: Math.PI / 2 },
      ...DIAG.map(([n, sx, sz]) => ({ n, len: C * Math.SQRT2, pos: [sx * (w / 2 - C / 2 - t * Math.SQRT1_2), base, sz * (d / 2 - C / 2 - t * Math.SQRT1_2)], ry: Math.atan2(sx, sz) })),
    ] : [
      { n: 'front', len: w, pos: [0, base, d / 2 - t], ry: 0 },
      { n: 'back', len: w, pos: [0, base, -d / 2 + t], ry: Math.PI },
      { n: 'left', len: d - 2 * t, pos: [-w / 2 + t, base, 0], ry: -Math.PI / 2 },
      { n: 'right', len: d - 2 * t, pos: [w / 2 - t, base, 0], ry: Math.PI / 2 },
    ];
    // the outer faces [len, x, z, ry, side] (the frieze and the glass-block foot run along them)
    const faces = C ? [[fw - 0.3, 0, d / 2, 0, 'front'], [fw - 0.3, 0, -d / 2, Math.PI, 'back'], [fd - 0.3, -w / 2, 0, -Math.PI / 2, 'left'], [fd - 0.3, w / 2, 0, Math.PI / 2, 'right'],
      ...DIAG.map(([n, sx, sz]) => [C * Math.SQRT2 - 0.3, sx * (w / 2 - C / 2), sz * (d / 2 - C / 2), Math.atan2(sx, sz), n])] : null;
    const lattice = tealGlassM();   // (ZEELICH-2: teal glass)
    const doorM = tm('planks', { color: o.workshop ? '#b8e0d8' : '#c8906a', rough: 0.8 });
    // (WORLD-FIX: what stands round each opening, in wall coordinates seen from outside: tests/worldfit.mjs)
    const fitOps = [], fx = (side, kind, x0, x1, y0, y1) => { const e = { side, kind, x0, x1, y0, y1 }; fitOps.push(e); return e; };
    for (const sd of sides) {
      const m4 = new THREE.Matrix4().compose(new THREE.Vector3(...sd.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd.ry, 0)), new THREE.Vector3(1, 1, 1));
      HB.addM(panelGeo(+sd.len.toFixed(3), h - base, t, holes[sd.n]), wallM, m4);
      const at = (lx, ly, lz, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(lx, ly, lz).applyMatrix4(m4), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd.ry + ry, 0)), new THREE.Vector3(1, 1, 1));
      for (const op of holes[sd.n]) {
        const fe = op.round ? fx(sd.n, 'window', op.x - op.w / 2 - 0.18, op.x + op.w / 2 + 0.18, op.y - 0.18, op.y + op.h + 0.18)
          : op.door ? fx(sd.n, 'door', op.x - op.w / 2 - 0.2, op.x + op.w / 2 + 0.2, op.y, op.y + op.h + 0.2)
          : fx(sd.n, 'window', op.x - op.w / 2 - 0.175, op.x + op.w / 2 + 0.175, op.y - 0.085, op.y + op.h + 0.13);
        if (op.door) fx(sd.n, 'step', op.x - 0.95, op.x + 0.95, -base, -base + 0.14);
        if (op.round) {
          // Baldino's big round workshop window: brass ring, spokes, warm lit glass
          const cy = op.y + op.h / 2;
          HB.addM(cached('bigring', () => new THREE.TorusGeometry(op.w / 2 + 0.06, 0.12, 10, 36)), brassM(), at(op.x, cy, t + 0.04));
          for (let k = 0; k < 4; k++) HB.addM(cached('spoke', () => bbox(op.w, 0.07, 0.07, 0.02, 1)), brassM(), new THREE.Matrix4().multiplyMatrices(at(op.x, cy, t * 0.5), new THREE.Matrix4().makeRotationZ((k * Math.PI) / 4)));
          HB.addM(cached('bigglass', () => new THREE.CircleGeometry(op.w / 2 + 0.02, 28)), pm('#ffd890', 0.2, { emissive: '#ffb050', emissiveIntensity: 0.9 }), at(op.x, cy, t * 0.35));
          for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; HB.addM(cached('rivb', () => new THREE.SphereGeometry(0.045, 6, 4)), brassM(), at(op.x + Math.cos(a) * (op.w / 2 + 0.06), cy + Math.sin(a) * (op.w / 2 + 0.06), t + 0.14)); }
          continue;
        }
        HB.addM(frameGeo(op, op.door ? 0.2 : 0.13, 0.1), op.door ? tiles : trimM, at(0, 0, t - 0.02));
        if (op.door) {
          // recessed plank door with brass studs, alfiz frame, a lantern
          HB.addM(fillGeo(op, 0.05, 0.08, 0.6), doorM, at(0, 0, t * 0.3));
          for (let k = 0; k < 10; k++) HB.addM(cached('stud', () => new THREE.SphereGeometry(0.035, 6, 4)), brassM(), at(op.x + ((k % 2) - 0.5) * 0.7, 0.3 + Math.floor(k / 2) * 0.42, t * 0.3 + 0.1));
          HB.addM(cached('dring', () => new THREE.TorusGeometry(0.08, 0.018, 6, 14)), brassM(), at(op.x + 0.32, 1.1, t * 0.3 + 0.12));
          // (WORLD-FIX: the alfiz stays clear of the frieze above and the lantern beside it, or is left out)
          const aw = op.w + 0.6, ah = Math.min(op.h + 0.55, friezeY - 0.09);
          if (ah - 0.07 >= op.y + op.h + 0.22) {
            for (const s of [-1, 1]) HB.addM(bbox(0.14, ah, 0.08, 0.02, 1), trimM, at(op.x + s * aw / 2, ah / 2, t + 0.03));
            HB.addM(bbox(aw + 0.14, 0.14, 0.08, 0.02, 1), trimM, at(op.x, ah, t + 0.03));
            Object.assign(fe, { x0: op.x - aw / 2 - 0.07, x1: op.x + aw / 2 + 0.07, y1: ah + 0.07 });
          }
          HB.addM(boxUV(bbox(1.9, 0.14, 0.7, 0.03, 1), 1), stoneM, at(op.x, -base + 0.07, t + 0.35));
        } else {
          HB.addM(fillGeo(op, 0.05, 0, 0.5), lattice, at(0, 0, t * 0.45));
          HB.addM(bbox(op.w + 0.35, 0.09, 0.26, 0.02, 1), stoneM, at(op.x, op.y - 0.04, t + 0.06));
          // flower box under some windows
          if (rr() < 0.55) {
            fe.y0 = op.y - 0.3;
            HB.addM(boxUV(bbox(op.w + 0.1, 0.2, 0.22, 0.03, 1), 1), tiles, at(op.x, op.y - 0.2, t + 0.16));
            for (let k = 0; k < 5; k++) HB.addM(cached('fl' + (k % 3), () => tint(new THREE.IcosahedronGeometry(0.075, 0), ['#ff6fa3', '#ffd84a', '#b28cff'][k % 3])), VC(), at(op.x - op.w / 2 + 0.1 + (k / 4) * (op.w - 0.2), op.y - 0.04, t + 0.18 + (k % 2) * 0.05));
          }
        }
      }
    }
    // rounded corner piers with knobs (an octagonal hall: slimmer ones at its eight corners)
    const piers = C ? octPoly(w / 2 - 0.03, d / 2 - 0.03, C) : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [sx * (w / 2 - 0.04), sz * (d / 2 - 0.04)]);
    for (const [px, pz] of piers) {
      HB.add(lathe([[0.36, 0], [0.36, 0.4], [0.3, 0.5], [0.28, h + 0.5], [0.36, h + 0.6], [0.36, h + 0.78], [0.2, h + 0.85], [0, h + 0.85]], 14, TILE.plaster), wallM, px, 0, pz, 0, 0, 0, C ? 0.7 : 1, 1, C ? 0.7 : 1);
      HB.add(cached('knob', () => lathe([[0, 0], [0.16, 0.05], [0.19, 0.18], [0.1, 0.32], [0.03, 0.42], [0.02, 0.6], [0, 0.62]], 10)), brassM(), px, h + 0.85, pz, 0, 0, 0, C ? 0.75 : 1);
    }
    // tiled frieze, cornice, scalloped parapet, roof
    for (const [len, x, z, ry] of faces ? faces.map(([l, x, z, ry]) => [l, x + Math.sin(ry) * 0.005, z + Math.cos(ry) * 0.005, ry]) : [[w - 0.5, 0, d / 2 + 0.005, 0], [w - 0.5, 0, -d / 2 - 0.005, Math.PI], [d - 0.5, -w / 2 - 0.005, 0, -Math.PI / 2], [d - 0.5, w / 2 + 0.005, 0, Math.PI / 2]]) {
      HB.add(boxUV(bbox(len, 0.42, 0.06, 0.01, 1), TILE.tiles), tiles, x + Math.sin(ry) * 0.02, h - 0.45, z + Math.cos(ry) * 0.02, 0, ry, 0);
    }
    // ZSTYLE-1: LBA2's Esmer foot, a band of glass blocks from the plinth to under the windows (the original's Otringal
    // houses and halls, bodies 9, 36, 38, 43: glass blocks over the lower third, plaster above), round the door: the
    // same glass material as the frieze (no new draw)
    {
      const bh = 0.8, gap = 1.25 / 2 + 0.26;
      for (const [len, x, z, ry, n] of faces ? faces.map(([l, x, z, ry, n]) => [l - 0.2, x + Math.sin(ry) * 0.03, z + Math.cos(ry) * 0.03, ry, n]) : [[w - 0.8, 0, d / 2 + 0.03, 0, 'front'], [w - 0.8, 0, -d / 2 - 0.03, Math.PI, 'back'], [d - 0.8, -w / 2 - 0.03, 0, -Math.PI / 2, 'left'], [d - 0.8, w / 2 + 0.03, 0, Math.PI / 2, 'right']]) {
        const cuts = holes[n].filter((op) => op.door || (op.y < bh && !op.round)).map((op) => [op.x - (op.door ? gap : op.w / 2 + 0.2), op.x + (op.door ? gap : op.w / 2 + 0.2)]).sort((a, b) => a[0] - b[0]);
        let u0 = -len / 2;
        for (const [c0, c1] of cuts.concat([[len / 2, len / 2]])) {
          const a = Math.max(u0, -len / 2), b = Math.min(c0, len / 2);
          if (b - a > 0.3) { const um = (a + b) / 2; HB.add(boxUV(bbox(b - a, bh, 0.05, 0.01, 1), TILE.tiles), tiles, x + Math.cos(ry) * um, base + bh / 2, z - Math.sin(ry) * um, 0, ry, 0); }
          u0 = Math.max(u0, c1);
        }
      }
    }
    if (C) {   // (the octagonal hall: its cornice and roof deck follow the chamfers)
      HB.add(slabGeo(octPoly(w / 2, d / 2, C, 0.25), 0.18, TILE.stone), stoneM, 0, h - 0.21, 0);
      HB.add(slabGeo(octPoly(w / 2, d / 2, C, 0.05), 0.14, 1.6), tm('concrete', { color: '#e6d8d0' }), 0, h - 0.15, 0);
    } else {
      HB.add(boxUV(bbox(w + 0.5, 0.18, d + 0.5, 0.06, 1), TILE.stone), stoneM, 0, h - 0.12, 0);
      HB.add(boxUV(bbox(w + 0.1, 0.14, d + 0.1, 0.03, 1), 1.6), tm('concrete', { color: '#e6d8d0' }), 0, h - 0.08, 0);   // (WORLD-FIX: at h − 0.1 its top lay in the cornice's top plane: the roof z-fought)
    }   // (WORLD-FIX: at h − 0.1 its top lay in the cornice's top plane: the roof z-fought)
    const merlon = cached('hmerlon', () => { const s = new THREE.Shape(); s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0.22, 0.18); s.quadraticCurveTo(0.22, 0.42, 0, 0.5); s.quadraticCurveTo(-0.22, 0.42, -0.22, 0.18); s.lineTo(-0.22, 0); return boxUV(new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 5 }), 1); });
    for (const [len, z, ry] of [[w, d / 2, 0], [w, -d / 2, Math.PI], [d, w / 2, Math.PI / 2], [d, -w / 2, -Math.PI / 2]]) {
      const nn = Math.floor((len - 0.9) / 0.62);
      for (let i = 0; i < nn; i++) {
        const lx = -((nn - 1) * 0.62) / 2 + i * 0.62;
        const [px, pz] = ry === 0 || ry === Math.PI ? [lx, z - Math.cos(ry) * 0.12] : [z - Math.sin(ry) * 0.12, lx];
        void px; void pz;
      }
    }
    void merlon;   // (ZEELICH-2: no scalloped merlons: a plain coping round the roof, as LBA2's Esmer roofs)
    if (!C && !o.vault) for (const [len, x, z, ry] of [[w + 0.24, 0, d / 2 - 0.06, 0], [w + 0.24, 0, -d / 2 + 0.06, 0], [d - 0.24, w / 2 - 0.06, 0, Math.PI / 2], [d - 0.24, -w / 2 + 0.06, 0, Math.PI / 2]]) HB.add(bbox(len, 0.22, 0.24, 0.03, 1), stoneM, x, h + 0.1, z, 0, ry, 0);
    // the dome (or Baldino's observatory) on a drum
    const dr = Math.min(w, d) * 0.3, dx = o.workshop ? -w * 0.18 : (rr() - 0.5) * 0.6, dz = o.workshop ? -0.4 : -0.2;
    // (ZSTYLE-1: the council house, the street's civic building, has LBA2's stacked civic silhouette: a tall drum ringed
    // by round grey columns with gold collars under its gold cap, as the original's Otringal halls (bodies 36, 44: 8.2 m,
    // a columned drum); the other houses keep their low drum)
    const DH = o.arcade ? 2.3 : 1.12;
    let domeTop;
    if (C) {
      // ZSTYLE-2: the octagonal hall's broad faceted cap, its eaves out past the cornice, a gold ring and spike (body 9)
      const Hc = 1.7, P = octPoly(w / 2, d / 2, C, 0.42);
      HB.add(polyCap(P, Hc), capM(o.dome), 0, h - 0.03, 0);
      HB.add(tube(P.concat([P[0]]).map(([x, z]) => [x * 1.005, 0.05, z * 1.005]), 0.05, 4, 1), brassM(), 0, h - 0.03, 0);
      domeTop = h - 0.03 + Hc;
      HB.add(capSpike(), brassM(), 0, domeTop - 0.06, 0, 0, 0, 0, 1.0);
    } else if (o.vault) {
      // ZSTYLE-2: a barrel vault across the house in the cap's mosaic, gables in the walls' stucco, a band of glass blocks
      // over its crown and brass ribs and gold spikes at its ends (Otringal's body 51)
      const span = d / 2 + 0.3, rise = o.vault, L = w + 0.5, y = h - 0.03;
      HB.add(vaultGeo(span, rise, L, 0, 0.14), capM(o.dome), 0, y, 0);
      HB.add(vaultGeo(span, rise, 0.9, 0.12, 0.19), tiles, 0, y, 0);
      for (const s of [-1, 1]) {
        HB.add(gableGeo(span, rise, d / 2, t), wallM, s < 0 ? -w / 2 : w / 2 - t, y, 0);
        HB.add(vaultGeo(span, rise, 0.14, 0.12, 0.2), brassM(), s * (L / 2 - 0.07), y, 0);
        HB.add(capSpike(), brassM(), s * (L / 2 - 0.07), y + rise + 0.18, 0, 0, 0, 0, 0.6);
      }
      domeTop = y + rise + 0.2;
    }
    if (!C && !o.vault) HB.add(lathe([[dr + 0.08, 0], [dr + 0.08, 0.15], [dr, 0.2], [dr, DH - 0.17], [dr + 0.12, DH - 0.12], [dr + 0.12, DH], [0, DH]], o.workshop ? 24 : 8, TILE.plaster, o.workshop ? 0 : Math.PI / 8), wallM, dx, h, dz);   // (ZEELICH-2: an octagonal drum under a cap)
    if (o.arcade && !C && !o.vault) for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k / 8) * Math.PI * 2, cx = dx + Math.sin(a) * (dr + 0.16), cz = dz + Math.cos(a) * (dr + 0.16);
      HB.add(cached('civcol' + DH, () => lathe([[0.17, 0], [0.17, 0.12], [0.13, 0.2], [0.13, DH - 0.2], [0.17, DH - 0.12], [0.17, DH], [0, DH]], 10)), tm('stone', { color: '#9a9e98' }), cx, h, cz);
      HB.add(cached('civcollar', () => new THREE.TorusGeometry(0.15, 0.04, 5, 10).rotateX(Math.PI / 2)), brassM(), cx, h + DH * 0.64, cz);
    }
    if (!C && !o.vault) HB.add(cyl(dr + 0.01, dr + 0.01, 0.3, o.workshop ? 24 : 8, 1, true).rotateY(o.workshop ? 0 : Math.PI / 8), tiles, dx, h + 0.55, dz);
    if (!C && !o.vault) for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; HB.add(fillGeo({ x: 0, y: 0, w: 0.2, h: 0.36, horse: true }, 0, 0, 0.5), lattice, dx + Math.sin(a) * (dr * (o.workshop ? 1 : 0.924) + 0.012), h + 0.36, dz + Math.cos(a) * (dr * (o.workshop ? 1 : 0.924) + 0.012), 0, a, 0); }
    const R0 = dr * 1.02;
    if (C || o.vault) { /* its roof is above */ } else if (o.workshop) {
      // brass observatory half-dome with ribs, a slot and a telescope
      HB.add(lathe([[R0, 0], [R0 * 0.98, R0 * 0.25], [R0 * 0.88, R0 * 0.5], [R0 * 0.68, R0 * 0.75], [R0 * 0.38, R0 * 0.93], [0, R0]], 24, 1.2), tm('brass', { rough: 0.42, metal: 0.65, color: '#e8d0a0' }), dx, h + 1.12, dz);
      for (let k = 0; k < 8; k++) HB.add(cached('obsrib' + R0, () => { const pts = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push([0, Math.sin(a) * (R0 + 0.03), Math.cos(a) * (R0 + 0.03)]); } return tube(pts, 0.04, 5, 1); }), tealM(), dx, h + 1.12, dz, 0, (k * Math.PI) / 4, 0);
      HB.add(bbox(0.4, R0 * 0.9, 0.3, 0.05, 1), darkSteel(), dx, h + 1.12 + R0 * 0.55, dz + R0 * 0.75, -0.6, 0, 0);
      HB.add(cyl(0.12, 0.17, 1.9, 12, 1), brassM(), dx, h + 1.12 + R0 * 1.0, dz + R0 * 0.9, 0.95, 0, 0);
      domeTop = h + 1.12 + R0;
    } else {
      // the cap on its drum: the Esmer roof every Zeelich building shares
      // (ZEELICH-2: LBA2's low faceted cap, props-esmer.js capParts, in aqua or gold, a gold spike: no onion)
      const CP = capParts(R0 * (o.arcade ? 1.22 : 1.12), R0 * 0.85);
      HB.add(CP.shell, capM(o.dome), dx, h + DH, dz);
      HB.add(CP.rib, brassM(), dx, h + DH, dz);
      domeTop = h + DH + R0 * 0.85;
      HB.add(capSpike(), brassM(), dx, domeTop - 0.04, dz, 0, 0, 0, 0.7);
    }
    // minaret: slender tower with a balcony and a small onion cap
    if (o.minaret) {
      const mx = o.minaret * (w / 2 + 0.55), mz = -d / 2 + 0.6, mh = h + 4.6;
      HB.add(lathe([[0.75, 0], [0.75, 0.4], [0.62, 0.5], [0.55, mh - 1.4], [0.68, mh - 1.3], [0.68, mh - 1.18], [0.5, mh - 1.15], [0.5, mh], [0, mh]], 16, TILE.plaster), wallM, mx, 0, mz);
      HB.add(cyl(0.56, 0.56, 0.36, 16, 1, true), tiles, mx, h * 0.6, mz);
      HB.add(lathe([[0.5, 0], [1.0, 0.0], [1.0, 0.18], [0.5, 0.25]], 18, 1.2), stoneM, mx, mh - 1.95, mz);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; HB.add(cached('bal', () => lathe([[0.04, 0], [0.06, 0.1], [0.035, 0.3], [0.05, 0.5], [0.03, 0.55]], 6)), stoneM, mx + Math.sin(a) * 0.92, mh - 1.77, mz + Math.cos(a) * 0.92); }
      HB.add(cached('balr', () => new THREE.TorusGeometry(0.92, 0.04, 6, 24).rotateX(Math.PI / 2)), brassM(), mx, mh - 1.2, mz);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; HB.add(fillGeo({ x: 0, y: 0, w: 0.26, h: 0.62, horse: true }, 0, 0, 0.5), lattice, mx + Math.sin(a) * 0.505, mh - 0.95, mz + Math.cos(a) * 0.505, 0, a, 0); }
      const [ca, cb] = o.dome;
      const MP = capParts(0.66, 1.0);   // (ZEELICH-2: a steep cap, as the original's towers)
      HB.add(MP.shell, capM([ca, cb]), mx, mh, mz);
      HB.add(MP.rib, brassM(), mx, mh, mz);
      HB.add(cached('mfin', () => lathe([[0, 0], [0.05, 0], [0.09, 0.12], [0.04, 0.22], [0.015, 0.6], [0, 0.62]], 8)), brassM(), mx, mh + 0.96, mz);
      col({ ...wpos(f, mx, mz), type: 'cyl', r: 0.78, top: Y0 + mh, camSkip: true });
      { const [wx, wz] = f(mx, mz); occ.add({ kind: 'rev', x: ox + wx, z: oz + wz, y0: Y0 - 1, base: Y0, profile: [[0.3, mh + 0.9], [0.66, mh + 0.1], [1.0, mh - 1.75]], name: 'minaret ' + o.seed }); }
    }
    // arcade porch in front
    let arcadeDepth = 0, arcade = null;
    if (o.arcade) {
      arcadeDepth = 2.1;
      // (VP-10: the porch is its own group: it is the one part of a Zeelich house that fades, while he stands under its
      //  roof — as Nell's lean-to on Citadel; the rest stays solid and the camera rises over it)
      const AG = new THREE.Group(); G.add(AG);
      const HB = new Batch(AG);
      const n = o.arcade, len = w - 0.3, ph = h - 0.9, pierW = 0.55, ow = (len - (n + 1) * pierW) / n;
      const arcs = []; for (let i = 0; i < n; i++) arcs.push({ x: -len / 2 + pierW + ow / 2 + i * (ow + pierW), y: 0.0, w: ow, h: ph - 0.75, horse: true });
      const az = d / 2 + arcadeDepth;
      HB.add(panelGeo(len, ph, 0.38, arcs), wallM, 0, -0.04, az - 0.38);
      for (const a of arcs) HB.add(frameGeo(a, 0.14, 0.06), tiles, 0, -0.04, az - 0.02);
      HB.add(boxUV(bbox(len + 0.3, 0.22, arcadeDepth + 0.3, 0.05, 1), 1.6), stoneM, 0, ph - 0.11, d / 2 + arcadeDepth / 2);
      HB.add(boxUV(bbox(len, 0.34, 0.05, 0.01, 1), TILE.tiles), tiles, 0, ph - 0.45, az + 0.02);
      for (let i = 0; i <= n; i++) {
        const px = -len / 2 + pierW / 2 + i * (ow + pierW);
        col({ ...wpos(f, px, az - 0.19), type: 'box', hw: pierW / 2 + 0.02, hd: 0.22, rot: o.ry, top: Y0 + ph, camSkip: true });
        HB.add(cached('pcap', () => bbox(0.7, 0.16, 0.5, 0.03, 1)), stoneM, px, ph - 0.85, az - 0.19);
      }
      HB.add(boxUV(bbox(len + 0.1, 0.12, arcadeDepth, 0.02, 1), TILE.cobble), tm(paveTex(), { color: '#f4f2f8' }), 0, 0.03, d / 2 + arcadeDepth / 2);
      // a rug drying over the arcade parapet
      HB.add(cached('rugq', () => new THREE.PlaneGeometry(1.5, 1.1)), pm('#ffffff', 0.95, { map: rugTex(['#a8304a', '#2a4a8a', '#e8b84a', '#f4e6c8', '#3a2030'], 4), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }), len / 2 - 1.3, ph - 0.62, az + 0.06, 0, 0, Math.PI / 2);
      HB.build();
      // the porch for the camera: solid from outside (the next shot rises over it); passed through while he stands under
      // it (walkUnder: roomocc.js), when it fades instead (a roof-slab volume had pulled the camera in to 2.3 m under it,
      // and with none the arcade hid him from a camera behind it: probe route-arc, 7.11)
      { const [wx, wz] = f(0, d / 2 + arcadeDepth / 2); occ.add({ kind: 'box', x: ox + wx, z: oz + wz, rot: o.ry, hw: (len + 0.3) / 2, hd: arcadeDepth / 2 + 0.1, y0: Y0 - 1, y1: Y0 + ph + 0.05, walkUnder: true, name: 'arcade ' + o.seed }); }
      arcade = { group: AG, x: o.x, z: o.z, ry: o.ry, lz0: d / 2, lz1: az + 0.1, hw: len / 2 + 0.1, top: Y0 + ph - 0.3 };
    }
    // awning over a window and a wall lantern by the door
    {
      const ax = doorX + (o.workshop ? -2.1 : 1.9) * (doorX > 0.5 ? -1 : 1);
      if (!o.arcade && Math.abs(ax) < fw / 2 - 0.6) {
        const aw = cached('awn', () => { const s = new THREE.Shape(); s.moveTo(-0.65, 0); s.lineTo(0.65, 0); s.lineTo(0.65, 0.05); s.lineTo(-0.65, 0.05); s.lineTo(-0.65, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false }); g.rotateX(-0.55); return boxUV(g, 0.5); });
        const awc = [['#b0503a', '#efe8dc'], ['#3a8a92', '#efe8dc'], ['#c8963a', '#efe8dc']][o.seed % 3];   // (ZSTYLE-1: rust, teal, ochre: not rose)
        HB.add(aw, tm(stripeTex(...awc), { rough: 0.9, side: THREE.DoubleSide }), ax, winY + 1.75, d / 2 + 0.02);
      }
      const lx = doorX + (doorX > 0.5 ? -1.16 : 1.16) * (o.workshop ? -1 : 1);   // (WORLD-FIX: at 1.05 the lantern's bracket sat on the alfiz)
      if (!o.arcade) fx('front', 'lamp', lx - 0.13, lx + 0.13, 2.06 - base, 2.6 - base);
      HB.add(cached('wlamp', () => compose([[bbox(0.08, 0.08, 0.36, 0.02, 1), 0, 0, 0.18], [cyl(0.015, 0.015, 0.2, 5), 0, -0.1, 0.34]])), brassM(), lx, 2.55, d / 2 + arcadeDepth + 0.02);
      HB.add(cached('wlampg', () => lathe([[0, 0], [0.1, 0.03], [0.13, 0.15], [0.1, 0.27], [0.03, 0.31], [0, 0.31]], 10)), pm('#fff4e2', 0.3, { emissive: '#ffd8a0', emissiveIntensity: 1.5 }), lx, 2.06, d / 2 + arcadeDepth + 0.36);
      HB.add(cached('wlampc', () => lathe([[0, 0], [0.13, 0], [0.09, 0.1], [0.03, 0.18], [0.01, 0.26], [0, 0.26]], 10)), brassM(), lx, 2.36, d / 2 + arcadeDepth + 0.36);
    }
    fitAdd({ region: 'zeelich', name: o.workshop ? "Baldino's workshop" : 'house ' + o.seed, x: ox + o.x, z: oz + o.z, ry: o.ry, oy: Y0 + base, w, d, base: -base - 0.12, plinth: 0, floor: 0.02, steps: base + 0.1,
      sides: C ? { front: fw / 2 - 0.2, back: fw / 2 - 0.2, left: fd / 2 - 0.2, right: fd / 2 - 0.2 } : { front: w / 2 - 0.4, back: w / 2 - 0.4, left: d / 2 - 0.4, right: d / 2 - 0.4 },
      top: Object.fromEntries(['front', 'back', 'left', 'right'].map((k) => [k, h - 0.45 - 0.21 - base])), openings: fitOps.filter((e) => ['front', 'back', 'left', 'right'].includes(e.side)) });
    let out = {};
    if (o.workshop) out = workshopClutter(HB, G, o, f, tiles);
    HB.build();
    // (ZEELICH-DOORS: the council house's door carries its notice: hearings by petition only)
    if (o.arcade) HB.add(cached('cnotice', () => new THREE.PlaneGeometry(0.62, 0.44)), (MC.get('cnotice') || (MC.set('cnotice', new THREE.MeshStandardMaterial({ map: noticeTex(), roughness: 0.9 })), MC.get('cnotice'))), doorX, base + 1.45, d / 2 - t + 0.2);
    // colliders, and the house's shape for the camera (VP-10, as Citadel's houses: nothing fades, the next shot rises
    // over it — src/game/roomocc.js): the walls up to the coping, corner piers and plinth included; the drum and its cap
    col({ ...wpos(f, 0, 0), type: 'box', hw: w / 2 + 0.25, hd: d / 2 + 0.25, rot: o.ry, top: Y0 + h + 1.0, camSkip: true });
    for (const [sx, sz] of [[-1, 1], [1, 1]]) col({ ...wpos(f, sx * (w / 2 - 0.04), sz * (d / 2 - 0.04)), type: 'cyl', r: 0.4, top: Y0 + h + 0.8, camSkip: true });
    occ.add({ kind: 'box', x: ox + o.x, z: oz + o.z, rot: o.ry, hw: w / 2 + 0.32, hd: d / 2 + 0.32, y0: Y0 - 1, y1: Y0 + h + 0.21, name: 'house ' + o.seed });
    if (C || o.vault) occ.add({ kind: 'box', x: ox + o.x, z: oz + o.z, rot: o.ry, hw: w / 2 + 0.32, hd: d / 2 + 0.32, y0: Y0 + h, y1: Y0 + h + 1.6, name: 'roof ' + o.seed });   // (ZSTYLE-2: the octagonal hall and the vaulted house have no drum or dome: their faceted cap or vault, up to 1.5 m)
    else { const [wx, wz] = f(dx, dz), hb = Y0 + h + DH, Rc = o.workshop ? R0 : R0 * (o.arcade ? 1.22 : 1.12), Hc = domeTop - h - DH;   // (ZSTYLE-1: the council's cap sits on its taller drum, DH)
      occ.add({ kind: 'rev', x: ox + wx, z: oz + wz, y0: Y0 + h - 0.1, base: Y0 + h, profile: [[Rc * 0.3, DH + Hc * 0.92], [Rc * 0.79, DH + Hc * 0.36], [Rc, DH + Hc * 0.07], [Rc + 0.01, DH]], name: 'dome ' + o.seed }); void hb; }
    // (ZSTYLE-2: the octagonal hall's chamfers leave the rectangle's corners, inside its colliders, open: a planter with a
    // golden fan plant fills each, so nothing invisible stops him there)
    if (C) for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const [px, pz] = f(sx * (w / 2 - 0.04), sz * (d / 2 - 0.04));
      B.add(cached('planter', () => lathe([[0, 0.05], [0.62, 0], [0.72, 0.08], [0.7, 0.5], [0.8, 0.56], [0.8, 0.68], [0.62, 0.68], [0.62, 0.6], [0, 0.6]], 8, 1.2)), tm('stone', { color: '#d6d2cc' }), px, Y0, pz, 0, Math.PI / 8, 0, 0.62);
      goldPlant(new Place(B, px, Y0 + 0.37, pz, sx + sz), { h: 1.25, w: 1.05, seed: 7 });
    }
    const ext = Math.max(w, d) / 2 + 0.6 + (o.minaret ? 1.4 : 0) + arcadeDepth;
    keepClear(o.x - ext - 0.6, o.z - ext - 0.6, o.x + ext + 0.6, o.z + ext + 0.6);
    const doorW = f(doorX, d / 2 + arcadeDepth + 0.75);
    // (where the dome sits, for the scaffold of the one being re-tiled: zeelife.js; houses facing south only)
    const dome = o.workshop || o.ry || C || o.vault ? null : { x: o.x + dx, z: o.z + dz, y: Y0 + h + DH, R0, roof: Y0 + h, front: o.z + d / 2, cap: { R: R0 * 1.12, H: R0 * 0.85, colors: o.dome } };   // (ZEELICH-2: cap: its shape, for zeelife.js's re-tiling)
    return { group: G, door: doorW, arcade, dome, ...out };
  }
  function wpos(f, lx, lz) { const [x, z] = f(lx, lz); return { x, z }; }
  function makeFader(G) {
    const mats = new Map();
    G.traverse((m) => {
      if (!m.isMesh) return;
      const list = Array.isArray(m.material) ? m.material : [m.material];
      const out = list.map((mm) => { if (!mats.has(mm)) { const c = mm.clone(); if (c.transparent) { c.userData.alwaysTransparent = true; c.userData.baseOpacity = c.opacity; } mats.set(mm, c); } return mats.get(mm); });
      m.material = Array.isArray(m.material) ? out : out[0];
    });
    return { mats: [...mats.values()] };
  }

  // Baldino's roof: antenna mast with a dish and wires, a propeller wind-vane, a brick chimney, a water tank, a cog
  function workshopClutter(HB, G, o, f, tiles) {
    const { w, d, h } = o;
    const rx = w * 0.25, rz = d * 0.15;
    // chimney
    HB.add(boxUV(bbox(0.7, 1.8, 0.7, 0.04, 1), 1.2), tm('brick', { color: '#e8c0b0' }), w / 2 - 0.7, h + 0.9, -d / 2 + 0.75);
    HB.add(boxUV(bbox(0.86, 0.14, 0.86, 0.03, 1), 1), tm('stone', { color: '#d8c8d0' }), w / 2 - 0.7, h + 1.85, -d / 2 + 0.75);
    HB.add(cyl(0.16, 0.16, 0.5, 10, 1), darkSteel(), w / 2 - 0.7, h + 2.1, -d / 2 + 0.75);
    HB.add(cached('chcap', () => lathe([[0, 0], [0.32, 0], [0.08, 0.22], [0, 0.24]], 10)), darkSteel(), w / 2 - 0.7, h + 2.38, -d / 2 + 0.75);
    // antenna mast with cross bars, a dish and a red light
    const ax = rx + 0.6, az = -d / 2 + 0.9;
    HB.add(cyl(0.05, 0.08, 4.4, 8, 1), darkSteel(), ax, h + 2.2, az);
    for (const [y, l] of [[h + 2.8, 1.2], [h + 3.6, 0.9], [h + 4.2, 0.6]]) HB.add(cyl(0.025, 0.025, l, 5, 1).rotateZ(Math.PI / 2), brassM(), ax, y, az);
    HB.add(cached('glr', () => new THREE.SphereGeometry(0.09, 10, 8)), pm('#ff8070', 0.3, { emissive: '#ff3020', emissiveIntensity: 2.2 }), ax, h + 4.45, az);
    HB.add(cached('dish', () => lathe([[0, 0], [0.3, 0.02], [0.55, 0.12], [0.66, 0.22], [0.64, 0.24], [0.52, 0.14], [0.28, 0.05], [0, 0.04]], 18)), tm('concrete', { color: '#f4f0ea', rough: 0.5 }), ax - 0.15, h + 3.0, az + 0.35, -1.0, 0.4, 0);
    for (const s of [-1, 1]) HB.add(tube([[ax, h + 4.1, az], [ax + s * 1.6, h + 2.5, az + 1.2], [ax + s * 2.5, h + 0.05, az + 1.8]], 0.012, 4, 1), darkSteel());
    // water tank on legs
    const tx = -w / 2 + 1.0, tz = -d / 2 + 1.0;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) HB.add(cyl(0.04, 0.04, 0.9, 6, 1), darkSteel(), tx + sx * 0.38, h + 0.45, tz + sz * 0.38);
    HB.add(lathe([[0, 0], [0.55, 0], [0.55, 0.9], [0.45, 1.05], [0, 1.1]], 16, 1), tm('planks', { color: '#c8a888' }), tx, h + 0.9, tz);
    HB.add(cached('tband', () => compose([0.15, 0.75].map((y) => [new THREE.TorusGeometry(0.56, 0.03, 5, 18).rotateX(Math.PI / 2), 0, y, 0]))), brassM(), tx, h + 0.9, tz);
    // pipes down the wall, a big cog decoration on the front, the sign on a bracket
    const fz = d / 2 + 0.1;
    HB.add(tube([[w / 2 - 0.35, h + 1.0, -d / 2 + 0.75], [w / 2 - 0.35, h + 0.2, d / 2 - 0.3], [w / 2 - 0.35, h - 0.6, fz + 0.05], [w / 2 - 0.35, 0.4, fz + 0.05]], 0.07, 8, 1), tm('copper' in textures() ? 'copper' : 'brass', { rough: 0.4, metal: 0.7, color: '#e0a070' }));
    const cog = cached('cogdeco', () => { const s = new THREE.Shape(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 0.52 : 0.66; const a2 = a + Math.PI / 24; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); s.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); } s.closePath(); const hp = new THREE.Path(); hp.absarc(0, 0, 0.2, 0, Math.PI * 2, true); s.holes.push(hp); return boxUV(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }), 0.6); });
    HB.add(cog, brassM(), -w / 2 + 0.95, h - 0.95, fz);
    // hanging sign with a cog (two-sided), on a brass bracket by the door
    const sx = (o.doorX ?? 0) - 1.25;
    HB.add(cached('sbr', () => compose([[bbox(0.07, 0.07, 1.0, 0.02, 1), 0, 0, 0.5], [tube([[0, -0.02, 0.05], [0, -0.35, 0.18], [0, -0.04, 0.6]], 0.02, 5, 1)]])), brassM(), sx, 3.05, d / 2);
    const sign = new THREE.Group(); sign.position.set(sx, 2.62, d / 2 + 0.78); G.add(sign);
    mesh(sign, cached('sboard', () => bbox(0.08, 0.6, 0.92, 0.03, 1)), brassM());
    for (const s of [-1, 1]) mesh(sign, cached('sface', () => new THREE.PlaneGeometry(0.86, 0.54)), pm('#ffffff', 0.6, { map: workshopSignTex() }), s * 0.045, 0, 0, s * Math.PI / 2, { cast: false });
    for (const zz of [-0.3, 0.3]) mesh(sign, cyl(0.008, 0.008, 0.16, 4), darkSteel(), 0, 0.37, zz);
    // a propeller wind-vane on a pole over the roof (spins)
    const vx = -w / 2 + 2.2, vz = 0.6;
    HB.add(cyl(0.05, 0.06, 2.6, 8, 1), darkSteel(), vx, h + 1.3, vz);
    const vane = new THREE.Group(); vane.position.set(vx, h + 2.65, vz); G.add(vane);
    mesh(vane, cached('vbody', () => compose([[lathe([[0, 0], [0.12, 0.1], [0.15, 0.5], [0.1, 0.9], [0, 1.0]], 10).rotateX(Math.PI / 2), 0, 0, -0.5], [slabGeo([[0, 0], [0.5, -0.35], [0.5, 0.35]], 0.03, 1).rotateZ(Math.PI / 2), 0, 0, -1.0]])), tealM());
    const prop = new THREE.Group(); prop.position.set(0, 0, 0.55); vane.add(prop);
    mesh(prop, cached('vprop', () => compose([0, 1, 2].map((k) => [bbox(0.1, 0.8, 0.03, 0.02, 1), Math.sin((k * Math.PI * 2) / 3) * 0.38, Math.cos((k * Math.PI * 2) / 3) * 0.38, 0, 0, 0.3, -(k * Math.PI * 2) / 3]).concat([[new THREE.SphereGeometry(0.08, 8, 6)]]))), tm('brass', { color: '#f0c8c0', rough: 0.4, metal: 0.6 }));
    updaters.push((dt, t) => { prop.rotation.z += dt * 7; vane.rotation.y = Math.sin(t * 0.3) * 0.5 + 0.3; sign.rotation.x = Math.sin(t * 1.3) * 0.05; });
    // ZSTYLE-2: Baldino's patched walls: ribbed metal sheets bolted over the back and the east side, clear of the windows,
    // the glass-block foot and the frieze (4 cm proud of the wall, inside his collider)
    {
      const rib = tm(ribTex(), { rough: 0.48, metal: 0.45, color: '#b8c0bc' }), y0 = 1.2, y1 = Math.min(3.25, h - 0.7);
      HB.add(boxUV(bbox(3.4, y1 - y0, 0.04, 0.01, 1), 1.0), rib, 1.1, (y0 + y1) / 2, -d / 2 - 0.03);
      HB.add(boxUV(bbox(0.04, y1 - y0, 2.2, 0.01, 1), 1.0), rib, w / 2 + 0.03, (y0 + y1) / 2, -1.5);
      for (const [bx, bz] of [[-0.45, -d / 2 - 0.06], [2.65, -d / 2 - 0.06]]) for (const by of [y0 + 0.12, y1 - 0.12]) HB.add(cached('ribbolt', () => new THREE.SphereGeometry(0.035, 6, 4)), brassM(), bx, by, bz);
    }
    // clutter by the wall: crates, a cart wheel, a gear rack, a barrel
    techCrates([wpos(f, w / 2 + 0.9, 0.8).x !== undefined ? [wpos(f, w / 2 + 0.9, 0.8).x, wpos(f, w / 2 + 0.9, 0.8).z, 1, 0.8] : [0, 0]]);
    placeTag('cartWheel');   // (PLACE-2: names the piece for tests/place-scan.mjs; nothing in play)
    HB.add(cached('cartwheel', () => compose([[new THREE.TorusGeometry(0.5, 0.06, 6, 22)], ...[0, 1, 2, 3].map((k) => [bbox(1.0, 0.05, 0.05, 0.01, 1), 0, 0, 0, 0, 0, (k * Math.PI) / 4]), [cyl(0.08, 0.08, 0.16, 8).rotateX(Math.PI / 2)]])), tm('wood', { color: '#a87850' }), -w / 2 - 0.25, 0.55, 1.2, 0, Math.PI / 2 - 0.2, 0.15);
    placeTag(null);
    return {};
  }

  // ================================================================ plaza: fountain and the market stall
  function buildPlaza() {
    const { x, z } = PLAZA;
    // fountain: tiled octagonal basin, brass bowl, water
    placeTag('fountain');   // (PLACE-2: names the pieces for tests/place-scan.mjs; nothing in play)
    const stone = tm('stone', { color: '#dedad6' });   // (ZSTYLE-1: grey stone and a glass-block band, not rose tiles)
    B.add(lathe([[1.9, 0], [1.95, 0.05], [1.95, 0.55], [2.05, 0.62], [2.05, 0.72], [1.7, 0.72], [1.7, 0.2], [0, 0.2]], 8, 1.2), stone, x, Y0, z, 0, Math.PI / 8, 0);
    B.add(cyl(1.97, 1.97, 0.3, 8, 1, true), glassM(), x, Y0 + 0.36, z, 0, Math.PI / 8, 0);
    B.add(lathe([[0.4, 0], [0.32, 0.6], [0.26, 1.2], [0.3, 1.3], [0.9, 1.45], [0.95, 1.6], [0.2, 1.62], [0.12, 1.9], [0.2, 2.1], [0.05, 2.5], [0, 2.55]], 16), brassM(), x, Y0 + 0.2, z);
    const water = mesh(group, cached('wdisc', () => new THREE.CircleGeometry(1.72, 8).rotateX(-Math.PI / 2)), tm('sea', { color: '#c8f0f8', rough: 0.15, metal: 0.1, emissive: '#204860', ei: 0.4 }), x, Y0 + 0.55, z, Math.PI / 8, { cast: false });
    water.material.map = water.material.map.clone(); water.material.map.needsUpdate = true; water.material.map.repeat.set(0.6, 0.6);
    const bowl = mesh(group, cached('bwater', () => new THREE.CircleGeometry(0.86, 16).rotateX(-Math.PI / 2)), water.material, x, Y0 + 1.75, z, 0, { cast: false });
    void bowl;
    // falling water: a thin translucent bell
    const bell = mesh(group, cached('wbell', () => lathe([[0.95, 0], [0.97, -0.3], [1.05, -0.8], [1.15, -1.18]], 16)), pm('#e0f8ff', 0.1, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, emissive: '#80c0e0', emissiveIntensity: 0.3 }), x, Y0 + 1.73, z, 0, { cast: false });
    bell.castShadow = false;
    updaters.push((dt, t) => { water.material.map.offset.set(t * 0.03, t * 0.02); });
    col({ type: 'cyl', x, z, r: 2.05, top: Y0 + 0.72 });
    // market stall: timber frame, striped canopy, counter of fruit, jars and a rug
    placeTag('stall');
    const sx = x, sz = z + 9.2, G = new THREE.Group(); G.position.set(sx, Y0, sz); G.rotation.y = Math.PI; group.add(G);
    const SB = new Batch(G);
    const wood = tm('wood', { color: '#c89868' });
    for (const [px, pz] of [[-1.6, -0.9], [1.6, -0.9], [-1.6, 0.9], [1.6, 0.9]]) SB.add(boxUV(bbox(0.14, pz < 0 ? 2.5 : 2.2, 0.14, 0.03, 1), 1), wood, px, (pz < 0 ? 2.5 : 2.2) / 2, pz);
    SB.add(boxUV(bbox(3.5, 0.9, 0.7, 0.04, 1), 1), tm('planks', { color: '#d8b090' }), 0, 0.45, 0.7);
    SB.add(boxUV(bbox(3.6, 0.08, 0.85, 0.02, 1), 1), wood, 0, 0.93, 0.7);
    SB.add(boxUV(bbox(3.5, 0.24, 0.05, 0.01, 1), TILE.tiles), glassM(), 0, 0.7, 1.06);
    const canopy = cached('canopy', () => { const s = new THREE.Shape(); s.moveTo(-1.95, 0); for (let i = 0; i <= 8; i++) { const xx = -1.95 + (i / 8) * 3.9; s.lineTo(xx, i % 2 ? -0.18 : 0); } s.lineTo(1.95, 0.06); s.lineTo(-1.95, 0.06); s.lineTo(-1.95, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: false }); g.translate(0, 0, -1.2); g.rotateX(0.24); return boxUV(g, 0.98); });
    SB.add(canopy, tm(stripeTex('#3a8a92', '#efe8dc'), { rough: 0.9, side: THREE.DoubleSide }), 0, 2.42, 0.0);
    const fruit = [];
    for (let i = 0; i < 26; i++) fruit.push([cached('fruit' + (i % 4), () => tint(new THREE.SphereGeometry(0.09 + (i % 4) * 0.015, 8, 6), ['#ff7a3a', '#e8d040', '#b048c8', '#f05070'][i % 4])), -1.4 + (i % 13) * 0.22, 1.02 + Math.floor(i / 13) * 0.05, 0.55 + Math.floor(i / 13) * 0.25]);
    for (const [g, fx, fy, fz] of fruit) SB.add(g, VC(), fx, fy, fz);
    for (let i = 0; i < 4; i++) SB.add(cached('jar', () => lathe([[0, 0], [0.12, 0], [0.16, 0.12], [0.14, 0.26], [0.08, 0.32], [0.09, 0.38], [0, 0.38]], 10)), tm(tileTex('#2f8a9a', '#e8b84a', '#c84a7a'), { rough: 0.4 }), 1.1 + (i % 2) * 0.3, 0.97, 0.45 + Math.floor(i / 2) * 0.3);
    SB.add(cached('rugstall', () => new THREE.PlaneGeometry(1.1, 0.8)), pm('#ffffff', 0.95, { map: rugTex(['#2a6a8a', '#a8304a', '#e8b84a', '#f4e6c8', '#3a2030'], 7), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }), -1.6, 1.4, 0.0, 0, Math.PI / 2, Math.PI / 2);
    SB.build();
    placeTag(null);
    col({ type: 'box', x: sx, z: sz - 0.7, hw: 1.8, hd: 0.45, rot: 0, top: Y0 + 1.0, noStand: true, seeThrough: true });
    for (const [px, pz] of [[-1.6, 0.9], [1.6, 0.9]]) col({ type: 'cyl', x: sx + px, z: sz + pz, r: 0.12, top: Y0 + 2.5, seeThrough: true });
    // (CAM-COVER, release audit v75 F-8: the canopy is a scenery volume for the play camera, as a porch is — the camera
    //  rises over it or looks round it, never through it at him; passed through while he stands under it: by Oku's
    //  stall the camera stood behind it, the cloth over him, his outline showing, and its sight test read him as seen)
    roomOcc(R, physics.terrain).add({ kind: 'box', x: ox + sx, z: oz + sz, hw: 2.0, hd: 1.25, y0: Y0 + 1.85, y1: Y0 + 2.75, walkUnder: true, name: 'stall canopy' });
    keepClear(sx - 2.2, sz - 1.4, sx + 2.2, sz + 1.4);
  }

  // ================================================================ lamps, benches, planters with odd plants
  function buildStreetFurniture() {
    for (let x = -44; x <= 34; x += 10.5) { lamps.push([x, -4.1]); lamps.push([x + 5, 4.1]); }
    lamps.push([PLAZA.x - 5.8, PLAZA.z - 5.8], [PLAZA.x + 5.8, PLAZA.z + 5.8 - 0.4]);
    const lampGeo = cached('zlamp', () => ({
      metal: compose([
        [lathe([[0, 0], [0.3, 0], [0.3, 0.1], [0.2, 0.2], [0.13, 0.5], [0.1, 0.58], [0.12, 0.64], [0, 0.64]], 10)],
        [cyl(0.05, 0.07, 2.7, 8), 0, 1.95, 0], [new THREE.TorusGeometry(0.09, 0.025, 6, 12).rotateX(Math.PI / 2), 0, 1.1, 0], [new THREE.TorusGeometry(0.075, 0.025, 6, 12).rotateX(Math.PI / 2), 0, 3.1, 0],
        [tube([[0, 3.2, 0], [0.12, 3.55, 0], [0.42, 3.62, 0], [0.62, 3.5, 0], [0.64, 3.36, 0]], 0.03, 5, 1)],
        [tube([[0, 2.9, 0], [0.3, 3.1, 0], [0.5, 3.38, 0]], 0.02, 4, 1)],
        [lathe([[0, 0], [0.2, 0.02], [0.16, 0.12], [0.07, 0.26], [0.02, 0.4], [0, 0.42]], 10), 0.64, 3.2, 0],
        [lathe([[0, 0], [0.14, 0], [0.16, 0.04], [0.12, 0.06], [0, 0.06]], 10), 0.64, 2.66, 0],
        [lathe([[0, 0], [0.04, 0], [0.04, 0.3], [0.08, 0.36], [0, 0.48]], 8), 0, 3.2, 0],
      ]),
      glass: lathe([[0.05, 0], [0.15, 0.08], [0.19, 0.28], [0.15, 0.46], [0.06, 0.54]], 10).translate(0.64, 2.68, 0),
    }));
    const lm = tm('brass', { color: '#d8c0a0', rough: 0.4, metal: 0.6 }), lg = pm('#fff4e4', 0.3, { emissive: '#ffd8a8', emissiveIntensity: 1.4 });   // (ZSTYLE-1: warm white, not pink)
    for (const [x, z] of lamps) {
      placeTag('lamp');   // (PLACE-2: names each piece for tests/place-scan.mjs; nothing in play)
      const ry = z > 0 ? -Math.PI / 2 : Math.PI / 2;
      B.add(lampGeo.metal, lm, x, Y0, z, 0, ry, 0);
      B.add(lampGeo.glass, lg, x, Y0, z, 0, ry, 0);
      col({ type: 'cyl', x, z, r: 0.22, top: Y0 + 3.4, seeThrough: true, noStand: true });
    }
    // benches: stone ends, plank seat, tiled back
    // (BENCHES-1: two of the north row's stood on the lamps' line — one with a lamp post through its end and the plaza's
    //  planter 0.9 m before its seat, one with a post before its middle — and stand between the lamps now: ZEELICH_SEATS)
    const benches = ZEELICH_SEATS;
    for (const [x, z, ry] of benches) {
      placeTag('bench');
      const f = frame(x, z, ry), at = (lx, ly, lz) => { const [a, b] = f(lx, lz); return [a, Y0 + ly, b]; };
      for (const s of [-1, 1]) B.add(boxUV(bbox(0.24, 0.48, 0.55, 0.05, 1), 1), tm('stone', { color: '#dcd8d4' }), ...at(s * 0.75, 0.24, 0), 0, ry, 0);
      for (let k = 0; k < 3; k++) B.add(boxUV(bbox(1.8, 0.06, 0.15, 0.02, 1), 1), tm('wood', { color: '#c89060' }), ...at(0, 0.5, -0.17 + k * 0.17), 0, ry, 0);
      B.add(boxUV(bbox(1.9, 0.5, 0.1, 0.03, 1), TILE.teal), tealM(), ...at(0, 0.82, -0.3), -0.1, ry, 0);   // (ZSTYLE-1: a teal back, as the rails)
      col({ type: 'box', ...wpos(f, 0, 0), hw: 0.95, hd: 0.35, rot: ry, top: Y0 + 0.55, seeThrough: true });
    }
    // planters with odd Zeelich plants (BENCHES-1: the one by the boulevard's west bench stood half through its end, at −30.5: 1.5 m off it now)
    // (PLACE-2: the one at −18.4 stood half in the plaza's planter at its rim, 34 cm into it; the one at 8 had the lamp
    //  post at 8.5 through its pot's rim: 2.2 m west and 1.2 m west, the same row, clear of the lamps and the benches)
    const planters = [[-44, -5.6], [-44, 5.6], [-27.8, -5.2], [-20.6, -5.2], [-6, 5.2], [6.8, -5.2], [17.5, 5.2], [33, -5.0], [33, 5.0], [PLAZA.x + 6.6, PLAZA.z - 4], [PLAZA.x + 7.3, PLAZA.z + 2.6]];
    // (ZSTYLE-1: LBA2's Zeelich street plants, measured on the original's Otringal: street trees in square planters with
    // a golden plume (bodies 52–54) and a golden fan plant with red fruit (body 18), props-esmer.js frondTree / goldPlant
    // as on our Otringal; where they were glowing orb stalks, violet striped bulbs and curl ferns in rose-tiled pots.
    // The same places and colliders)
    const pot = cached('planter', () => lathe([[0, 0.05], [0.62, 0], [0.72, 0.08], [0.7, 0.5], [0.8, 0.56], [0.8, 0.68], [0.62, 0.68], [0.62, 0.6], [0, 0.6]], 8, 1.2));
    planters.forEach(([x, z], i) => {
      placeTag('planter');
      { const kind = Math.floor(r() * 3); for (let k = 0; k < (kind === 0 ? 4 : 1); k++) r(); }   // (the old plants' draws: the island's random stream unchanged after them)
      if (i % 2 === 0) frondTree(new Place(B, x, Y0, z, (i * 0.9) % 1.6), { h: 3.1, s: 1.2, seed: i });
      else {
        B.add(pot, tm('stone', { color: '#d6d2cc' }), x, Y0, z, 0, Math.PI / 8, 0);
        B.add(cyl(0.705, 0.705, 0.22, 8, 1, true), glassM(), x, Y0 + 0.3, z, 0, Math.PI / 8, 0);
        goldPlant(new Place(B, x, Y0 + 0.6, z, i * 1.3), { h: 1.7, w: 1.5, seed: i });
      }
      col({ type: 'cyl', x, z, r: 0.78, top: Y0 + 0.68, seeThrough: true });
    });
    placeTag(null);
  }
  function plantAt(x, y, z, kind, s = 1) {
    if (kind === 0) {
      // orb stalks: curved stems with glowing orbs
      const stem = cached('orbstem', () => compose([0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2, hh = 0.9 + (k % 3) * 0.35; return [tint(tube([[0, 0, 0], [Math.sin(a) * 0.12, hh * 0.5, Math.cos(a) * 0.12], [Math.sin(a) * 0.32, hh, Math.cos(a) * 0.32]], 0.025, 4, 1), '#4a9a6a')]; }).concat([[tint(new THREE.SphereGeometry(0.3, 10, 6), '#3f7a4a'), 0, 0.05, 0, 0, 0, 0, 1, 0.45, 1]]), true));
      B.add(stem, VC(), x, y, z, 0, r() * 6, 0, s);
      const orb = cached('orbs', () => compose([0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2, hh = 0.9 + (k % 3) * 0.35; return [new THREE.SphereGeometry(0.09 + (k % 2) * 0.03, 10, 8), Math.sin(a) * 0.32, hh + 0.05, Math.cos(a) * 0.32]; })));
      const k = Math.floor(r() * 3); void r();   // (ZSTYLE-1: amber or pale cyan glows, no pink; the stream's draws kept)
      B.add(orb, pm(['#fff0b0', '#c8f8ff', '#fff0b0'][k], 0.3, { emissive: ['#ffc040', '#40d8ff', '#ffb030'][k], emissiveIntensity: 1.1 }), x, y, z, 0, r() * 6, 0, s);
    } else if (kind === 1) {
      // striped onion bulbs with drooping leaves
      const g = cached('bulbplant', () => {
        const bulb = lathe([[0, 0], [0.22, 0.05], [0.3, 0.2], [0.24, 0.42], [0.1, 0.6], [0.03, 0.8], [0, 0.82]], 12);
        const c = [], p = bulb.attributes.position, cc = new THREE.Color();
        for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)); cc.set(Math.floor(((a + Math.PI) / (Math.PI * 2)) * 10 + p.getY(i) * 3) % 2 ? '#c8783a' : '#e8b860'); c.push(cc.r, cc.g, cc.b); }   // (ZSTYLE-1: ochre and gold, not violet and rose)
        bulb.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
        const parts = [[bulb, 0, 0, 0], [bulb, 0.3, 0, 0.15, 0, 1, 0.2, 0.7], [bulb, -0.25, 0, -0.2, 0, 2, -0.2, 0.6]];
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; parts.push([tint(new THREE.SphereGeometry(0.35, 8, 5), '#5aa86a'), Math.sin(a) * 0.32, 0.12, Math.cos(a) * 0.32, 0.3, a, 0, 0.35, 0.08, 1]); }
        return compose(parts, true);
      });
      B.add(g, VC(), x, y, z, 0, r() * 6, 0, s);
    } else {
      // curl ferns: spiral fronds
      const g = cached('curlfern', () => compose([0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k / 6) * Math.PI * 2, pts = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10, rr = 0.5 * (1 - t * 0.6), ang = t * 4; pts.push([Math.sin(a) * (0.1 + t * 0.6) + Math.sin(a + 1.6) * Math.sin(ang) * 0.12 * t, 0.2 + Math.sin(t * 2.6) * 0.9 * rr + t * 0.3, Math.cos(a) * (0.1 + t * 0.6) + Math.cos(a + 1.6) * Math.sin(ang) * 0.12 * t]); }
        return [tint(tube(pts, 0.035, 4, 1), k % 2 ? '#3a9a8a' : '#7ac860')];
      }), true));
      B.add(g, VC(), x, y, z, 0, r() * 6, 0, s);
    }
  }

  // ================================================================ wind-mills
  function buildMill(m) {
    const G = new THREE.Group(); G.position.set(m.x, Y0, m.z); group.add(G);
    const MB = new Batch(G);
    const old = !!m.old;
    const H = old ? 12.0 : 10.0, R0 = old ? 2.5 : 2.2, R1 = old ? 2.0 : 1.75;
    const Rat = (y) => R0 + (R1 - R0) * (y / H);
    // (ZSTYLE-1: the mills in the street's Esmer look: taupe stucco (the old one granite), glass-block bands, teal glass,
    // a low faceted cap in aqua or gold under a gold spike, canvas sails in grey with teal or ochre; where they were
    // white and lilac plaster, rose and blue star tiles, violet lattice, violet and teal onions, rose sails)
    const wallM = old ? tm(graniteTex(), { color: '#e2ded8' }) : tm('plasterWall', { color: m.id === 'east' ? '#e2d8d0' : '#dcd2ca' });
    const tiles = glassM();
    const stoneM = tm('stone', { color: '#d8d4ce' });
    // tower, plinth, bands, door, windows
    MB.add(lathe([[R0 + 0.35, 0], [R0 + 0.35, 0.45], [R0 + 0.1, 0.55], [R0, 0.6], [R1, H], [R1 + 0.2, H + 0.05], [R1 + 0.2, H + 0.35], [0, H + 0.35]], 28, old ? TILE.stone : TILE.plaster), wallM, 0, 0, 0);
    MB.add(lathe([[R0 + 0.36, 0], [R0 + 0.36, 0.46], [0, 0.46]], 28, 1.6), stoneM, 0, 0, 0);
    for (const y of old ? [H * 0.45] : [H * 0.33, H * 0.66]) MB.add(cyl(Rat(y) + 0.02, Rat(y) + 0.02, 0.4, 28, 1, true), tiles, 0, y, 0);
    MB.add(cyl(R1 + 0.05, R1 + 0.05, 0.42, 28, 1, true), tiles, 0, H - 0.25, 0);
    const doorPhi = m.brake + Math.PI * (old ? 0.5 : 0.35);
    {
      const op = { x: 0, y: 0.02, w: 1.1, h: 2.2, horse: true };
      const rr = Rat(1.1) + 0.02;
      MB.add(fillGeo(op, 0.0, 0.06, 0.6), tm('planks', { color: '#a87858' }), Math.sin(doorPhi) * (rr - 0.04), 0.55, Math.cos(doorPhi) * (rr - 0.04), 0, doorPhi, 0);
      MB.add(frameGeo(op, 0.16, 0.12), tiles, Math.sin(doorPhi) * (rr - 0.02), 0.55, Math.cos(doorPhi) * (rr - 0.02), 0, doorPhi, 0);
    }
    for (const [y, a] of [[H * 0.55, doorPhi + 0.6], [H * 0.8, doorPhi - 0.9], [H * 0.3, doorPhi + 2.6]]) {
      const op = { x: 0, y: 0, w: 0.5, h: 0.9, horse: true }, rr = Rat(y + 0.45) + 0.01;
      MB.add(fillGeo(op, 0.04, 0, 0.5), tealGlassM(), Math.sin(a) * rr, y, Math.cos(a) * rr, 0, a, 0);
      MB.add(frameGeo(op, 0.1, 0.08), stoneM, Math.sin(a) * (rr - 0.02), y, Math.cos(a) * (rr - 0.02), 0, a, 0);
    }
    // cap: onion (new mills) or shingled cone (old mill), turned to the wind
    const capY = H + 0.35, face = m.face;
    { const capH = old ? 2.7 : 2.5, CP = capParts(R1 + 0.5, capH);
      MB.add(CP.shell, capM(old ? ['#b0824a', '#e6c47e'] : m.id === 'east' ? ['#78a8ae', '#b4d8d8'] : ['#6c9ea8', '#a8d0d4']), 0, capY, 0);
      MB.add(CP.rib, brassM(), 0, capY, 0);
      MB.add(capSpike(), brassM(), 0, capY + capH - 0.05, 0, 0, 0, 0, 0.95); }
    // nacelle and axle out to the hub
    const hubY = old ? H + 1.6 : H + 1.2, axL = old ? 5.3 : 3.9;
    const fx = Math.sin(face), fz = Math.cos(face);
    MB.add(boxUV(bbox(1.3, 1.1, axL - 0.6, 0.1, 1), TILE.teal), old ? tm('wood', { color: '#a88870' }) : tealM(), fx * (axL - 0.6) / 2, hubY, fz * (axL - 0.6) / 2, 0, face, 0);
    MB.add(boxUV(bbox(1.42, 0.14, axL - 0.4, 0.04, 1), 1.6), brassM(), fx * (axL - 0.6) / 2, hubY + 0.6, fz * (axL - 0.6) / 2, 0, face, 0);
    MB.add(cyl(0.16, 0.16, axL, 10, 1).rotateX(Math.PI / 2), brassM(), fx * axL / 2, hubY, fz * axL / 2, 0, face, 0);
    // the sail wheel (spins about the axle)
    const Rw = old ? 4.4 : 4.6;
    const pivot = new THREE.Group(); pivot.position.set(fx * axL, hubY, fz * axL); pivot.rotation.y = face; G.add(pivot);
    const spin = new THREE.Group(); spin.rotation.z = r() * 6; pivot.add(spin);
    const WB = new Batch(spin);
    const spokeM = old ? tm('wood', { color: '#b89070' }) : tm('wood', { color: '#d8b898' });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      WB.add(bbox(Rw - 0.3, 0.16, 0.16, 0.03, 1), spokeM, Math.cos(a) * (Rw / 2 + 0.15), Math.sin(a) * (Rw / 2 + 0.15), 0, 0, 0, a);
      WB.add(cached('sail' + Rw, () => {
        const nu = 4, nv = 3, P = [], UV = [], I = [], a0 = 0.06, a1 = 0.62, r0 = 0.9, r1 = Rw - 0.25;
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
          const u = i / nu, v = j / nv, rr = lerp(r0, r1, u), aa = lerp(a0, a1 * (0.75 + 0.25 * u), v);
          P.push(Math.cos(aa) * rr, Math.sin(aa) * rr, 0.06 + v * 0.32 + Math.sin(u * Math.PI) * v * 0.12); UV.push(v, u);
        }
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const q = i * (nv + 1) + j; I.push(q, q + nv + 1, q + 1, q + 1, q + nv + 1, q + nv + 2); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
        return g;
      }), tm(sailTex(old ? '#e4ded4' : '#ece6dc', old ? '#9a8a78' : (m.id === 'east' ? '#4f8a92' : '#c89a4a')), { rough: 0.9, side: THREE.DoubleSide }), 0, 0, 0, 0, 0, a);
    }
    WB.add(cached('rim' + Rw, () => new THREE.TorusGeometry(Rw, 0.08, 6, 48)), old ? spokeM : tealM());
    WB.add(cached('rim2' + Rw, () => new THREE.TorusGeometry(Rw * 0.45, 0.06, 6, 32)), brassM());
    WB.add(cached('hub', () => lathe([[0, -0.3], [0.45, -0.25], [0.5, 0.1], [0.4, 0.4], [0.16, 0.62], [0, 0.66]], 14).rotateX(Math.PI / 2)), brassM());
    WB.build();
    // brake: a round bullseye plate on a lever, linked up the tower to the cap
    const bp = m.brake, rb = Rat(3) + 0.75;
    const bx = Math.sin(bp) * rb, bz = Math.cos(bp) * rb, by = 3.0;
    MB.add(boxUV(bbox(0.16, 0.16, 0.8, 0.03, 1), 1), darkSteel(), Math.sin(bp) * (Rat(3) + 0.3), by - 0.55, Math.cos(bp) * (Rat(3) + 0.3), 0, bp, 0);
    { const rTop = old ? 8.4 : H - 0.5; rod(MB, [Math.sin(bp) * (Rat(3.2) + 0.1), 3.2, Math.cos(bp) * (Rat(3.2) + 0.1)], [Math.sin(bp) * (Rat(rTop) + 0.1), rTop, Math.cos(bp) * (Rat(rTop) + 0.1)], 0.03, brassM(), 6); }
    const lever = new THREE.Group(); lever.position.set(bx, by - 0.55, bz); lever.rotation.y = bp; G.add(lever);
    mesh(lever, cyl(0.05, 0.05, 0.75, 8, 1), brassM(), 0, 0.3, 0);
    mesh(lever, cached('bullring', () => new THREE.TorusGeometry(0.56, 0.07, 8, 28)), brassM(), 0, 0.7, 0.05);
    mesh(lever, cached('bulldisc', () => new THREE.CircleGeometry(0.55, 28)), pm('#ffffff', 0.5, { map: bullseyeTex(), emissive: '#401010', emissiveIntensity: 0.3 }), 0, 0.7, 0.09, 0, { cast: false });
    mesh(lever, cached('bullback', () => cyl(0.55, 0.55, 0.08, 20).rotateX(Math.PI / 2)), darkSteel(), 0, 0.7, 0.02);
    col({ type: 'cyl', x: m.x, z: m.z, r: R0 + 0.05, top: Y0 + H + 3, camSkip: true });
    // the tower and its cap for the camera (VP-10: roomocc.js); the nacelle and the sail wheel are left open, as trees
    { const cy = H + 0.35, prof = old ? [[0.4, cy + 2.7], [R1 * 0.7, cy + 1.6], [R1 + 0.5, cy + 0.05], [R0 + 0.35, 0.55]] : [[0.45, cy + 2.6], [R1 * 0.75, cy + 1.9], [R1 + 0.45, cy + 1.1], [R1 + 0.5, cy + 0.5], [R0 + 0.35, 0.55]];
      roomOcc(R, physics.terrain).add({ kind: 'rev', x: m.x + ox, z: m.z + oz, y0: Y0 - 1, base: Y0, profile: prof, name: 'mill ' + m.id }); }
    // the old mill: stair-stones spiralling up to a wooden balcony gallery
    let top = null;
    if (old) {
      // (CONTROL-FEEL: seven stones 1.09 m apart, and the gallery 1.09 m over the last; it was six 1.25 m apart, made
      // for a jump that rose 1.77 m. LBA2's jump, ours now, rises 1.19 m and takes a ledge ~1.4 m up: a margin kept)
      const phi0 = 0.9, dphi = (30 * Math.PI) / 180, rs = 3.475, balY = 8.75, nS = 7;
      const tops = Array.from({ length: nS }, (_, k) => +((balY * (k + 1)) / (nS + 1)).toFixed(3));
      const stones = [];
      const stone = tm(graniteTex(), { color: '#d8d4ce' });
      tops.forEach((ty, k) => {
        const phi = phi0 + k * dphi, inner = Rat(ty) - 0.25, outer = rs + 0.66, mid = (inner + outer) / 2;
        MB.add(boxUV(bbox(1.5, 0.4, outer - inner, 0.07, 1), 1.2), stone, Math.sin(phi) * mid, ty - 0.2, Math.cos(phi) * mid, 0, phi, 0);
        if (k > 0) MB.add(cached('corbel', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.9, 0); s.quadraticCurveTo(0.2, -0.1, 0, -0.8); s.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); g.translate(0, 0, -0.25); g.rotateY(-Math.PI / 2); return boxUV(g, 1); }), stone, Math.sin(phi) * (Rat(ty) - 0.05), ty - 0.4, Math.cos(phi) * (Rat(ty) - 0.05), 0, phi, 0);
        else MB.add(boxUV(bbox(1.5, ty - 0.4, 1.3, 0.06, 1), 1.2), stone, Math.sin(phi) * rs, (ty - 0.4) / 2, Math.cos(phi) * rs, 0, phi, 0);
        col({ type: 'box', x: m.x + Math.sin(phi) * rs, z: m.z + Math.cos(phi) * rs, hw: 0.75, hd: 0.64, rot: phi, top: Y0 + ty, bottom: k === 0 ? undefined : Y0 + ty - 0.4 });
        stones.push({ x: m.x + ox + Math.sin(phi) * 3.3, y: Y0 + ty, z: m.z + oz + Math.cos(phi) * 3.3 });
      });
      // the gallery: a ring of planks with a gap where the last stones arrive (its planks start just past the last
      // stone's end: a hop up, not a hop up and across — CONTROL-FEEL; it was 0.6 m across)
      const gap0 = phi0 + (nS - 2) * dphi - 0.29, gap1 = phi0 + (nS - 1) * dphi + 0.26;
      const span = Math.PI * 2 - (gap1 - gap0);
      MB.add(lathe([[Rat(balY) - 0.1, -0.3], [4.05, -0.3], [4.12, -0.18], [4.05, 0], [Rat(balY) - 0.1, 0]], 40, TILE.planks, gap1, span), tm('planks', { color: '#d8b898' }), 0, balY, 0);
      const nb = 14;
      for (let j = 0; j <= nb; j++) {
        const a = gap1 + (j / nb) * span;
        MB.add(cached('bpost', () => lathe([[0.05, 0], [0.05, 1.0], [0.08, 1.05], [0, 1.1]], 6)), tm('wood', { color: '#a88060' }), Math.sin(a) * 3.95, balY, Math.cos(a) * 3.95);
        if (j % 2 === 0) MB.add(cached('bcorbel', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.6, 0); s.lineTo(1.6, -0.12); s.quadraticCurveTo(0.4, -0.2, 0, -1.1); s.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); g.translate(0, 0, -0.07); g.rotateY(-Math.PI / 2); return boxUV(g, 1); }), tm('wood', { color: '#8a6850' }), Math.sin(a) * (Rat(balY) - 0.1), balY - 0.3, Math.cos(a) * (Rat(balY) - 0.1), 0, a, 0);
      }
      for (const y of [0.55, 1.02]) MB.add(cached('brail' + y, () => new THREE.TorusGeometry(3.95, 0.04, 5, 40, span).rotateX(Math.PI / 2).rotateY(gap1 - Math.PI / 2 + span * 0 + 0)), tm('wood', { color: '#b89070' }), 0, balY + y, 0);
      const segs = 16;
      for (let j = 0; j < segs; j++) {
        const a = gap1 + ((j + 0.5) / segs) * span, half = (span / segs / 2) * 3.45 * 1.05;
        col({ type: 'box', x: m.x + Math.sin(a) * 3.45, z: m.z + Math.cos(a) * 3.45, hw: half, hd: 0.6, rot: a, top: Y0 + balY, bottom: Y0 + balY - 0.15 });
        // the railing keeps people on the gallery (except at the gap)
        col({ type: 'box', x: m.x + Math.sin(a) * 4.1, z: m.z + Math.cos(a) * 4.1, hw: half * 1.15, hd: 0.08, rot: a, top: Y0 + balY + 1.1, bottom: Y0 + balY - 0.1, noStand: true, seeThrough: true });
      }
      // the gearbox where the cog belongs, on the gallery facing the street
      const ta = 0.0;
      // (stones: where to stand on each stair-stone; landing: the gallery's first planks past the gap — tests/lib/player.js)
      const la = phi0 + (nS - 1) * dphi + 0.5;
      top = { x: m.x + ox + Math.sin(ta) * 3.3, y: Y0 + balY, z: m.z + oz + Math.cos(ta) * 3.3, stones, landing: { x: m.x + ox + Math.sin(la) * 3.4, z: m.z + oz + Math.cos(la) * 3.4 } };
      MB.add(boxUV(bbox(0.9, 0.8, 0.5, 0.06, 1), 1), tm('wood', { color: '#9a7058' }), Math.sin(ta) * (Rat(balY) + 0.15), balY + 0.4, Math.cos(ta) * (Rat(balY) + 0.15), 0, ta, 0);
      MB.add(cached('gbcog', () => { const s = new THREE.Shape(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 0.26 : 0.34; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); return boxUV(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), 0.5); }), darkSteel(), Math.sin(ta) * (Rat(balY) + 0.42) + 0.25, balY + 0.55, Math.cos(ta) * (Rat(balY) + 0.42), 0, ta, 0);
      // stair-stones keep the vegetation off
      keepClear(m.x - 5, m.z - 5, m.x + 5, m.z + 5);
    } else keepClear(m.x - 3.5, m.z - 3.5, m.x + 3.5, m.z + 3.5);
    MB.build();
    // spinning, with a slow wind-down when the brake is pulled
    const dr = Rat(1.1) + 0.75;
    const api = {
      id: m.id, ...W(m.x, m.z), door: W(m.x + Math.sin(doorPhi) * dr, m.z + Math.cos(doorPhi) * dr), brake: { x: m.x + ox + bx, y: Y0 + by + 0.15, z: m.z + oz + bz }, spinning: true, speed: old ? 0.75 : 1.0,
      setSpinning(b) { this.spinning = !!b; },
    };
    const full = api.speed;
    let leverA = 0;
    updaters.push((dt) => {
      const goal = api.spinning ? full : 0;
      api.speed = api.spinning ? Math.min(goal, api.speed + dt * 0.4) : Math.max(0, api.speed - dt * 0.28);
      spin.rotation.z -= api.speed * dt;
      leverA += ((api.spinning ? 0 : 0.9) - leverA) * (1 - Math.exp(-dt * 5));
      lever.rotation.x = leverA;
    });
    return { api, top };
  }

  // ================================================================ the project depot
  function buildDepot() {
    const D = DEPOT;
    const chain = cached('chainMat', () => { const map = textures().chain.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map, color: '#c8d0d4', roughness: 0.5, metalness: 0.5, alphaTest: 0.35, side: THREE.DoubleSide }); });
    const chainGeo = (len, h) => cached(`chain${len.toFixed(2)},${h}`, () => { const g = new THREE.PlaneGeometry(len, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.32, uv.getY(i) * h / 0.32); return g; });
    const fence = (a, b, h = 2.3) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 2.6)), ry = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2;
      const post = cached('fpost' + h, () => compose([[cyl(0.07, 0.07, h + 0.1, 8, 1), 0, (h + 0.1) / 2, 0], [lathe([[0, 0], [0.11, 0], [0.13, 0.08], [0.06, 0.18], [0, 0.2]], 8), 0, h + 0.1, 0], [cyl(0.16, 0.2, 0.25, 8), 0, 0.05, 0]]));
      for (let i = 0; i <= n; i++) B.add(post, tealM(), a[0] + (b[0] - a[0]) * (i / n), Y0 - 0.08, a[1] + (b[1] - a[1]) * (i / n));
      for (let i = 0; i < n; i++) {
        const xm = a[0] + (b[0] - a[0]) * ((i + 0.5) / n), zm = a[1] + (b[1] - a[1]) * ((i + 0.5) / n), sl = len / n;
        B.add(chainGeo(sl - 0.1, h - 0.15), chain, xm, Y0 + 0.08 + (h - 0.15) / 2, zm, 0, ry, 0);
        for (const yy of [0.08, h]) B.add(cyl(0.035, 0.035, sl, 6, 1).rotateZ(Math.PI / 2), brassM(), xm, Y0 + yy, zm, 0, ry, 0);
      }
      col({ type: 'box', x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: len / 2, hd: 0.12, rot: ry, top: Y0 + h + 0.1, seeThrough: true, noStand: true });
    };
    fence([D.x0, D.z0], [D.gate[0], D.z0]);
    fence([D.gate[1], D.z0], [D.x1, D.z0]);
    fence([D.x0, D.z0], [D.x0, D.z1]);
    fence([D.x1, D.z0], [D.x1, D.z1]);
    fence([D.x0, D.z1], [D.x1, D.z1]);
    // gate pillars with project banners
    for (const gx of D.gate) {
      B.add(boxUV(bbox(0.55, 3.0, 0.55, 0.06, 1), TILE.teal), tealM(), gx, Y0 + 1.5, D.z0);
      B.add(cached('gcap', () => lathe([[0, 0], [0.4, 0], [0.4, 0.12], [0.22, 0.3], [0.08, 0.5], [0, 0.55]], 12)), brassM(), gx, Y0 + 3.0, D.z0);
      B.add(cached('gglobe', () => new THREE.SphereGeometry(0.14, 12, 8)), glowCyan(), gx, Y0 + 3.6, D.z0);
      B.add(emq(), emblemMaterial(), gx, Y0 + 2.1, D.z0 - 0.285, 0, Math.PI, 0, 0.42);
      col({ type: 'box', x: gx, z: D.z0, hw: 0.3, hd: 0.3, rot: 0, top: Y0 + 3.0 });
    }
    B.add(boxUV(bbox(D.gate[1] - D.gate[0] + 0.5, 0.3, 0.3, 0.05, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), (D.gate[0] + D.gate[1]) / 2, Y0 + 3.2, D.z0);
    // concrete yard floor
    B.add(slabGeo([[D.x0 + 0.15, D.z0 + 0.15], [D.x1 - 0.15, D.z0 + 0.15], [D.x1 - 0.15, D.z1 - 0.15], [D.x0 + 0.15, D.z1 - 0.15]], 0.04, TILE.concrete), tm('concrete', { color: '#e8dcd8' }), 0, Y0, 0);
    // containers
    const container = (x, z, ry, color) => {
      const C = cached('container', () => {
        const L = 6.0, Wd = 2.44, Hh = 2.6, body = [], frameP = [];
        body.push([boxUV(bbox(L - 0.2, Hh - 0.24, Wd - 0.12, 0.02, 1), 2.6), 0, Hh / 2, 0]);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { frameP.push([bbox(0.16, Hh, 0.16, 0.02, 1), sx * (L / 2 - 0.08), Hh / 2, sz * (Wd / 2 - 0.08)]); frameP.push([bbox(0.2, 0.16, 0.2, 0.02, 1), sx * (L / 2 - 0.09), Hh - 0.08, sz * (Wd / 2 - 0.09)]); }
        for (const s of [-1, 1]) for (const y of [0.1, Hh - 0.1]) frameP.push([bbox(L - 0.3, 0.14, 0.1, 0.02, 1), 0, y, s * (Wd / 2 - 0.05)]);
        for (let xx = -L / 2 + 0.3; xx < L / 2 - 0.25; xx += 0.27) for (const s of [-1, 1]) body.push([boxUV(bbox(0.13, Hh - 0.38, 0.06, 0.015, 1), 2.6), xx, Hh / 2, s * (Wd / 2 - 0.04)]);
        for (const s of [-1, 1]) body.push([boxUV(bbox(0.06, Hh - 0.36, Wd / 2 - 0.16, 0.015, 1), 2.6), L / 2 - 0.02, Hh / 2, s * (Wd / 4 - 0.02)]);
        for (const zz of [-0.85, -0.35, 0.35, 0.85]) body.push([cyl(0.025, 0.025, Hh - 0.3, 6), L / 2 + 0.05, Hh / 2, zz]);
        return { body: compose(body), frame: compose(frameP) };
      });
      B.add(C.body, tm('metal', { color, rough: 0.6, metal: 0.25 }), x, Y0, z, 0, ry, 0);
      B.add(C.frame, tm('metal', { color: new THREE.Color(color).multiplyScalar(0.7).getStyle(), rough: 0.55, metal: 0.3 }), x, Y0, z, 0, ry, 0);
      const f = frame(x, z, ry);
      for (const s of [-1, 1]) { const [ex, ez] = f(0.4, s * 1.245); B.add(emq(), emblemMaterial(), ex, Y0 + 1.4, ez, 0, ry + (s > 0 ? 0 : Math.PI), 0, 1.1); }
      col({ type: 'box', x, z, hw: 3.05, hd: 1.25, rot: ry, top: Y0 + 2.6 });
    };
    // (DEPOT-CORNER, release audit v75: along the back fence the container, the two crate stacks and the shed each left a
    //  slot 0.5–0.7 m wide, narrower than Twinsen (0.8 m): walked into, he was wedged between the fence and a crate and
    //  could not move. Each now stands against the fence (and the west stack against the container's end), so the slots
    //  are shut, and the way between the stacks and the locker stays 1–2 m wide)
    container(8.2, 23.8, 0, '#3a8a86');
    container(22.3, 15.6, Math.PI / 2, '#d86a5a');
    // the teal shed (Zeelich-tech module) in the south-east corner
    {
      const x = 20.6, z = 23.0, w = 4.2, d = 3.6, h = 2.6, G = new THREE.Group(); G.position.set(x, Y0, z); G.rotation.y = Math.PI; group.add(G);
      const SB = new Batch(G);
      const wallM = tm(ribTex(), { rough: 0.5, metal: 0.4, color: '#bcd8d6' });   // (ZSTYLE-2: ribbed teal-grey sheet, not plain painted steel)
      SB.add(boxUV(bbox(w + 0.3, 0.3, d + 0.3, 0.05, 1), TILE.concrete), tm('concrete', { color: '#d8d0cc' }), 0, 0.13, 0);
      const door = { x: -0.6, y: 0.02, w: 1.1, h: 2.1 }, win = { x: 1.1, y: 1.2, w: 0.7, h: 0.7, round: true };
      SB.add(panelGeo(w, h, 0.2, [door, win], TILE.teal), wallM, 0, 0.28, d / 2 - 0.2);
      SB.add(panelGeo(w, h, 0.2, [], TILE.teal), wallM, 0, 0.28, -d / 2);
      for (const s of [-1, 1]) SB.add(panelGeo(d - 0.4, h, 0.2, [], TILE.teal), wallM, s * (w / 2 - 0.1), 0.28, 0, 0, s * Math.PI / 2, 0);
      SB.add(bbox(1.06, 2.08, 0.06, 0.02, 1), tm('teal', { color: '#8ab4b4', rough: 0.5, metal: 0.35 }), -0.6, 1.33, d / 2 - 0.12);
      SB.add(cached('shport', () => new THREE.TorusGeometry(0.37, 0.06, 8, 22)), brassM(), 1.1, 1.83, d / 2 + 0.03);
      SB.add(cached('shportg', () => new THREE.CircleGeometry(0.36, 18)), pm('#7fd8e8', 0.12, { metalness: 0.3, emissive: '#3ab8d0', emissiveIntensity: 0.35 }), 1.1, 1.83, d / 2 - 0.1);
      for (const [fx, fy, fw, fh] of [[-1.17, 1.35, 0.14, 2.3], [-0.03, 1.35, 0.14, 2.3], [-0.6, 2.47, 1.3, 0.14]]) SB.add(boxUV(bbox(fw, fh, 0.08, 0.02, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), fx, fy, d / 2 + 0.02);
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) SB.add(bbox(0.3, h + 0.1, 0.3, 0.05, 1), brassM(), cx * (w / 2 - 0.05), 0.28 + h / 2, cz * (d / 2 - 0.05));
      const rise = 0.6, a = w / 2 + 0.3;
      SB.add(cached('shroof', () => { const s = new THREE.Shape(); s.moveTo(-a, 0); s.quadraticCurveTo(0, 2 * rise, a, 0); s.lineTo(a, -0.14); s.quadraticCurveTo(0, 2 * rise - 0.14, -a, -0.14); s.lineTo(-a, 0); const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.6, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -(d + 0.6) / 2); return boxUV(g, TILE.brass); }), tm('brass', { rough: 0.45, metal: 0.6, color: '#d8c8a8' }), 0, 0.28 + h + 0.08, 0);
      SB.add(cached('shend', () => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.quadraticCurveTo(0, 2 * (rise - 0.1), w / 2, 0); s.lineTo(-w / 2, 0); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -d / 2); return boxUV(g, TILE.teal); }), wallM, 0, 0.28 + h + 0.06, 0);
      SB.add(emq(), emblemMaterial(), 0, 0.28 + h + 0.32, d / 2 + 0.02, 0, 0, 0, 0.5);
      SB.build();
      col({ type: 'box', x, z, hw: w / 2 + 0.2, hd: d / 2 + 0.2, rot: 0, top: Y0 + h + 1 });
    }
    // the locker at the back (code cylinder inside): teal steel, brass trim, two doors, an emblem
    const LK = { x: 15.2, z: D.z1 - 0.65 };
    {
      const G = new THREE.Group(); G.position.set(LK.x, Y0, LK.z); G.rotation.y = Math.PI; group.add(G);
      const LB = new Batch(G);
      LB.add(boxUV(bbox(1.5, 2.1, 0.7, 0.05, 1), TILE.teal), tealM(), 0, 1.15, 0);
      LB.add(boxUV(bbox(1.62, 0.12, 0.8, 0.03, 1), 1), brassM(), 0, 2.24, 0);
      LB.add(boxUV(bbox(1.62, 0.12, 0.8, 0.03, 1), 1), brassM(), 0, 0.08, 0);
      for (const s of [-1, 1]) {
        LB.add(boxUV(bbox(0.68, 1.88, 0.05, 0.02, 1), TILE.teal), tm('teal', { color: '#a8d0cc', rough: 0.5, metal: 0.35 }), s * 0.36, 1.15, 0.36);
        for (let k = 0; k < 4; k++) LB.add(bbox(0.42, 0.03, 0.03, 0.01, 1), darkSteel(), s * 0.36, 1.8 + k * 0.07, 0.4);
        LB.add(bbox(0.05, 0.22, 0.05, 0.015, 1), brassM(), s * 0.08, 1.15, 0.42);
      }
      LB.add(cached('lock', () => cyl(0.09, 0.09, 0.06, 14).rotateX(Math.PI / 2)), brassM(), 0, 1.4, 0.4);
      LB.add(cached('lockled', () => new THREE.SphereGeometry(0.035, 8, 6)), pm('#ff8070', 0.3, { emissive: '#ff3020', emissiveIntensity: 2.4 }), 0, 1.55, 0.41);
      LB.add(emq(), emblemMaterial(), 0, 0.7, 0.4, 0, 0, 0, 0.4);
      LB.build();
      col({ type: 'box', x: LK.x, z: LK.z, hw: 0.8, hd: 0.4, rot: 0, top: Y0 + 2.3, noStand: true });
    }
    // crates, tech crates, barrels, floodlight masts
    techCrates([[5.4, 11.0, 2, 0.9], [6.5, 10.6, 1, 0.8], [17.6, 24.45, 1, 0.9], [11.75, 24.5, 2, 0.85]]);
    const barrel = cached('zbarrel', () => { const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push([0.32 + Math.sin(k * Math.PI) * 0.06, k * 0.95]); } return compose([[lathe(pts, 14, 1)], [new THREE.CircleGeometry(0.33, 14).rotateX(-Math.PI / 2), 0, 0.95, 0]]); });
    for (const [x, z] of [[4.9, 13.0], [5.1, 13.8], [23.0, 10.4], [22.3, 10.2]]) { placeTag('barrel'); B.add(barrel, tm('metal', { color: '#e8b84a', rough: 0.6, metal: 0.3 }), x, Y0, z); col({ type: 'cyl', x, z, r: 0.4, top: Y0 + 0.95, noStand: true, seeThrough: true }); }
    for (const [x, z] of [[4.6, 24.6], [23.4, 9.6]]) {
      placeTag('floodMast');
      B.add(lathe([[0, 0], [0.4, 0], [0.4, 0.12], [0.15, 0.2], [0.1, 6.5], [0.15, 6.6], [0, 6.65]], 12, TILE.teal), tealM(), x, Y0, z);
      B.add(bbox(1.4, 0.12, 0.16, 0.03, 1), brassM(), x, Y0 + 6.5, z, 0, Math.atan2(14 - x, 17 - z) + Math.PI / 2, 0);
      for (const s of [-0.5, 0.5]) { const a = Math.atan2(14 - x, 17 - z); B.add(cached('flood', () => lathe([[0, 0], [0.12, 0], [0.18, 0.18], [0.18, 0.22], [0, 0.22]], 12).rotateX(Math.PI / 2 + 0.5)), brassM(), x + Math.cos(a) * s, Y0 + 6.72, z - Math.sin(a) * s, 0, a, 0); B.add(cached('floodL', () => new THREE.CircleGeometry(0.17, 14).translate(0, 0, 0.225).rotateX(0.5)), pm('#fffbe8', 0.3, { emissive: '#fff4c8', emissiveIntensity: 2.0 }), x + Math.cos(a) * s, Y0 + 6.72, z - Math.sin(a) * s, 0, a, 0); }
      col({ type: 'cyl', x, z, r: 0.4, top: Y0 + 6.5, seeThrough: true });
    }
    placeTag(null);
    keepClear(D.x0 - 1, D.z0 - 1, D.x1 + 1, D.z1 + 1);
    const patrol = [[7.2, 13.8], [13.5, 12.2], [18.6, 12.8], [18.8, 19.2], [13.2, 20.6], [7.4, 19.0]];
    return { ...W((D.x0 + D.x1) / 2, (D.z0 + D.z1) / 2), patrol: patrol.map(([x, z]) => [x + ox, z + oz]), locker: W(LK.x, LK.z - 0.75) };
  }

  // ================================================================ the drill platform, its gate and shield
  function buildPlatform() {
    let consoleStop = null;   // (CAMPAIGN-7: the bore's stop on the console)
    const PB = new Batch(group);
    // deck: octagon with the shaft hole; teal skirt, hazard edge, brass trim
    const hole = new THREE.Path(); hole.absarc(PAD.x, -PAD.z, SHAFT_R, 0, Math.PI * 2, true);
    PB.add(slabGeo(PLATFORM, 0.5, TILE.deck, [hole]), tm('deck', { color: '#e4e2e8', rough: 0.65, metal: 0.25 }), 0, DECK - 0.5, 0);   // (ZSTYLE-1: LBA2's lavender-grey deck plate, paler)
    const outlineRing = chaikin(PLATFORM, 0).map(([x, z]) => [x, z]);
    const skirt = (P, y0, y1, out, mat, tile) => {
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        if (a[0] === 40 && b[0] === 40) continue;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2;
        const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
        PB.add(boxUV(bbox(len + 0.1, y1 - y0, 0.2, 0.04, 1), tile), mat, (a[0] + b[0]) / 2 - nx * out, (y0 + y1) / 2, (a[1] + b[1]) / 2 - nz * out, 0, ry, 0);
      }
    };
    skirt(outlineRing, DECK - 1.6, DECK - 0.45, 0.02, tealM(), TILE.teal);
    skirt(outlineRing, DECK - 0.45, DECK - 0.1, 0.04, tm('hazard', { rough: 0.6 }), TILE.hazard);
    // trusses under the deck, down into the clouds, and struts back to the cliff
    for (const [x, z] of [[44, -8], [44, 8], [52, -9], [52, 9], [58, -4], [58, 4], [48, 0]]) {
      PB.add(lathe([[0.55, 0], [0.55, 0.3], [0.4, 0.4], [0.4, 15], [0, 15]], 12, TILE.teal), tealM(), x, DECK - 16.5, z);
      for (const y of [-4, -9, -14]) PB.add(cached('trband', () => new THREE.TorusGeometry(0.45, 0.07, 6, 16).rotateX(Math.PI / 2)), brassM(), x, DECK + y, z);
    }
    for (const [a, b] of [[[44, -8], [52, -9]], [[44, 8], [52, 9]], [[52, -9], [58, -4]], [[52, 9], [58, 4]], [[44, -8], [44, 8]], [[58, -4], [58, 4]]]) {
      member(PB, [a[0], DECK - 1.7, a[1]], [b[0], DECK - 6.5, b[1]], 0.22, brassM(), 1, 0.04);
      member(PB, [b[0], DECK - 1.7, b[1]], [a[0], DECK - 6.5, a[1]], 0.22, brassM(), 1, 0.04);
    }
    for (const z of [-6, 6]) member(PB, [41, DECK - 1.5, z], [34.5, Y0 - 8, z * 1.3], 0.3, tealM(), 1, 0.05);
    // railing around the deck (open on the neck side)
    const rail = (a, b) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 1.5)), ry = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2;
      for (let i = 0; i <= n; i++) PB.add(cached('prpost', () => lathe([[0.06, 0], [0.06, 1.0], [0.09, 1.05], [0, 1.1]], 8)), tealM(), a[0] + (b[0] - a[0]) * (i / n), DECK, a[1] + (b[1] - a[1]) * (i / n));
      for (const y of [0.5, 1.02]) PB.add(cyl(y > 1 ? 0.05 : 0.03, y > 1 ? 0.05 : 0.03, len, 6, 1).rotateZ(Math.PI / 2), brassM(), (a[0] + b[0]) / 2, DECK + y, (a[1] + b[1]) / 2, 0, ry, 0);
      col({ type: 'box', x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: len / 2, hd: 0.1, rot: ry, top: DECK + 1.1, noStand: true, seeThrough: true });
    };
    const inset = PLATFORM.map(([x, z]) => [x + (x < 50 ? 0.25 : -0.25), z + (z < 0 ? 0.25 : -0.25)]);
    for (let i = 0; i < inset.length; i++) { const a = inset[i], b = inset[(i + 1) % inset.length]; if (PLATFORM[i][0] === 40 && PLATFORM[(i + 1) % inset.length][0] === 40) continue; rail(a, b); }
    for (const s of [-1, 1]) rail([40.25, s * 7.25], [40.25, s * 6.2]);
    // walkable deck around the shaft, and the neck step
    const P2 = PLATFORM;
    for (let x = 40.05; x < 60.2; x += 1) {
      const xa = x, xb = Math.min(x + 1, 60.2), xm = (xa + xb) / 2;
      const I = zIntervals(P2, xa + 0.01)[0], J = zIntervals(P2, xb - 0.01)[0];
      if (!I || !J) continue;
      const lo = Math.max(I[0], J[0]) + 0.35, hi = Math.min(I[1], J[1]) - 0.35;
      const dx = xa <= PAD.x && xb >= PAD.x ? 0 : Math.min(Math.abs(xa - PAD.x), Math.abs(xb - PAD.x));
      const ext = dx < SHAFT_R ? Math.sqrt(SHAFT_R * SHAFT_R - dx * dx) : 0;
      const ivs = ext > 0 ? [[lo, PAD.z - ext], [PAD.z + ext, hi]] : [[lo, hi]];
      for (const [l, h] of ivs) if (h - l > 0.3) col({ type: 'box', x: xm, z: (l + h) / 2, hw: (xb - xa) / 2 + 0.08, hd: (h - l) / 2, rot: 0, top: DECK, seeThrough: true });
    }
    // the shaft: glowing rings going down, a bore glow at the bottom
    mesh(group, cyl(SHAFT_R, SHAFT_R, 14, 24, 2, true), tm('teal', { color: '#5a8a90', rough: 0.5, metal: 0.4, side: THREE.BackSide }), PAD.x, DECK - 7, PAD.z, 0, { cast: false });
    for (let k = 1; k <= 5; k++) PB.add(cached('shring', () => new THREE.TorusGeometry(SHAFT_R - 0.05, 0.06, 6, 30).rotateX(Math.PI / 2)), glowCyan(), PAD.x, DECK - k * 2.3, PAD.z);
    PB.add(cached('bore', () => new THREE.CircleGeometry(SHAFT_R, 24).rotateX(-Math.PI / 2)), pm('#bff8ff', 0.3, { emissive: '#40e0ff', emissiveIntensity: 2.6 }), PAD.x, DECK - 13.5, PAD.z);
    PB.add(cached('shlip', () => lathe([[SHAFT_R - 0.02, -0.1], [SHAFT_R + 0.35, -0.1], [SHAFT_R + 0.35, 0.06], [SHAFT_R - 0.02, 0.06]], 32)), brassM(), PAD.x, DECK, PAD.z);
    // the lift pad
    const pad = new THREE.Group(); pad.position.set(PAD.x, DECK, PAD.z); group.add(pad);
    mesh(pad, cached('padtop', () => lathe([[0, -0.3], [PAD.r, -0.3], [PAD.r + 0.05, -0.05], [PAD.r - 0.05, 0.02], [0, 0.02]], 32)), tm('deck', { color: '#c8c8cc', rough: 0.6, metal: 0.3 }));
    mesh(pad, cached('padring', () => new THREE.RingGeometry(PAD.r - 0.35, PAD.r - 0.08, 32).rotateX(-Math.PI / 2)), tm('hazard', { rough: 0.6 }), 0, 0.03, 0, 0, { cast: false });
    mesh(pad, cached('padem', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), emblemMaterial(), 0, 0.04, 0, 0, { cast: false });
    for (let k = 0; k < 4; k++) mesh(pad, cached('padrail', () => cyl(0.06, 0.06, 1.0, 8, 1)), brassM(), Math.sin(k * Math.PI / 2 + 0.6) * (PAD.r - 0.12), 0.5, Math.cos(k * Math.PI / 2 + 0.6) * (PAD.r - 0.12));
    const padCol = col({ type: 'cyl', x: PAD.x, z: PAD.z, r: SHAFT_R + 0.15, top: DECK, seeThrough: true }); // overlaps the deck: no gap to fall in
    // the derrick over the shaft: four lattice legs, girts, X braces, crown block, a hanging top drive
    const dH = 15, legB = 3.4, legT = 0.7;
    const leg = (sx, sz, y) => [PAD.x + sx * lerp(legB, legT, y / dH), DECK + y, PAD.z + sz * lerp(legB, legT, y / dH)];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sz] of corners) { member(PB, leg(sx, sz, 0), leg(sx, sz, dH), 0.28, tealM(), 1, 0.04); PB.add(boxUV(bbox(0.8, 0.4, 0.8, 0.05, 1), TILE.concrete), tm('concrete', { color: '#d8d0d4' }), PAD.x + sx * legB, DECK + 0.2, PAD.z + sz * legB); col({ type: 'box', x: PAD.x + sx * legB, z: PAD.z + sz * legB, hw: 0.4, hd: 0.4, rot: 0, top: DECK + dH, seeThrough: true }); }
    for (let y = 3; y <= dH; y += 3) for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      member(PB, leg(ax, az, y), leg(bx, bz, y), 0.16, brassM(), 1, 0.03);
      if (y > 3 || i % 2 === 0) { member(PB, leg(ax, az, y - 3), leg(bx, bz, y), 0.1, darkSteel(), 1, 0.02); member(PB, leg(bx, bz, y - 3), leg(ax, az, y), 0.1, darkSteel(), 1, 0.02); }
    }
    PB.add(boxUV(bbox(2.2, 0.9, 2.2, 0.1, 1), TILE.brass), brassM(), PAD.x, DECK + dH + 0.45, PAD.z);
    PB.add(cached('sheave', () => new THREE.TorusGeometry(0.55, 0.12, 8, 20)), darkSteel(), PAD.x, DECK + dH + 1.2, PAD.z);
    PB.add(cached('beacon', () => new THREE.SphereGeometry(0.2, 12, 8)), pm('#ff9080', 0.3, { emissive: '#ff4030', emissiveIntensity: 2.4 }), PAD.x, DECK + dH + 1.9, PAD.z);
    PB.add(emq(), emblemMaterial(), PAD.x, DECK + dH + 0.45, PAD.z + 1.12, 0, 0, 0, 0.8);
    PB.add(emq(), emblemMaterial(), PAD.x - 1.12, DECK + dH + 0.45, PAD.z, 0, -Math.PI / 2, 0, 0.8);
    for (const s of [-0.25, 0.25]) rod(PB, [PAD.x + s, DECK + dH, PAD.z], [PAD.x + s, DECK + 7.3, PAD.z], 0.025, darkSteel(), 5);
    const drive = new THREE.Group(); drive.position.set(PAD.x, DECK + 6.4, PAD.z); group.add(drive);
    mesh(drive, boxUV(bbox(1.2, 1.4, 1.0, 0.1, 1), TILE.teal), tealM(), 0, 0.2, 0);
    mesh(drive, cached('drvcap', () => lathe([[0, 0], [0.5, 0], [0.3, 0.4], [0, 0.45]], 12)), brassM(), 0, 0.9, 0);
    mesh(drive, cyl(0.16, 0.16, 1.4, 12, 1), tm('pipe', { rough: 0.5, metal: 0.35 }), 0, -1.1, 0);
    mesh(drive, cached('drbit', () => lathe([[0.16, 0], [0.32, -0.1], [0.36, -0.4], [0.12, -0.75], [0, -0.85]], 12)), brassM(), 0, -1.8, 0);
    // pipe rack, drill motor housing, tanks, a control hut, floodlight masts, the big emblem
    for (let k = 0; k < 7; k++) PB.add(cyl(0.16, 0.16, 6.5, 10, 1).rotateZ(Math.PI / 2), tm('pipe', { rough: 0.5, metal: 0.35 }), 52.5, DECK + 0.62 + Math.floor(k / 4) * 0.3, 7.2 + (k % 4) * 0.34 + Math.floor(k / 4) * 0.17);
    for (const x of [49.6, 55.4]) PB.add(boxUV(bbox(0.3, 0.5, 1.8, 0.04, 1), 1), darkSteel(), x, DECK + 0.25, 7.7);
    col({ type: 'box', x: 52.5, z: 7.7, hw: 3.3, hd: 1.0, rot: 0, top: DECK + 1.2, noStand: false });
    PB.add(boxUV(bbox(3.0, 2.2, 2.2, 0.15, 1), TILE.teal), tealM(), 56.3, DECK + 1.1, -1.0);
    PB.add(lathe([[0, 0], [0.9, 0], [0.9, 1.6], [0.75, 1.8], [0, 1.85]], 18, TILE.brass), brassM(), 56.3, DECK + 2.2, -1.0, 0, 0, Math.PI / 2);
    PB.add(emq(), emblemMaterial(), 54.79, DECK + 1.2, -1.0, 0, -Math.PI / 2, 0, 1.1);
    col({ type: 'box', x: 56.3, z: -1.0, hw: 1.7, hd: 1.2, rot: 0, top: DECK + 3.2 });
    for (const [x, z] of [[57.4, 6.6], [57.4, 3.6]]) { PB.add(lathe([[0, 0], [1.0, 0], [1.0, 2.6], [0.8, 2.9], [0.3, 3.05], [0, 3.1]], 20, TILE.teal), tealM(), x, DECK, z); PB.add(cached('tkband', () => new THREE.TorusGeometry(1.02, 0.06, 6, 24).rotateX(Math.PI / 2)), brassM(), x, DECK + 1.2, z); col({ type: 'cyl', x, z, r: 1.05, top: DECK + 3.1 }); }
    {
      const hx = 52.8, hz = -8.3, w = 4.0, d = 2.8, h = 2.5, G = new THREE.Group(); G.position.set(hx, DECK, hz); group.add(G);
      const HB = new Batch(G);
      const wallM = tm('teal', { rough: 0.6, metal: 0.25, color: '#e8f4f2' });
      const door = { x: 1.0, y: 0.02, w: 1.0, h: 2.05 }, w1 = { x: -0.8, y: 1.0, w: 1.4, h: 0.8 };
      HB.add(panelGeo(w, h, 0.2, [door, w1], TILE.teal), wallM, 0, 0, d / 2 - 0.2);
      HB.add(panelGeo(w, h, 0.2, [], TILE.teal), wallM, 0, 0, -d / 2);
      for (const s of [-1, 1]) HB.add(panelGeo(d - 0.4, h, 0.2, [], TILE.teal), wallM, s * (w / 2 - 0.1), 0, 0, 0, s * Math.PI / 2, 0);
      HB.add(bbox(1.4, 0.8, 0.04, 0.01, 1), pm('#7fd8e8', 0.12, { metalness: 0.3, emissive: '#3ab8d0', emissiveIntensity: 0.5 }), -0.8, 1.4, d / 2 - 0.1);
      HB.add(bbox(0.96, 2.04, 0.06, 0.02, 1), tm('teal', { color: '#8ab4b4', rough: 0.5, metal: 0.35 }), 1.0, 1.04, d / 2 - 0.12);
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) HB.add(bbox(0.28, h + 0.1, 0.28, 0.05, 1), brassM(), cx * (w / 2 - 0.05), h / 2, cz * (d / 2 - 0.05));
      HB.add(boxUV(bbox(w + 0.5, 0.2, d + 0.5, 0.06, 1), TILE.brass), brassM(), 0, h + 0.1, 0);
      HB.add(cached('dish', () => lathe([[0, 0], [0.3, 0.02], [0.55, 0.12], [0.66, 0.22], [0.64, 0.24], [0.52, 0.14], [0.28, 0.05], [0, 0.04]], 18)), tm('concrete', { color: '#f4f0ea', rough: 0.5 }), 1.0, h + 0.75, 0, -0.8, 2.6, 0);
      HB.add(cyl(0.05, 0.07, 0.6, 8, 1), darkSteel(), 1.0, h + 0.4, 0);
      HB.build();
      col({ type: 'box', x: hx, z: hz, hw: w / 2 + 0.15, hd: d / 2 + 0.15, rot: 0, top: DECK + h + 0.3 });
    }
    PB.add(cached('bigem', () => new THREE.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2)), pm('#2f7a84', 0.6, { metalness: 0.3 }), 44.3, DECK + 0.012, 0);
    PB.add(cached('bigemq', () => new THREE.PlaneGeometry(3.6, 3.6).rotateX(-Math.PI / 2)), emblemMaterial(), 44.3, DECK + 0.02, 0, 0, -Math.PI / 2, 0);
    // the gate across the neck: pylons, solid walls to the rim, a hazard lintel
    const gx = GATE.x;
    for (const s of [-1, 1]) {
      const pz = s * GATE.half;
      PB.add(lathe([[0.7, 0], [0.7, 0.4], [0.55, 0.5], [0.45, 4.2], [0.6, 4.35], [0.6, 4.6], [0.3, 4.9], [0, 5.0]], 16, TILE.teal), tealM(), gx, Y0, pz);
      for (const y of [1.0, 2.2, 3.4]) PB.add(cached('pyband', () => new THREE.TorusGeometry(0.5, 0.07, 6, 18).rotateX(Math.PI / 2)), brassM(), gx, Y0 + y, pz);
      PB.add(cached('emit', () => new THREE.SphereGeometry(0.32, 16, 12)), glowCyan(), gx, Y0 + 5.15, pz);
      PB.add(cached('emitr', () => new THREE.TorusGeometry(0.4, 0.05, 6, 20)), brassM(), gx, Y0 + 5.15, pz, Math.PI / 2, 0, 0);
      col({ type: 'cyl', x: gx, z: pz, r: 0.72, top: Y0 + 5.0 });
      // wall from the pylon to the rim
      const z0 = s * (GATE.half + 0.5), z1 = s * GATE.wall, len = Math.abs(z1 - z0);
      PB.add(panelGeo(len, 2.9, 0.4, [{ x: 0, y: 1.2, w: 0.7, h: 0.7, round: true }], TILE.teal), tm('teal', { rough: 0.6, metal: 0.25, color: '#d8ece8' }), gx - 0.2, Y0, (z0 + z1) / 2, 0, Math.PI / 2, 0);
      PB.add(cached('wport', () => new THREE.TorusGeometry(0.38, 0.06, 8, 20)), brassM(), gx - 0.24, Y0 + 1.55, (z0 + z1) / 2, 0, -Math.PI / 2, 0);
      PB.add(boxUV(bbox(0.6, 0.2, len + 0.2, 0.05, 1), TILE.brass), brassM(), gx, Y0 + 3.0, (z0 + z1) / 2);
      PB.add(boxUV(bbox(0.5, 0.3, len, 0.03, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), gx, Y0 + 0.15, (z0 + z1) / 2);
      PB.add(boxUV(bbox(0.6, 3.2, 0.6, 0.06, 1), TILE.teal), tealM(), gx, Y0 + 1.6, z1);
      col({ type: 'box', x: gx, z: (z0 + z1) / 2, hw: 0.3, hd: len / 2 + 0.1, rot: 0, top: Y0 + 3.1 });
    }
    PB.add(boxUV(bbox(0.7, 0.45, GATE.half * 2 + 0.8, 0.06, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), gx, Y0 + 4.55, 0);
    PB.add(boxUV(bbox(0.8, 0.14, GATE.half * 2 + 1.0, 0.04, 1), 1.6), brassM(), gx, Y0 + 4.85, 0);
    PB.add(emq(), emblemMaterial(), gx - 0.36, Y0 + 4.55, 0, 0, -Math.PI / 2, 0, 0.75);
    // the neck step up onto the deck
    // (WORLD-FIX: 12 mm under the deck's top, which it shared where they overlap: z-fighting)
    PB.add(boxUV(bbox(1.2, DECK - Y0 - 0.012, 11.6, 0.03, 1), TILE.deck), tm('deck', { color: '#e4e2e8', rough: 0.65, metal: 0.25 }), 40.0, Y0 + (DECK - Y0 - 0.012) / 2, 0);
    col({ type: 'box', x: 39.9, z: 0, hw: 0.5, hd: 5.6, rot: 0, top: DECK, seeThrough: true });
    // console at the gate (outside, on the island side)
    const CX = 34.9, CZ = -4.3;
    {
      const G = new THREE.Group(); G.position.set(CX, Y0, CZ); G.rotation.y = -Math.PI / 2 + 0.35; group.add(G);
      const CB = new Batch(G);
      CB.add(boxUV(bbox(1.5, 1.0, 0.7, 0.08, 1), TILE.teal), tealM(), 0, 0.5, 0);
      CB.add(boxUV(bbox(1.6, 0.1, 0.9, 0.03, 1), 1), brassM(), 0, 1.02, 0.08, -0.35, 0, 0);
      CB.add(boxUV(bbox(1.2, 0.75, 0.12, 0.04, 1), 1), darkSteel(), 0, 1.55, -0.25, -0.15, 0, 0);
      CB.add(cached('cscreen', () => new THREE.PlaneGeometry(1.05, 0.6)), pm('#7ff8ff', 0.3, { emissive: '#30c8f0', emissiveIntensity: 1.4 }), 0, 1.56, -0.18, -0.15, 0, 0);
      for (let k = 0; k < 3; k++) { CB.add(cyl(0.025, 0.025, 0.3, 6, 1), darkSteel(), -0.45 + k * 0.3, 1.2, 0.2, 0.4, 0, 0); CB.add(cached('knobr', () => new THREE.SphereGeometry(0.06, 8, 6)), pm(['#e04030', '#e8b84a', '#40c060'][k], 0.4, { emissive: ['#802010', '#806010', '#106030'][k] }), -0.45 + k * 0.3, 1.33, 0.26); }
      // CAMPAIGN-7 (wave 5, chapter 9): the bore's STOP on the desk's right end, and two dials on the screen's frame, BORE and
      // GROUND (their faces in the batch; the lever and the two needles move: story/cnline.js)
      CB.add(boxUV(bbox(0.2, 0.06, 0.16, 0.02, 1), 1), darkSteel(), 0.55, 1.1, 0.12, -0.35, 0, 0);
      const dialFace = cached('cndial', () => new THREE.CircleGeometry(0.11, 20));
      const dialM = new THREE.MeshStandardMaterial({ color: '#f2ecdc', roughness: 0.6, map: (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#f2ecdc'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#2a2a2a'; x.lineWidth = 3; x.fillStyle = '#2a2a2a'; x.font = 'bold 15px sans-serif'; x.textAlign = 'center'; [['BORE', 64], ['GROUND', 192]].forEach(([l, cx]) => { for (let v = 0; v <= 6; v++) { const a = Math.PI * (1.15 + v * 0.117); x.beginPath(); x.moveTo(cx + Math.cos(a) * 40, 64 + Math.sin(a) * 40); x.lineTo(cx + Math.cos(a) * 52, 64 + Math.sin(a) * 52); x.stroke(); } x.fillText(l, cx, 100); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() });
      for (const [dx, u] of [[-0.3, 0], [0.3, 0.5]]) { const gq = dialFace.clone(); const uv = gq.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, u + uv.getX(i) * 0.5); CB.add(gq, dialM, dx, 1.62, -0.165, -0.15, 0, 0); }
      CB.build();
      col({ type: 'box', x: CX, z: CZ, hw: 0.8, hd: 0.45, rot: -Math.PI / 2 + 0.35, top: Y0 + 1.1, noStand: true, seeThrough: true });
      const stopL = new THREE.Group(); stopL.position.set(0.55, 1.13, 0.12); G.add(stopL);
      const nM = pm('#2a2a2a', 0.6);
      stopL.add(new THREE.Mesh(cached('cnlev', () => { const gq = new THREE.CylinderGeometry(0.018, 0.018, 0.24, 6); gq.translate(0, 0.12, 0); return gq; }), darkSteel()));
      const knobS = new THREE.Mesh(cached('knobr', () => new THREE.SphereGeometry(0.06, 8, 6)), pm('#e04030', 0.4, { emissive: '#802010' })); knobS.position.y = 0.25; stopL.add(knobS);
      const needles = [-0.3, 0.3].map((dx) => { const nd = new THREE.Mesh(cached('cnneedle', () => { const gq = new THREE.BoxGeometry(0.008, 0.085, 0.004); gq.translate(0, 0.04, 0); return gq; }), nM); nd.position.set(dx, 1.62 - 0.01, -0.15); nd.rotation.x = -0.15; G.add(nd); return nd; });
      for (const o of [stopL, ...needles]) o.traverse((m) => { if (m.isMesh) m.castShadow = false; });
      const rot = G.rotation.y, c0 = Math.cos(rot), s0 = Math.sin(rot);
      const loc = (lx, lz) => W(CX + lx * c0 + lz * s0, CZ - lx * s0 + lz * c0);   // (a point of the console's own frame, in the world)
      const lp = loc(0.55, 0.12);
      // (he faces the console's back, its −z: in the world the way its frame's −z points)
      consoleStop = { ...touch(lp.x, lp.z, Math.atan2(-s0, -c0), 'tinker'), thrown: false, loose: false, t: 0,
        set(thrown, loose) { this.thrown = !!thrown; this.loose = !!loose; } };
      updaters.push((dt, t) => {
        const S = consoleStop;
        stopL.rotation.x += ((S.thrown ? 0.9 : -0.5) - stopL.rotation.x) * Math.min(1, dt * 10);
        // BORE: steady near the top while the drill runs, falls to nothing once stopped; GROUND: three kicks and a rest
        const bore = S.thrown ? -1.1 : 0.5 + Math.sin(t * 7) * 0.03;
        needles[0].rotation.z += (-bore - needles[0].rotation.z) * Math.min(1, dt * (S.thrown ? 2.5 : 8));
        const ph = t % 2.4, kick = S.loose && ph < 0.75 ? Math.abs(Math.sin((ph / 0.25) * Math.PI)) : 0;
        needles[1].rotation.z = 1.0 - kick * 1.6;
      });
    }
    PB.build();
    // the shield: a curved translucent energy wall between the pylons
    const shieldMat = new THREE.MeshBasicMaterial({ map: shieldTex(), color: '#8ff4ff', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
    shieldMat.map = shieldMat.map.clone(); shieldMat.map.needsUpdate = true; shieldMat.map.repeat.set(3, 2);
    const sR = 3.6, sA = Math.asin(GATE.half / sR);
    const shGeo = new THREE.CylinderGeometry(sR, sR, 4.8, 24, 1, true, -Math.PI / 2 - sA, sA * 2);
    const shield = mesh(group, shGeo, shieldMat, gx + Math.cos(sA) * sR - 0.1, Y0 + 2.4, 0, 0, { cast: false });
    shield.renderOrder = 5;
    const capGeo = new THREE.SphereGeometry(sR, 24, 8, -Math.PI / 2 - sA + Math.PI / 2 * 0, sA * 2, 0, 0.5);
    void capGeo;
    const shieldCol = col({ type: 'box', x: gx, z: 0, hw: 0.45, hd: GATE.half + 0.2, rot: 0, top: Y0 + 6, seeThrough: true, noStand: true });
    const shieldApi = {
      on: true,
      setOn(b) { this.on = !!b; shieldCol.enabled = this.on; if (this.on) shield.visible = true; },
    };
    let fade = 1;
    updaters.push((dt, t) => {
      fade += ((shieldApi.on ? 1 : 0) - fade) * (1 - Math.exp(-dt * 6));
      shield.visible = fade > 0.02;
      shieldMat.opacity = fade * (0.55 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 17) * 0.04);
      shieldMat.map.offset.y = -t * 0.12;
      drive.rotation.y = t * 0.6;
    });
    // the lift: pad + whoever stands on it sinks 8 m into the shaft over ~3 s
    const lift = {
      busy: false, down: false,
      // lower(cb, actor?): the pad sinks with the hero (if standing on it) and `actor` (e.g. Vesk, or a list)
      lower(cb, riders) {
        if (this.busy) return;
        this.busy = true;
        const G = globalThis.game;
        const extra = riders ? (Array.isArray(riders) ? riders : [riders]) : [];
        const onPad = (a) => a && a.pos && Math.hypot(a.pos.x - (PAD.x + ox), a.pos.z - (PAD.z + oz)) < PAD.r + 0.3 && Math.abs(a.pos.y - padCol.top) < 0.8;
        const who = [...new Set(extra.filter((a) => a && a.pos).concat([G?.hero].filter(onPad)))];
        let tt = 0;
        const u = (dt) => {
          tt = Math.min(3, tt + dt);
          const k = tt / 3, e = k * k * (3 - 2 * k), y = DECK - 8 * e;
          pad.position.y = y; padCol.top = y;
          for (const a of who) { a.pos.y = y; a.vy = 0; a.onGround = true; a.sync?.(); }
          if (tt >= 3) {
            updaters.splice(updaters.indexOf(u), 1); this.down = true;
            cb?.();
            // the empty pad comes back up after a while so the shaft isn't left open
            let wait = 0;
            const back = (dt2) => {
              wait += dt2;
              if (wait < 2.5) return;
              const k2 = Math.min(1, (wait - 2.5) / 3), y2 = DECK - 8 * (1 - k2 * k2 * (3 - 2 * k2));
              pad.position.y = y2; padCol.top = y2;
              if (k2 >= 1) { updaters.splice(updaters.indexOf(back), 1); this.busy = false; this.down = false; }
            };
            updaters.push(back);
          }
        };
        updaters.push(u);
      },
      reset() { pad.position.y = DECK; padCol.top = DECK; this.down = false; this.busy = false; },
    };
    keepClear(34, -8, 62, 8);
    return { ...W(PAD.x, PAD.z), y: DECK, gate: W(GATE.x - 1.2, 0), console: W(CX, CZ), stop: consoleStop, shield: shieldApi, pad: W(PAD.x, PAD.z), lift };
  }

  // ================================================================ the sea of clouds, puffs, distant islets
  function buildClouds() {
    const size = 1600;
    const mk = (tex, y, rep, color, opacity, speed, transparent) => {
      const map = tex.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(rep, rep);
      const m = new THREE.MeshBasicMaterial({ map, color, transparent, opacity, depthWrite: !transparent, fog: true });
      const pl = mesh(group, cached('cloudpl', () => new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2)), m, 0, y, 0, 0, { cast: false });
      pl.receiveShadow = false; pl.renderOrder = transparent ? -1 : 0;
      updaters.push((dt, t) => { map.offset.set(t * speed, t * speed * 0.6); });
      return pl;
    };
    // (ZSTYLE-1: the pale lavender-grey sea of LBA2's Zeelich: the billows in greys (SKY-9's grey cloudTex) under a pale
    // lavender-grey tint; it was white over the texture's rose, a pink-violet sea)
    mk(cloudTex(true, true), CLOUD_Y - 2.5, 16, '#dcd6e8', 1, 0.0012, false);
    mk(cloudTex(false, true), CLOUD_Y, 11, '#e4def0', 0.9, 0.002, true);
    mk(cloudTex(false, true), CLOUD_Y + 1.8, 7, '#ece8f4', 0.6, -0.0015, true);
    // big puffs hugging the cliffs and drifting further out
    const ring = resample(ISL, 7);
    const puffs = [];
    const pm2 = new THREE.SpriteMaterial({ map: puffTex(true), color: '#ece8f4', transparent: true, depthWrite: false, fog: true, opacity: 0.8 });
    // (PERF-ARRIVAL: all the puffs in one draw call, engine/spritebatch.js; they were one call each)
    const SB = new SpriteBatch(group, pm2, ring.length + Math.ceil(ring.length / 2) + 8);
    const add = (x, y, z, s) => { const sp = SB.add(x, y, z, s * 1.6, s); puffs.push({ sp, y, ph: r() * 6 }); };
    let cx = 0, cz = 0; for (const [x, z] of ISL) { cx += x; cz += z; } cx /= ISL.length; cz /= ISL.length;
    ring.forEach(([x, z], i) => {
      const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz);
      if (i % 2 === 0) add(x + (dx / l) * (1 + r() * 4), CLOUD_Y + 0.5 + r() * 2, z + (dz / l) * (1 + r() * 4), 6 + r() * 5);
      if (r() < 0.25) add(x + (dx / l) * (20 + r() * 40), CLOUD_Y + 1 + r() * 3, z + (dz / l) * (20 + r() * 40), 10 + r() * 10);
    });
    for (const [x, z] of [[50, 0], [46, -9], [56, 8], [-58, 0], [-62, 6]]) add(x, CLOUD_Y + 2.5, z, 12 + r() * 6);
    SB.update();
    updaters.push((dt, t) => { for (const p of puffs) p.sp.y = p.y + Math.sin(t * 0.25 + p.ph) * 0.4; SB.update(); });
  }
  function buildIslets() {
    const list = [[-110, -60, 9, 3], [-95, 70, 13, 6], [30, -95, 16, 5], [120, -50, 11, 2], [115, 60, 18, 7], [-40, 100, 10, 1], [70, 105, 8, 4], [-150, 10, 20, 8]];
    const IB = new Batch(group, { cast: false });
    for (const [x, z, s, seed] of list) {
      const rr = rng(seed * 17 + 1);
      const g = cached('islet' + seed, () => {
        const geo = lathe([[0, -1.6], [0.25, -1.25], [0.55, -0.7], [0.82, -0.3], [1.0, -0.06], [1.02, 0], [0.9, 0.06], [0, 0.1]], 18);
        const p = geo.attributes.position, c = [], cc = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(px, pz);
          const k = 1 + Math.sin(a * 5 + seed) * 0.08 + Math.sin(a * 11 + py * 4) * 0.05;
          p.setXYZ(i, px * k, py * (1 + Math.sin(a * 3 + seed) * 0.15), pz * k);
          cc.set(py > -0.02 ? '#e0d8cc' : py > -0.15 ? '#c4bcb0' : '#aca6a4').multiplyScalar(0.85 + 0.15 * Math.sin(py * 9 + a * 2));
          c.push(cc.r, cc.g, cc.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
        geo.computeVertexNormals();
        return geo;
      });
      const y = CLOUD_Y + 3 + rr() * 5;
      IB.add(g, VC(), x, y, z, 0, rr() * 6, 0, s, s * 1.2, s);
      // a tiny Esmer house with a dome on the bigger ones, a puff tree on others
      if (s > 10) {
        // (the shared Esmer building, props-esmer.js, its door toward the island)
        setLook(true);   // (ZEELICH-2: in LBA2's look, as the street)
        esmerBuilding(new Place(IB, x, y + 0.1 * s * 1.2, z, Math.atan2(-x, -z)), { w: 3.4, d: 3.4, h: 5.2, wallH: 2.95, wall: tm('plasterWall', { color: '#e2d6cc' }), domeM: capM(['#78a8ae', '#b4d8d8']), trim: '#3a7a8a', seed });
        setLook(null);
      } else {
        IB.add(puffTreeGeo(seed % 2), VC(), x + 1, y + 0.1 * s * 1.2, z, 0, 0, 0, 1.4);
      }
    }
    IB.build();
    const islets = group.children[group.children.length - 1];
    void islets;
  }

  // ================================================================ trees, rocks, grass and flowers
  function puffTreeGeo(v) {
    return cached('puff' + v, () => {
      const rr = rng(v * 13 + 5), parts = [];
      const trunk = tube([[0, -0.1, 0], [0.12, 1.0, 0.05], [0.05 + v * 0.2, 2.0, -0.1], [0.25, 2.8, 0.0]], 0.16, 7, 1);
      parts.push([tint(trunk, '#8a5a3a')]);
      const puffCols = v ? ['#f0c860', '#ffe0a0', '#e0a840'] : ['#e8b450', '#f8d890', '#d89a38'];   // (ZEELICH-2: gold, as LBA2's Zeelich plants)
      const blobs = [[0.25, 3.3, 0, 1.15], [-0.6, 2.9, 0.3, 0.8], [0.9, 2.8, -0.2, 0.75], [0.1, 3.0, -0.7, 0.7], [0.3, 4.0, 0.2, 0.7]];
      for (const [bx, by, bz, br] of blobs) {
        const g = new THREE.IcosahedronGeometry(br, 2), p = g.attributes.position, c = [], cc = new THREE.Color(), nn = new THREE.Vector3();
        const base = new THREE.Color(puffCols[Math.floor(rr() * 3)]);
        for (let i = 0; i < p.count; i++) {
          nn.fromBufferAttribute(p, i).normalize();
          const k = 1 + Math.sin(nn.x * 7 + nn.y * 5 + bx) * 0.07 + Math.sin(nn.z * 9 - nn.y * 3) * 0.05;
          p.setXYZ(i, nn.x * br * k, nn.y * br * k * 0.85, nn.z * br * k);
          cc.copy(base).multiplyScalar(0.78 + 0.3 * (nn.y * 0.5 + 0.5));
          c.push(cc.r, cc.g, cc.b);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.deleteAttribute('uv');
        // smooth normals (the icosahedron is unindexed): bend them toward the blob's radial direction
        const N = g.attributes.normal; for (let i = 0; i < p.count; i++) { nn.fromBufferAttribute(p, i).normalize(); N.setXYZ(i, nn.x, nn.y, nn.z); }
        parts.push([g, bx, by, bz]);
      }
      const out = compose(parts.map(([g, x = 0, y = 0, z = 0]) => [g.attributes.uv ? g : (g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)), g), x, y, z]), true);
      return out;
    });
  }
  function scatter() {
    // puff trees
    const trees = [[-45, -15], [-33, -18.5], [-19.5, -16.5], [-30, 15.5], [-23, 17.5], [-46, 12], [6, -12], [12, -22], [29, -10], [30, 12], [-14, 22], [-28, 22.5], [28, 20], [8, -6.5], [-6, -24], [-38, -21]];
    const items = [[], []];
    for (const [x, z] of trees) {
      if (!onIsland(x, z, 2) || !isClear(x, z, 1)) continue;
      const v = items[0].length <= items[1].length ? 0 : 1;
      const s = 0.9 + r() * 0.35, it = { x, y: Y0 - 0.05, z, ry: r() * 6, s };
      if (zlClear(x, z, 1) || liftClear(x, z, 1)) continue;   // (after the draws: the island's other trees keep their places)
      items[v].push(it);
      col({ type: 'cyl', x, z, r: 0.3, top: Y0 + 2.6 * s, seeThrough: true });
    }
    // (HEADING-LOAD-2: the trees and rocks culled per instance in each pass, kit.js cullInstances; the grass and flowers,
    //  which cast no shadow, culled to the view per 8 m square, viewinst.js: as island-wide InstancedMeshes all of them went
    //  to the GPU at every heading. gpuGroup: benchgpu.js)
    items.forEach((list, v) => { cullInstances(group, puffTreeGeo(v), VC(), list).userData.gpuGroup = 'trees'; });
    // rocks along the rim and in the grass
    const rocks = [[], [], []];
    for (const it of rimRocks) rocks[Math.floor(r() * 3)].push(it);
    for (let i = 0; i < 14; i++) {
      const x = -48 + r() * 84, z = -28 + r() * 56;
      if (!onIsland(x, z, 1.2) || !isClear(x, z, 1.5)) continue;
      const s = 0.25 + r() * 0.5, it = { x, y: Y0 - 0.1, z, ry: r() * 6, s, color: new THREE.Color('#eeece8').multiplyScalar(0.95 + r() * 0.15) };
      if (zlClear(x, z, 1) || liftClear(x, z, 1)) continue;
      rocks[i % 3].push(it);
      if (s > 0.45) col({ type: 'cyl', x, z, r: 1.0 * s, top: Y0 + 0.9 * s, seeThrough: true });
    }
    const rockMat = pm('#ffffff', 0.9, { vertexColors: true, emissive: '#2a2a2c', emissiveIntensity: 0.4 });
    rocks.forEach((list, v) => { if (list.length) cullInstances(group, rockGeometry(v + 1), rockMat, list).userData.gpuGroup = 'trees'; });
    // grass clumps and flowers
    const grass = [], flowers = [[], [], [], []];
    for (let i = 0; i < 900; i++) {
      const x = -50 + r() * 88, z = -30 + r() * 60;
      if (!onIsland(x, z, 0.3) || !isClear(x, z, 0.2)) continue;
      const patch = Math.sin(x * 0.21) + Math.sin(z * 0.27 + x * 0.05);
      if (patch < 0.6) continue;   // (ZEELICH-2: tufts in a few patches on the granite, no lawn)
      const gr = { x, y: Y0 - 0.02, z, ry: r() * 6, s: 0.8 + r() * 0.7, color: new THREE.Color().setHSL(0.1 + r() * 0.04, 0.42, 0.5 + r() * 0.15) };   // (ZSTYLE-1: dry golden tufts, as Knartas' and Otringal's)
      const fl = r() < 0.35 ? [Math.floor(r() * 4), { x: x + (r() - 0.5) * 0.6, y: Y0, z: z + (r() - 0.5) * 0.6, ry: r() * 6, s: 0.9 + r() * 0.6 }] : null;
      if (zlClear(x, z, 0.1) || liftClear(x, z, 0.1)) continue;   // (the draws are made either way)
      grass.push(gr);
      if (fl) flowers[fl[0]].push(fl[1]);
    }
    viewCull(instances(group, grassClumpGeometry(5, 9), pm('#ffffff', 0.9, { vertexColors: true, side: THREE.DoubleSide }), grass, { cast: false })).userData.gpuGroup = 'grass';
    ['#e8a040', '#f4eee0', '#c8503a', '#ffd84a'].forEach((c, k) => { viewCull(instances(group, flowerGeometry(c), pm('#ffffff', 0.7, { vertexColors: true }), flowers[k], { cast: false })).userData.gpuGroup = 'grass'; });
    // flower beds around the plaza and along the house fronts
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, x = PLAZA.x + Math.sin(a) * (PLAZA.r + 0.8), z = PLAZA.z + Math.cos(a) * (PLAZA.r + 0.8);
      if (Math.abs(z) < 4.5 || !isClear(x, z, -0.5)) continue;
      // (ZSTYLE-1: a small golden fan plant where the glowing orb stalks stood; the bulbs (ochre now) and teal curl ferns stay)
      if (i % 3 === 0) goldPlant(new Place(B, x, Y0, z, i * 0.7), { h: 1.15, w: 1.0, seed: i });
      else plantAt(x, Y0, z, i % 3, 0.6);
    }
  }
}
// (the whole build at once: a step at a time, without pauses)
export function buildZeelich(scene, physics) { const it = buildZeelichSteps(scene, physics); let r = it.next(); while (!r.done) r = it.next(); return r.value; }
const lamps = [];
const rimRocks = [];
