// HOUSE-WINDOWS: the views behind the windows of the interiors. One painted atlas (drawn here on a canvas, no image
// files), one unlit material, one small plane per window with its UVs on the window's own tile: every window of a
// room merges into a single draw call, and the view is never lit by the room's lamps (a basic material).
//
// The rooms' camera is fixed (yaw 45 deg, pitch 0.58 rad), so what a window shows is decided by the view direction,
// not by where the player stands: through a window in the north or west wall the eye looks out and DOWN, sideways to
// the left (north wall) or right (west wall) of the wall's own axes. windowViewPlane() puts the painting where those
// rays land, so the middle of each tile is what you see through the glass, the horizon sits low in the pane and the
// sky is only its top third. Each tile is a slice of the island seen from the house, facing a different way.
import * as THREE from 'three';
import { M, canvasTex } from './props.js';

export const TILE = 256, GUTTER = 6;
export const TILES = { sea: 0, harbour: 1, village: 2, garden: 3, orchard: 4, street: 5, yard: 6 };
const COLS = 4, ROWS = 2;

// ------------------------------------------------------------------ small painter kit
function rand(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
const mix = (a, b, t) => { const p = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }; const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };

function sky(x, top, horizon, y0 = 0, y1 = 120, hz = '#f4efd8') {
  const g = x.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top); g.addColorStop(0.7, horizon); g.addColorStop(1, hz);
  x.fillStyle = g; x.fillRect(0, y0, TILE, y1 - y0);
}
function cloud(x, cx, cy, s, a = 0.9) {
  x.save(); x.globalAlpha = a;
  for (const [dx, dy, r] of [[-0.5, 0.05, 0.5], [0, -0.12, 0.62], [0.55, 0.03, 0.46], [0.1, 0.1, 0.5]]) {
    const g = x.createRadialGradient(cx + dx * s, cy + dy * s, 0, cx + dx * s, cy + dy * s, r * s);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx + dx * s, cy + dy * s, r * s, r * s * 0.5, 0, 0, 7); x.fill();
  }
  x.restore();
}
// a bumpy hill / treeline ridge filled down to y = bottom
function ridge(x, base, amp, col, r, bottom = TILE, freq = 1, col2 = null) {
  const p1 = r() * 6, p2 = r() * 6;
  x.beginPath(); x.moveTo(-2, bottom);
  for (let i = -2; i <= TILE + 2; i += 4) x.lineTo(i, base - amp * (0.5 + 0.5 * Math.sin(i * 0.021 * freq + p1)) - amp * 0.4 * Math.sin(i * 0.053 * freq + p2));
  x.lineTo(TILE + 2, bottom); x.closePath();
  if (col2) { const g = x.createLinearGradient(0, base - amp * 1.4, 0, bottom); g.addColorStop(0, col); g.addColorStop(1, col2); x.fillStyle = g; } else x.fillStyle = col;
  x.fill();
}
function haze(x, y0, y1, col = '#dcefff', a = 0.45) {
  const g = x.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
  x.save(); x.globalAlpha = a; x.fillStyle = g; x.fillRect(0, y0, TILE, y1 - y0); x.restore();
}
function tree(x, cx, base, r, o = {}) {
  const c = o.col || '#4f9a50', hi = o.hi || '#8ccc5a', lo = o.lo || '#2f6a3a', tr = o.trunk || '#6a4a2c';
  x.fillStyle = tr; x.fillRect(cx - r * 0.1, base - r * 1.1, r * 0.2, r * 1.1);
  x.fillStyle = shade(tr, 0.7); x.fillRect(cx + r * 0.02, base - r * 1.1, r * 0.08, r * 1.1);
  const blobs = [[0, -1.55, 0.95], [-0.7, -1.2, 0.7], [0.7, -1.2, 0.72], [-0.3, -1.95, 0.62], [0.35, -1.85, 0.6]];
  for (const [dx, dy, k] of blobs) { x.fillStyle = lo; x.beginPath(); x.arc(cx + dx * r + r * 0.08, base + dy * r + r * 0.1, k * r, 0, 7); x.fill(); }
  for (const [dx, dy, k] of blobs) { x.fillStyle = c; x.beginPath(); x.arc(cx + dx * r, base + dy * r, k * r, 0, 7); x.fill(); }
  for (const [dx, dy, k] of blobs) { x.fillStyle = hi; x.beginPath(); x.arc(cx + dx * r - r * 0.18, base + dy * r - r * 0.2, k * r * 0.55, 0, 7); x.fill(); }
  if (o.fruit) { const rr = rand(Math.round(cx * 7 + base)); x.fillStyle = o.fruit; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(cx + (rr() - 0.5) * r * 2, base - r * (1 + rr() * 1.2), r * 0.07, 0, 7); x.fill(); } }
}
function pine(x, cx, base, h, col = '#2f6a3a') {
  x.fillStyle = '#5a3c24'; x.fillRect(cx - 1.5, base - h * 0.25, 3, h * 0.25);
  for (let i = 0; i < 3; i++) {
    const w = h * (0.34 - i * 0.07), y = base - h * (0.18 + i * 0.26);
    x.fillStyle = shade(col, 0.85 + i * 0.12); x.beginPath(); x.moveTo(cx - w, y); x.lineTo(cx, y - h * 0.4); x.lineTo(cx + w, y); x.closePath(); x.fill();
  }
}
// a small house in three-quarter view: front wall, a darker side wall, a hipped roof with its side plane
function house(x, ox, oy, w, h, o = {}) {
  const wall = o.wall || '#f2e4c4', roof = o.roof || '#c4503a', sd = o.depth ?? w * 0.38, rh = o.rh ?? h * 0.5, dy = sd * 0.32;
  // side wall
  x.fillStyle = shade(wall, 0.72); x.beginPath(); x.moveTo(ox + w, oy); x.lineTo(ox + w + sd, oy - dy); x.lineTo(ox + w + sd, oy - dy - h); x.lineTo(ox + w, oy - h); x.closePath(); x.fill();
  // front wall with a soft top-to-bottom shade
  const g = x.createLinearGradient(0, oy - h, 0, oy); g.addColorStop(0, wall); g.addColorStop(1, shade(wall, 0.9));
  x.fillStyle = g; x.fillRect(ox, oy - h, w, h);
  // roof: front trapezoid + side slope
  x.fillStyle = shade(roof, 0.78); x.beginPath(); x.moveTo(ox + w + 4, oy - h); x.lineTo(ox + w + sd + 4, oy - dy - h); x.lineTo(ox + w + sd - rh * 0.5, oy - dy - h - rh); x.lineTo(ox + w - rh * 0.25 - 2, oy - h - rh); x.closePath(); x.fill();
  const gr = x.createLinearGradient(0, oy - h - rh, 0, oy - h); gr.addColorStop(0, shade(roof, 1.12)); gr.addColorStop(1, roof);
  x.fillStyle = gr; x.beginPath(); x.moveTo(ox - 5, oy - h + 1); x.lineTo(ox + w + 5, oy - h + 1); x.lineTo(ox + w - rh * 0.25 - 2, oy - h - rh); x.lineTo(ox + rh * 0.25 + 2, oy - h - rh); x.closePath(); x.fill();
  x.strokeStyle = shade(roof, 0.7); x.lineWidth = 0.8; x.globalAlpha = 0.5;
  for (let i = 1; i < 4; i++) { const yy = oy - h - rh * (i / 4); x.beginPath(); x.moveTo(ox + rh * 0.25 * (i / 4) - 4, yy + rh * 0.02); x.lineTo(ox + w - rh * 0.25 * (i / 4) + 4, yy + rh * 0.02); x.stroke(); }
  x.globalAlpha = 1;
  // eave shadow
  x.fillStyle = 'rgba(40,20,10,0.22)'; x.fillRect(ox, oy - h, w, 3);
  if (o.chimney) { const cx = ox + w * o.chimney; x.fillStyle = '#b8a890'; x.fillRect(cx, oy - h - rh - 7, 7, rh * 0.8 + 7); x.fillStyle = '#6a5a4c'; x.fillRect(cx - 1, oy - h - rh - 9, 9, 3); if (o.smoke) { x.save(); x.globalAlpha = 0.5; x.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(cx + 4 + i * 4, oy - h - rh - 14 - i * 8, 4 + i * 1.5, 0, 7); x.fill(); } x.restore(); } }
  // windows and a door
  const nw = o.windows ?? Math.max(1, Math.round(w / 26));
  const ww = Math.min(13, w / (nw * 2 + 0.4)), wh = h * 0.34;
  for (let i = 0; i < nw; i++) {
    const wx = ox + (i + 0.5) * (w / nw) - ww / 2 + (o.door ? 0 : 0), wy = oy - h * 0.7;
    if (o.door && Math.abs(wx + ww / 2 - (ox + w * o.door)) < ww * 1.1) continue;
    x.fillStyle = o.shutter || '#3b6fb0'; x.fillRect(wx - 3, wy - 1, 3, wh + 2); x.fillRect(wx + ww, wy - 1, 3, wh + 2);
    x.fillStyle = '#3a4a5a'; x.fillRect(wx, wy, ww, wh); x.fillStyle = '#9ad0ee'; x.fillRect(wx + 1, wy + 1, ww - 2, wh * 0.55);
    x.fillStyle = '#f4efe2'; x.fillRect(wx + ww / 2 - 0.5, wy, 1, wh);
    x.fillStyle = shade(wall, 0.8); x.fillRect(wx - 2, wy + wh, ww + 4, 2);
  }
  if (o.door) { const dx = ox + w * o.door - 5; x.fillStyle = '#6a4226'; x.fillRect(dx, oy - h * 0.52, 10, h * 0.52); x.fillStyle = shade('#6a4226', 1.25); x.fillRect(dx + 1, oy - h * 0.5, 3.5, h * 0.4); x.fillStyle = '#d8b050'; x.fillRect(dx + 7, oy - h * 0.26, 1.5, 1.5); }
  // plinth
  x.fillStyle = 'rgba(70,60,50,0.3)'; x.fillRect(ox, oy - 4, w, 4);
}
// a sailing boat: hull, mast, two sails
function boat(x, cx, cy, s, hull = '#b8402e', sail = '#fdf4de') {
  x.fillStyle = 'rgba(10,50,100,0.3)'; x.beginPath(); x.ellipse(cx, cy + 2 * s, 17 * s, 2.2 * s, 0, 0, 7); x.fill();
  x.fillStyle = '#6a4a30'; x.fillRect(cx - 0.8 * s, cy - 34 * s, 1.6 * s, 34 * s);
  x.fillStyle = sail; x.beginPath(); x.moveTo(cx + 1.5 * s, cy - 33 * s); x.lineTo(cx + 15 * s, cy - 6 * s); x.lineTo(cx + 1.5 * s, cy - 6 * s); x.closePath(); x.fill();
  x.fillStyle = shade(sail, 0.88); x.beginPath(); x.moveTo(cx - 1.5 * s, cy - 28 * s); x.lineTo(cx - 12 * s, cy - 6 * s); x.lineTo(cx - 1.5 * s, cy - 6 * s); x.closePath(); x.fill();
  x.fillStyle = hull; x.beginPath(); x.moveTo(cx - 16 * s, cy - 5 * s); x.lineTo(cx + 17 * s, cy - 5 * s); x.lineTo(cx + 11 * s, cy + 2 * s); x.lineTo(cx - 11 * s, cy + 2 * s); x.closePath(); x.fill();
  x.fillStyle = '#f4ead0'; x.fillRect(cx - 14 * s, cy - 4 * s, 29 * s, 1.2 * s);
}
function waves(x, y0, y1, r, n, col = 'rgba(255,255,255,0.5)') {
  x.strokeStyle = col; x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = y0 + (y1 - y0) * Math.pow(r(), 0.8), xx = r() * TILE, l = 5 + (y - y0) / (y1 - y0) * 16;
    x.lineWidth = 0.8 + (y - y0) / (y1 - y0) * 1.6;
    x.beginPath(); x.moveTo(xx, y); x.quadraticCurveTo(xx + l / 2, y - 1.8, xx + l, y); x.stroke();
  }
}
function fence(x, y, x0, x1, h = 26, col = '#f2ead6') {
  x.fillStyle = shade(col, 0.82); x.fillRect(x0, y - h * 0.72, x1 - x0, 3); x.fillRect(x0, y - h * 0.3, x1 - x0, 3);
  for (let xx = x0 + 2; xx < x1; xx += 9) { x.fillStyle = col; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y - h + 3); x.lineTo(xx + 3.5, y - h); x.lineTo(xx + 7, y - h + 3); x.lineTo(xx + 7, y); x.closePath(); x.fill(); x.fillStyle = 'rgba(60,40,20,0.2)'; x.fillRect(xx + 5, y - h + 3, 2, h - 3); }
}
function flowers(x, y0, y1, r, n, cols) {
  for (let i = 0; i < n; i++) { const yy = y0 + r() * (y1 - y0), xx = r() * TILE, k = 1.2 + (yy - y0) / (y1 - y0) * 1.8; x.fillStyle = '#3f8a45'; x.fillRect(xx - 0.4, yy, 0.8, k * 2.2); x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath(); x.arc(xx, yy, k, 0, 7); x.fill(); }
}
// slanted light on the glass, laid over the tile: the window's reflection
function glare(x) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const [x0, wd, a] of [[60, 18, 0.1], [92, 7, 0.08]]) {
    const g = x.createLinearGradient(x0, 0, x0 + wd, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(x0 + 70, 0); x.lineTo(x0 + wd + 70, 0); x.lineTo(x0 + wd - 70, TILE); x.lineTo(x0 - 70, TILE); x.closePath(); x.fill();
  }
  x.restore();
}

// ------------------------------------------------------------------ the tiles (each 256 x 256, drawn at the origin)
// What is seen through a window is the tile's middle ~65% (see windowViewPlane); the horizon is at y ~ 112.
const PAINT = {
  // the bay: sea to the horizon, an island with a tower, a sailing boat, the garden hedge in front
  sea(x, r) {
    sky(x, '#4a9ee6', '#a8d8f4', 0, 114, '#f6f0d8');
    cloud(x, 70, 52, 52); cloud(x, 190, 38, 40, 0.8); cloud(x, 150, 84, 30, 0.7);
    // the far island: blue-green mound, white tower
    ridge(x, 116, 11, '#5a9a8a', r, 118, 2.4);
    x.fillStyle = '#f0e8d4'; x.fillRect(196, 84, 7, 26); x.fillStyle = '#c4503a'; x.beginPath(); x.moveTo(194, 85); x.lineTo(199.5, 76); x.lineTo(205, 85); x.fill();
    const g = x.createLinearGradient(0, 112, 0, 256); g.addColorStop(0, '#5ab6e4'); g.addColorStop(0.18, '#2f92d2'); g.addColorStop(1, '#17589e');
    x.fillStyle = g; x.fillRect(0, 114, TILE, 142);
    x.fillStyle = 'rgba(255,248,220,0.28)'; x.fillRect(0, 114, TILE, 2);
    // the suns' glitter
    x.fillStyle = 'rgba(255,250,225,0.35)'; for (let i = 0; i < 14; i++) x.fillRect(120 + (r() - 0.5) * 60, 118 + i * 5, 12 + r() * 18, 1.3);
    waves(x, 120, 215, r, 70);
    boat(x, 92, 150, 1.05); boat(x, 175, 132, 0.55, '#3b6fb0');
    // the garden hedge and a bit of tiled roof in the corner
    ridge(x, 206, 7, '#3f8a45', r, TILE, 2.6, '#2a6a38');
    x.fillStyle = '#c4503a'; x.beginPath(); x.moveTo(0, 170); x.lineTo(54, 214); x.lineTo(0, 232); x.closePath(); x.fill();
    x.fillStyle = shade('#c4503a', 0.75); x.beginPath(); x.moveTo(0, 190); x.lineTo(40, 218); x.lineTo(0, 232); x.fill();
    flowers(x, 214, 250, r, 26, ['#f2d24a', '#f4f0e8', '#e8643c']);
  },
  // the harbour: a lighthouse on its rock, a quay, boats, houses along the far shore
  harbour(x, r) {
    sky(x, '#4a9ee6', '#a8d8f4', 0, 112, '#f6efd6');
    cloud(x, 54, 46, 46); cloud(x, 200, 66, 36, 0.8);
    ridge(x, 114, 18, '#7aa6b8', r, 120, 1.3);
    // far shore: tiny houses
    for (let i = 0; i < 9; i++) { const hx = 8 + i * 13 + r() * 5, hw = 7 + r() * 5; x.fillStyle = ['#f2e4c4', '#f0cdb4', '#e8d4a0'][i % 3]; x.fillRect(hx, 106, hw, 7); x.fillStyle = ['#c4503a', '#3b6fb0', '#d9753f'][(i * 2) % 3]; x.beginPath(); x.moveTo(hx - 1, 106); x.lineTo(hx + hw / 2, 100); x.lineTo(hx + hw + 1, 106); x.fill(); }
    haze(x, 90, 116, '#cfe6f6', 0.35);
    const g = x.createLinearGradient(0, 112, 0, 256); g.addColorStop(0, '#62bce6'); g.addColorStop(0.2, '#2f92d2'); g.addColorStop(1, '#17589e');
    x.fillStyle = g; x.fillRect(0, 114, TILE, 142);
    waves(x, 120, 200, r, 60);
    // the lighthouse on its rock
    x.fillStyle = '#7a7468'; x.beginPath(); x.moveTo(150, 128); x.lineTo(160, 108); x.lineTo(200, 106); x.lineTo(214, 128); x.closePath(); x.fill();
    x.fillStyle = '#948c7c'; x.beginPath(); x.moveTo(160, 108); x.lineTo(176, 104); x.lineTo(172, 126); x.lineTo(152, 128); x.fill();
    x.fillStyle = '#f8f2e2'; x.beginPath(); x.moveTo(171, 108); x.lineTo(176, 44); x.lineTo(192, 44); x.lineTo(197, 108); x.closePath(); x.fill();
    x.fillStyle = '#c4503a'; for (const [y0, y1] of [[58, 70], [84, 96]]) { x.beginPath(); x.moveTo(176 + (y0 - 44) * -0.083 - 0.5, y0); x.lineTo(192 + (y0 - 44) * 0.083, y0); x.lineTo(192 + (y1 - 44) * 0.083, y1); x.lineTo(176 - (y1 - 44) * 0.083, y1); x.fill(); }
    x.fillStyle = shade('#f8f2e2', 0.78); x.beginPath(); x.moveTo(186, 44); x.lineTo(192, 44); x.lineTo(197, 108); x.lineTo(189, 108); x.fill();
    x.fillStyle = '#3a4a5a'; x.fillRect(174, 36, 20, 8); x.fillStyle = '#ffe98a'; x.fillRect(177, 37, 14, 6); x.fillStyle = '#c4503a'; x.beginPath(); x.moveTo(172, 36); x.lineTo(184, 26); x.lineTo(196, 36); x.fill();
    boat(x, 78, 142, 1.0, '#3b6fb0'); boat(x, 126, 124, 0.5);
    // the quay: stone wall, bollards, rope
    const qg = x.createLinearGradient(0, 178, 0, 256); qg.addColorStop(0, '#d8cfbc'); qg.addColorStop(0.08, '#a8a090'); qg.addColorStop(1, '#6a6458');
    x.fillStyle = qg; x.fillRect(0, 178, TILE, 78); x.fillStyle = '#e8dfca'; x.fillRect(0, 176, TILE, 5);
    x.strokeStyle = 'rgba(60,55,45,0.35)'; x.lineWidth = 1; for (let y = 190; y < 256; y += 13) { x.beginPath(); x.moveTo(0, y); x.lineTo(TILE, y); x.stroke(); for (let xx = ((y / 13) % 2) * 17; xx < TILE; xx += 34) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 13); x.stroke(); } }
    for (const bx of [34, 128, 214]) { x.fillStyle = '#4a4036'; x.fillRect(bx - 4, 168, 8, 11); x.fillStyle = '#6a5a48'; x.fillRect(bx - 5.5, 166, 11, 3); }
    x.strokeStyle = '#a8864a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(34, 170); x.quadraticCurveTo(80, 186, 128, 170); x.stroke();
  },
  // a lane of neighbours' houses on the slope, chimneys smoking, a tree, an ochre lane
  village(x, r) {
    sky(x, '#4a9ee6', '#a8d8f4', 0, 96, '#f6efd6');
    cloud(x, 52, 36, 44); cloud(x, 206, 58, 36, 0.85);
    ridge(x, 122, 20, '#8ab8a0', r, 150, 1.2);
    ridge(x, 136, 14, '#5fa24c', r, 170, 1.9, '#4a8a42');
    // the back row on the hill
    house(x, 150, 140, 30, 18, { wall: '#f4ead0', roof: '#d9753f', windows: 2, depth: 10, rh: 11, chimney: 0.7 });
    house(x, 196, 134, 28, 17, { wall: '#f0cdb4', roof: '#a63d2e', windows: 2, depth: 9, rh: 10, shutter: '#2f8f7a' });
    house(x, 12, 134, 30, 19, { wall: '#e8d8b4', roof: '#3b6fb0', windows: 2, depth: 10, rh: 11 });
    haze(x, 96, 170, '#d8ecf8', 0.28);
    // the lane
    const lg = x.createLinearGradient(0, 168, 0, 256); lg.addColorStop(0, '#d8b878'); lg.addColorStop(1, '#b8925a');
    x.fillStyle = lg; x.beginPath(); x.moveTo(0, 214); x.lineTo(TILE, 184); x.lineTo(TILE, 256); x.lineTo(0, 256); x.fill();
    x.strokeStyle = 'rgba(120,90,50,0.35)'; x.lineWidth = 1; for (let i = 0; i < 18; i++) { const yy = 196 + r() * 56, xx = r() * TILE; x.beginPath(); x.ellipse(xx, yy, 4 + r() * 5, 1.4, 0, 0, 7); x.stroke(); }
    // the near houses, one each side, a tree between
    house(x, -8, 186, 84, 50, { wall: '#f2e4c4', roof: '#c4503a', windows: 3, depth: 26, rh: 28, chimney: 0.3, smoke: true, door: 0.82, shutter: '#3b78d8' });
    house(x, 156, 176, 78, 46, { wall: '#f0d4b8', roof: '#3b6fb0', windows: 3, depth: 24, rh: 26, chimney: 0.6, door: 0.2, shutter: '#2f8f7a' });
    tree(x, 120, 192, 17, { col: '#58a64c', hi: '#98d060' });
    flowers(x, 238, 254, r, 16, ['#e8643c', '#f2d24a', '#f4f0e8']);
  },
  // a back garden: a picket fence and flower bed in front, an old tree, the neighbours' roof behind
  garden(x, r) {
    sky(x, '#4a9ee6', '#a8d8f4', 0, 92, '#f6efd6');
    cloud(x, 60, 38, 42); cloud(x, 190, 52, 34, 0.8);
    ridge(x, 118, 22, '#86b49a', r, 150, 1.1);
    pine(x, 22, 124, 40, '#2f6a50'); pine(x, 232, 120, 34, '#2f6a50');
    house(x, 122, 150, 70, 38, { wall: '#f4ead0', roof: '#3b6fb0', windows: 2, depth: 20, rh: 24, chimney: 0.65, smoke: true, door: 0.25 });
    ridge(x, 158, 6, '#4a9a48', r, 190, 2.4, '#3a7a3c');
    haze(x, 96, 150, '#d8ecf8', 0.22);
    // lawn and flower bed
    const lg = x.createLinearGradient(0, 160, 0, 256); lg.addColorStop(0, '#6fb44c'); lg.addColorStop(1, '#3f8a3a'); x.fillStyle = lg; x.fillRect(0, 168, TILE, 88);
    x.fillStyle = '#d8b878'; x.beginPath(); x.moveTo(98, 256); x.lineTo(124, 168); x.lineTo(142, 168); x.lineTo(196, 256); x.fill();
    tree(x, 52, 184, 24, { col: '#4f9a50', hi: '#9acc5a', fruit: '#e8503a' });
    fence(x, 206, -4, 260, 30);
    flowers(x, 210, 250, r, 40, ['#e8643c', '#f2d24a', '#f4f0e8', '#c84a8a']);
  },
  // orchard hills: terraced greens, fruit trees, a windmill and a yellow field
  orchard(x, r) {
    sky(x, '#4a9ee6', '#a8d8f4', 0, 96, '#f6efd6');
    cloud(x, 80, 40, 46); cloud(x, 206, 56, 32, 0.8);
    ridge(x, 108, 20, '#86b4a0', r, 150, 1.0);
    // windmill on the far hill
    x.fillStyle = '#f2e4c4'; x.beginPath(); x.moveTo(176, 100); x.lineTo(184, 64); x.lineTo(194, 64); x.lineTo(202, 100); x.fill();
    x.fillStyle = '#c4503a'; x.beginPath(); x.moveTo(181, 64); x.lineTo(189, 54); x.lineTo(197, 64); x.fill();
    x.strokeStyle = '#6a4a30'; x.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.5; x.beginPath(); x.moveTo(189, 62); x.lineTo(189 + Math.cos(a) * 24, 62 + Math.sin(a) * 24); x.stroke(); x.fillStyle = 'rgba(250,244,228,0.9)'; x.beginPath(); x.moveTo(189 + Math.cos(a) * 8, 62 + Math.sin(a) * 8); x.lineTo(189 + Math.cos(a) * 23, 62 + Math.sin(a) * 23); x.lineTo(189 + Math.cos(a) * 23 - Math.sin(a) * 6, 62 + Math.sin(a) * 23 + Math.cos(a) * 6); x.lineTo(189 + Math.cos(a) * 8 - Math.sin(a) * 6, 62 + Math.sin(a) * 8 + Math.cos(a) * 6); x.fill(); }
    ridge(x, 134, 12, '#6aae50', r, 190, 1.6, '#4f9a46');
    haze(x, 100, 140, '#d8ecf8', 0.25);
    // the yellow field and furrows
    const fg = x.createLinearGradient(0, 150, 0, 220); fg.addColorStop(0, '#e8cf64'); fg.addColorStop(1, '#c9a53c'); x.fillStyle = fg;
    x.beginPath(); x.moveTo(0, 168); x.lineTo(TILE, 150); x.lineTo(TILE, 226); x.lineTo(0, 236); x.fill();
    x.strokeStyle = 'rgba(120,80,20,0.25)'; x.lineWidth = 1; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(i * 24 - 10, 238); x.lineTo(60 + i * 16, 156); x.stroke(); }
    for (const [cx, by, rr] of [[26, 156, 12], [214, 158, 11], [118, 148, 9]]) tree(x, cx, by, rr, { col: '#4f9a50', hi: '#98d060', fruit: '#e8503a' });
    ridge(x, 232, 6, '#3f8a45', r, TILE, 2.4, '#2a6a38');
    tree(x, 70, 246, 26, { col: '#4f9a50', hi: '#9acc5a', fruit: '#f2c23a' });
  },
  // the lane between two houses, the Citadel's roofs and a tower down the way
  street(x, r) {
    sky(x, '#4a9ee6', '#a8d8f4', 0, 100, '#f6efd6');
    cloud(x, 90, 44, 44);
    ridge(x, 112, 14, '#86b4a0', r, 140, 1.0);
    // far roofs and a tower at the end of the lane
    for (let i = 0; i < 6; i++) house(x, 70 + i * 24, 132 + (i % 2) * 4, 18 + (i % 3) * 3, 14, { wall: ['#f2e4c4', '#f0cdb4', '#e8d4a0'][i % 3], roof: ['#c4503a', '#3b6fb0', '#d9753f'][i % 3], windows: 1, depth: 6, rh: 8 });
    x.fillStyle = '#e8dcc0'; x.fillRect(108, 70, 18, 66); x.fillStyle = '#c4503a'; x.beginPath(); x.moveTo(104, 70); x.lineTo(117, 50); x.lineTo(130, 70); x.fill(); x.fillStyle = '#3a4a5a'; x.fillRect(113, 82, 8, 12);
    haze(x, 96, 150, '#d8ecf8', 0.3);
    const lg = x.createLinearGradient(0, 140, 0, 256); lg.addColorStop(0, '#d8c08c'); lg.addColorStop(1, '#a88450'); x.fillStyle = lg;
    x.beginPath(); x.moveTo(96, 140); x.lineTo(160, 140); x.lineTo(TILE, 256); x.lineTo(0, 256); x.fill();
    x.strokeStyle = 'rgba(100,70,40,0.3)'; x.lineWidth = 1; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(128, 140); x.lineTo(i * 36 - 20, 256); x.stroke(); }
    // the houses either side, seen almost end-on
    x.fillStyle = '#e8d8b4'; x.beginPath(); x.moveTo(-4, 40); x.lineTo(96, 96); x.lineTo(96, 190); x.lineTo(-4, 256); x.fill();
    x.fillStyle = '#c4503a'; x.beginPath(); x.moveTo(-4, 26); x.lineTo(104, 92); x.lineTo(96, 100); x.lineTo(-4, 52); x.fill();
    x.fillStyle = '#3a4a5a'; x.fillRect(20, 110, 18, 28); x.fillStyle = '#9ad0ee'; x.fillRect(22, 112, 14, 11);
    x.fillStyle = '#f0d4b8'; x.beginPath(); x.moveTo(TILE + 4, 30); x.lineTo(166, 100); x.lineTo(166, 196); x.lineTo(TILE + 4, 256); x.fill();
    x.fillStyle = '#3b6fb0'; x.beginPath(); x.moveTo(TILE + 4, 16); x.lineTo(160, 94); x.lineTo(166, 104); x.lineTo(TILE + 4, 44); x.fill();
    x.fillStyle = '#3a4a5a'; x.fillRect(206, 116, 18, 28); x.fillStyle = '#9ad0ee'; x.fillRect(208, 118, 14, 11);
    tree(x, 60, 232, 14, { col: '#58a64c', hi: '#98d060' });
  },
  // a cellar light at ground level: grass at eye height, fence posts, flowers, the neighbours' wall behind
  yard(x, r) {
    sky(x, '#4a9ee6', '#a8d8f4', 0, 84, '#f6efd6');
    cloud(x, 70, 36, 40);
    house(x, 130, 120, 84, 46, { wall: '#f4ead0', roof: '#c4503a', windows: 3, depth: 24, rh: 26, chimney: 0.7, door: 0.2 });
    ridge(x, 128, 8, '#4a9a48', r, 190, 2.0, '#3a7a3c');
    fence(x, 170, -4, 260, 34);
    const lg = x.createLinearGradient(0, 160, 0, 256); lg.addColorStop(0, '#5fa84a'); lg.addColorStop(1, '#2f7a38'); x.fillStyle = lg; x.fillRect(0, 168, TILE, 88);
    // blades of grass
    for (let i = 0; i < 160; i++) { const xx = r() * TILE, yy = 172 + r() * 84, hh = 5 + (yy - 172) * 0.16; x.strokeStyle = mix('#3f8a3a', '#a8d860', r()); x.lineWidth = 1 + (yy - 172) * 0.01; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + (r() - 0.5) * 6, yy - hh); x.stroke(); }
    flowers(x, 190, 250, r, 22, ['#f2d24a', '#f4f0e8', '#e8643c']);
  },
};

// ------------------------------------------------------------------ the atlas
let atlas = null;
function buildAtlas() {
  if (atlas) return atlas;
  const tex = canvasTex(TILE * COLS, TILE * ROWS, (x) => {
    x.fillStyle = '#8cc4f0'; x.fillRect(0, 0, TILE * COLS, TILE * ROWS);
    for (const [name, i] of Object.entries(TILES)) {
      x.save(); x.translate((i % COLS) * TILE, Math.floor(i / COLS) * TILE);
      x.beginPath(); x.rect(0, 0, TILE, TILE); x.clip();
      PAINT[name](x, rand(1000 + i * 77));
      glare(x);
      x.restore();
    }
  });
  atlas = { tex, mat: M('winviewatlas', () => { const m = new THREE.MeshBasicMaterial({ map: tex }); m.userData.noShadow = true; return m; }) };
  return atlas;
}
export function windowViewMaterial() { return buildAtlas().mat; }
export function paintedAtlasCanvas() { return buildAtlas().tex.image; }   // (for looking at it)

// the plane for one window's view: UVs on the window's tile, inset by the gutter so mipmaps don't bleed across tiles
const GEO = new Map();
export function viewPlaneGeo(tile, w, h) {
  const key = `${tile}|${w.toFixed(3)}|${h.toFixed(3)}`;
  let g = GEO.get(key);
  if (!g) {
    g = new THREE.PlaneGeometry(w, h); g.userData.keepUV = true;
    const i = TILES[tile] ?? 0, W = TILE * COLS, H = TILE * ROWS, c = i % COLS, rw = Math.floor(i / COLS);
    const u0 = (c * TILE + GUTTER) / W, u1 = ((c + 1) * TILE - GUTTER) / W;
    let v1 = 1 - (rw * TILE + GUTTER) / H, v0 = 1 - ((rw + 1) * TILE - GUTTER) / H;   // (canvas y runs down, texture v up)
    // a tall opening (a door) shows the middle of the tile instead of stretching it
    const asp = h / w, keep = asp > 1.25 ? 1.25 / asp : 1, vm = (v0 + v1) / 2, vh = (v1 - v0) * keep / 2;
    v0 = vm - vh; v1 = vm + vh;
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
    GEO.set(key, g);
  }
  return g;
}

// Where the view plane goes for a window in a wall frame (local x along the wall, z out of the wall into the room,
// the glass at z = -0.45 t): `side` is the way the eye drifts along x going out through the wall: -1 for the north
// wall (towards -x), +1 for the west wall (the frame is turned a quarter turn). Returns { geo, x, y, z }.
export function windowViewPlane(tile, { at, w, h, y0 }, t, side, depth = 0.55) {
  const D = t + depth, drift = Math.tan(0.58) / Math.cos(Math.PI / 4);
  // what shows through the opening: the inner rim and the outer rim of the reveal, offset by the drift across the wall
  const vw = Math.max(0.3, w - t), vh = Math.max(0.3, h - drift * t);
  const cx = at - side * t / 2, cy = y0 + (h + drift * t) / 2;   // the visible middle, on the inner face
  const pw = vw + 0.4, ph = vh + 0.4;
  return { geo: viewPlaneGeo(tile, pw, ph), x: cx + side * D, y: cy - drift * D, z: -D };
}
