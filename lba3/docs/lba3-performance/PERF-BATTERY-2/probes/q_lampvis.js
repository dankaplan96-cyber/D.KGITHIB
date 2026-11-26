(async () => {
  // What the lamps add to the picture: the frame as is against the same frame with the pool's lights at intensity 0
  // (same programs), on a route (window.ROUTE): pixels that change and by how much.
  const G = game, gl = G.renderer.renderer.getContext();
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'interior')); G.state = 'play'; route.setup(); G.state = 'play';
  G.renderer.setAutoRes(false);
  for (let i = 0; i < 60; i++) { route.drive((i + 1) / 30, 1 / 30); G.frame(1 / 30, i % 15 === 14); }
  const grab = () => { G.renderer.render(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, p = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
  const L = G.lightPool.lights, info = L.map((l) => `[i ${l.intensity.toFixed(2)} d ${l.distance} decay ${l.decay} at ${l.position.toArray().map((v) => v.toFixed(1))} visible ${l.visible}]`).join(' ');
  const a = grab();
  const keep = L.map((l) => l.intensity); for (const l of L) l.intensity = 0;
  const upd = G.lightPool.update; G.lightPool.update = () => {};
  const b = grab();
  G.lightPool.update = upd; L.forEach((l, i) => { l.intensity = keep[i]; });
  let n = 0, o8 = 0, sum = 0, max = 0; const N = a.length / 4;
  for (let i = 0; i < a.length; i += 4) { const m = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (m) n++; if (m > 8) o8++; sum += m; if (m > max) max = m; }
  return `PROBE ${window.ROUTE || "interior"} · ${G.settings.quality} battery ${G.renderer.battery} · lights ${info}\nPROBE lamps off vs on: ${(100 * n / N).toFixed(1)} % of pixels change, ${(100 * o8 / N).toFixed(1)} % by more than 8 levels, mean ${(sum / N).toFixed(2)}, max ${max}`;
})()
