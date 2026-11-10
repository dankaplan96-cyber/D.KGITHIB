/* המשמרת — all art is drawn in code: tiles, furniture, people, creatures, backdrops. */
'use strict';
const Art = (() => {
  const T = TILE;

  /* ================= floors & walls ================= */
  const FLOOR = {
    hall: { base: '#f1ebdf', line: '#ddd3c1', speck: '#f8f4ec', dark: '#d8ccb6' },
    ward: { base: '#e3f2ea', line: '#c9e2d4', speck: '#f1f9f4', dark: '#c3dccd' },
    lab: { base: '#e6eff7', line: '#cddcea', speck: '#f3f8fc', dark: '#c6d6e5' },
    wood: { base: '#dcb58a', line: '#c49a6c', speck: '#e6c49c', dark: '#b88d5f' },
    carpet: { base: '#e2c39d', line: '#cfaa80', speck: '#ead0ae', dark: '#c49d72' },
  };
  function drawGround(c, kind, base, tx, ty, px, py) {
    const h = (a, b) => hash(tx * 13 + a, ty * 7 + b);
    if (kind === 'grass' || kind === 'flowers' || kind === 'tallgrass') {
      c.fillStyle = (tx + ty) % 2 ? '#9fd88c' : '#a7dc93'; c.fillRect(px, py, T, T);
      c.fillStyle = '#8bcc78'; for (let i = 0; i < 6; i++) c.fillRect(px + h(i, 1) * 36 + 2, py + h(i, 2) * 34 + 3, 1.5, 4);
      if (kind === 'flowers') ['#f472b6', '#fde047', '#ffffff', '#fb923c'].forEach((col, i) => { const fx = px + 6 + h(i, 5) * 28, fy = py + 6 + h(i, 6) * 26; circle(c, fx, fy, 2.6, col); circle(c, fx, fy, 1, '#a16207'); });
      if (kind === 'tallgrass') { c.fillStyle = '#5fb35a'; c.fillRect(px + 1, py + 6, T - 2, T - 6); c.fillStyle = '#4c9e48'; for (let i = 0; i < 9; i++) { const bx = px + 2 + i * 4.2; c.beginPath(); c.moveTo(bx, py + 38); c.lineTo(bx + 2, py + 6 + (i % 3) * 3); c.lineTo(bx + 4, py + 38); c.fill(); } }
      return;
    }
    if (kind === 'path') { c.fillStyle = '#e9dcc0'; c.fillRect(px, py, T, T); c.fillStyle = '#dccca9'; c.fillRect(px, py + 19, T, 2); c.fillRect(px + (ty % 2 ? 19 : 0), py, 2, 19); c.fillRect(px + (ty % 2 ? 0 : 19), py + 21, 2, 19); return; }
    if (kind === 'road') { c.fillStyle = '#8c96a3'; c.fillRect(px, py, T, T); c.fillStyle = '#7f8a97'; for (let i = 0; i < 5; i++) c.fillRect(px + h(i, 3) * 36, py + h(i, 4) * 36, 2, 2);
      if (ty % 2 === 0) { c.fillStyle = '#f8fafc'; if (tx % 2) c.fillRect(px + 8, py + T - 3, 24, 4); } return; }
    drawFloor(c, base, tx, ty, px, py);
    if (kind === 'mat') { c.fillStyle = '#5b8fd6'; c.fillRect(px, py + 2, T, T - 4); c.fillStyle = '#4a7cc2'; c.fillRect(px, py + 2, T, 3); }
    if (kind === 'rug') { c.fillStyle = '#c2410c'; roundRect(c, px + 3, py + 8, 34, 24, 3); c.fill(); c.strokeStyle = '#fde68a'; c.lineWidth = 2; roundRect(c, px + 7, py + 12, 26, 16, 2); c.stroke(); c.fillStyle = '#9a3412'; c.fillRect(px + 30, py + 26, 7, 6); }
  }
  function drawFloor(c, kind, tx, ty, px, py) {
    if (kind === 'grass') return drawGround(c, 'grass', null, tx, ty, px, py);
    const f = FLOOR[kind] || FLOOR.hall;
    c.fillStyle = f.base; c.fillRect(px, py, T, T);
    if (kind === 'wood' || kind === 'carpet') {
      for (let i = 0; i < 4; i++) {
        c.fillStyle = i % 2 ? f.speck : f.base; c.fillRect(px, py + i * 10, T, 10);
        c.fillStyle = f.line; c.fillRect(px, py + i * 10 + 9, T, 1);
        const off = Math.floor(hash(tx * 4 + i, ty) * 30) + 5; c.fillRect(px + off, py + i * 10, 1, 9);
      }
      return;
    }
    c.fillStyle = f.line; c.fillRect(px, py + T - 1, T, 1); c.fillRect(px + T - 1, py, 1, T);
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(px, py, T, 1); c.fillRect(px, py, 1, T);
    for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? f.speck : f.dark; c.fillRect(px + hash(tx * 7 + i, ty * 3) * 36 + 2, py + hash(tx, ty * 5 + i) * 36 + 2, 2, 2); }
  }
  function drawWallFront(c, px, py) {
    c.fillStyle = '#d7ece8'; c.fillRect(px, py, T, T);
    c.fillStyle = '#e6f4f1'; c.fillRect(px, py + 4, T, 15);
    c.fillStyle = '#7cc4bb'; c.fillRect(px, py + 21, T, 3);
    c.fillStyle = '#b9ddd6'; c.fillRect(px, py + 24, T, 12);
    c.fillStyle = '#8fbfb7'; c.fillRect(px, py + 36, T, 4);
    c.fillStyle = '#9fc4c8'; c.fillRect(px, py, T, 4);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(px + T - 1, py + 4, 1, 32);
  }
  function drawWallTop(c, px, py, tx, ty) {
    c.fillStyle = '#a9c7cf'; c.fillRect(px, py, T, T);
    c.fillStyle = '#bcd6dd'; c.fillRect(px + 3, py + 3, T - 6, T - 6);
    if ((tx + ty) % 2) { c.fillStyle = '#b2cfd6'; c.fillRect(px + 10, py + 18, 20, 3); }
  }

  /* ================= wall decorations ================= */
  const WALL = {
    W(c, x, y) { roundRect(c, x + 3, y + 5, 34, 22, 2); c.fillStyle = '#cbd5e1'; c.fill(); c.fillStyle = '#f8fafc'; c.fillRect(x + 5, y + 7, 30, 18);
      c.strokeStyle = '#ef4444'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 8, y + 11); c.lineTo(x + 22, y + 11); c.stroke();
      c.strokeStyle = '#2563eb'; c.beginPath(); c.moveTo(x + 8, y + 16); c.lineTo(x + 30, y + 16); c.moveTo(x + 8, y + 21); c.lineTo(x + 18, y + 21); c.stroke();
      c.fillStyle = '#22c55e'; c.fillRect(x + 26, y + 19, 6, 4); },
    O(c, x, y) { c.fillStyle = '#d6dee6'; c.fillRect(x + 4, y + 4, 32, 26);
      const g = c.createLinearGradient(0, y + 6, 0, y + 28); g.addColorStop(0, '#6ec6ff'); g.addColorStop(1, '#c9ecff'); c.fillStyle = g; c.fillRect(x + 6, y + 6, 28, 22);
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x + 13, y + 11, 5, 2.4, 0, 0, 6.28); c.ellipse(x + 17, y + 10, 4, 2.6, 0, 0, 6.28); c.fill();
      c.fillStyle = '#ffd25e'; c.beginPath(); c.arc(x + 28, y + 11, 3, 0, 6.28); c.fill();
      c.fillStyle = '#9db6c8'; c.fillRect(x + 6, y + 20, 7, 8); c.fillRect(x + 14, y + 17, 6, 11); c.fillRect(x + 22, y + 21, 12, 7);
      c.fillStyle = '#e8f4fb'; c.fillRect(x + 8, y + 22, 1, 1); c.fillRect(x + 16, y + 19, 1, 1); c.fillRect(x + 25, y + 23, 1, 1); c.fillRect(x + 30, y + 24, 1, 1);
      c.fillStyle = '#d6dee6'; c.fillRect(x + 19, y + 6, 2, 22); c.fillStyle = '#9aa7b4'; c.fillRect(x + 3, y + 30, 34, 3); },
    m(c, x, y) { roundRect(c, x + 6, y + 4, 28, 22, 3); c.fillStyle = '#1e293b'; c.fill(); c.fillStyle = '#05121a'; c.fillRect(x + 9, y + 7, 22, 16); c.fillStyle = '#475569'; c.fillRect(x + 18, y + 26, 4, 5); },
    Q(c, x, y) { circle(c, x + 20, y + 15, 10, '#f8fafc'); c.strokeStyle = '#1e293b'; c.lineWidth = 2; c.beginPath(); c.arc(x + 20, y + 15, 10, 0, 6.28); c.stroke();
      c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 20, y + 15); c.lineTo(x + 20, y + 8); c.moveTo(x + 20, y + 15); c.lineTo(x + 25, y + 17); c.stroke(); },
    H(c, x, y) { roundRect(c, x + 14, y + 6, 12, 20, 3); c.fillStyle = '#f1f5f9'; c.fill(); c.fillStyle = '#38bdf8'; c.fillRect(x + 15, y + 8, 10, 6); c.fillStyle = '#64748b'; c.fillRect(x + 18, y + 26, 4, 3); },
    A(c, x, y) { c.fillStyle = '#fff7ed'; c.fillRect(x + 7, y + 4, 26, 26); c.fillStyle = '#f97316'; c.fillRect(x + 7, y + 4, 26, 7);
      circle(c, x + 20, y + 17, 3, '#0f766e'); c.fillStyle = '#0f766e'; c.fillRect(x + 18, y + 20, 4, 7); c.fillRect(x + 14, y + 22, 12, 2); },
    J(c, x, y) { c.fillStyle = '#e2e8f0'; c.fillRect(x + 1, y + 3, 38, 28); c.fillStyle = '#94a3b8'; c.fillRect(x, y + 2, 40, 2); },
  };

  /* ================= furniture ================= */
  const FURN = {
    B(c, x, y) { // a hospital bed, two tiles tall (head at the top)
      ellipse(c, x + 20, y + 76, 17, 4, 'rgba(0,0,0,.25)');
      c.fillStyle = '#64748b'; roundRect(c, x + 4, y + 2, 32, 10, 3); c.fill();
      c.fillStyle = '#94a3b8'; c.fillRect(x + 6, y + 4, 28, 2);
      c.fillStyle = '#cbd5e1'; roundRect(c, x + 5, y + 10, 30, 62, 4); c.fill();
      c.fillStyle = '#f8fafc'; roundRect(c, x + 6, y + 11, 28, 60, 3); c.fill();
      c.fillStyle = '#ffffff'; roundRect(c, x + 9, y + 13, 22, 11, 5); c.fill();
      c.fillStyle = '#e2e8f0'; c.fillRect(x + 10, y + 22, 20, 2);
      c.fillStyle = '#4f7cc7'; roundRect(c, x + 6, y + 30, 28, 40, 3); c.fill();
      c.fillStyle = '#6f97da'; c.fillRect(x + 6, y + 30, 28, 4);
      c.fillStyle = '#3f67ab'; c.fillRect(x + 8, y + 46, 24, 1); c.fillRect(x + 8, y + 58, 24, 1);
      c.fillStyle = '#94a3b8'; c.fillRect(x + 3, y + 26, 2, 24); c.fillRect(x + 35, y + 26, 2, 24);
      c.fillStyle = '#64748b'; roundRect(c, x + 4, y + 70, 32, 7, 2); c.fill();
      circle(c, x + 8, y + 78, 2, '#1e293b'); circle(c, x + 32, y + 78, 2, '#1e293b');
    },
    b() {},
    C(c, x, y) { c.fillStyle = '#d9b98c'; c.fillRect(x, y + 8, T, 10); c.fillStyle = '#f0d6ad'; c.fillRect(x, y + 8, T, 2);
      c.fillStyle = '#2f5d7c'; c.fillRect(x, y + 18, T, 20); c.fillStyle = '#3d7398'; c.fillRect(x, y + 22, T, 3); c.fillStyle = '#244a63'; c.fillRect(x, y + 36, T, 2); },
    K(c, x, y, m, tx, ty) {
      const onCounter = m.grid[ty][tx - 1] === 'C' || m.grid[ty][tx + 1] === 'C';
      if (onCounter) FURN.C(c, x, y); else { c.fillStyle = '#7c5a3c'; c.fillRect(x + 2, y + 14, 36, 22); c.fillStyle = '#9b7350'; c.fillRect(x + 2, y + 14, 36, 4); c.fillStyle = '#5a3f28'; c.fillRect(x + 4, y + 36, 3, 4); c.fillRect(x + 33, y + 36, 3, 4); }
      roundRect(c, x + 9, y - 6, 22, 16, 2); c.fillStyle = '#1e293b'; c.fill(); c.fillStyle = '#0c4a6e'; c.fillRect(x + 11, y - 4, 18, 12); c.fillStyle = '#334155'; c.fillRect(x + 18, y + 10, 4, 3);
      c.fillStyle = '#cbd5e1'; c.fillRect(x + 12, y + 12, 16, 2);
    },
    T(c, x, y, m, tx, ty) { const g = m.grid, up = g[ty - 1] && g[ty - 1][tx] === 'T', dn = g[ty + 1] && g[ty + 1][tx] === 'T';
      c.fillStyle = '#a8743f'; c.fillRect(x, y + (up ? 0 : 6), T, T - (up ? 0 : 6) - (dn ? 0 : 8));
      if (!up) { c.fillStyle = '#c48d52'; c.fillRect(x, y + 6, T, 3); }
      if (!dn) { c.fillStyle = '#7d5426'; c.fillRect(x, y + 30, T, 4); c.fillStyle = '#5b3a17'; c.fillRect(x + 4, y + 34, 3, 6); c.fillRect(x + 33, y + 34, 3, 6); } },
    h(c, x, y) { ellipse(c, x + 20, y + 34, 11, 3, 'rgba(0,0,0,.2)'); c.fillStyle = '#3b5f8a'; roundRect(c, x + 10, y + 8, 20, 12, 4); c.fill();
      c.fillStyle = '#4f7ab0'; roundRect(c, x + 9, y + 18, 22, 10, 4); c.fill(); c.fillStyle = '#1e293b'; c.fillRect(x + 11, y + 28, 2, 6); c.fillRect(x + 27, y + 28, 2, 6); },
    P(c, x, y) { ellipse(c, x + 20, y + 37, 11, 3, 'rgba(0,0,0,.25)'); c.fillStyle = '#b45f3c'; roundRect(c, x + 12, y + 24, 16, 13, 3); c.fill(); c.fillStyle = '#c9744d'; c.fillRect(x + 11, y + 23, 18, 4);
      [[20, 12, 9, '#2f7d43'], [13, 16, 7, '#37924e'], [27, 15, 7, '#37924e'], [20, 7, 6, '#46a85d'], [16, 21, 5, '#2f7d43'], [25, 21, 5, '#2f7d43']].forEach(l => circle(c, x + l[0], y + l[1], l[2], l[3]));
      circle(c, x + 18, y + 9, 2, '#7bd389'); },
    S(c, x, y, m, tx, ty) { const g = m.grid[ty], L = g[tx - 1] === 'S', R = g[tx + 1] === 'S';
      c.fillStyle = '#5b4fb3'; roundRect(c, x + (L ? 0 : 3), y + 6, T - (L ? 0 : 3) - (R ? 0 : 3), 16, 4); c.fill();
      c.fillStyle = '#6d60c9'; roundRect(c, x + (L ? 0 : 3), y + 18, T - (L ? 0 : 3) - (R ? 0 : 3), 16, 4); c.fill();
      c.fillStyle = '#8072dc'; c.fillRect(x + 6, y + 20, 28, 3); c.fillStyle = '#463c93'; if (!L) c.fillRect(x + 1, y + 10, 6, 24); if (!R) c.fillRect(x + 33, y + 10, 6, 24); },
    L(c, x, y) { c.fillStyle = '#e2e8f0'; c.fillRect(x, y + 10, T, 8); c.fillStyle = '#f8fafc'; c.fillRect(x, y + 10, T, 2);
      c.fillStyle = '#94a3b8'; c.fillRect(x, y + 18, T, 20); c.fillStyle = '#a8b5c4'; c.fillRect(x + 2, y + 20, 17, 16); c.fillRect(x + 21, y + 20, 17, 16);
      c.fillStyle = '#64748b'; c.fillRect(x + 15, y + 27, 3, 2); c.fillRect(x + 22, y + 27, 3, 2); },
    M(c, x, y) { FURN.L(c, x, y); c.fillStyle = '#1e293b'; c.fillRect(x + 16, y - 6, 6, 16); c.fillRect(x + 12, y + 7, 16, 4); c.fillRect(x + 21, y - 4, 7, 4); circle(c, x + 19, y - 7, 3, '#334155'); },
    R(c, x, y) { FURN.L(c, x, y); c.fillStyle = '#64748b'; c.fillRect(x + 5, y + 4, 30, 3);
      ['#ef4444', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b'].forEach((col, i) => { c.fillStyle = '#e2e8f0'; c.fillRect(x + 7 + i * 6, y - 4, 3, 12); c.fillStyle = col; c.fillRect(x + 7 + i * 6, y - 5, 3, 3); }); },
    F(c, x, y) { c.fillStyle = '#e2e8f0'; roundRect(c, x + 4, y - 8, 32, 46, 3); c.fill(); c.fillStyle = '#cbd5e1'; c.fillRect(x + 4, y + 12, 32, 2);
      c.fillStyle = '#7dd3fc'; c.fillRect(x + 9, y - 4, 22, 13); c.fillStyle = '#94a3b8'; c.fillRect(x + 30, y + 18, 2, 12); },
    V(c, x, y) { ellipse(c, x + 20, y + 38, 14, 3, 'rgba(0,0,0,.3)'); c.fillStyle = '#b91c1c'; roundRect(c, x + 6, y - 10, 28, 48, 4); c.fill();
      c.fillStyle = '#dc2626'; c.fillRect(x + 6, y - 10, 28, 4); c.fillStyle = '#111827'; c.fillRect(x + 10, y - 2, 20, 12); c.fillRect(x + 12, y + 16, 16, 14);
      c.fillStyle = '#f8fafc'; roundRect(c, x + 16, y + 21, 8, 8, 2); c.fill(); c.fillStyle = '#7c2d12'; c.fillRect(x + 17, y + 22, 6, 2); },
    X(c, x, y) { c.fillStyle = '#6b4226'; c.fillRect(x + 1, y - 10, 38, 48); c.fillStyle = '#4a2c17'; c.fillRect(x + 3, y - 8, 34, 44);
      const cols = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6', '#f472b6'];
      [y - 7, y + 7, y + 21].forEach((yy, r) => { for (let i = 0; i < 7; i++) { const h = 11 - ((i + r) % 3) * 2; c.fillStyle = cols[(i + r * 2) % 7]; c.fillRect(x + 4 + i * 5, yy + 12 - h, 4, h); } c.fillStyle = '#6b4226'; c.fillRect(x + 3, yy + 12, 34, 2); }); },
    Z(c, x, y) { c.fillStyle = '#5b7083'; c.fillRect(x + 2, y - 10, 36, 48); c.fillStyle = '#6f879c'; c.fillRect(x + 4, y - 8, 15, 44); c.fillRect(x + 21, y - 8, 15, 44);
      c.fillStyle = '#4a5c6d'; for (let i = 0; i < 3; i++) { c.fillRect(x + 7, y - 4 + i * 3, 9, 1); c.fillRect(x + 24, y - 4 + i * 3, 9, 1); }
      c.fillStyle = '#fef3c7'; c.fillRect(x + 8, y + 8, 7, 4); c.fillRect(x + 25, y + 8, 7, 4); c.fillStyle = '#cbd5e1'; c.fillRect(x + 16, y + 16, 2, 6); c.fillRect(x + 33, y + 16, 2, 6); },
    I(c, x, y) { ellipse(c, x + 20, y + 37, 9, 3, 'rgba(0,0,0,.25)'); c.fillStyle = '#94a3b8'; c.fillRect(x + 19, y - 6, 2, 42); c.fillRect(x + 12, y - 6, 16, 2);
      c.fillStyle = 'rgba(191,227,255,.85)'; roundRect(c, x + 11, y - 4, 8, 12, 3); c.fill(); c.fillStyle = '#e2e8f0'; roundRect(c, x + 16, y + 12, 9, 8, 2); c.fill();
      c.fillStyle = '#22c55e'; c.fillRect(x + 18, y + 14, 3, 2); c.fillStyle = '#475569'; c.fillRect(x + 12, y + 35, 16, 2); },
    w(c, x, y) { ellipse(c, x + 20, y + 37, 14, 3, 'rgba(0,0,0,.25)'); c.strokeStyle = '#475569'; c.lineWidth = 3; c.beginPath(); c.arc(x + 15, y + 28, 9, 0, 6.28); c.stroke();
      c.fillStyle = '#2563eb'; roundRect(c, x + 14, y + 8, 16, 14, 3); c.fill(); c.fillStyle = '#1d4ed8'; c.fillRect(x + 12, y + 20, 20, 5); c.fillStyle = '#94a3b8'; c.fillRect(x + 28, y + 6, 2, 16); circle(c, x + 31, y + 34, 3, '#334155'); },
    c(c, x, y) { ellipse(c, x + 20, y + 37, 15, 3, 'rgba(0,0,0,.25)'); c.fillStyle = '#2563eb'; roundRect(c, x + 5, y + 4, 30, 30, 3); c.fill();
      c.fillStyle = '#3b82f6'; for (let i = 0; i < 3; i++) c.fillRect(x + 7, y + 7 + i * 9, 26, 7); c.fillStyle = '#e2e8f0'; for (let i = 0; i < 3; i++) c.fillRect(x + 17, y + 9 + i * 9, 6, 2);
      c.fillStyle = '#f8fafc'; c.fillRect(x + 8, y, 8, 5); c.fillStyle = '#fbbf24'; c.fillRect(x + 22, y, 6, 5); circle(c, x + 9, y + 35, 2.5, '#1e293b'); circle(c, x + 31, y + 35, 2.5, '#1e293b'); },
    y(c, x, y) { ellipse(c, x + 20, y + 37, 10, 3, 'rgba(0,0,0,.25)'); c.fillStyle = '#facc15'; c.beginPath(); c.moveTo(x + 20, y + 4); c.lineTo(x + 31, y + 36); c.lineTo(x + 9, y + 36); c.closePath(); c.fill();
      c.fillStyle = '#111827'; c.fillRect(x + 19, y + 14, 3, 10); c.fillRect(x + 19, y + 27, 3, 3); },
    Y(c, x, y) { // tree, canopy spills over the tile above
      ellipse(c, x + 20, y + 36, 15, 4, 'rgba(0,0,0,.18)'); c.fillStyle = '#7c4a2a'; c.fillRect(x + 16, y + 20, 8, 18);
      [[20, 6, 17, '#3f9142'], [9, 14, 11, '#4aa34d'], [31, 14, 11, '#4aa34d'], [20, -4, 12, '#56b358'], [14, 4, 8, '#63c065']].forEach(l => circle(c, x + l[0], y + l[1], l[2], l[3]));
      circle(c, x + 14, y - 2, 3, 'rgba(255,255,255,.35)');
    },
    U(c, x, y, m, tx, ty, wallOnly) { // house: roof on the first row, wall with windows below
      const pal = [['#e76f51', '#c2563c'], ['#5b8fd6', '#4473b8'], ['#2a9d8f', '#1f7a70']][Math.floor(tx / 8) % 3];
      const roof = m.grid[ty - 1] && m.grid[ty - 1][tx] !== 'U' && !wallOnly;
      if (roof) { c.fillStyle = pal[0]; c.fillRect(x - 1, y - 12, T + 2, T + 12); c.fillStyle = pal[1]; for (let i = -1; i < 4; i++) c.fillRect(x - 1, y - 6 + i * 10, T + 2, 2); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x - 1, y + T - 4, T + 2, 4); return; }
      c.fillStyle = '#fbf3e4'; c.fillRect(x, y, T, T); c.fillStyle = '#eadfca'; c.fillRect(x, y + T - 4, T, 4);
      if (!wallOnly) { c.fillStyle = '#7dd3fc'; c.fillRect(x + 10, y + 9, 20, 16); c.fillStyle = '#ffffff'; c.fillRect(x + 19, y + 9, 2, 16); c.fillRect(x + 10, y + 16, 20, 2); c.fillStyle = '#9a6b45'; c.fillRect(x + 8, y + 25, 24, 3); }
    },
    E(c, x, y, m, tx, ty, wallOnly) { // hospital facade
      const top = !m.grid[ty - 1] || m.grid[ty - 1][tx] !== 'E';
      c.fillStyle = top ? '#e6eef3' : '#f7fbfd'; c.fillRect(x, y, T, T);
      if (top) { c.fillStyle = '#c9d6df'; c.fillRect(x, y, T, 6); c.fillStyle = '#8fd0f3'; c.fillRect(x + 6, y + 14, 28, 18); c.fillStyle = '#ffffff'; c.fillRect(x + 19, y + 14, 2, 18);
        if (tx === 11) { c.fillStyle = '#ffffff'; roundRect(c, x + 6, y + 8, 28, 28, 4); c.fill(); c.fillStyle = '#ef4444'; c.fillRect(x + 17, y + 12, 6, 20); c.fillRect(x + 10, y + 19, 20, 6); } }
      else if (!wallOnly) { c.fillStyle = '#8fd0f3'; c.fillRect(x + 6, y + 6, 28, 22); c.fillStyle = '#ffffff'; c.fillRect(x + 19, y + 6, 2, 22); c.fillStyle = '#0e8f86'; c.fillRect(x, y + T - 6, T, 6); }
    },
    q(c, x, y) { ellipse(c, x + 20, y + 34, 16, 3, 'rgba(0,0,0,.18)'); c.fillStyle = '#9a6b45'; c.fillRect(x + 4, y + 14, 32, 6); c.fillRect(x + 4, y + 22, 32, 5); c.fillStyle = '#475569'; c.fillRect(x + 6, y + 27, 3, 8); c.fillRect(x + 31, y + 27, 3, 8); },
    l(c, x, y) { ellipse(c, x + 20, y + 37, 7, 2, 'rgba(0,0,0,.2)'); c.fillStyle = '#334155'; c.fillRect(x + 18, y - 10, 4, 47); c.fillRect(x + 12, y - 12, 16, 4); circle(c, x + 20, y - 6, 5, '#fef3c7'); },
    j(c, x, y) { c.fillStyle = '#334155'; c.fillRect(x + 18, y - 6, 3, 42); c.fillStyle = '#0e8f86'; roundRect(c, x + 8, y - 8, 24, 16, 3); c.fill(); c.fillStyle = '#ffffff'; c.fillRect(x + 12, y - 4, 16, 2); c.fillRect(x + 12, y, 10, 2); },
    n(c, x, y) { c.fillStyle = '#f8fafc'; for (let i = 0; i < 4; i++) c.fillRect(x + 3 + i * 10, y + 10, 4, 24); c.fillRect(x, y + 16, T, 3); c.fillRect(x, y + 26, T, 3); },
    p(c, x, y) { c.fillStyle = '#94a3b8'; c.fillRect(x + 2, y + 10, 3, 24); c.fillRect(x + 35, y + 10, 3, 24); c.fillStyle = '#cbd5e1'; c.fillRect(x, y + 10, T, 3); c.fillRect(x, y + 20, T, 3); c.fillStyle = '#5b8fd6'; c.fillRect(x, y + 34, T, 4); },
    v(c, x, y) { ellipse(c, x + 20, y + 36, 14, 3, 'rgba(0,0,0,.2)'); c.fillStyle = '#334155'; c.fillRect(x + 8, y + 30, 26, 4); c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(x + 12, y + 30); c.lineTo(x + 20, y + 10); c.lineTo(x + 30, y + 30); c.closePath(); c.fill(); c.fillStyle = '#1e293b'; c.fillRect(x + 16, y + 6, 10, 4); c.fillRect(x + 26, y + 8, 3, 8); },
    z(c, x, y) { c.fillStyle = '#c49a6c'; for (let i = 0; i < 3; i++) c.fillRect(x + 4 + i * 4, y + 26 - i * 8, 32 - i * 8, 8); c.fillStyle = '#94a3b8'; c.fillRect(x + 34, y + 4, 3, 30); },
    a(c, x, y) { ellipse(c, x + 20, y + 36, 15, 3, 'rgba(0,0,0,.2)'); c.fillStyle = '#7c3aed'; roundRect(c, x + 6, y + 4, 28, 22, 6); c.fill(); c.fillStyle = '#8b5cf6'; roundRect(c, x + 4, y + 18, 32, 16, 5); c.fill(); c.fillStyle = '#6d28d9'; c.fillRect(x + 4, y + 16, 5, 18); c.fillRect(x + 31, y + 16, 5, 18); },
    o(c, x, y) { ellipse(c, x + 20, y + 37, 7, 2, 'rgba(0,0,0,.2)'); c.fillStyle = '#475569'; c.fillRect(x + 19, y + 4, 2, 32); c.fillStyle = '#fde68a'; c.beginPath(); c.moveTo(x + 12, y + 8); c.lineTo(x + 28, y + 8); c.lineTo(x + 24, y - 4); c.lineTo(x + 16, y - 4); c.closePath(); c.fill(); },
    G(c, x, y) { c.fillStyle = 'rgba(14,143,134,.15)'; c.fillRect(x + 2, y + 2, T - 4, T - 4); },
    k(c, x, y) { c.fillStyle = '#cbd5e1'; roundRect(c, x + 6, y + 6, 28, 16, 4); c.fill(); c.fillStyle = '#94a3b8'; roundRect(c, x + 10, y + 9, 20, 9, 4); c.fill();
      c.fillStyle = '#64748b'; c.fillRect(x + 19, y + 2, 2, 7); c.fillStyle = '#e2e8f0'; c.fillRect(x + 14, y + 22, 12, 16); },
  };

  /* Static map layer, drawn once per map at device resolution. */
  const layers = new Map();
  function mapLayer(mi) {
    const m = MAPS[mi], key = mi + ':' + dpr;
    if (layers.has(key)) return layers.get(key);
    const W = m.grid[0].length, H = m.grid.length;
    const cv = document.createElement('canvas'); cv.width = W * T * dpr; cv.height = H * T * dpr;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const g = m.grid, at = (x, y) => (g[y] && g[y][x]) || '#';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = at(x, y), px = x * T, py = y * T;
      if (WALLISH.has(ch)) {
        const below = at(x, y + 1);
        if (!WALLISH.has(below) && y < H - 1) { drawWallFront(c, px, py); if (WALL[ch]) WALL[ch](c, px, py); }
        else drawWallTop(c, px, py, x, y);
      } else if (GROUND[ch]) drawGround(c, GROUND[ch], m.floor, x, y, px, py);
      else drawFloor(c, m.floor, x, y, px, py);
    }
    // depth: walls and buildings cast a soft shadow onto the floor below and beside them
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      if (WALLISH.has(at(x, y))) continue;
      const px = x * T, py = y * T;
      if (WALLISH.has(at(x, y - 1))) { const gr = c.createLinearGradient(0, py, 0, py + 13); gr.addColorStop(0, 'rgba(35,65,90,.20)'); gr.addColorStop(1, 'rgba(35,65,90,0)'); c.fillStyle = gr; c.fillRect(px, py, T, 13); }
      if (x > 0 && WALLISH.has(at(x - 1, y))) { const gr = c.createLinearGradient(px, 0, px + 7, 0); gr.addColorStop(0, 'rgba(35,65,90,.12)'); gr.addColorStop(1, 'rgba(35,65,90,0)'); c.fillStyle = gr; c.fillRect(px, py, 7, T); }
    }
    if (m.id === 'hall') { c.fillStyle = 'rgba(45,212,191,.55)'; c.fillRect(T, 4 * T + 18, (W - 2) * T, 4); c.fillStyle = 'rgba(251,191,36,.45)'; c.fillRect(T, 4 * T + 24, (W - 2) * T, 2); }
    if (m.id === 'staff') { c.fillStyle = '#9fd5cd'; roundRect(c, 2 * T + 6, 2 * T + 6, 7 * T - 12, 4 * T - 12, 6); c.fill(); c.strokeStyle = '#d4a85a'; c.lineWidth = 2; roundRect(c, 2 * T + 12, 2 * T + 12, 7 * T - 24, 4 * T - 24, 4); c.stroke(); }
    // doors
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === 'D') {
      const px = x * T, py = y * T;
      const up = at(x, y - 1);
      if (up === 'U' || up === 'E') {
        if (up === 'E') { FURN.E(c, px, py, m, x, y, true); c.fillStyle = '#7dd3fc'; c.fillRect(px + 4, py + 8, 32, 32); c.fillStyle = '#bae6fd'; c.fillRect(px + 6, py + 10, 13, 30); c.fillRect(px + 21, py + 10, 13, 30); c.fillStyle = '#0e8f86'; c.fillRect(px + 2, py + 4, 36, 5); }
        else { FURN.U(c, px, py, m, x, y, true); c.fillStyle = '#7c4a2a'; roundRect(c, px + 9, py + 10, 22, 30, 3); c.fill(); c.fillStyle = '#92603a'; c.fillRect(px + 12, py + 14, 16, 10); c.fillRect(px + 12, py + 27, 16, 10); circle(c, px + 26, py + 26, 1.6, '#fde68a'); }
      } else if (y === 0) {
        c.fillStyle = '#9fb7c6'; c.fillRect(px + 4, py + 2, 32, 38); c.fillStyle = '#c8dbe6'; c.fillRect(px + 6, py + 4, 28, 34);
        c.fillStyle = '#5fa59c'; c.fillRect(px + 2, py, 3, 40); c.fillRect(px + 35, py, 3, 40); c.fillRect(px + 2, py, 36, 3);
        c.fillStyle = 'rgba(251,191,36,.25)'; c.fillRect(px + 6, py + 30, 28, 8);
      } else {
        drawFloor(c, m.floor, x, y, px, py);
        c.fillStyle = 'rgba(14,143,134,.18)'; roundRect(c, px + 4, py + 6, 32, 28, 4); c.fill();
        c.fillStyle = 'rgba(251,191,36,.35)'; c.fillRect(px + 8, py + 10, 24, 2); c.fillRect(px + 8, py + 28, 24, 2);
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ch = at(x, y); if (FURN[ch]) FURN[ch](c, x * T, y * T, m, x, y); }
    layers.set(key, cv);
    return cv;
  }
  function clearLayers() { layers.clear(); }
  /* Day light: soft shafts from every window onto the floor, with a few drifting dust motes. */
  function sunlight(c, mi, t) {
    if (reduceFx()) return;
    const g = MAPS[mi].grid;
    for (let y = 0; y < g.length - 1; y++) for (let x = 0; x < g[0].length; x++) {
      if (g[y][x] !== 'O' || WALLISH.has(g[y + 1][x])) continue;
      const px = x * T, py = y * T + 30, len = T * 3.2;
      const gr = c.createLinearGradient(0, py, 0, py + len); gr.addColorStop(0, 'rgba(255,236,170,.30)'); gr.addColorStop(1, 'rgba(255,236,170,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(px + 6, py); c.lineTo(px + 34, py); c.lineTo(px + 34 + 26, py + len); c.lineTo(px + 6 + 14, py + len); c.closePath(); c.fill();
      for (let i = 0; i < 4; i++) { const k = ((t / 6000 + i * .27 + x * .13) % 1); circle(c, px + 14 + i * 8 + k * 22, py + k * len * .9, 1.1, 'rgba(255,255,255,' + (.7 * (1 - k)) + ')'); }
    }
  }

  /* Animated bits drawn over the layer every frame. */
  function mapAnim(c, mi, t) {
    const m = MAPS[mi], g = m.grid;
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      const ch = g[y][x], px = x * T, py = y * T;
      if (ch === 'm' && y + 1 < g.length && !WALLISH.has(g[y + 1][x])) {
        c.strokeStyle = '#4ade80'; c.lineWidth = 1.2; c.beginPath();
        for (let i = 0; i <= 22; i++) { const ph = (i + t / 60 + x * 7) % 22; const v = ph > 9 && ph < 11 ? -6 : ph >= 11 && ph < 12 ? 4 : 0; const xx = px + 9 + i, yy = py + 15 + v; if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
        c.stroke(); circle(c, px + 28, py + 9, 1.2, (t / 500 | 0) % 2 ? '#f87171' : '#7f1d1d');
      } else if (ch === 'K') {
        c.fillStyle = 'rgba(56,189,248,' + (.35 + .15 * Math.sin(t / 400 + x)) + ')'; c.fillRect(px + 11, py - 4, 18, 12);
        c.fillStyle = '#e0f2fe'; c.fillRect(px + 13, py - 2, 8, 1.5); c.fillRect(px + 13, py + 2, 12, 1.5);
      } else if (ch === 'V') {
        circle(c, px + 14, py + 3, 2, (t / 700 | 0) % 2 ? '#4ade80' : '#14532d');
        if ((t / 1600 | 0) % 3 === 0) { c.save(); c.globalAlpha = .4; c.strokeStyle = '#e2e8f0'; c.lineWidth = 1.2; c.beginPath(); const k = (t % 1600) / 1600; c.moveTo(px + 20, py + 18 - k * 14); c.quadraticCurveTo(px + 24, py + 12 - k * 14, px + 19, py + 6 - k * 14); c.stroke(); c.restore(); }
      } else if (ch === 'F') { c.fillStyle = 'rgba(125,211,252,' + (.3 + .2 * Math.sin(t / 900)) + ')'; c.fillRect(px + 9, py - 4, 22, 13); }
    }
  }

  /* ================= people ================= */
  // Chibi figure, feet at (x, y). size ≈ height in logical px (46 in the ward).
  const OUTLINE = 'drop-shadow(1px 0 0 #2a3d50) drop-shadow(-1px 0 0 #2a3d50) drop-shadow(0 1px 0 #2a3d50) drop-shadow(0 -1px 0 #2a3d50)';
  const OUTLINE_OK = (() => { try { const t = document.createElement('canvas').getContext('2d'); t.filter = 'blur(1px)'; return t.filter === 'blur(1px)'; } catch (e) { return false; } })();
  /* Characters are drawn once per pose (look, direction, walk frame, blink, size) into a cached sprite
     with a dark contour baked in — the outline filter is far too slow to run every frame. */
  const sprites = new Map();
  function drawPerson(c, x, y, look, o) {
    o = o || {};
    const size = o.size || 46;
    if (!OUTLINE_OK || o.raw) return personRaw(c, x, y, look, o);
    const TAU = Math.PI * 2, walkF = o.walking ? Math.round((((o.phase || 0) % TAU) + TAU) % TAU / (Math.PI / 4)) % 8 : -1;
    const blink = (clock + (o.seed || 0) * 900) % 3800 < 120;
    const breath = walkF < 0 && !o.still ? Math.floor((clock + (o.seed || 0) * 700) / 850) % 2 : 0;
    const key = [typeof look === 'string' ? look : JSON.stringify(look), o.dir || 'down', walkF, blink ? 1 : 0, size, o.flash ? 1 : 0, dpr, breath].join('|');
    let spr = sprites.get(key);
    if (!spr) {
      const k = dpr, pad = 4, w = Math.ceil(size * .8 + pad * 2), h = Math.ceil(size * 1.4 + pad * 2);
      const raw = document.createElement('canvas'); raw.width = w * k; raw.height = h * k;
      const rc = raw.getContext('2d'); rc.scale(k, k);
      personRaw(rc, w / 2, h - pad, look, Object.assign({}, o, { shadow: false, walking: walkF >= 0, phase: walkF < 0 ? 0 : walkF * Math.PI / 4, blinkForce: blink, breath, bob: 0, alpha: null }));
      const out = document.createElement('canvas'); out.width = raw.width; out.height = raw.height;
      const oc = out.getContext('2d'), d = Math.max(1, Math.round(k * size / 60)), col = '#2a3d50';
      oc.filter = `drop-shadow(${d}px 0 0 ${col}) drop-shadow(-${d}px 0 0 ${col}) drop-shadow(0 ${d}px 0 ${col}) drop-shadow(0 -${d}px 0 ${col})`;
      oc.drawImage(raw, 0, 0);
      spr = { c: out, w, h, pad };
      if (sprites.size > 700) sprites.clear();
      sprites.set(key, spr);
    }
    const sc = size / 46;
    c.save();
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.shadow !== false) ellipse(c, x, y - sc, 12 * sc, 4 * sc, 'rgba(0,0,0,.22)');
    c.drawImage(spr.c, x - spr.w / 2, y - spr.h + spr.pad + (o.bob || 0), spr.w, spr.h);
    c.restore();
  }
  const shadeCache = new Map();
  function shade(hex, f) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const k = hex + f; let v = shadeCache.get(k); if (v) return v;
    const n = parseInt(hex.slice(1), 16), ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f + (f > 1 ? (f - 1) * 70 : 0))));
    v = 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')'; shadeCache.set(k, v); return v;
  }
  /* One character, feet at (x,y). Shaded scrubs/coats, layered hair, tall Gen-3 eyes; breathes when idle, bounces when walking. */
  function personRaw(c, x, y, look, o) {
    o = o || {};
    const L = typeof look === 'string' ? LOOKS[look] : look;
    const s = (o.size || 46) / 46, dir = o.dir || 'down', ph = o.phase || 0;
    const walk = o.walking ? Math.sin(ph) : 0;
    c.save(); c.translate(x, y); c.scale(s, s);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    if (o.shadow !== false) ellipse(c, 0, -1, 12, 4, 'rgba(0,0,0,.22)');
    const side = dir === 'left' || dir === 'right', up = dir === 'up', down = dir === 'down';
    if (dir === 'right') c.scale(-1, 1);   // side art faces left; mirror it for right
    const fl = o.flash, col = k => fl ? '#fecaca' : L[k];
    const yb = (o.breath ? -.8 : 0) - Math.abs(walk) * 1.1;
    const skin = col('skin'), skinD = shade(skin, .86), H = col('hair'), HD = shade(H, .72), HL = shade(H, 1.32);
    const coat = !!L.coat, topC = fl ? '#fecaca' : (coat ? '#f8fafc' : L.top), topD = fl ? '#fca5a5' : (coat ? '#dbe4ec' : (L.top2 || shade(L.top, .8)));
    const pants = col('pants'), pantsD = shade(pants, .78), shoes = col('shoes');
    const hy = -40 + (o.bob || 0) + yb, hs = L.hairStyle;
    const tri = (a, b, d, e, f, g) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.lineTo(f, g); c.closePath(); c.fill(); };
    // hair that falls behind the head
    if (!up && (hs === 'long' || hs === 'bob')) { c.fillStyle = HD; const len = hs === 'long' ? 25 : 17; if (side) roundRect(c, 0, hy - 6, 13, len, 6); else roundRect(c, -13.5, hy - 6, 27, len, 7); c.fill(); }
    // legs and shoes
    const lift1 = Math.max(0, walk) * 3, lift2 = Math.max(0, -walk) * 3;
    const shoe = (sx, sy, rx) => { ellipse(c, sx, sy + .9, rx + .4, 2.7, shade(shoes, .62)); ellipse(c, sx, sy, rx, 2.4, shoes); ellipse(c, sx - rx * .3, sy - .8, rx * .35, .8, 'rgba(255,255,255,.5)'); };
    if (side) {
      c.fillStyle = pantsD; roundRect(c, -1 - walk * 4, -15, 6, 14 - lift2, 3); c.fill(); shoe(1 - walk * 4, -2 - lift2, 5);
      c.fillStyle = pants; roundRect(c, -5 + walk * 4, -15, 6, 14 - lift1, 3); c.fill(); shoe(-3 + walk * 4, -2 - lift1, 5);
    } else {
      c.fillStyle = pants; roundRect(c, -8, -15, 6.5, 14 - lift1, 3); c.fill(); roundRect(c, 1.5, -15, 6.5, 14 - lift2, 3); c.fill();
      c.fillStyle = pantsD; c.fillRect(-2.7, -15, 1.2, 9 - lift1); c.fillRect(1.5, -15, 1.2, 9 - lift2);
      shoe(-4.8, -2 - lift1, 4.4); shoe(4.8, -2 - lift2, 4.4);
    }
    // torso
    c.save(); c.translate(0, yb);
    const tx = side ? -8 : -10.5, tw = side ? 16 : 21;
    c.fillStyle = topC; roundRect(c, tx, -31, tw, 18, 6); c.fill();
    c.save(); roundRect(c, tx, -31, tw, 18, 6); c.clip();
    c.fillStyle = 'rgba(20,40,60,.13)'; c.fillRect(tx, -18, tw, 6); c.fillRect(side ? 3 : 6.5, -31, 5, 18);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(tx, -31, 3.5, 12);
    c.restore();
    if (down) {
      if (coat) {
        c.fillStyle = col('inner') || L.top; c.beginPath(); c.moveTo(-4, -31); c.lineTo(4, -31); c.lineTo(2.2, -14); c.lineTo(-2.2, -14); c.closePath(); c.fill();
        c.fillStyle = fl ? '#fca5a5' : '#e2e8f0'; tri(-4.4, -31, -1, -22.5, -7, -24); tri(4.4, -31, 1, -22.5, 7, -24);
        circle(c, 4.2, -19.5, .7, '#94a3b8'); circle(c, 4.2, -16.2, .7, '#94a3b8');
        c.fillStyle = '#dbe4ec'; c.fillRect(-9, -21, 4.6, 3.6); c.fillStyle = '#2563eb'; c.fillRect(-8, -23, 1, 3);
      } else {
        c.fillStyle = skin; tri(-3.6, -31, 0, -25.6, 3.6, -31);
        c.strokeStyle = topD; c.lineWidth = 1.3; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-4.6, -31); c.lineTo(0, -24.8); c.lineTo(4.6, -31); c.stroke();
        c.fillStyle = topD; roundRect(c, -7.6, -21.4, 5, 4.2, 1); c.fill();
      }
      if (L.steth) { c.strokeStyle = '#1e293b'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-6, -31); c.quadraticCurveTo(-7, -21, 0, -20); c.quadraticCurveTo(7, -21, 6, -31); c.stroke(); circle(c, 0, -19.5, 2, '#94a3b8'); circle(c, 0, -19.5, .9, '#e2e8f0'); }
    }
    if (up) { c.fillStyle = 'rgba(20,40,60,.10)'; c.fillRect(-.5, -29, 1, 15); }
    if (L.apron && !up) { c.fillStyle = L.apron; roundRect(c, -7, -26, 14, 13, 3); c.fill(); c.fillStyle = 'rgba(20,40,60,.10)'; c.fillRect(-7, -16.5, 14, 1); }
    if (L.badge && down) { c.strokeStyle = 'rgba(30,41,59,.5)'; c.lineWidth = .8; c.beginPath(); c.moveTo(3, -31); c.lineTo(6, -26); c.stroke(); c.fillStyle = '#fff'; c.fillRect(3.7, -26, 4.6, 5.6); c.fillStyle = L.badge; c.fillRect(3.7, -26, 4.6, 1.8); c.fillStyle = '#64748b'; c.fillRect(4.5, -23.3, 3, .7); c.fillRect(4.5, -22, 2, .7); }
    // arms: scrubs have short sleeves, coats long ones
    const sw = walk * 3, sleeve = fl ? '#fecaca' : (coat ? '#e8eef4' : topD);
    const arm = (ax, ay) => { c.fillStyle = sleeve; roundRect(c, ax, ay, 5, coat ? 13 : 7.5, 2.5); c.fill(); if (!coat) { c.fillStyle = skin; roundRect(c, ax + .6, ay + 6.3, 3.8, 6.7, 1.9); c.fill(); } circle(c, ax + 2.5, ay + 13.5, 2.6, skin); };
    if (side) arm(-2.5 + sw, -29); else { arm(-14, -29 - sw * .4); arm(9, -29 + sw * .4); }
    if (L.bag && !side) { c.fillStyle = '#7c2d12'; roundRect(c, 10, -20, 7, 8, 2); c.fill(); c.fillStyle = '#9a3f1c'; c.fillRect(10, -20, 7, 2.2); }
    c.restore();
    // head
    if (!up) { c.fillStyle = skinD; c.fillRect(-2.5, hy + 9, 5, 3.6); }
    if (!side) { circle(c, -11.6, hy + 1, 2.3, skin); circle(c, 11.6, hy + 1, 2.3, skin); if (down) { circle(c, -11.6, hy + 1, 1, skinD); circle(c, 11.6, hy + 1, 1, skinD); } }
    circle(c, 0, hy, 12, skin);
    const hi = (cx, cy, r, a0, a1) => { c.strokeStyle = HL; c.lineWidth = 1.7; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, r, Math.PI * a0, Math.PI * a1); c.stroke(); };
    c.fillStyle = H;
    if (up) {
      c.beginPath(); c.arc(0, hy - 1, 12.6, 0, 6.28); c.fill();
      c.fillStyle = HD; c.beginPath(); c.arc(0, hy - 1, 12.6, Math.PI * .12, Math.PI * .88); c.closePath(); c.fill(); c.fillStyle = H;
      if (hs === 'bun') { circle(c, 0, hy - 12, 5.2, H); circle(c, -1.4, hy - 13.4, 1.6, HL); }
      if (hs === 'long' || hs === 'bob') { roundRect(c, -12, hy, 24, hs === 'long' ? 17 : 11, 6); c.fill(); }
      if (hs === 'curly') for (let i = 0; i < 6; i++) circle(c, -10 + i * 4, hy - 10 + (i % 2) * 2, 4, H);
      hi(0, hy - 1, 9.4, 1.18, 1.5);
    } else if (side) {
      c.beginPath(); c.arc(1, hy - 2, 12.4, Math.PI * 1.1, Math.PI * 2.15); c.fill();
      c.beginPath(); c.ellipse(6.2, hy + 1, 6.8, 10, 0, 0, 6.28); c.fill();
      circle(c, 1.5, hy + 1.5, 2.1, skin); circle(c, 1.5, hy + 1.5, .9, skinD);   // ear
      c.fillStyle = H;
      if (hs === 'bun') { circle(c, 9, hy - 9, 5.2, H); circle(c, 7.8, hy - 10.4, 1.5, HL); }
      if (hs === 'long' || hs === 'bob') { roundRect(c, 1, hy - 2, 11, hs === 'long' ? 18 : 12, 5); c.fill(); }
      if (hs === 'curly') for (let i = 0; i < 5; i++) circle(c, -6 + i * 4, hy - 10 + (i % 2) * 2, 4, H);
      hi(1, hy - 2, 9.2, 1.2, 1.55);
      circle(c, -8.6, hy + 2.2, 1.4, skin);   // nose
      ellipse(c, -5, hy + .4, 1.9, 2.7, '#1f2a3a'); circle(c, -5.6, hy - .6, .8, '#fff');
      c.strokeStyle = HD; c.lineWidth = 1; c.beginPath(); c.moveTo(-7.2, hy - 3.6); c.lineTo(-3.4, hy - 4); c.stroke();
      if (L.glasses) { c.strokeStyle = '#1e293b'; c.lineWidth = 1.2; c.beginPath(); c.arc(-5, hy + .3, 3.5, 0, 6.28); c.moveTo(-1.5, hy); c.lineTo(4, hy - 1); c.stroke(); }
      if (L.goggles) { c.fillStyle = 'rgba(125,211,252,.8)'; roundRect(c, -11, hy - 9, 14, 4, 2); c.fill(); }
      if (L.beard) { c.fillStyle = H; c.beginPath(); c.ellipse(-3, hy + 7, 7, 5, 0, 0, 6.28); c.fill(); }
      else { c.strokeStyle = '#9a5b4f'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, hy + 6); c.lineTo(-5.4, hy + 6.4); c.stroke(); }
      circle(c, -3, hy + 4.4, 1.5, 'rgba(249,168,168,.75)');
    } else {
      c.beginPath(); c.arc(0, hy - 2, 12.6, Math.PI * 1.02, Math.PI * 1.98); c.fill();
      c.beginPath(); c.ellipse(-6, hy - 7, 7, 4.5, -.3, 0, 6.28); c.fill(); c.beginPath(); c.ellipse(5, hy - 8, 7, 4, .3, 0, 6.28); c.fill();
      if (hs === 'bun') { circle(c, 0, hy - 13.5, 5.2, H); circle(c, -1.5, hy - 15, 1.6, HL); }
      if (hs === 'bob' || hs === 'long') { c.fillStyle = H; roundRect(c, -13.4, hy - 6, 4.4, hs === 'long' ? 19 : 12, 2.4); c.fill(); roundRect(c, 9, hy - 6, 4.4, hs === 'long' ? 19 : 12, 2.4); c.fill(); }
      if (hs === 'curly') for (let i = 0; i < 6; i++) circle(c, -10 + i * 4, hy - 10 + (i % 2) * 2, 4, H);
      hi(0, hy - 2, 9.6, 1.17, 1.5);
      c.fillStyle = 'rgba(120,70,40,.10)'; c.beginPath(); c.ellipse(0, hy - 3.4, 9.4, 1.8, 0, 0, 6.28); c.fill();
      const blink = o.blinkForce != null ? o.blinkForce : (clock + (o.seed || 0) * 900) % 3800 < 120;
      if (blink) { c.fillStyle = '#1f2a3a'; c.fillRect(-6.6, hy + .4, 4.2, 1.2); c.fillRect(2.4, hy + .4, 4.2, 1.2); }
      else [-4.6, 4.6].forEach(ex => { ellipse(c, ex, hy + .6, 2.05, 2.9, '#1f2a3a'); circle(c, ex - .6, hy - .5, .9, '#fff'); circle(c, ex + .7, hy + 1.8, .45, 'rgba(255,255,255,.7)'); });
      c.strokeStyle = HD; c.lineWidth = 1; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6.6, hy - 3.6); c.lineTo(-2.9, hy - 4.1); c.moveTo(2.9, hy - 4.1); c.lineTo(6.6, hy - 3.6); c.stroke();
      if (L.glasses) { c.strokeStyle = '#1e293b'; c.lineWidth = 1.1; c.beginPath(); c.arc(-4.6, hy + .5, 3.7, 0, 6.28); c.moveTo(8.3, hy + .5); c.arc(4.6, hy + .5, 3.7, 0, 6.28); c.moveTo(-.9, hy + .2); c.lineTo(.9, hy + .2); c.stroke(); }
      if (L.goggles) { c.fillStyle = 'rgba(125,211,252,.85)'; roundRect(c, -10, hy - 10, 20, 4, 2); c.fill(); }
      if (L.beard) { c.fillStyle = H; c.beginPath(); c.ellipse(0, hy + 7, 9, 5.5, 0, 0, 6.28); c.fill(); c.strokeStyle = shade(skin, .7); c.lineWidth = 1; c.beginPath(); c.arc(0, hy + 4.6, 1.8, .3, Math.PI - .3); c.stroke(); }
      else { c.strokeStyle = '#9a5b4f'; c.lineWidth = 1.1; c.beginPath(); c.arc(0, hy + 4.2, 2.3, .3, Math.PI - .3); c.stroke(); }
      circle(c, -7.6, hy + 4.2, 1.7, 'rgba(249,168,168,.75)'); circle(c, 7.6, hy + 4.2, 1.7, 'rgba(249,168,168,.75)');
    }
    c.restore();
  }

  /* Patient lying in bed: head on the pillow, breathing under the blanket. (x,y) = bed head tile. */
  function drawPatientInBed(c, x, y, who, t, o) {
    const P = PEOPLE[who]; if (!P) return;
    o = o || {};
    const br = Math.sin(t / 900 + x) * .8;
    c.fillStyle = '#4f7cc7'; c.beginPath(); c.ellipse(x + 20, y + 44 - br, 12, 14 + br, 0, 0, 6.28); c.fill();
    c.fillStyle = '#6f97da'; c.beginPath(); c.ellipse(x + 20, y + 34, 13, 4, 0, 0, 6.28); c.fill();
    c.fillStyle = P.gown; c.beginPath(); c.ellipse(x + 20, y + 30, 10, 3.5, 0, 0, 6.28); c.fill();
    const hx = x + 20, hy = y + 20;
    circle(c, hx, hy, 8, P.skin);
    c.fillStyle = P.hair;
    if (P.style === 'bald') { c.beginPath(); c.arc(hx - 8, hy, 3, 0, 6.28); c.arc(hx + 8, hy, 3, 0, 6.28); c.fill(); }
    else if (P.style === 'scarf') { c.beginPath(); c.arc(hx, hy - 1, 8.8, Math.PI, 0); c.fill(); c.fillRect(hx - 9, hy - 2, 3, 8); c.fillRect(hx + 6, hy - 2, 3, 8); }
    else if (P.style === 'curly') { for (let i = 0; i < 5; i++) circle(c, hx - 8 + i * 4, hy - 6 + (i % 2), 3.5, P.hair); }
    else { c.beginPath(); c.arc(hx, hy - 1, 8.6, Math.PI * 1.05, Math.PI * 1.95); c.fill(); if (P.style === 'bun') circle(c, hx, hy - 9, 3.5, P.hair); }
    if (P.kippah) { c.fillStyle = P.kippah; c.beginPath(); c.ellipse(hx, hy - 7, 4.5, 2.2, 0, 0, 6.28); c.fill(); }
    const sleep = o.sleep;
    if (sleep) { c.fillStyle = '#334155'; c.fillRect(hx - 5, hy + 1, 3, 1); c.fillRect(hx + 2, hy + 1, 3, 1); }
    else { circle(c, hx - 3, hy + 1, 1.3, '#1e293b'); circle(c, hx + 3, hy + 1, 1.3, '#1e293b'); }
    if (P.glasses) { c.strokeStyle = '#334155'; c.lineWidth = .9; c.beginPath(); c.arc(hx - 3, hy + 1, 2.4, 0, 6.28); c.moveTo(hx + 5.4, hy + 1); c.arc(hx + 3, hy + 1, 2.4, 0, 6.28); c.stroke(); }
    if (P.beard) { c.fillStyle = P.hair; c.beginPath(); c.ellipse(hx, hy + 6, 5.5, 3.5, 0, 0, 6.28); c.fill(); }
    if (P.cannula) { c.strokeStyle = '#bfe3ff'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx - 8, hy + 2); c.quadraticCurveTo(hx, hy + 6, hx + 8, hy + 2); c.stroke(); }
    if (sleep && !reduceFx()) { const k = (t % 2400) / 2400; heText('z', hx + 10 + k * 6, hy - 6 - k * 12, { size: 9 + k * 4, bold: true, color: '#93c5fd', alpha: 1 - k, align: 'center', ltr: true }); }
  }

  /* A patient's bust for cards and the battle bed. */
  function drawBust(c, x, y, who, s) {
    const P = PEOPLE[who] || PEOPLE.leah;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = P.gown; roundRect(c, -22, 6, 44, 26, 12); c.fill();
    c.fillStyle = 'rgba(0,0,0,.12)'; for (let i = -16; i < 20; i += 8) circle(c, i, 20, 1.4, 'rgba(255,255,255,.35)');
    circle(c, 0, -10, 16, P.skin);
    c.fillStyle = P.hair;
    if (P.style === 'bald') { c.beginPath(); c.ellipse(-15, -8, 4, 7, 0, 0, 6.28); c.ellipse(15, -8, 4, 7, 0, 0, 6.28); c.fill(); }
    else if (P.style === 'scarf') { c.beginPath(); c.arc(0, -12, 17.5, Math.PI * .92, Math.PI * 2.08); c.fill(); roundRect(c, 12, -6, 8, 16, 4); c.fill(); }
    else if (P.style === 'curly') for (let i = 0; i < 7; i++) circle(c, -15 + i * 5, -22 + (i % 2) * 3, 5.5, P.hair);
    else { c.beginPath(); c.arc(0, -13, 16.8, Math.PI * 1.03, Math.PI * 1.97); c.fill(); if (P.style === 'bun') circle(c, 0, -29, 6, P.hair); }
    if (P.kippah) { c.fillStyle = P.kippah; c.beginPath(); c.ellipse(0, -25, 8, 3.5, 0, 0, 6.28); c.fill(); }
    circle(c, -6, -9, 2.2, '#1e293b'); circle(c, 6, -9, 2.2, '#1e293b');
    c.strokeStyle = 'rgba(120,80,60,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -17); c.lineTo(-3, -17); c.moveTo(3, -17); c.lineTo(9, -17); c.moveTo(-12, -6); c.lineTo(-10, -5); c.moveTo(12, -6); c.lineTo(10, -5); c.stroke();
    if (P.glasses) { c.strokeStyle = '#334155'; c.lineWidth = 1.4; c.beginPath(); c.arc(-6, -9, 4.6, 0, 6.28); c.moveTo(10.6, -9); c.arc(6, -9, 4.6, 0, 6.28); c.stroke(); }
    if (P.beard) { c.fillStyle = P.hair; c.beginPath(); c.ellipse(0, 0, 12, 8, 0, 0, 6.28); c.fill(); }
    else { c.strokeStyle = '#9a5b4f'; c.lineWidth = 1.3; c.beginPath(); c.arc(0, -2, 3, .4, Math.PI - .4); c.stroke(); }
    if (P.cannula) { c.strokeStyle = '#bfe3ff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-16, -6); c.quadraticCurveTo(0, 0, 16, -6); c.stroke(); }
    c.restore();
  }

  /* ================= creatures: the clinical problems ================= */
  function eyes(c, x, y, w, mood, col) {
    c.fillStyle = col || '#1e1b2e';
    if (mood === 'angry') { [-1, 1].forEach(sg => { c.beginPath(); c.moveTo(x + sg * w, y - 4); c.lineTo(x + sg * 3, y); c.lineTo(x + sg * w, y + 3); c.closePath(); c.fill(); }); }
    else { [-1, 1].forEach(sg => { c.beginPath(); c.ellipse(x + sg * w * .6, y, 3, 4, 0, 0, 6.28); c.fill(); circle(c, x + sg * w * .6 - 1, y - 1.5, 1.1, '#fff'); }); }
  }
  function drawCreature(c, e, x, y, s) {
    const t = clock / 1000, type = e.type;
    const dying = e.dying ? easeOut(clamp(e.dying, 0, 1)) : 0;
    const bob = Math.sin(t * 2 + (e.seed || 0)) * 4;
    c.save();
    const shake = e.shake > 0 && !reduceFx() ? Math.sin(clock * .09) * 4 : 0;
    c.translate(x + shake + (e.recoil || 0) * 12 * (e.recoilDir || 1), y + bob);
    c.globalAlpha = 1 - dying;
    c.scale(s * (1 - dying * .5), s * (1 - dying * .5)); if (dying) c.rotate(dying * .7);
    const br = Math.sin(t * 2.4) * .025; c.scale(1 - br * .6, 1 + br);
    c.save(); c.globalAlpha *= .3; ellipse(c, 0, 44 - bob, 30, 8, '#000'); c.restore();
    const flash = e.flash > 0, FC = (e.flash % 100) > 50 ? '#ffffff' : '#fca5a5';
    const tc = (TYPES[type] || TYPES.meds).color, body = flash ? FC : tc;
    if (type === 'meds') {
      c.save(); c.rotate(-.5 + Math.sin(t * 1.5) * .08);
      roundRect(c, -34, -16, 68, 32, 16); c.fillStyle = flash ? FC : '#f8fafc'; c.fill();
      c.save(); roundRect(c, -34, -16, 68, 32, 16); c.clip(); c.fillStyle = body; c.fillRect(0, -16, 34, 32); c.restore();
      c.fillStyle = 'rgba(255,255,255,.55)'; roundRect(c, -26, -11, 46, 5, 3); c.fill();
      c.strokeStyle = '#1e1b2e'; c.lineWidth = 2; roundRect(c, -34, -16, 68, 32, 16); c.stroke(); c.restore();
      eyes(c, 0, -2, 14, 'angry');
    } else if (type === 'labs') {
      c.save(); c.rotate(Math.sin(t * 1.3) * .1);
      roundRect(c, -16, -46, 32, 84, 15); c.fillStyle = 'rgba(226,232,240,.35)'; c.fill(); c.strokeStyle = '#e2e8f0'; c.lineWidth = 2.5; c.stroke();
      c.save(); roundRect(c, -16, -46, 32, 84, 15); c.clip(); c.fillStyle = body; c.fillRect(-16, -8 + Math.sin(t * 3) * 2, 32, 50); c.restore();
      c.fillStyle = '#94a3b8'; roundRect(c, -19, -52, 38, 9, 3); c.fill();
      for (let i = 0; i < 4; i++) { const k = ((t * .6 + i * .27) % 1); circle(c, -8 + i * 5, 30 - k * 36, 2 + i % 2, 'rgba(255,255,255,' + (.6 * (1 - k)) + ')'); }
      eyes(c, 0, 8, 10, 'angry', '#3b0a24'); c.restore();
    } else if (type === 'neuro') {
      const lobes = [[-18, -6, 18], [0, -16, 20], [18, -6, 18], [-10, 10, 16], [12, 10, 16]];
      lobes.forEach(l => circle(c, l[0], l[1], l[2], body));
      c.strokeStyle = flash ? '#fff' : '#6d28d9'; c.lineWidth = 2;
      [[-24, -10, -8, -18], [6, -24, 20, -10], [-16, 6, -2, 14], [8, 4, 22, 12]].forEach(q => { c.beginPath(); c.moveTo(q[0], q[1]); c.quadraticCurveTo((q[0] + q[2]) / 2, q[1] - 8, q[2], q[3]); c.stroke(); });
      eyes(c, 0, 0, 13);
      for (let i = 0; i < 3; i++) { const a = t * 2.5 + i * 2; c.save(); c.globalAlpha *= .6 + .4 * Math.sin(t * 6 + i); c.fillStyle = '#fde047'; c.translate(Math.cos(a) * 44, Math.sin(a) * 30 - 10); c.rotate(a); c.fillRect(-1, -6, 2, 12); c.fillRect(-6, -1, 12, 2); c.restore(); }
    } else if (type === 'cardio') {
      const beat = 1 + Math.max(0, Math.sin(t * 7)) * .08;
      c.save(); c.scale(beat, beat); c.fillStyle = body;
      c.beginPath(); c.moveTo(0, 30); c.bezierCurveTo(-48, -2, -30, -44, 0, -20); c.bezierCurveTo(30, -44, 48, -2, 0, 30); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-16, -18, 7, 4, -.6, 0, 6.28); c.fill(); c.restore();
      eyes(c, 0, -4, 13, 'angry');
      c.strokeStyle = '#fde68a'; c.lineWidth = 2; c.beginPath(); const yy = 40;
      for (let i = -40; i <= 40; i += 2) { const ph = ((i + t * 80) % 40 + 40) % 40; const v = ph > 16 && ph < 20 ? -12 : ph >= 20 && ph < 22 ? 6 : 0; if (i === -40) c.moveTo(i, yy + v); else c.lineTo(i, yy + v); }
      c.globalAlpha *= .7; c.stroke();
    } else if (type === 'renal') {
      c.fillStyle = body; c.beginPath(); c.moveTo(0, -42); c.bezierCurveTo(16, -16, 32, 4, 30, 16); c.bezierCurveTo(28, 38, -28, 38, -30, 16); c.bezierCurveTo(-32, 4, -16, -16, 0, -42); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-12, 4, 5, 10, .3, 0, 6.28); c.fill();
      eyes(c, 0, 12, 12);
      for (let i = 0; i < 2; i++) { const k = (t * .7 + i * .5) % 1; c.fillStyle = 'rgba(125,211,252,' + (1 - k) + ')'; c.beginPath(); c.ellipse(26 + i * 10, 10 + k * 30, 3, 4.5, 0, 0, 6.28); c.fill(); }
    } else if (type === 'infect') {
      c.save(); c.rotate(t * .5);
      for (let i = 0; i < 12; i++) { c.save(); c.rotate(i * Math.PI / 6); c.fillStyle = flash ? FC : '#15803d'; c.fillRect(-2, -38, 4, 12); circle(c, 0, -39, 4.5, body); c.restore(); }
      c.restore(); circle(c, 0, 0, 28, body);
      [[-10, -12, 5], [12, 10, 4], [-6, 14, 3], [14, -8, 3]].forEach(d => circle(c, d[0], d[1], d[2], 'rgba(20,83,45,.45)'));
      eyes(c, 0, 0, 12, 'angry');
    } else if (type === 'func') {
      c.save(); c.rotate(-.35 + Math.sin(t * 2) * .12);
      c.fillStyle = flash ? FC : '#fef3c7'; roundRect(c, -30, -8, 60, 16, 7); c.fill();
      [[-30, -9], [-30, 9], [30, -9], [30, 9]].forEach(p => circle(c, p[0], p[1], 10, flash ? FC : '#fef3c7'));
      c.fillStyle = body; c.fillRect(-6, -10, 12, 20); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-6, -4, 12, 2); c.fillRect(-6, 3, 12, 2);
      c.restore(); eyes(c, 0, -22, 12, 'angry');
    } else if (type === 'goals') {
      c.save(); c.globalAlpha *= .92;
      const g = c.createRadialGradient(0, -8, 4, 0, -8, 46); g.addColorStop(0, flash ? FC : '#e2e8f0'); g.addColorStop(1, flash ? FC : '#64748b');
      c.fillStyle = g; c.beginPath(); c.moveTo(-32, 30); c.bezierCurveTo(-40, -20, -20, -44, 0, -44); c.bezierCurveTo(20, -44, 40, -20, 32, 30);
      for (let i = 0; i < 4; i++) c.quadraticCurveTo(24 - i * 16, 22 + (i % 2 ? 10 : -2) + Math.sin(t * 3 + i) * 3, 16 - i * 16, 30);
      c.closePath(); c.fill(); c.restore();
      eyes(c, 0, -14, 12);
      heText('?', 34, -34 + Math.sin(t * 3) * 3, { size: 18, bold: true, color: '#fde68a', align: 'center', ltr: true });
      heText('?', -36, -20 + Math.cos(t * 3) * 3, { size: 14, bold: true, color: '#fde68a', align: 'center', ltr: true });
    } else if (type === 'pager') {
      c.save(); c.rotate(Math.sin(t * 18) * (e.ringing ? .08 : .02));
      c.fillStyle = flash ? FC : '#1e293b'; roundRect(c, -34, -24, 68, 48, 8); c.fill();
      c.fillStyle = '#9be27a'; roundRect(c, -26, -16, 44, 22, 3); c.fill();
      c.fillStyle = '#365314'; if ((clock / 400 | 0) % 2) { c.fillRect(-22, -12, 30, 3); c.fillRect(-22, -5, 22, 3); }
      circle(c, 26, -10, 4, (clock / 250 | 0) % 2 ? '#ef4444' : '#7f1d1d'); circle(c, 26, 4, 4, '#fbbf24');
      c.fillStyle = '#334155'; c.fillRect(-20, -30, 12, 6); c.restore();
      eyes(c, -4, 14, 10, 'angry', '#fde047');
    }
    c.restore();
  }

  /* ================= skyline & backdrops ================= */
  function skyline(c, w, h, horizon, seed, tone) {
    const layersDef = [{ col: tone ? tone[0] : '#c3d6e6', hMin: 40, hMax: 110, wMin: 30, wMax: 64, lit: .35 }, { col: tone ? tone[1] : '#9fbad0', hMin: 26, hMax: 80, wMin: 26, wMax: 54, lit: .45 }];
    layersDef.forEach((L, li) => {
      let x = -10, i = 0;
      while (x < w + 10) {
        const bw = L.wMin + hash(seed + li * 99 + i, 7) * (L.wMax - L.wMin), bh = L.hMin + hash(seed + i, li * 31) * (L.hMax - L.hMin);
        c.fillStyle = L.col; c.fillRect(x, horizon - bh, bw, bh + 2);
        for (let wy = horizon - bh + 6; wy < horizon - 6; wy += 9) for (let wx = x + 5; wx < x + bw - 6; wx += 8) {
          if (hash(wx * 3 + li, wy) < L.lit) { c.fillStyle = hash(wx, wy * 2) < .5 ? '#eaf6ff' : '#d6ecfb'; c.globalAlpha = .75; c.fillRect(wx, wy, 3, 4); c.globalAlpha = 1; }
        }
        x += bw + 2; i++;
      }
    });
  }
  function stars(c, w, h, n) {
    for (let i = 0; i < n; i++) { const x = hash(i, 1) * w, y = hash(i, 2) * h, tw = .5 + .5 * Math.sin(clock / 700 + i * 1.7); c.globalAlpha = .3 + .6 * tw * hash(i, 3); c.fillStyle = '#fff'; c.fillRect(x, y, hash(i, 4) < .1 ? 2 : 1.2, hash(i, 4) < .1 ? 2 : 1.2); }
    c.globalAlpha = 1;
  }
  function moon(c, x, y, r) {
    c.save(); c.shadowColor = '#fde68a'; c.shadowBlur = 24; circle(c, x, y, r, '#f8fafc'); c.restore();
    circle(c, x + r * .45, y - r * .2, r * .9, '#141a3a');
  }
  function hospital(c, x, base, w, h) {
    c.fillStyle = '#f7fbfd'; c.fillRect(x, base - h, w, h);
    c.fillStyle = '#e6f1f6'; c.fillRect(x + w * .3, base - h - 26, w * .4, 26);
    c.fillStyle = '#0e8f86'; c.fillRect(x, base - h, w, 4);
    for (let r = 0; r < Math.floor(h / 18); r++) for (let k = 0; k < Math.floor(w / 16); k++) {
      const wx = x + 6 + k * 16, wy = base - h + 8 + r * 18, floor3 = r === Math.floor(h / 18) - 4;
      const on = floor3 || hash(k + 3, r + 9) < .45;
      c.fillStyle = floor3 ? '#2fb3a8' : on ? '#8fd0f3' : '#b9dcef'; c.fillRect(wx, wy, 9, 10);
    }
    const cx = x + w / 2, cy = base - h - 14;
    c.save(); c.shadowColor = '#ef4444'; c.shadowBlur = 16 + 6 * Math.sin(clock / 500);
    c.fillStyle = '#ef4444'; c.fillRect(cx - 3, cy - 9, 6, 18); c.fillRect(cx - 9, cy - 3, 18, 6); c.restore();
  }
  function drawSky(c, w, h, horizon) {
    const g = c.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, '#5fbdf5'); g.addColorStop(.65, '#a9dcfb'); g.addColorStop(1, '#fde7c2');
    c.fillStyle = g; c.fillRect(0, 0, w, horizon); clouds(c, w, horizon);
  }
  function clouds(c, w, h) {
    c.save(); c.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 6; i++) { const x = ((hash(i, 9) * w + clock / (60 + i * 25)) % (w + 120)) - 60, y = 18 + hash(i, 3) * h * .45, r = 10 + hash(i, 5) * 10;
      c.beginPath(); c.ellipse(x, y, r * 2.2, r * .8, 0, 0, 6.28); c.ellipse(x - r, y + 2, r * 1.3, r * .7, 0, 0, 6.28); c.ellipse(x + r * .8, y - r * .35, r * 1.2, r * .75, 0, 0, 6.28); c.fill(); }
    c.restore();
  }
  function sun(c, x, y, r) { c.save(); c.shadowColor = '#ffd25e'; c.shadowBlur = 30; circle(c, x, y, r, '#ffe28a'); c.restore(); circle(c, x, y, r * .8, '#fff1b8'); }

  // Battle arenas: full-bleed, with platforms for the two sides.
  /* Battle backdrops, Gen-3 style: a painted wall or sky, a perspective floor, and one clear landmark per place. */
  function battleBackdrop(kind, who) {
    const w = VW, h = VH, horizon = h * .52, t = clock;
    const wall = (a, b) => { ctx.fillStyle = lin(0, 0, 0, horizon, [[0, a], [1, b]]); ctx.fillRect(0, 0, w, horizon); };
    // perspective floor: two-tone tiles (or planks) converging on the horizon
    const floor = (a, b, tint, planks) => {
      ctx.fillStyle = lin(0, horizon, 0, h, [[0, a], [1, b]]); ctx.fillRect(0, horizon, w, h - horizon);
      const rows = 7, yAt = k => horizon + (h - horizon) * Math.pow(k / rows, 1.7), xAt = (i, yy) => w / 2 + i * (26 + (yy - horizon) / (h - horizon) * 120);
      ctx.fillStyle = tint;
      for (let k = 0; k < rows; k++) { const y0 = yAt(k), y1 = yAt(k + 1);
        for (let i = -10; i < 10; i++) { if ((i + k) & 1) continue; if (planks && k % 2) continue;
          ctx.beginPath(); ctx.moveTo(xAt(i, y0), y0); ctx.lineTo(xAt(i + 1, y0), y0); ctx.lineTo(xAt(i + 1, y1), y1); ctx.lineTo(xAt(i, y1), y1); ctx.closePath(); ctx.fill(); } }
      ctx.fillStyle = lin(0, horizon, 0, horizon + 22, [[0, 'rgba(30,60,80,.16)'], [1, 'rgba(30,60,80,0)']]); ctx.fillRect(0, horizon, w, 22);
    };
    const skirting = col => { ctx.fillStyle = col; ctx.fillRect(0, horizon - 7, w, 7); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, horizon - 7, w, 1.5); };
    const plant = (px, sc) => { ctx.save(); ctx.translate(px, horizon); ctx.scale(sc, sc); ctx.fillStyle = '#c2714a'; roundRect(ctx, -9, -16, 18, 16, 3); ctx.fill(); ctx.fillStyle = '#a85d3b'; ctx.fillRect(-10, -17, 20, 4);
      [[-9, -30, 9, '#3f9b4a'], [8, -32, 10, '#4caf58'], [0, -42, 11, '#58b85f'], [-4, -26, 7, '#2f8a3d']].forEach(p => circle(ctx, p[0], p[1], p[2], p[3])); ctx.restore(); };
    const frame = (fx, fy, fw, fh, col) => { ctx.fillStyle = '#b08455'; ctx.fillRect(fx - 2, fy - 2, fw + 4, fh + 4); ctx.fillStyle = col; ctx.fillRect(fx, fy, fw, fh); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(fx, fy, fw, 3); };
    const windowSky = (wx, wy, ww, wh, curtain) => {
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); drawSky(ctx, w, wy + wh, wy + wh); sun(ctx, wx + ww * .22, wy + 22, 10); skyline(ctx, w, h, wy + wh, 3); ctx.restore();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.strokeRect(wx, wy, ww, wh); ctx.fillStyle = '#ffffff'; ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh); ctx.fillStyle = '#e6eef3'; ctx.fillRect(wx - 6, wy + wh, ww + 12, 5);
      if (curtain) { const sway = reduceFx() ? 0 : Math.sin(t / 1500) * 2; ctx.fillStyle = curtain;
        [[wx - 18, 1], [wx + ww - 4, -1]].forEach(([cx, d]) => { ctx.beginPath(); ctx.moveTo(cx, wy - 8); ctx.lineTo(cx + 22, wy - 8); ctx.lineTo(cx + 22 + sway * d, wy + wh + 10); ctx.lineTo(cx + sway * d, wy + wh + 10); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < 3; i++) ctx.fillRect(cx + 3 + i * 7, wy - 8, 2, wh + 16); ctx.fillStyle = curtain; });
        ctx.fillStyle = '#8fa8b8'; ctx.fillRect(wx - 24, wy - 11, ww + 48, 3); }
      if (!reduceFx()) { const gr = ctx.createLinearGradient(0, wy + wh, 0, h); gr.addColorStop(0, 'rgba(255,236,170,.30)'); gr.addColorStop(1, 'rgba(255,236,170,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(wx + 10, wy + wh); ctx.lineTo(wx + ww - 10, wy + wh); ctx.lineTo(wx + ww - 70, h); ctx.lineTo(wx - 40, h); ctx.closePath(); ctx.fill(); }
    };
    if (kind === 'conf') {
      wall('#f3e7d6', '#e6d3b8');
      ctx.fillStyle = 'rgba(120,80,40,.07)'; for (let i = 0; i < w; i += 46) ctx.fillRect(i, 0, 2, horizon);
      ctx.fillStyle = '#d9bf98'; ctx.fillRect(0, horizon - 40, w, 33); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, horizon - 40, w, 2);
      const sx = w * .5 - 90; ctx.fillStyle = '#8fa3b5'; roundRect(ctx, sx - 3, 19, 186, 102, 4); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 4, 26, 172, 88);
      ctx.strokeStyle = '#0e8f86'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 160; i += 4) { const ph = (i + t / 30) % 40, v = ph > 16 && ph < 19 ? -20 : ph >= 19 && ph < 21 ? 10 : 0; const xx = sx + 10 + i, yy = 80 + v; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke();
      heText('GRAND ROUNDS', sx + 90, 46, { size: 11, bold: true, color: '#c27c0e', align: 'center', ltr: true });
      skirting('#b89268'); plant(w * .08, 1.5); plant(w * .93, 1.3);
      floor('#e2c39d', '#c49d72', 'rgba(120,80,40,.10)', true);
    } else if (kind === 'council') {
      wall('#f4f0e6', '#e3dccb');
      for (let i = 0; i < 6; i++) { const cx = w * (.04 + i * .184); ctx.fillStyle = lin(cx, 0, cx + 26, 0, [[0, '#ffffff'], [.5, '#ece6d8'], [1, '#cfc7b4']]); ctx.fillRect(cx, 14, 26, horizon - 14);
        ctx.fillStyle = '#d8cfba'; ctx.fillRect(cx - 5, 8, 36, 8); ctx.fillRect(cx - 5, horizon - 10, 36, 10); ctx.fillStyle = 'rgba(120,100,60,.12)'; for (let k = 0; k < 3; k++) ctx.fillRect(cx + 5 + k * 7, 18, 1.5, horizon - 30); }
      PILLAR_ORDER.forEach((p, i) => { const bx = w * (.04 + (i + .5) * .184) + 13 + (i > 1 ? w * .184 : 0), sway = reduceFx() ? 0 : Math.sin(t / 900 + i) * 1.5;
        ctx.fillStyle = PILLARS[p].color; ctx.beginPath(); ctx.moveTo(bx - 15, 10); ctx.lineTo(bx + 15, 10); ctx.lineTo(bx + 15 + sway, horizon - 44); ctx.lineTo(bx + sway, horizon - 30); ctx.lineTo(bx - 15 + sway, horizon - 44); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(bx - 15, 10, 30, 5); heText(PILLARS[p].icon, bx, 52, { size: 17, align: 'center', ltr: true }); });
      skirting('#b9ad92');
      floor('#efe9dc', '#cfc5ad', 'rgba(110,90,50,.09)');
      ctx.fillStyle = 'rgba(190,40,60,.20)'; ctx.beginPath(); ctx.moveTo(w / 2 - 34, horizon); ctx.lineTo(w / 2 + 34, horizon); ctx.lineTo(w / 2 + 150, h); ctx.lineTo(w / 2 - 150, h); ctx.closePath(); ctx.fill();
    } else if (kind === 'lab') {
      wall('#eef5fb', '#dbe8f3');
      for (let s = 0; s < 3; s++) { const yy = 30 + s * 36; ctx.fillStyle = '#b8c9d8'; ctx.fillRect(0, yy + 22, w, 4); ctx.fillStyle = 'rgba(30,60,90,.08)'; ctx.fillRect(0, yy + 26, w, 3);
        for (let i = 0; i < w / 26; i++) { const col = ['#f472b6', '#a855f7', '#38bdf8', '#4ade80', '#fbbf24'][(i + s) % 5]; ctx.save(); ctx.globalAlpha = .55 + .3 * Math.sin(t / 600 + i + s); ctx.fillStyle = col; roundRect(ctx, 10 + i * 26, yy + 8, 8, 14, 3); ctx.fill(); ctx.globalAlpha = .5; ctx.fillStyle = '#ffffff'; roundRect(ctx, 10 + i * 26, yy + 2, 8, 20, 3); ctx.fill(); ctx.restore(); } }
      skirting('#a9bccb');
      floor('#e6eef5', '#b9cad8', 'rgba(60,100,140,.08)');
    } else if (kind === 'hall') {
      wall('#edf6f4', '#d6ebe7');
      ctx.fillStyle = '#c3e2dc'; ctx.fillRect(0, horizon - 46, w, 39); ctx.fillStyle = '#7cc4bb'; ctx.fillRect(0, horizon - 48, w, 3);
      for (let i = 0; i < 5; i++) { const dx = w * .06 + i * w * .21; ctx.fillStyle = '#9fc3cf'; roundRect(ctx, dx, horizon - 92, 40, 85, 3); ctx.fill(); ctx.fillStyle = '#c4dde6'; ctx.fillRect(dx + 4, horizon - 88, 32, 81);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(dx + 9, horizon - 82, 22, 26); circle(ctx, dx + 32, horizon - 44, 2, '#f2a516'); ctx.fillStyle = '#5fa59c'; ctx.fillRect(dx - 3, horizon - 95, 46, 4); }
      ctx.fillStyle = '#d7dee4'; ctx.fillRect(0, horizon - 30, w, 3);   // handrail
      for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,255,255,.85)'; roundRect(ctx, w * .1 + i * w * .2, 5, w * .09, 7, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,220,.10)'; ctx.beginPath(); ctx.moveTo(w * .1 + i * w * .2, 12); ctx.lineTo(w * .19 + i * w * .2, 12); ctx.lineTo(w * .23 + i * w * .2, horizon); ctx.lineTo(w * .06 + i * w * .2, horizon); ctx.closePath(); ctx.fill(); }
      skirting('#9fc9c1');
      floor('#f1f5ee', '#c9dad0', 'rgba(40,110,100,.07)');
      ctx.fillStyle = 'rgba(45,212,191,.35)'; ctx.fillRect(0, horizon + 14, w, 3);
    } else if (kind === 'street') {
      drawSky(ctx, w, horizon, horizon); sun(ctx, w * .82, 34, 15); clouds(ctx, w, horizon); skyline(ctx, w, h, horizon - 8, 5);
      [[.06, '#e8785a', '#fff7ea'], [.36, '#2a9d8f', '#f7f1e3'], [.7, '#e0a93b', '#fdf6e9']].forEach(([fx, roof, body], i) => { const hx = w * fx, hw = w * .2, hh = 62 + i * 6, by = horizon - 6;
        ctx.fillStyle = body; ctx.fillRect(hx, by - hh, hw, hh); ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(hx - 8, by - hh); ctx.lineTo(hx + hw / 2, by - hh - 30); ctx.lineTo(hx + hw + 8, by - hh); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(30,60,80,.10)'; ctx.fillRect(hx, by - hh, hw, 5);
        for (let k = 0; k < 3; k++) { ctx.fillStyle = '#9bd3f5'; ctx.fillRect(hx + hw * (.12 + k * .3), by - hh + 16, hw * .17, 16); ctx.fillStyle = '#ffffff'; ctx.fillRect(hx + hw * (.12 + k * .3), by - hh + 23, hw * .17, 1.5); }
        ctx.fillStyle = '#8a5a34'; roundRect(ctx, hx + hw * .42, by - 26, hw * .16, 26, 2); ctx.fill(); });
      for (let i = 0; i < 7; i++) { const tx = w * (.01 + i * .165) + 20; ctx.fillStyle = '#7a5230'; ctx.fillRect(tx - 2, horizon - 26, 4, 22); circle(ctx, tx, horizon - 34, 13, '#3f9b4a'); circle(ctx, tx - 7, horizon - 28, 9, '#4caf58'); circle(ctx, tx + 7, horizon - 29, 9, '#58b85f'); }
      ctx.fillStyle = '#ffffff'; for (let i = 0; i < w; i += 14) { ctx.fillRect(i, horizon - 14, 3, 14); } ctx.fillRect(0, horizon - 11, w, 2.5);
      floor('#a9dd8f', '#6fbf63', 'rgba(255,255,255,.07)');
      ctx.fillStyle = 'rgba(240,222,180,.75)'; ctx.beginPath(); ctx.moveTo(w / 2 - 40, horizon); ctx.lineTo(w / 2 + 40, horizon); ctx.lineTo(w / 2 + 190, h); ctx.lineTo(w / 2 - 190, h); ctx.closePath(); ctx.fill();
    } else if (kind === 'home') {
      wall('#fbf1e2', '#f1dfc6');
      ctx.fillStyle = 'rgba(200,150,90,.10)'; for (let i = 12; i < w; i += 34) for (let k = 14; k < horizon - 50; k += 30) circle(ctx, i + (k % 60 ? 17 : 0), k, 2.2, 'rgba(200,150,90,.16)');
      ctx.fillStyle = '#e7cfa9'; ctx.fillRect(0, horizon - 42, w, 35); ctx.fillStyle = '#c9a877'; ctx.fillRect(0, horizon - 44, w, 3);
      windowSky(w * .56, 18, w * .26, horizon - 76, '#f2a9a0');
      frame(w * .1, 30, 44, 34, '#9ad0c2'); frame(w * .1 + 58, 40, 30, 40, '#f5c97b'); frame(w * .34, 26, 36, 28, '#c8b6e2');
      const lx = w * .9; ctx.fillStyle = '#8a6a48'; ctx.fillRect(lx - 1.5, horizon - 80, 3, 74); ctx.fillStyle = '#f7d27a'; ctx.beginPath(); ctx.moveTo(lx - 16, horizon - 80); ctx.lineTo(lx + 16, horizon - 80); ctx.lineTo(lx + 10, horizon - 104); ctx.lineTo(lx - 10, horizon - 104); ctx.closePath(); ctx.fill();
      if (!reduceFx()) { ctx.fillStyle = rad(lx, horizon - 84, 4, 70, [[0, 'rgba(255,225,140,.35)'], [1, 'rgba(255,225,140,0)']]); ctx.fillRect(lx - 70, horizon - 150, 140, 140); }
      ctx.fillStyle = '#7c5cd6'; roundRect(ctx, w * .04, horizon - 44, 110, 38, 10); ctx.fill(); ctx.fillStyle = '#8f72e0'; roundRect(ctx, w * .04 + 8, horizon - 60, 94, 26, 9); ctx.fill(); ctx.fillStyle = '#f7d27a'; roundRect(ctx, w * .04 + 18, horizon - 46, 24, 16, 5); ctx.fill();
      skirting('#b08455');
      floor('#e6c79c', '#c79f6e', 'rgba(120,80,40,.10)', true);
      ctx.fillStyle = 'rgba(200,70,70,.22)'; ctx.beginPath(); ctx.ellipse(w / 2, horizon + (h - horizon) * .52, w * .34, (h - horizon) * .3, 0, 0, 6.28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,210,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(w / 2, horizon + (h - horizon) * .52, w * .3, (h - horizon) * .25, 0, 0, 6.28); ctx.stroke();
    } else {
      // a patient room: daylight window, privacy curtain and a calm wall
      wall('#edf7f4', '#d8ede8');
      ctx.fillStyle = '#c6e4de'; ctx.fillRect(0, horizon - 44, w, 37); ctx.fillStyle = '#7cc4bb'; ctx.fillRect(0, horizon - 46, w, 3);
      windowSky(w - w * .14 - w * .42, 18, w * .42, horizon - 70, 'rgba(125,211,200,.75)');
      const rx = w * .05, rw = w * .28; ctx.fillStyle = '#8fa8b8'; ctx.fillRect(rx - 6, 12, rw + 12, 3);
      for (let i = 0; i < 9; i++) { const sway = reduceFx() ? 0 : Math.sin(t / 1300 + i * .7) * 1.2, px = rx + i * rw / 9; ctx.fillStyle = i % 2 ? '#bfe6f0' : '#a9dbe8'; ctx.beginPath(); ctx.moveTo(px, 15); ctx.lineTo(px + rw / 9 + 1, 15); ctx.lineTo(px + rw / 9 + 1 + sway, horizon - 12); ctx.lineTo(px + sway, horizon - 12); ctx.closePath(); ctx.fill(); circle(ctx, px + rw / 18, 13.5, 1.6, '#64748b'); }
      skirting('#9fc9c1');
      floor('#f2f6ee', '#c8d9cf', 'rgba(40,110,100,.07)');
    }
    ctx.fillStyle = rad(w / 2, h * .45, h * .25, w * .8, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(120,150,170,.18)']]); ctx.fillRect(0, 0, w, h);
  }
  function platform(x, y, rx, ry, col) {
    ctx.save();
    ellipse(ctx, x, y + 5, rx * 1.04, ry, 'rgba(40,70,90,.20)');
    ellipse(ctx, x, y + 2.5, rx, ry, 'rgba(60,90,110,.55)');   // rim
    ctx.fillStyle = rad(x, y - ry * .3, 2, rx, [[0, '#ffffff'], [.55, col || '#bfe3dc'], [1, '#8fb1a8']]); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, rx * .82, ry * .7, 0, 0, 6.28); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, rx * .55, ry * .45, 0, 0, 6.28); ctx.stroke();
    ctx.restore();
  }

  /* ================= title ================= */
  function title(tt, name) {
    const w = VW, h = VH, horizon = h * .74;
    drawSky(ctx, w, horizon, horizon);
    sun(ctx, w * .88, h * .16, 20);
    skyline(ctx, w, h, horizon, 11);
    hospital(ctx, w * .64, horizon, 120, 128);
    ctx.fillStyle = lin(0, horizon, 0, h, [[0, '#bfe3c2'], [1, '#93cc9c']]); ctx.fillRect(0, horizon, w, h - horizon);
    ctx.fillStyle = '#d9d2c3'; ctx.fillRect(0, horizon + 12, w, 10);
    // the night's trouble — a purple fog with red eyes (delirium), drifting near the hospital
    const fx = w * .86 + Math.sin(clock / 1500) * 8, fy = horizon - 70 + Math.sin(clock / 900) * 5;
    ctx.save(); for (let i = 0; i < 5; i++) { ctx.globalAlpha = .22; circle(ctx, fx + Math.sin(i * 2 + clock / 1100) * 20, fy + Math.cos(i * 3 + clock / 1300) * 12, 30 - i * 3, i % 2 ? '#a78bfa' : '#c4b5fd'); } ctx.restore();
    ctx.save(); ellipse(ctx, fx - 9, fy - 2, 4, 2.5, '#7c3aed'); ellipse(ctx, fx + 9, fy - 2, 4, 2.5, '#7c3aed'); ctx.restore();
    // the nurse on the roof, looking at the hospital
    ctx.fillStyle = '#9fbad0'; ctx.fillRect(w * .1, horizon - 52, 64, 52); ctx.fillStyle = '#0e8f86'; ctx.fillRect(w * .1, horizon - 52, 64, 4);
    drawPerson(ctx, w * .1 + 32, horizon - 52, S && S.player && S.player.look ? S.player.look : 'nurseF', { size: 42, dir: 'right', shadow: false });
    // logo
    const k = easeOut(clamp(tt / 900, 0, 1)), cx = w / 2, ty = h * .2 + (1 - k) * 20;
    ctx.save(); ctx.globalAlpha = k;
    [['#f472b6', 0], ['#2fb3a8', 9], ['#f2b544', 18]].forEach(([col, off], i) => { ctx.save(); ctx.translate(cx, ty + 22 + off); ctx.rotate(-.02); ctx.fillStyle = col; ctx.fillRect(-150 + i * 10, 0, (300 - i * 20) * easeOut(clamp((tt - 300 - i * 120) / 600, 0, 1)), 5); ctx.restore(); });
    heText('המשמרת', cx, ty + 14, { size: 54, bold: true, color: '#f2a516', align: 'center', stroke: '#ffffff', strokeW: 7, shadow: 'rgba(30,60,80,.35)', shadowBlur: 10 });
    heText('מסע ההסמכה: אח/ות מומחה/ית קליני/ת בגריאטריה', cx, ty + 66, { size: 17, bold: true, color: '#0b6f68', align: 'center', stroke: '#ffffff', strokeW: 4 });
    heText('קרדיולוגיה · גרונטולוגיה · נוירולוגיה · פרמקולוגיה', cx, ty + 86, { size: 11, bold: true, color: '#24425c', align: 'center', stroke: 'rgba(255,255,255,.85)', strokeW: 3 });
    ctx.restore();
  }
  function cutsceneBg(t) {
    const w = VW, h = VH, horizon = h * .8;
    drawSky(ctx, w, horizon, horizon); sun(ctx, w * .82, h * .2, 16); skyline(ctx, w, h, horizon, 5); hospital(ctx, w * .3 + Math.sin(t / 4000) * 4, horizon, 120, 130);
    ctx.fillStyle = lin(0, horizon, 0, h, [[0, '#bfe3c2'], [1, '#93cc9c']]); ctx.fillRect(0, horizon, w, h - horizon);
  }

  return { sunlight, sun, clouds, mapLayer, clearLayers, mapAnim, drawPerson, drawPatientInBed, drawBust, drawCreature, battleBackdrop, platform, title, cutsceneBg, skyline, stars, moon };
})();
