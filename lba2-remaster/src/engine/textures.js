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
    // (a warmer, slightly olive green like Citadel's lawns: the cool pure green read as neon under the sun)
    x.fillStyle = '#5a8a38'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 40, ['#4c7a30', '#6a9642', '#537f33', '#76a24a'], 20, 60, 0.6);
    x.lineCap = 'round';
    for (let i = 0; i < 700; i++) {
      const px = r() * S, py = r() * S, l = 3 + r() * 5, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      x.strokeStyle = ['#3f6e2a', '#86b450', '#4a7e2e', '#98c060'][Math.floor(r() * 4)];
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
    x.fillStyle = '#9c6c44'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 40, ['#8a5c38', '#ab7b52', '#80543a'], 15, 40, 0.6);
    for (let i = 0; i < 120; i++) {
      const px = r() * S, py = r() * S, rr = 1.5 + r() * 3.5;
      wrap(S, (ox, oy) => {
        x.fillStyle = 'rgba(80,58,36,0.5)'; x.beginPath(); x.ellipse(px + ox + 0.8, py + oy + 0.8, rr, rr * 0.7, 0, 0, 7); x.fill();
        x.fillStyle = ['#b8946e', '#957a60', '#c4a682'][i % 3]; x.beginPath(); x.ellipse(px + ox, py + oy, rr, rr * 0.7, 0, 0, 7); x.fill();
      });
    }
    T.dirt = toTex(c);
  }
  // paving (streets and the square), as on Citadel Island: grey rectangular
  // setts laid in running bond, each a little different in tone and wear,
  // bevelled edges catching the light, dark joints
  {
    const N = 512, ROWS = 10, PER = 5;
    const [c, x] = canvas(N); const r = rng(15);
    x.fillStyle = '#4a4640'; x.fillRect(0, 0, N, N);
    const rh = N / ROWS, bw = N / PER, gap = 3;
    for (let j = 0; j < ROWS; j++) {
      const off = (j % 2) * bw / 2 + (r() - 0.5) * 6;
      for (let i = -1; i <= PER; i++) {
        const x0 = i * bw + off + gap / 2, y0 = j * rh + gap / 2, w = bw - gap - r() * 3, h = rh - gap;
        const tone = 128 + Math.floor(r() * 34), warm = r() * 10;
        const base = `rgb(${tone + warm},${tone + warm * 0.4},${tone - 4})`;
        for (const ox of [-N, 0, N]) {
          x.fillStyle = base; x.beginPath(); x.roundRect(x0 + ox, y0, w, h, 6); x.fill();
          // bevel: light top/left, dark bottom/right
          x.fillStyle = 'rgba(255,250,235,0.22)'; x.fillRect(x0 + ox + 3, y0 + 2, w - 6, 4); x.fillRect(x0 + ox + 2, y0 + 3, 4, h - 6);
          x.fillStyle = 'rgba(30,26,20,0.28)'; x.fillRect(x0 + ox + 3, y0 + h - 6, w - 6, 4); x.fillRect(x0 + ox + w - 6, y0 + 3, 4, h - 6);
          // wear and grain
          for (let k = 0; k < 14; k++) {
            x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
            x.beginPath(); x.ellipse(x0 + ox + 8 + r() * (w - 16), y0 + 6 + r() * (h - 12), 3 + r() * 10, 2 + r() * 5, r() * 3, 0, 7); x.fill();
          }
          if (r() < 0.2) { x.strokeStyle = 'rgba(40,36,30,0.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(x0 + ox + r() * w, y0 + 2); x.lineTo(x0 + ox + r() * w, y0 + h - 2); x.stroke(); }
        }
      }
    }
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
  islandTextures(T);
  return T;
}

// ------------------------------------------------------------------ island kit
// Textures for the outdoor island (island.js): cliffs, rubble walls, planks,
// and the Joint Project's "Zeelich tech" metals.
function rivetRow(x, x0, y0, x1, y1, n, r = 2.2) {
  for (let i = 0; i <= n; i++) {
    const px = x0 + (x1 - x0) * (i / n), py = y0 + (y1 - y0) * (i / n);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.arc(px + 0.8, py + 1, r, 0, 7); x.fill();
    const g = x.createRadialGradient(px - r * 0.4, py - r * 0.4, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,240,0.9)'); g.addColorStop(1, 'rgba(120,110,90,0.6)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
}

function islandTextures(T) {
  const S = 256;
  // cliff rock (LBA2 Citadel cliffs): grey-violet, horizontal strata, faceted
  // light planes and dark cracks; used triplanar on the terrain
  {
    const N = 512;
    const [c, x] = canvas(N); const r = rng(101);
    x.fillStyle = '#8e8796'; x.fillRect(0, 0, N, N);
    // strata bands
    let y = 0;
    while (y < N) {
      const h = 18 + r() * 40, tone = r();
      x.fillStyle = tone < 0.33 ? '#7c7586' : tone < 0.66 ? '#a29bab' : '#918a99';
      wrap(N, (ox, oy) => { x.beginPath(); x.moveTo(ox, y + oy); for (let k = 0; k <= N; k += 32) x.lineTo(k + ox, y + oy + Math.sin(k * 0.03 + y) * 4); x.lineTo(N + ox, y + h + oy); x.lineTo(ox, y + h + oy); x.fill(); });
      y += h;
    }
    // faceted chunks: light top planes, dark undersides
    for (let i = 0; i < 160; i++) {
      const px = r() * N, py = r() * N, w = 14 + r() * 40, h = 8 + r() * 22;
      const pts = [[0, 0], [w * (0.4 + r() * 0.3), -h * (0.3 + r() * 0.4)], [w, r() * h * 0.2], [w * (0.5 + r() * 0.3), h], [w * 0.1, h * (0.6 + r() * 0.3)]];
      const tone = r();
      x.fillStyle = tone < 0.4 ? 'rgba(220,214,226,0.55)' : tone < 0.75 ? 'rgba(70,62,82,0.45)' : 'rgba(150,140,160,0.5)';
      wrap(N, (ox, oy) => { x.beginPath(); pts.forEach(([a, b], k) => (k ? x.lineTo(px + a + ox, py + b + oy) : x.moveTo(px + a + ox, py + b + oy))); x.closePath(); x.fill(); });
      // highlight edge on top
      x.strokeStyle = 'rgba(245,240,250,0.5)'; x.lineWidth = 1.5;
      wrap(N, (ox, oy) => { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + pts[1][0] + ox, py + pts[1][1] + oy); x.lineTo(px + pts[2][0] + ox, py + pts[2][1] + oy); x.stroke(); });
    }
    // dark cracks, mostly horizontal with vertical joints
    x.strokeStyle = 'rgba(40,32,48,0.7)'; x.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      let px = r() * N, py = r() * N;
      const vert = r() < 0.35;
      const pts = [[px, py]];
      for (let k = 0; k < 5; k++) { px += vert ? (r() - 0.5) * 10 : 10 + r() * 22; py += vert ? 8 + r() * 14 : (r() - 0.5) * 9; pts.push([px, py]); }
      wrap(N, (ox, oy) => { x.beginPath(); pts.forEach(([a, b], k) => (k ? x.lineTo(a + ox, b + oy) : x.moveTo(a + ox, b + oy))); x.stroke(); });
    }
    speckle(x, N, r, 900, ['#d8d2de', '#5c5468', '#b4adbc'], 0.5, 0.3);
    T.cliff = toTex(c);
  }
  // rubble stone (LBA2 harbour houses and embankments): rounded irregular
  // stones, lit from the upper left, dark mortar
  {
    const N = 256;
    const [c, x] = canvas(N); const r = rng(102);
    x.fillStyle = '#3e3a3a'; x.fillRect(0, 0, N, N);
    const stones = [];
    for (let i = 0; i < 900 && stones.length < 90; i++) {
      const px = r() * N, py = r() * N, rx = 9 + r() * 13, ry = 7 + r() * 8;
      let ok = true;
      for (const s of stones) {
        let dx = Math.abs(s[0] - px), dy = Math.abs(s[1] - py);
        dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy);
        if ((dx / (s[2] + rx)) ** 2 + (dy / (s[3] + ry)) ** 2 < 0.62) { ok = false; break; }
      }
      if (ok) stones.push([px, py, rx, ry, r() * 0.6 - 0.3, r()]);
    }
    for (const [px, py, rx, ry, rot, tone] of stones) {
      const base = 120 + tone * 70;
      wrap(N, (ox, oy) => {
        x.save(); x.translate(px + ox, py + oy); x.rotate(rot);
        x.fillStyle = 'rgba(20,16,16,0.5)'; x.beginPath(); x.ellipse(1.5, 2, rx, ry, 0, 0, 7); x.fill();
        const g = x.createRadialGradient(-rx * 0.35, -ry * 0.45, 0, 0, 0, Math.max(rx, ry) * 1.1);
        g.addColorStop(0, `rgb(${base + 70},${base + 66},${base + 62})`);
        g.addColorStop(0.55, `rgb(${base},${base - 4},${base - 6})`);
        g.addColorStop(1, `rgb(${base - 60},${base - 64},${base - 64})`);
        x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, 7); x.fill();
        x.restore();
      });
    }
    speckle(x, N, r, 300, ['#e8e2da', '#2a2626'], 0.35, 0.3);
    T.rubble = toTex(c);
  }
  // weathered planks (pier deck, plank roofs): horizontal boards, nail heads
  {
    const [c, x] = canvas(S); const r = rng(103);
    const n = 8, h = S / n;
    for (let j = 0; j < n; j++) {
      const tone = r();
      x.fillStyle = tone < 0.33 ? '#8d6e52' : tone < 0.66 ? '#9b7b5c' : '#82664c';
      x.fillRect(0, j * h, S, h);
      x.strokeStyle = 'rgba(60,40,24,0.28)'; x.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const py = j * h + 3 + r() * (h - 6); x.beginPath(); x.moveTo(0, py); x.bezierCurveTo(S / 3, py + (r() - 0.5) * 4, S * 0.66, py + (r() - 0.5) * 4, S, py); x.stroke(); }
      x.fillStyle = 'rgba(255,240,220,0.18)'; x.fillRect(0, j * h + 1, S, 2);
      x.fillStyle = 'rgba(30,18,8,0.75)'; x.fillRect(0, j * h + h - 2, S, 2);
      const cut = r() * S; x.fillRect(cut, j * h, 2, h);
      x.fillStyle = 'rgba(30,24,20,0.7)';
      for (const px of [cut + 6, cut - 6, (cut + S / 2) % S]) { x.beginPath(); x.arc(px, j * h + h * 0.3, 1.3, 0, 7); x.arc(px, j * h + h * 0.7, 1.3, 0, 7); x.fill(); }
    }
    speckle(x, S, r, 200, ['#5a4430', '#c8b090'], 0.3, 0.3);
    T.planks = toTex(c);
  }
  // brushed brass plates with rivet rows at the seams
  {
    const [c, x] = canvas(S); const r = rng(104);
    x.fillStyle = '#b8924a'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) { const py = r() * S; x.strokeStyle = r() < 0.5 ? 'rgba(255,230,170,0.16)' : 'rgba(90,60,20,0.14)'; x.lineWidth = 1 + r(); x.beginPath(); x.moveTo(0, py); x.lineTo(S, py + (r() - 0.5) * 2); x.stroke(); }
    blotches(x, S, r, 14, ['#8a6a30', '#d8b468', '#a07a38'], 20, 60, 0.35);
    for (const py of [0, S / 2]) { x.fillStyle = 'rgba(60,40,10,0.55)'; x.fillRect(0, py, S, 2); x.fillStyle = 'rgba(255,235,180,0.35)'; x.fillRect(0, py + 2, S, 1); rivetRow(x, 6, py + 8, S - 6, py + 8, 10); }
    for (const px of [0, S / 2]) { x.fillStyle = 'rgba(60,40,10,0.5)'; x.fillRect(px, 0, 2, S); }
    T.brass = toTex(c);
  }
  // teal-painted steel plates (Zeelich tech): rivets, chipped paint, grime
  {
    const [c, x] = canvas(S); const r = rng(105);
    x.fillStyle = '#2f8c8a'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 26, ['#277a78', '#38a09c', '#2c8482', '#24706e'], 20, 60, 0.5);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const px = i * S / 2, py = j * S / 2;
      x.strokeStyle = 'rgba(10,40,40,0.6)'; x.lineWidth = 3; x.strokeRect(px + 1.5, py + 1.5, S / 2 - 3, S / 2 - 3);
      x.strokeStyle = 'rgba(150,230,220,0.25)'; x.lineWidth = 1; x.strokeRect(px + 4, py + 4, S / 2 - 8, S / 2 - 8);
      rivetRow(x, px + 9, py + 9, px + S / 2 - 9, py + 9, 6, 2);
      rivetRow(x, px + 9, py + S / 2 - 9, px + S / 2 - 9, py + S / 2 - 9, 6, 2);
    }
    for (let i = 0; i < 40; i++) { x.fillStyle = r() < 0.5 ? 'rgba(160,150,130,0.6)' : 'rgba(110,70,40,0.35)'; x.beginPath(); x.ellipse(r() * S, r() * S, 1 + r() * 4, 1 + r() * 2, r() * 3, 0, 7); x.fill(); }
    const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,25,15,0.18)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    T.teal = toTex(c);
  }
  // yellow-black hazard stripes, worn
  {
    const [c, x] = canvas(128); const r = rng(106);
    x.fillStyle = '#1e1e1c'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#e8b51e';
    for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64 + 32, 0); x.lineTo(i * 64 + 32 + 128, 128); x.lineTo(i * 64 + 128, 128); x.fill(); }
    speckle(x, 128, r, 120, ['#5a5040', '#2a2620', '#c8a040'], 0.6, 0.4);
    T.hazard = toTex(c);
  }
  // lavender-grey metal deck plate with a diamond tread and seams (#07/#60)
  {
    const [c, x] = canvas(S); const r = rng(107);
    x.fillStyle = '#8f8a9c'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 16, ['#857f92', '#9a95a6'], 20, 60, 0.4);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const px = i * 16 + (j % 2) * 8, py = j * 16 + 8, a = (i + j) % 2 ? 0.6 : -0.6;
      x.save(); x.translate(px, py); x.rotate(a);
      x.fillStyle = 'rgba(40,36,50,0.4)'; x.fillRect(-5, -0.5, 10, 3);
      x.fillStyle = 'rgba(230,226,240,0.45)'; x.fillRect(-5, -1.5, 10, 1.5);
      x.restore();
    }
    x.fillStyle = 'rgba(30,26,40,0.7)'; x.fillRect(0, 0, S, 3); x.fillRect(0, 0, 3, S);
    rivetRow(x, 8, 8, S - 8, 8, 12, 2); rivetRow(x, 8, 8, 8, S - 8, 12, 2);
    T.deck = toTex(c);
  }
  // blue-grey slate shingles (Funfrock-era tower roofs)
  {
    const [c, x] = canvas(S); const r = rng(108);
    x.fillStyle = '#2c3240'; x.fillRect(0, 0, S, S);
    const rows = 10, cols = 9, w = S / cols, h = S / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
      const px = i * w + (j % 2) * w / 2, py = j * h, tone = 80 + r() * 40;
      const g = x.createLinearGradient(0, py, 0, py + h * 1.3);
      g.addColorStop(0, `rgb(${tone - 10},${tone},${tone + 18})`); g.addColorStop(1, `rgb(${tone - 40},${tone - 34},${tone - 20})`);
      x.fillStyle = g; x.beginPath(); x.roundRect(px + 1, py, w - 2, h * 1.25, [0, 0, 5, 5]); x.fill();
    }
    T.slate = toTex(c);
  }
  // Funfrock's fortress masonry: big grey-blue ashlar blocks, weathered
  {
    const [c, x] = canvas(S); const r = rng(109);
    x.fillStyle = '#4a4f58'; x.fillRect(0, 0, S, S);
    const rows = 5, rh = S / rows;
    for (let j = 0; j < rows; j++) {
      let xx = -r() * 60;
      while (xx < S) {
        const w = 60 + r() * 50, tone = 120 + r() * 36;
        wrap(S, (ox) => {
          const g = x.createLinearGradient(0, j * rh, 0, j * rh + rh);
          g.addColorStop(0, `rgb(${tone + 14},${tone + 20},${tone + 30})`); g.addColorStop(1, `rgb(${tone - 22},${tone - 18},${tone - 8})`);
          x.fillStyle = g; x.beginPath(); x.roundRect(xx + ox + 2, j * rh + 2, w - 4, rh - 4, 4); x.fill();
        });
        xx += w;
      }
    }
    blotches(x, S, r, 20, ['#3a4048', '#6a7480', '#55606a'], 15, 50, 0.3);
    for (let i = 0; i < 18; i++) { const px = r() * S, py = r() * S; x.strokeStyle = 'rgba(30,30,36,0.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 20, py + 6 + r() * 14); x.stroke(); }
    speckle(x, S, r, 400, ['#2e3238', '#a8b0bc'], 0.4, 0.3);
    T.fortStone = toTex(c);
  }
  // chain-link mesh (alpha), for the depot fence
  {
    const [c, x] = canvas(64);
    x.clearRect(0, 0, 64, 64);
    x.strokeStyle = '#c8ccd0'; x.lineWidth = 2.2;
    for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 64, 64); x.stroke(); x.beginPath(); x.moveTo(i * 32 + 64, 0); x.lineTo(i * 32, 64); x.stroke(); }
    x.strokeStyle = 'rgba(60,64,70,0.8)'; x.lineWidth = 0.8;
    for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * 32 + 1, 0); x.lineTo(i * 32 + 65, 64); x.stroke(); }
    T.chain = toTex(c);
  }
  // pipeline sections: teal steel with longitudinal weld seam and circumferential rivet bands
  {
    const [c, x] = canvas(S); const r = rng(110);
    x.fillStyle = '#3a8f8c'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 22, ['#2f7f7c', '#46a09c', '#357f7c'], 15, 50, 0.45);
    for (const px of [0, S / 2]) { x.fillStyle = 'rgba(10,40,40,0.55)'; x.fillRect(px, 0, 3, S); rivetRow(x, px + 9, 6, px + 9, S - 6, 12, 2.2); }
    x.fillStyle = 'rgba(200,255,250,0.12)'; x.fillRect(0, S * 0.2, S, S * 0.08);
    for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(120,80,50,0.3)'; x.beginPath(); x.ellipse(r() * S, r() * S, 1 + r() * 5, 1 + r() * 2, 0, 0, 7); x.fill(); }
    T.pipe = toTex(c);
  }
  // concrete / poured stone (pads, plinths of machines)
  {
    const [c, x] = canvas(S); const r = rng(111);
    x.fillStyle = '#a9a39a'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 30, ['#9c968c', '#b8b2a8', '#a39d92'], 15, 50, 0.5);
    x.fillStyle = 'rgba(60,56,50,0.6)'; x.fillRect(0, 0, S, 2); x.fillRect(0, 0, 2, S);
    speckle(x, S, r, 600, ['#7a756c', '#d0cbc2'], 0.45, 0.3);
    T.concrete = toTex(c);
  }
  // neutral painted sheet metal (tinted per use): chipped paint, streaks, grime at the bottom
  {
    const [c, x] = canvas(S); const r = rng(112);
    x.fillStyle = '#d4d4d4'; x.fillRect(0, 0, S, S);
    blotches(x, S, r, 26, ['#c8c8c8', '#e0e0e0', '#bcbcbc'], 15, 50, 0.45);
    for (let i = 0; i < 70; i++) { const px = r() * S, py = r() * S; x.strokeStyle = `rgba(90,80,70,${0.08 + r() * 0.12})`; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 3, py + 10 + r() * 40); x.stroke(); }
    for (let i = 0; i < 50; i++) { x.fillStyle = r() < 0.6 ? 'rgba(120,100,80,0.45)' : 'rgba(250,250,250,0.5)'; x.beginPath(); x.ellipse(r() * S, r() * S, 1 + r() * 4, 1 + r() * 2, r() * 3, 0, 7); x.fill(); }
    const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(70,55,40,0.25)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    T.metal = toTex(c);
  }
}

let cache = null;
export const textures = () => (cache ??= makeTextures());
