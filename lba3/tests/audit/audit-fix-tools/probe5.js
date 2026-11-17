(async () => {
  const G = game;
  if (!window.CW) { const s = document.createElement('script'); s.src = '/tests/lib/camwalk.js'; document.head.appendChild(s); await new Promise((r) => { s.onload = r; }); }
  CW.place({ room: 'desert', x: 3478.07, z: 11.89, y: 1.49, a: 4.27 });
  G.step(0.3);
  const R = G.room, T = G.physics.terrain, OX = 3400, OZ = 0; const t0 = [T.heightAt(3479.5, 7.5), T.heightAt(3462, 7.5), G.physics.groundAt(3462, 7.5, 30)];
  const n = 301, SEA = -0.35, h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = T.heightAt(OX - 150 + i, OZ - 150 + j);
  const sea = new Uint8Array(n * n), q = new Int32Array(n * n); let a0 = 0, a1 = 0;
  for (let i = 0; i < n; i++) for (const k of [i, (n - 1) * n + i, i * n, i * n + n - 1]) if (!sea[k] && h[k] < SEA) { sea[k] = 1; q[a1++] = k; }
  const nb = (c) => { const ci = c % n, cj = (c - ci) / n, o = []; if (ci > 0) o.push(c - 1); if (ci < n - 1) o.push(c + 1); if (cj > 0) o.push(c - n); if (cj < n - 1) o.push(c + n); return o; };
  while (a0 < a1) { const c = q[a0++]; for (const a of nb(c)) if (!sea[a] && h[a] < SEA) { sea[a] = 1; q[a1++] = a; } }
  const comp = new Int32Array(n * n).fill(-1), comps = [];
  for (let k = 0; k < n * n; k++) {
    if (h[k] >= SEA || sea[k] || comp[k] >= 0) continue;
    const id = comps.length, list = [k]; comp[k] = id; let sx = 0, sz = 0, mn = 99;
    for (let p = 0; p < list.length; p++) { const c = list[p]; sx += c % n; sz += (c - (c % n)) / n; mn = Math.min(mn, h[c]); for (const a of nb(c)) if (comp[a] < 0 && !sea[a] && h[a] < SEA) { comp[a] = id; list.push(a); } }
    comps.push({ cells: list.length, at: [-150 + sx / list.length, -150 + sz / list.length].map((v) => +v.toFixed(1)), min: +mn.toFixed(2) });
  }
  return { t0, seaCells: a1, comps };
})();
