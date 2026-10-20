// FRAME-1: the door fade's curve as the compositor shows it at a real display cadence (a light page, so rAF runs at
// the display rate here). The game writes #fade's opacity each frame (0 → 1 over 0.35 s, swap, 1 → 0 over 0.35 s);
// css/style.css gives #fade `transition: opacity 0.6s`, so each write starts a new 0.6 s ease towards it.
// Prints the shown opacity when the script reaches 1 (where the room is swapped) with the stylesheet's transition
// and with it switched off for the scripted fade (FRAME-1's fix).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<style>#fade{position:fixed;inset:0;background:#000;opacity:0;transition:opacity 0.6s}</style><div id="fade"></div>`);
const curves = [];
for (const off of [false, true]) {
  const r = await page.evaluate(async (off) => {
    const f = document.querySelector('#fade'); f.style.transition = off ? 'none' : ''; f.style.opacity = ''; await new Promise((r) => setTimeout(r, 700));
    const s = []; let t = 0, last = performance.now(), swap = null;
    await new Promise((res) => { const tick = (now) => { t += Math.min(0.1, (now - last) / 1000); last = now;
      const op = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.35);
      f.style.opacity = op; const shown = +getComputedStyle(f).opacity;
      if (t >= 0.35 && swap == null) swap = { t: +t.toFixed(3), set: +op.toFixed(3), shown: +shown.toFixed(3) };
      s.push([+t.toFixed(3), +op.toFixed(3), +shown.toFixed(3)]);
      if (t < 0.7) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    // what is still shown 0.1 s after the script has cleared the screen
    f.style.opacity = ''; await new Promise((r) => setTimeout(r, 100)); const tail = +(+getComputedStyle(f).opacity).toFixed(3);
    const at = (tt) => s.find((x) => x[0] >= tt);
    return { frames: s.length, msPerFrame: +(700 / s.length).toFixed(1), swap, maxShown: Math.max(...s.map((x) => x[2])), at020: at(0.2), at050: at(0.5), tail, s };
  }, off);
  const { s, ...sum } = r; curves.push({ off, s });
  console.log(off ? 'transition off (FRAME-1):' : 'stylesheet transition (before):', JSON.stringify(sum));
}
// a chart of both runs (written opacity dashed, shown opacity solid) → fade-curves.jpg
if (process.env.CHART) {
  await page.setViewportSize({ width: 720, height: 300 });
  await page.setContent(`<body style="margin:0;background:#fff"><canvas id="c" width="720" height="300"></canvas></body>`);
  await page.evaluate((curves) => {
    const c = document.querySelector('#c').getContext('2d'), X = (t) => 50 + t / 0.7 * 640, Y = (o) => 250 - o * 200;
    c.font = '13px sans-serif'; c.fillStyle = '#222';
    c.fillText('Door fade at a 60 Hz display cadence: opacity of the black overlay vs time (s); the room swaps at 0.35 s', 50, 20);
    c.strokeStyle = '#999'; c.beginPath(); c.moveTo(50, 250); c.lineTo(690, 250); c.moveTo(50, 50); c.lineTo(50, 250); c.stroke();
    for (const t of [0, 0.35, 0.7]) c.fillText(String(t), X(t) - 8, 268);
    c.fillText('1', 36, 54); c.fillText('0', 36, 254);
    c.setLineDash([2, 3]); c.strokeStyle = '#bbb'; c.beginPath(); c.moveTo(X(0.35), 50); c.lineTo(X(0.35), 250); c.stroke();
    const col = { false: '#c0392b', true: '#1f6fb2' };
    for (const { off, s } of curves) {
      for (const [k, dash] of [[1, [5, 4]], [2, []]]) {
        c.setLineDash(dash); c.strokeStyle = col[off]; c.lineWidth = 2; c.beginPath();
        s.forEach((p, i) => (i ? c.lineTo(X(p[0]), Y(p[k])) : c.moveTo(X(p[0]), Y(p[k])))); c.stroke();
      }
    }
    c.setLineDash([]); c.fillStyle = col.false; c.fillText('before: shown (solid) lags the written fade (dashed): 14 % dark at the swap', 60, 288);
    c.fillStyle = col.true; c.fillText('after (FRAME-1): shown = written', 520, 70);
  }, curves);
  await page.screenshot({ path: process.env.CHART, type: 'jpeg', quality: 80 });
}
await browser.close();
