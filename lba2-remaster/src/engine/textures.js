// Hand-painted-style tileable textures, generated on a canvas at startup.
// LBA2's exteriors were texture-mapped polygons with a bright, painterly
// palette; these imitate that look without using any original artwork.
import * as THREE from 'three';
import { rng } from './math.js';

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

// Draw something 9 times with wrap-around offsets so the tile is seamless.
function wrap(size, fn) {
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy);
}

function toTex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function speckle(x, size, r, n, colors, alpha = 1, minR = 0.5) {
  for (let i = 0; i < n; i++) {
    const px = r() * size, py = r() * size, rr = minR + r() * 2.2;
    x.globalAlpha = alpha * (0.4 + r() * 0.6);
    x.fillStyle = colors[Math.floor(r() * colors.length)];
    wrap(size, (ox, oy) => { x.beginPath(); x.arc(px + ox, py + oy, rr, 0, Math.PI * 2); x.fill(); });
  }
  x.globalAlpha = 1;
}

function transparent(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},0)`;
}

function blotches(x, size, r, n, colors, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    const px = r() * size, py = r() * size, rr = rmin + r() * (rmax - rmin);
    const col = colors[Math.floor(r() * colors.length)];
    wrap(size, (ox, oy) => {
      const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rr);
      g.addColorStop(0, col);
      g.addColorStop(1, transparent(col)); // fade to the same colour, not to black
      x.globalAlpha = alpha;
      x.fillStyle = g;
      x.fillRect(px + ox - rr, py + oy - rr, rr * 2, rr * 2);
    });
  }
  x.globalAlpha = 1;
}

export function makeTextures() {
  const T = {};
  const S = 256;

  // grass: bright LBA green with painted tufts
  {
    const [c, x] = canvas(S); const r = rng(11);
    x.fillStyle = '#5a9e3c'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 40, ['#4d8f33', '#6fb048', '#57983a', '#7cb854'], 20, 60, 0.6);
    x.lineCap = 'round';
    for (let i = 0; i < 700; i++) {
      const px = r() * S, py = r() * S, l = 3 + r() * 5, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      x.strokeStyle = ['#3f8526', '#8ed35a', '#4c9a2f', '#a4dd6a'][Math.floor(r() * 4)];
      x.lineWidth = 1 + r();
      wrap(S, (ox, oy) => { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + Math.cos(a) * l, py + oy + Math.sin(a) * l); x.stroke(); });
    }
    speckle(x, S, r, 25, ['#fff6a0', '#ffffff', '#ffb0c8'], 0.9, 0.8);
    T.grass = toTex(c);
  }
  // sand
  {
    const [c, x] = canvas(S); const r = rng(12);
    x.fillStyle = '#e8d49a'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 30, ['#f2e0aa', '#d9c084', '#efd99e'], 20, 50, 0.6);
    x.strokeStyle = 'rgba(190,160,100,0.35)'; x.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const y = r() * S, ph = r() * 6;
      wrap(S, (ox, oy) => { x.beginPath(); for (let k = 0; k <= S; k += 8) x.lineTo(k + ox, y + oy + Math.sin(k * 0.05 + ph) * 3); x.stroke(); });
    }
    speckle(x, S, r, 500, ['#c9ad70', '#fff1c4', '#b89a5e'], 0.7, 0.3);
    T.sand = toTex(c);
  }
  // rock (cliffs)
  {
    const [c, x] = canvas(S); const r = rng(13);
    x.fillStyle = '#9b8c78'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 50, ['#8a7a66', '#b09f88', '#a39079', '#7e705e'], 15, 45, 0.7);
    x.strokeStyle = 'rgba(70,58,46,0.55)'; x.lineWidth = 1.6;
    for (let i = 0; i < 30; i++) {
      let px = r() * S, py = r() * S;
      const pts = [[px, py]];
      for (let k = 0; k < 4; k++) { px += (r() - 0.3) * 22; py += (r() - 0.5) * 14; pts.push([px, py]); }
      wrap(S, (ox, oy) => { x.beginPath(); pts.forEach(([a, b], k) => (k ? x.lineTo(a + ox, b + oy) : x.moveTo(a + ox, b + oy))); x.stroke(); });
    }
    speckle(x, S, r, 300, ['#c7b8a0', '#6b5d4c'], 0.6, 0.4);
    T.rock = toTex(c);
  }
  // dirt path
  {
    const [c, x] = canvas(S); const r = rng(14);
    x.fillStyle = '#b48a58'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 40, ['#a07a4a', '#c39a66', '#9a7044'], 15, 40, 0.6);
    for (let i = 0; i < 120; i++) {
      const px = r() * S, py = r() * S, rr = 1.5 + r() * 3.5;
      wrap(S, (ox, oy) => {
        x.fillStyle = 'rgba(80,58,36,0.5)'; x.beginPath(); x.ellipse(px + ox + 0.8, py + oy + 0.8, rr, rr * 0.7, 0, 0, 7); x.fill();
        x.fillStyle = ['#cdb08a', '#a99274', '#d8c4a0'][i % 3]; x.beginPath(); x.ellipse(px + ox, py + oy, rr, rr * 0.7, 0, 0, 7); x.fill();
      });
    }
    T.dirt = toTex(c);
  }
  // cobblestones (streets and the square): irregular rounded setts from a
  // tileable Voronoi pattern, each stone with its own tone, a lit top-left
  // shoulder, a shaded rim and dark sandy joints between them
  {
    const N = 512, G = 14; // 14×14 stones per tile
    const [c, x] = canvas(N); const r = rng(15);
    const pts = [];
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) pts.push([(i + 0.5 + (r() - 0.5) * 0.7) / G, (j + 0.5 + (r() - 0.5) * 0.7) / G, 0.78 + r() * 0.34, r()]);
    const img = x.createImageData(N, N), d = img.data;
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const u = px / N, v = py / N;
      const ci = Math.floor(u * G), cj = Math.floor(v * G);
      let d1 = 9, d2 = 9, best = null, bx = 0, by = 0;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
        const ii = ((ci + di) % G + G) % G, jj = ((cj + dj) % G + G) % G;
        const p = pts[jj * G + ii];
        const qx = p[0] + Math.floor((ci + di) / G), qy = p[1] + Math.floor((cj + dj) / G);
        const dd = Math.hypot(u - qx, v - qy);
        if (dd < d1) { d2 = d1; d1 = dd; best = p; bx = u - qx; by = v - qy; } else if (dd < d2) d2 = dd;
      }
      const edge = (d2 - d1) * G;                       // 0 at the joint, ~1 in the middle
      const stone = Math.min(1, Math.max(0, (edge - 0.07) / 0.12));
      const dome = Math.min(1, edge * 1.6);
      const light = 1 + (-bx - by) * G * 0.55 * (1 - dome) + dome * 0.06; // lit from the top-left
      const grain = (Math.sin(px * 1.7 + py * 0.9) * Math.sin(px * 0.6 - py * 1.3)) * 0.04 + (r() - 0.5) * 0.06;
      const t = best[2] * (light + grain);
      const warm = best[3];
      const sr = (150 + warm * 22) * t, sg = (144 + warm * 12) * t, sb = (132 - warm * 6) * t; // grey-beige stones, some warmer
      const jr = 92, jg = 82, jb = 66;                    // sandy joints
      const k = (py * N + px) * 4;
      d[k] = jr + (sr - jr) * stone; d[k + 1] = jg + (sg - jg) * stone; d[k + 2] = jb + (sb - jb) * stone; d[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    T.cobble = toTex(c);
  }
  // plaster wall
  {
    const [c, x] = canvas(S); const r = rng(16);
    x.fillStyle = '#f3ead6'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 30, ['#e6dbc2', '#fbf4e4', '#e9dcc0'], 20, 60, 0.7);
    speckle(x, S, r, 200, ['#d8cbb0', '#fffaf0'], 0.5, 0.3);
    // stone base band at the bottom (V=0 is the bottom after flipY)
    for (let i = 0; i < 9; i++) {
      x.fillStyle = ['#a39886', '#b3a892', '#968b79'][i % 3];
      x.fillRect(i * (S / 8) - 10, S - 34 + (i % 2) * 2, S / 8 - 3, 30);
    }
    T.plaster = toTex(c);
  }
  // plaster without the stone band (exterior walls sit on a modelled plinth)
  {
    const [c, x] = canvas(S); const r = rng(26);
    x.fillStyle = '#f2e8d2'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 34, ['#e8dcc2', '#fbf4e4', '#eadcbe', '#f6ead0'], 18, 60, 0.7);
    // faint trowel strokes and a few cracks
    x.strokeStyle = 'rgba(180,160,130,0.18)'; x.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const px = r() * S, py = r() * S; wrap(S, (ox, oy) => { x.beginPath(); x.arc(px + ox, py + oy, 10 + r() * 20, r() * 6, r() * 6 + 1.2); x.stroke(); }); }
    x.strokeStyle = 'rgba(120,100,80,0.35)'; x.lineWidth = 1;
    for (let i = 0; i < 4; i++) { let px = r() * S, py = r() * S; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 14; py += r() * 12; x.lineTo(px, py); } x.stroke(); }
    speckle(x, S, r, 260, ['#d6c8aa', '#fffaf0', '#cdbf9f'], 0.5, 0.3);
    T.plasterWall = toTex(c);
  }
  // dressed stone (plinths, quoins, sills, surrounds)
  {
    const [c, x] = canvas(S); const r = rng(27);
    x.fillStyle = '#7d756a'; x.fillRect(0, 0, S, S);
    let y = 0;
    while (y < S) {
      const h = 34 + Math.floor(r() * 26);
      let xx = -Math.floor(r() * 40);
      while (xx < S) {
        const w = 46 + Math.floor(r() * 50);
        const tone = 150 + Math.floor(r() * 40);
        wrap(S, (ox, oy) => {
          const g = x.createLinearGradient(0, y + oy, 0, y + oy + h);
          g.addColorStop(0, `rgb(${tone + 22},${tone + 16},${tone + 6})`);
          g.addColorStop(1, `rgb(${tone - 18},${tone - 22},${tone - 28})`);
          x.fillStyle = g;
          x.beginPath(); x.roundRect(xx + ox + 2, y + oy + 2, w - 4, Math.min(h, S - y) - 4, 6); x.fill();
        });
        xx += w;
      }
      y += h;
    }
    speckle(x, S, r, 400, ['#5f574c', '#c8bea8', '#8f8676'], 0.5, 0.3);
    T.stone = toTex(c);
  }
  // bricks (chimneys, garden walls)
  {
    const [c, x] = canvas(S); const r = rng(28);
    x.fillStyle = '#8a7a6a'; x.fillRect(0, 0, S, S);
    const bh = 22, bw = 52;
    for (let j = 0; j * bh < S; j++) for (let i = -1; i * bw < S; i++) {
      const tone = r();
      x.fillStyle = tone < 0.3 ? '#a84a32' : tone < 0.7 ? '#b85a3a' : '#9a4030';
      x.fillRect(i * bw + (j % 2) * bw / 2 + 2, j * bh + 2, bw - 4, bh - 4);
    }
    speckle(x, S, r, 300, ['#6a2a1a', '#d8805a'], 0.5, 0.3);
    T.brick = toTex(c);
  }
  // terracotta roof tiles
  {
    const [c, x] = canvas(S); const r = rng(17);
    x.fillStyle = '#a8442c'; x.fillRect(0, 0, S, S);
    const rows = 10, cols = 8, w = S / cols, h = S / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
      const px = i * w + (j % 2) * w / 2, py = j * h;
      const tone = r();
      const g = x.createLinearGradient(0, py, 0, py + h);
      g.addColorStop(0, tone > 0.5 ? '#d9714a' : '#cf6440');
      g.addColorStop(1, '#8f3522');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(px + 1, py);
      x.lineTo(px + w - 1, py);
      x.lineTo(px + w - 1, py + h * 0.7);
      x.quadraticCurveTo(px + w / 2, py + h * 1.15, px + 1, py + h * 0.7);
      x.closePath(); x.fill();
    }
    T.roof = toTex(c);
  }
  // blue slate roof variant
  {
    const [c, x] = canvas(S);
    x.drawImage(T.roof.image, 0, 0);
    x.globalCompositeOperation = 'hue';
    x.fillStyle = '#3a6fd0'; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = 'source-over';
    T.roofBlue = toTex(c);
  }
  // wooden planks
  {
    const [c, x] = canvas(S); const r = rng(18);
    const n = 6, w = S / n;
    for (let i = 0; i < n; i++) {
      x.fillStyle = ['#8a5a32', '#7d5029', '#94643a'][i % 3];
      x.fillRect(i * w, 0, w, S);
      x.strokeStyle = 'rgba(60,36,18,0.35)'; x.lineWidth = 1;
      for (let k = 0; k < 6; k++) { const px = i * w + r() * w; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + 3, S / 3, px - 3, S * 0.66, px, S); x.stroke(); }
      x.fillStyle = 'rgba(40,24,10,0.6)'; x.fillRect(i * w, 0, 2, S);
    }
    T.wood = toTex(c);
  }
  // sea: painted wave crests
  {
    const [c, x] = canvas(S); const r = rng(19);
    x.fillStyle = '#2f86c4'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 40, ['#2676b4', '#3a96d2', '#2a80c0'], 20, 60, 0.6);
    x.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const px = r() * S, py = r() * S, l = 8 + r() * 14;
      x.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(170,220,255,0.6)';
      x.lineWidth = 1.5 + r() * 1.5;
      wrap(S, (ox, oy) => { x.beginPath(); x.moveTo(px + ox - l, py + oy); x.quadraticCurveTo(px + ox, py + oy - 4, px + ox + l, py + oy); x.stroke(); });
    }
    T.sea = toTex(c);
  }
  // cloud ceiling (LBA2 draws the sky as a flat textured plane)
  {
    const [c, x] = canvas(512); const r = rng(20);
    x.fillStyle = '#7fb4ec'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) {
      const px = r() * 512, py = r() * 512, rr = 30 + r() * 60;
      for (let k = 0; k < 6; k++) {
        const qx = px + (r() - 0.5) * rr * 1.6, qy = py + (r() - 0.5) * rr * 0.7, q = rr * (0.4 + r() * 0.5);
        wrap(512, (ox, oy) => {
          const g = x.createRadialGradient(qx + ox, qy + oy - q * 0.2, 0, qx + ox, qy + oy, q);
          g.addColorStop(0, 'rgba(255,255,255,0.95)');
          g.addColorStop(0.6, 'rgba(240,246,255,0.6)');
          g.addColorStop(1, 'rgba(255,255,255,0)'); // white-to-clear: no darkening
          x.fillStyle = g; x.fillRect(qx + ox - q, qy + oy - q, q * 2, q * 2);
        });
      }
    }
    T.clouds = toTex(c);
  }
  // soft round shadow (LBA2 draws a shaded quad under every actor)
  {
    const [c, x] = canvas(64);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    T.blob = toTex(c, false);
  }
  return T;
}

let cache = null;
export const textures = () => (cache ??= makeTextures());
