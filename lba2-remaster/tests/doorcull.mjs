// PERF-2: no door, frame or handle near Twinsen is left out by the small-prop culling (engine/shadowcull.js skips
// static pieces under 4 px on Medium, 7 px on Low) or by the actor/far culling. For every Citadel house door and
// every Zeelich house door, at Low and Medium, with the LBA and the free camera, Twinsen stands 2, 6 and 12 m out in
// front of the door; one frame is drawn and every mesh whose bounds lie within 2.5 m of the door is checked: shown
// in the main view (layer 0 on) whenever the same mesh is shown at High (no culling there).
import { launch, open, checker } from './lib/boot.mjs';
const { check, checkVisual, done } = checker();
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await open(page, '?nocine');
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const res = await page.evaluate(() => {
  const G = game, out = [];
  const V = G.hero.pos.constructor;   // (THREE.Vector3; three isn't a page global)
  const doors = [];
  for (const h of G.world.houses) { let nx = h.door.x - h.x, nz = h.door.z - h.z; const l = Math.hypot(nx, nz) || 1; doors.push({ area: 'citadel', id: h.id, x: h.door.x, z: h.door.z, nx: nx / l, nz: nz / l }); }
  const Z = G.rooms.zeelich;
  for (const [i, d] of (Z.houseDoors || []).entries()) {
    // (outward: away from the house group's centre; the door point is just outside the facade)
    let best = null, bd = 1e9; Z.group.children.forEach((c) => { if (!c.isGroup) return; const p = c.getWorldPosition(new V()); const dd = Math.hypot(p.x - d.x, p.z - d.z); if (dd < bd && dd > 0.5) { bd = dd; best = p; } });
    let nx = d.x - (best?.x ?? d.x - 1), nz = d.z - (best?.z ?? d.z); const l = Math.hypot(nx, nz) || 1;
    doors.push({ area: 'zeelich', id: 'zhouse' + i, x: d.x, z: d.z, nx: nx / l, nz: nz / l });
  }
  const go = (D, dist) => {
    const x = D.x + D.nx * dist, z = D.z + D.nz * dist, a = Math.atan2(-D.nx, -D.nz);
    if (D.area === 'citadel') G.exitRoom({ x, z, a }, true, true); else G.enterRoom('zeelich', { x, z, a }, true, true);
    G.state = 'play';
  };
  const near = (D) => {
    const root = D.area === 'citadel' ? G.world.root : Z.group, list = [];
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const c = new V();
    root.traverse((o) => {
      if (!o.isMesh || o.userData.shadowProxy || !o.geometry?.boundingSphere && !o.geometry?.computeBoundingSphere) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const s = o.geometry.boundingSphere; if (!s || !Number.isFinite(s.radius)) return;
      c.copy(s.center).applyMatrix4(o.matrixWorld);
      const r = s.radius * o.matrixWorld.getMaxScaleOnAxis();
      if (!(Number.isFinite(c.x + c.z) && Number.isFinite(r)) || Math.hypot(c.x - D.x, c.z - D.z) - r > 2.5 || r > 12) return;   // (a whole merged house is not "a door part")
      list.push(o);
    });
    return list.map((o) => ({ o, on: shown(o) && o.layers.test(G.camera.layers) }));
  };
  const frame = () => { for (let i = 0; i < 20; i++) G.frame(1 / 30, false); G.perf.beginFrame(); G.frame(1 / 30, true); };
  for (const cam of ['lba', 'free']) {
    G.settings.camera = cam; G.applySettings();
    for (const D of doors) for (const dist of [2, 6, 12]) {
      const shownAt = {};
      for (const q of ['high', 'medium', 'low']) {
        if (G.settings.quality !== q) { G.settings.quality = q; G.applySettings(); }
        go(D, dist); frame();
        shownAt[q] = near(D);
      }
      const ref = new Map(shownAt.high.map((x) => [x.o, x.on]));
      for (const q of ['medium', 'low']) {
        const lost = shownAt[q].filter((x) => ref.get(x.o) && !x.on).map((x) => `${x.o.name || x.o.type}(${x.o.material?.name || x.o.material?.type})`);
        out.push({ cam, door: D.area + '/' + D.id, dist, q, n: shownAt[q].length, lost });
      }
    }
  }
  return { out, nd: doors.length };
});
const bad = res.out.filter((r) => r.lost.length);
console.log('doors', res.nd, 'checks', res.out.length, 'meshes per door (median)', res.out.map((r) => r.n).sort((a, b) => a - b)[res.out.length >> 1]);
for (const r of bad.slice(0, 20)) console.log('  culled:', JSON.stringify(r));
checkVisual('Citadel house doors: no door part culled at Low/Medium near Twinsen (2/6/12 m, LBA + free camera)', !bad.some((r) => r.door.startsWith('citadel')), bad.filter((r) => r.door.startsWith('citadel')).slice(0, 5));
checkVisual('Zeelich house doors: no door part culled at Low/Medium near Twinsen (2/6/12 m, LBA + free camera)', res.out.some((r) => r.door.startsWith('zeelich')) && !bad.some((r) => r.door.startsWith('zeelich')), bad.filter((r) => r.door.startsWith('zeelich')).slice(0, 5));
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
