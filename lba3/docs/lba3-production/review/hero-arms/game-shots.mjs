// HERO-ARMS: Twinsen in the game on Citadel in daylight, each pose reached by the game itself (keys, a line of
// dialogue, a found object, the ball and the sword), photographed from a near camera (and the play camera for idle).
//   GAME_URL=http://localhost:8650/ [SPOT=x,z,angle] node game-shots.mjs <out dir> [only,names]
// One browser, 1280x720. The near camera is placed after the game's own frame; nothing in the game is changed, except
// that the other characters are hidden for the portraits (the town's people walk into the frame).
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[3]?.split(',');
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, "new");
console.log("spawn", JSON.stringify(await ev(() => ({ hero: [game.hero.pos.x, game.hero.pos.z, game.hero.angle], room: game.room?.id, house: game.world.houses?.[0] && [game.world.houses[0].x, game.world.houses[0].z] }))));
const SPOT = (process.env.SPOT || '-12,-34,0.6').split(',').map(Number);
await ev((SPOT) => {
  const G = game, h = G.hero, [X, Z, A] = SPOT;
  G.exitRoom({ x: X, z: Z, a: A }, true, true);
  G.camRig.lba && (G.camRig.lba.init = false);
  G.step(1.5);
  const keys = (on, ks) => ks.forEach((k) => { if (on) { G.input.keys.add(k); G.input.taps.add(k); } else G.input.keys.delete(k); });
  window.S = {
    G, h, keys,
    step(s, dt = 1 / 60) { for (let t = 0; t < s - 1e-9; t += dt) G.frame(dt, false); },
    reset(a = A) {
      keys(false, [...G.input.keys]); G.input.keys.clear();
      G.foundObj?.reset?.();
      if (G.state !== 'play') G.setState('play');
      h.pos.set(X, G.physics.groundAt(X, Z), Z); h.angle = a; h.vel.set(0, 0); h.fwdSpeed = 0; h.setBehaviour('normal');
      h.combat?.reset?.(); G.resetCombat?.();
      S.step(0.8);
      S.hide();
    },
    // the other characters out of the picture (skinned meshes that are not his)
    hide() {
      const mine = new Set(); h.rig.root.traverse((o) => mine.add(o));
      G.scene.traverse((o) => { if (o.isSkinnedMesh && !mine.has(o)) o.visible = false; });
    },
    // the near camera: yaw relative to his facing (0 = in front of him), distance, look-at height
    cam(yaw = 0, d = 3.2, y = 1.0, up = 0.35) {
      const a = h.angle + yaw, c = G.camera;
      c.position.set(h.pos.x + Math.sin(a) * d, h.pos.y + y + up, h.pos.z + Math.cos(a) * d);
      c.fov = 40; c.updateProjectionMatrix();
      c.lookAt(h.pos.x, h.pos.y + y, h.pos.z); c.updateMatrixWorld();
      G.renderer.render();
    },
    // a close-up of a hand and its cuff: the camera `d` from the hand bone, `yaw` round his facing, a little above
    camHand(arm = 'armL', yaw = 0.9, d = 0.9, up = 0.25) {
      const v = h.pos.clone(); h.rig.j[arm].hand.updateWorldMatrix(true, false); h.rig.j[arm].hand.getWorldPosition(v);
      v.y -= 0.06;
      const a = h.angle + yaw, c = G.camera;
      c.position.set(v.x + Math.sin(a) * d, v.y + up, v.z + Math.cos(a) * d);
      c.fov = 40; c.updateProjectionMatrix(); c.lookAt(v); c.updateMatrixWorld();
      G.renderer.render();
    },
  };
}, SPOT);
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 180000 }); console.log('shot', name); };
const want = (n) => !ONLY || ONLY.includes(n);
const P = [
  // name, setup (in the page), camera [yaw, dist, look-at height]
  ['idle-play', () => { S.reset(); S.step(1.0); G.renderer.render(); }, null],
  ['idle-front', () => { S.reset(); S.step(1.0); }, [0, 4.2, 1.0]],
  ['idle-34', () => { S.reset(); S.step(1.0); }, [0.7, 4.2, 1.0]],
  ['hand-close', () => { S.reset(); S.step(1.0); }, ['hand', 'armL', 0.95, 0.95, 0.3]],
  ['hand-close-r', () => { S.reset(); S.step(1.0); }, ['hand', 'armR', -1.1, 0.95, 0.3]],
  ['walk', () => { S.reset(); S.keys(true, ['ArrowUp']); S.step(1.25); }, [0.6, 4.4, 1.0]],
  ['run', () => { S.reset(); S.h.setBehaviour('athletic'); S.keys(true, ['ArrowUp']); S.step(0.8); }, [0.6, 5.0, 1.0]],
  ['found', () => { S.reset(); G.found('rope', 'c4_toast_rope', () => {}); S.step(0.62); document.querySelector('#found')?.classList.add('hidden'); }, [0.25, 4.4, 1.15]],
  ['found-arms', () => { S.reset(); G.found('rope', 'c4_toast_rope', () => {}); S.step(0.95); document.querySelector('#found')?.classList.add('hidden'); }, [-0.4, 4.4, 1.15]],
  // both arms overhead (rig.js 'cheer'; no game event plays it, so the rig is driven directly, the world held still)
  ['cheer', () => { S.reset(); S.step(0.5); const r = S.h.rig; for (let k = 0; k < 18; k++) { r.play('cheer'); r.update(1 / 60, 0); } }, [0.35, 4.4, 1.2]],
  ['throw', () => { S.reset(); S.h.hasBall = true; S.h.combat.equip('ball', true); S.step(0.3); S.keys(true, ['KeyF']); S.step(1 / 60); S.keys(false, ['KeyF']); S.step(0.12); }, [0.6, 4.4, 1.05]],
  ['sword', () => { S.reset(); S.h.hasSword = true; S.h.combat.equip('sword', true); S.step(0.5); S.keys(true, ['KeyK']); S.step(1 / 60); S.keys(false, ['KeyK']); S.step(0.17); }, [0.5, 4.6, 1.05]],
  ['sword-wind', () => { S.reset(); S.h.hasSword = true; S.h.combat.equip('sword', true); S.step(0.5); S.keys(true, ['KeyK']); S.step(1 / 60); S.keys(false, ['KeyK']); S.step(0.09); }, [-0.5, 4.6, 1.05]],
  ['talk', () => { S.reset(); G.say('Twinsen', ['A line to say, long enough for his hands to move while he talks.'], () => {}, S.h); S.step(1.25); S.hide(); }, [0.5, 4.0, 1.0]],
];
for (const [name, setup, cam] of P) {
  if (!want(name)) continue;
  try {
    await ev(`(() => { const G = S.G; (${setup.toString()})(); })()`);
    const info = await ev((cam) => { if (cam && cam[0] === 'hand') S.camHand(...cam.slice(1)); else if (cam) S.cam(...cam); return { anim: S.h.rig.anim, state: S.G.state }; }, cam);
    await shot(name);
    console.log(name, JSON.stringify(info));
  } catch (e) { console.log('FAILED', name, e.message.slice(0, 300)); }
}
await browser.close();
