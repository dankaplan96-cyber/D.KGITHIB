// Our game (LBA3) from the same cameras as remake.mjs (gen.py writes both lists): chapter 1 after the prologue, Twinsen
// stood at each spot, the camera set by camRig.override; { region } enters that area first, nofog / sea for the
// overviews and the sea candidate. usage: GAME_URL=http://localhost:8123/ node ours.mjs <shots-ours.json> <outdir>
import fs from 'fs';
const ROOT = process.env.LBA3 || new URL('../..', import.meta.url).pathname.replace(/\/$/, '');   // (the game's folder, for its test boot)
const { launch, open, menu } = await import(ROOT + '/tests/lib/boot.mjs');
const [file, outdir] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync(file, 'utf8'));
fs.mkdirSync(outdir, { recursive: true });
const W = shots.w || 960, H = shots.h || 540;
const { browser, page } = await launch({ width: W, height: H });
page.setDefaultTimeout(1800000);
await open(page, '?nocine');
await menu(page, 'new');
await page.evaluate(() => {
  const G = game; for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  const f = G.flags; Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'well', c1_started: true, c1_home: true });
  f.chapter = G.story.chapters.findIndex((c) => c.key === 'well'); G.story.refreshCast?.();
  G.step(0.5);
});
await page.evaluate(async () => { window.__FC = (await import('./src/engine/drawcull.js')).FOGCULL; });
await page.addStyleTag({ content: 'body *:not(canvas){visibility:hidden!important} canvas{visibility:visible!important}' });
const info = [];
for (const s of shots.list) {
  const r = await page.evaluate((s) => { const shots = s.shots;
    const G = game, V3 = G.camera.position.constructor;
    let gy = 0, pos, look; const h = G.hero;
    const ax = s.abs ? s.target[0] : s.at[0], az = s.abs ? s.target[2] : s.at[1];
    if (shots.region) { if (G.room?.id !== shots.region) { G.regions.ensure(shots.region, 'test'); G.enterRoom(shots.region, null, true, true); G.step(0.1); } }
    else if (G.room) { G.exitRoom({ x: ax, z: az, a: 0 }, true, true); G.step(0.1); }
    if (s.abs) { pos = new V3(...s.pos); look = new V3(...s.target); }
    else {
      gy = G.physics.groundAt(s.at[0], s.at[1], 40);
      h.pos.set(s.at[0], gy, s.at[1]); h.vy = 0; h.onGround = true; h.angle = Math.atan2(Math.sin(s.yaw * Math.PI / 180), -Math.cos(s.yaw * Math.PI / 180));
      pos = new V3(s.cam[0], s.cam[1] + gy, s.cam[2]); look = new V3(s.target[0], s.target[1] + gy, s.target[2]);
    }
    if (s.abs || s.hero === false) h.rig && (h.rig.root.visible = false);
    G.camRig.override = { pos, look }; G.doorCool = 9;
    const cam = G.camera; const far0 = cam.far;
    G.camRig.snap?.();
    const fix = () => { cam.position.copy(pos); cam.lookAt(look); cam.fov = s.fov; if (s.abs) cam.far = Math.max(far0, 3000); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); if (s.sea && G.env.waterU) { G.env.waterU.uDeep.value.set(s.sea[0]); G.env.waterU.uShallow.value.set(s.sea[1]); } if (s.nofog) { G.env.fog.near = 5000; G.env.fog.far = 9000; if (window.__FC) window.__FC.on = false; } };
    for (let i = 0; i < 6; i++) { G.frame(1 / 60, false); fix(); }
    const R = G.renderer.renderer; G.perf?.beginFrame?.(); fix(); G.renderer.render();
    const calls = R.info.render.calls + (G.perf?.sub || 0), tris = R.info.render.triangles;
    return { gy: +gy.toFixed(2), calls, tris, room: G.room?.id || null, hx: +h.pos.x.toFixed(1), hz: +h.pos.z.toFixed(1) };
  }, { ...s, shots: { region: shots.region } });
  await page.screenshot({ path: `${outdir}/${s.name}.jpg`, type: 'jpeg', quality: 88, timeout: 600000 });
  info.push({ name: s.name, ...r }); console.log('shot', s.name, JSON.stringify(r));
}
fs.writeFileSync(outdir + '/info.json', JSON.stringify(info, null, 1));
await browser.close();
