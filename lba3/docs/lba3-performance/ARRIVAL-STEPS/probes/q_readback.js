(async () => {
  // ARRIVAL-STEPS: what one canvas read-back costs here (texarray.js layerOf's getImageData), canvas by canvas, for an
  // area's painted textures (W_AREA, default desert): the first reads and the later ones
  const G = game, id = window.AREA || 'desert', root = G.regions.built(id)?.group;
  if (!root) return 'no area ' + id;
  const cans = new Set();
  root.traverse((o) => { const m = o.material; for (const x of Array.isArray(m) ? m : m ? [m] : []) { const c = x.map?.source?.data; if (c && typeof c.getContext === 'function') cans.add(c); } });
  const out = [`${id}: ${cans.size} canvases`];
  let i = 0;
  for (const c of cans) {
    const t0 = performance.now(); c.getContext('2d').getImageData(0, 0, 1, 1); const ms = performance.now() - t0;
    const t1 = performance.now(); c.getContext('2d').getImageData(0, 0, c.width, c.height); const ms2 = performance.now() - t1;
    if (i < 12 || ms > 50) out.push(`${i} ${c.width}x${c.height} first ${ms.toFixed(1)} ms, again ${ms2.toFixed(1)} ms`);
    if (++i > 40) break;
  }
  return out.join('\n');
})()
