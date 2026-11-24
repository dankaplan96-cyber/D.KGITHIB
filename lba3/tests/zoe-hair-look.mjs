// P120 ZOE-HAIR (the user, 24.11: "Zoé's hair should be like Twinsen's"; docs/lba-maturity/P120.md): pictures of Zoé's
// hair for the user's pick (P107), and the checks a script can make. Nothing here judges the look: a person does.
//   PHASE=hash      Twinsen's model as built (lookdev): one hash of every vertex attribute, printed (before/after a change
//                   to the hair code: the same hash = the same look, byte for byte)
//   PHASE=lookdev   for each ?zoehair= value in HAIRS (default old,a,b,c; ZOE-HAIR-2: a-cap = v153's gold over the skull, a-bigtie): Zoé's whole figure from the front, ¾, side and
//                   back, her head from the same four sides, the talking pose (head, ¾) and the walk from behind; the
//                   model's triangle count. ZOE-HEAD: HEADS=current,twinsen,round also goes through ?zoehead= for each
//                   (files ld-<hair>-<head>-…); TWIN=1 first takes Twinsen's head from the same four sides and talking, with
//                   the same camera (ld-twinsen-head-…, ld-twinsen-talk), for the side-by-side
//   PHASE=game      (one boot, ?zoehair=<ZH>, default the game's default) the opening film's two Zoé lines (her at the
//                   tap), the yard under the play camera (Follow, Far) by her, a fixed camera behind her at about the Far
//                   camera's distance and height, the talk with her (her line, his answer), and her standing in the house (a
//                   copy of her model set in the room by the script, a fixed camera: the interior's light); the bake's
//                   misses (nothing of hers re-sculpted)
// OUT=dir (default captures/p120/). Checks: the model keeps its 19 bones, eyes, mouth and brow morphs; the part of the hair
// the tail bones carry stays 3 cm or more off her head, neck, collar and back through idle, talk, walk, run and a head
// turned both ways and tipped back (lookdev, skinned vertex positions). SwiftShader, headless: Automated runtime only.
import { launch, open, checker, URL0 } from './lib/boot.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const PHASE = process.env.PHASE || 'lookdev';
const CAP = process.env.OUT || fileURLToPath(new URL('../captures/p120/', import.meta.url));
mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const jpg = (name) => page.screenshot({ path: CAP + name + '.jpg', type: 'jpeg', quality: 90, timeout: 180000 });
const ld = async (q) => {
  await page.goto(`${URL0}lookdev.html?light=outdoor&labels=0&props=0&grid=0&${q}`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.lookdev?.rigs?.length, null, { timeout: 300000 });
  await ev(() => window.lookdev.render());
};

if (PHASE === 'hash') {
  await ld('c=twinsen&anim=idle&t=0.5&yaw=0' + (process.env.Q ? '&' + process.env.Q : ''));   // (Q=look=hairsmooth: another of his looks)
  const h = await ev(() => {
    let a = 0x811c9dc5 >>> 0, n = 0;
    const eat = (arr) => { const b = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); for (let i = 0; i < b.length; i++) { a ^= b[i]; a = Math.imul(a, 0x01000193) >>> 0; } n += b.length; };
    window.lookdev.rigs[0].root.traverse((o) => { if (o.isMesh) for (const k of ['position', 'normal', 'color', 'skinIndex', 'skinWeight']) if (o.geometry.attributes[k]) eat(o.geometry.attributes[k].array); });
    return { hash: a.toString(16), bytes: n };
  });
  console.log('TWINSEN', JSON.stringify(h));
  check('Twinsen hashed', !!h.bytes, h);
}

if (PHASE === 'lookdev') {
  const meta = {};
  const views = [['front', 0], ['34', 0.62], ['side', 1.57], ['back', 3.14]];
  if (process.env.TWIN) {
    for (const [n, a] of views) { await ld(`c=twinsen&anim=idle&t=0.5&yaw=0&focus=head&fd=1.6&fy=0.24&cyaw=${a}&cpitch=0.12&fov=30`); await jpg(`ld-twinsen-head-${n}`); }
    await ld('c=twinsen&anim=talk&t=1.3&mouth=0.6&yaw=0&focus=head&fd=1.6&fy=0.2&cyaw=0.62&cpitch=0.1&fov=30'); await jpg('ld-twinsen-talk');
  }
  const combos = (process.env.HAIRS || 'old,a,b,c').split(',').flatMap((h) => (process.env.HEADS ? process.env.HEADS.split(',').map((d) => [h, d]) : [[h, '']]));
  for (const [hair, head] of combos) {
    const zh = head ? `${hair}-${head}` : hair, Z = `zoehair=${hair}` + (head ? `&zoehead=${head}` : '');
    await ld(`c=zoe&anim=idle&t=0.5&views=${views.map((v) => v[1]).join(',')}&gap=0.95&dist=5.0&cy=1.35&ly=1.2&fov=30&${Z}`);
    await jpg(`ld-${zh}-turn`);
    for (const [n, a] of views) { await ld(`c=zoe&anim=idle&t=0.5&yaw=0&focus=head&fd=1.6&fy=0.24&cyaw=${a}&cpitch=0.12&fov=30&${Z}`); await jpg(`ld-${zh}-head-${n}`); }
    // the talking pose (the rig's talk gesture, the mouth half open) close, ¾; the walk from behind at the play camera's pitch
    await ld(`c=zoe&anim=talk&t=1.3&mouth=0.6&yaw=0&focus=head&fd=1.6&fy=0.2&cyaw=0.62&cpitch=0.1&fov=30&${Z}`); await jpg(`ld-${zh}-talk`);
    await ld(`c=zoe&anim=walk&t=0.9&yaw=3.14&focus=head&fd=3.2&fy=-0.4&cyaw=3.14&cpitch=0.55&fov=30&${Z}`); await jpg(`ld-${zh}-walk-back`);
    // the counts and the clearance: through a talk and a turn (idle, talk, walk, run; the head turned both ways and
    // tipped back), the least distance of any hair vertex below the crown to the body's skin under it
    const r = await ev(async () => {
      const rig = window.lookdev.rigs[0];
      let tris = 0; rig.root.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
      const m = rig.mesh, g = m.geometry, pos = g.attributes.position, col = g.attributes.color, v = new (rig.root.position.constructor)();
      const bones = m.skeleton.bones.map((b) => b.name), hi = ['tail0', 'tail1', 'tail2'].map((b) => bones.indexOf(b));
      const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
      const hair = [], body = [];
      for (let i = 0; i < pos.count; i++) {
        let wt = 0; for (let k = 0; k < 4; k++) if (hi.includes(si.getComponent(i, k))) wt += sw.getComponent(i, k);
        if (wt > 0.5) hair.push(i);
        else if (wt === 0 && pos.getY(i) < 1.95) body.push(i);   // (the rest below the tie: her head, the hair over it, the neck, collar, shoulders, back)
      }
      let least = 9;
      const poses = [['idle', 0, 0], ['talk', 0, 0], ['walk', 0, 0], ['run', 0, 0], ['idle', 0.6, 0], ['idle', -0.6, 0], ['idle', 0, -0.35]];
      for (const [anim, hy, hx] of poses) {
        for (let i = 0; i < 40; i++) { rig.play(anim); rig.update(1 / 30, anim === 'walk' ? 1.4 : anim === 'run' ? 6.5 : 0); }
        rig.j.head.rotation.y += hy; rig.j.head.rotation.x += hx;
        rig.root.updateMatrixWorld(true);
        const B = body.map((i) => m.getVertexPosition(i, v.clone())), H = hair.map((i) => m.getVertexPosition(i, v.clone()));
        for (const p of H) for (const q of B) { const d = p.distanceTo(q); if (d < least) least = d; }
      }
      return { tris, hairVerts: hair.length, bodyVerts: body.length, leastToBody: +least.toFixed(3), colours: col.count };
    });
    meta[zh] = r;
    console.log(zh, JSON.stringify(r));
    check(`${Z}: the swinging hair (the part the tail bones carry) keeps clear of her head, neck, collar and back through idle, talk, walk, run and a turned/tipped head (≥ 3 cm)`, r.leastToBody >= 0.03, r);
  }
  writeFileSync(CAP + 'meta-lookdev.json', JSON.stringify(meta, null, 1));
}

if (PHASE === 'game') {
  const ZH = process.env.ZH ? `zoehair=${process.env.ZH}` : '';
  const tag = process.env.ZH || 'default';
  // ---- the opening film (the notebook cut): Zoé at the tap, her two first lines
  await page.goto(URL0 + (ZH ? '?' + ZH : ''), { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
  await ev(() => { localStorage.clear(); game.testFreeze = true; });
  await page.click('[data-act="new"]', { timeout: 180000 });
  if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]', { timeout: 180000 });
  await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
  const { nb } = await ev(() => game.cine.clock);
  for (const [k, t] of [['1', 45.4 + 1.2], ['2', 51.0 + 0.8]]) {
    await ev((t) => { for (let i = 0; i < 6000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false); game.renderer.render(); }, t + nb);
    await jpg(`game-${tag}-film-${k}`);
  }
  // ---- the yard (as tests/twinsen-zoe-look.mjs): no film, the ball from the cupboard, out to Zoé
  await open(page, '?nocine' + (ZH ? '&' + ZH : ''));
  await page.click('[data-act="new"]');
  if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
  await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
  await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false; });
  // her standing in the house: a copy of her model by the hero, the room's own light (the script's one liberty)
  await ev(async () => {
    const CH = await import('./src/game/characters.js');
    const z = CH.createCharacter('zoe'), h = game.hero;
    const rt = new (h.pos.constructor)().setFromMatrixColumn(game.camera.matrixWorld, 0); rt.y = 0; rt.normalize();   // (1.6 m to his left on screen: into the room, clear of him)
    z.root.position.set(h.pos.x - rt.x * 1.6, h.pos.y, h.pos.z - rt.z * 1.6);
    game.scene.add(z.root); window.__zc = z;
    for (let i = 0; i < 30; i++) { z.play('idle'); z.update(1 / 30, 0); }
    // (the room's own camera dollied in toward her along its line of sight, so the cutaway still shows the room and no wall
    //  comes between: framing about 1.5 m of her with the room's long lens; she is turned to face it, ¾)
    const c = game.camera.position.clone(), t = z.root.position.clone().add({ x: 0, y: 1.45, z: 0 });
    z.root.rotation.y = Math.atan2(c.x - t.x, c.z - t.z) + 0.6;
    const d = 0.75 / Math.tan((game.camera.fov * Math.PI) / 360);
    game.camRig.override = { pos: t.clone().add(c.clone().sub(t).normalize().multiplyScalar(d)), look: t };
    game.step(2.5); for (let i = 0; i < 30; i++) { z.play('idle'); z.update(1 / 30, 0); } game.renderer.render();
  });
  await jpg(`game-${tag}-house`);
  await ev(() => { game.scene.remove(window.__zc.root); game.camRig.override = null; game.step(0.3); });
  const zoe = await ev(() => {
    const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z);
    for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
    game.step(1.0); P.settle(); const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle();
    const z = P.npc('zoe'); if (!z) return null; const r = z.rig; let s = 0, bones = 0; r.root.traverse((o) => { if (o.isSkinnedMesh) s++; if (o.isBone) bones++; });
    return { skinned: s, bones, eyes: !!r.j?.eyes?.length, mouth: !!r.mouth, morphs: r.mesh?.morphTargetInfluences?.length || 0, cam: game.settings.camDist };
  });
  check('Zoé in the yard: the polygon model with its 19 bones, eyes, mouth and brow morphs', !!zoe && zoe.skinned > 0 && zoe.bones >= 19 && zoe.eyes && zoe.mouth && zoe.morphs === 3, zoe);
  // the bake: her sculpted parts (the fallback body's skeleton, hands, shoes) still found in assets/bake.bin, not re-sculpted
  const bake = await ev(async () => { const S = await import('./src/engine/sculpt.js'); return { hit: S.bakeStats.hit, miss: S.bakeStats.miss, zoe: S.bakeStats.missed.filter((k) => /zoe/i.test(k)) }; });
  check('the bake: nothing of Zoé re-sculpted at load', bake.zoe.length === 0, bake);
  await ev(() => { if (game.tutorial?._mk) game.tutorial._mk.group.visible = false; const z = P.npc('zoe'); const h = game.hero.pos; const dx = z.pos.x - h.x, dz = z.pos.z - h.z, d = Math.hypot(dx, dz); if (d > 3.2) P.go(h.x + dx * (1 - 3 / d), h.z + dz * (1 - 3 / d), { tol: 0.5, maxT: 60 }); P.face(z.pos.x, z.pos.z); P.settle(); game.step(2.0); game.renderer.render(); });
  await jpg(`game-${tag}-far-standing`);
  // her from behind under the same Follow camera (Far): she is turned to face away from it for this one frame (walking round
  // her in this yard puts the tree and the fence between the camera and her); the target marker hidden
  await ev(() => {
    const z = P.npc('zoe'), r = z.rig.root, c = game.camera.position;
    r.rotation.y = Math.atan2(r.position.x - c.x, r.position.z - c.z);
    game.scene.traverse((o) => { if (o.isSprite && o.renderOrder === 20) o.visible = false; });
    r.updateMatrixWorld(true); game.renderer.render();
  });
  await jpg(`game-${tag}-far-herback`);
  await ev(() => { game.camRig.override = null; game.step(0.3); });
  await ev(() => {
    const z = P.npc('zoe'), ready = () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; };
    P.go(z.pos.x, z.pos.z, { tol: 1.4, stopWhen: ready, maxT: 40 }); P.face(z.pos.x, z.pos.z);
    for (let k = 0; k < 3 && !ready(); k++) { P.go(z.pos.x, z.pos.z, { tol: 1.0 - k * 0.2, maxT: 20 }); P.face(z.pos.x, z.pos.z); }
    P.tap('KeyE', 0.1); game.step(1.6); game.renderer.render();
  });
  check('the talk with Zoé opens by E', await ev(() => game.state === 'dialog'));
  await jpg(`game-${tag}-talk-1`);
  await ev(() => { for (let i = 0; i < 6 && game.state === 'dialog'; i++) { P.tap('KeyE', 0.05); P.tap('KeyE', 0.05); game.step(1.4); if (game.speaker === game.hero) break; } game.renderer.render(); });
  await jpg(`game-${tag}-talk-2`);
}
await browser.close();
done();
