// FACE-1 (P67 phase 4, the user 18.11: "the characters lack even basic facial expressions"): Twinsen's and Zoé's faces
// in close-up for each expression (neutral, curious, concerned, pleased, determined, annoyed), the gaze, and a real
// conversation driving them by its lines' intentions. src/engine/rig.js (FACES, setFace, _gazeStep, _mouthShape),
// src/game/characters.js (addBrowMorphs, irisOf), src/main.js faceLine. Captures: captures/faces/*.jpg (looked at by hand).
import { launch, open, checker } from './lib/boot.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const CAP = fileURLToPath(new URL('../captures/faces/', import.meta.url));
mkdirSync(CAP, { recursive: true });
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);

await open(page, '?nocine');
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false;
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.go(sp.x, sp.z, { tol: 1.2 }); P.use(sp.x, sp.z);
  for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
  const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); P.settle(); game.step(1.0);
  window.FC = {
    // a close-up of a character's face: the camera in front of the head, looking at it (the frame not stepped after)
    shot(a, dist = 0.55) {
      const R = a.rig, hd = R.j.head, p = new game.camera.position.constructor();
      hd.getWorldPosition(p); const f = p.clone(); R.j.eyes[0].getWorldPosition(f);
      p.copy(f); f.sub(hd.getWorldPosition(new game.camera.position.constructor())).setY(0).normalize();   // (the way the face looks: the eyes are in front of the head bone)
      p.y -= 0.03 * (R.root.scale.y || 1);
      if (game.tutorial._mk) game.tutorial._mk.group.visible = false;
      game.camera.position.copy(p).addScaledVector(f, dist * (R.root.scale.y || 1)); game.camera.lookAt(p);
      const c = game.camera, n0 = c.near, f0 = c.fov; c.near = 0.02; c.fov = 30; c.updateProjectionMatrix(); c.updateMatrixWorld(); game.renderer.render(); c.near = n0; c.fov = f0; c.updateProjectionMatrix();
    },
  };
});
const info = await ev(() => { const z = P.npc('zoe'), h = game.hero; const m = (r) => ({ morphs: r.mesh?.morphTargetInfluences?.length || 0, iris: !!r.j.eyes[0]?.userData.iris, mouth: !!r.mouth?.userData.base }); return { hero: m(h.rig), zoe: m(z.rig) }; });
check('F1 Twinsen and Zoé: brow morphs (3), the iris marked for the gaze, the mouth\'s base for the smile', ['hero', 'zoe'].every((k) => info[k].morphs === 3 && info[k].iris && info[k].mouth), info);
// each expression, both faces
const names = ['neutral', 'curious', 'concerned', 'pleased', 'determined', 'annoyed'];
const vals = {};
for (const n of names) {
  vals[n] = await ev((n) => {
    const z = P.npc('zoe'), h = game.hero;
    for (const a of [h, z]) { a.rig.setFace(n, 1, Infinity); a.rig.gazeAt = null; a.rig.gxTo = a.rig.gyTo = 0; }
    game.step(1.0);
    return [h, z].map((a) => { const r = a.rig; return { inf: [...r.mesh.morphTargetInfluences].map((x) => +x.toFixed(2)), lid: +r.j.eyes[0].scale.y.toFixed(2), sm: +r.face.smile.toFixed(2) }; });
  }, n);
  await ev(() => FC.shot(game.hero)); await page.screenshot({ path: `${CAP}tw-${names.indexOf(n)}-${n}.jpg`, type: 'jpeg', quality: 85 });
  await ev(() => FC.shot(P.npc('zoe'))); await page.screenshot({ path: `${CAP}zoe-${names.indexOf(n)}-${n}.jpg`, type: 'jpeg', quality: 85 });
}
check('F2 each expression sets its brows, lids and mouth (pleased: smile up, eyes narrower; concerned: inner brows up, corners down; annoyed: brows down and in)',
  vals.pleased[0].sm > 0.9 && vals.pleased[0].lid < 0.9 && vals.concerned[0].inf[2] > 0.9 && vals.concerned[0].sm < -0.6 && vals.annoyed[0].inf[1] > 0.9 && vals.curious[0].inf[0] > 0.8 && vals.neutral[0].inf.every((x) => x === 0), vals);
// the gaze: Zoé looks at Twinsen standing to her side
const gz = await ev(() => { const z = P.npc('zoe'), h = game.hero; z.rig.setFace('neutral'); z.rig.gazeAt = h.pos.clone().setY(h.pos.y + 1.8); z.rig.gazeT = 5; game.step(0.6); return { gx: +z.rig.gx.toFixed(2), gy: +z.rig.gy.toFixed(2) }; });
check('F3 the gaze follows a point (Zoé at Twinsen): the iris moves', Math.abs(gz.gx) > 0.05 || Math.abs(gz.gy) > 0.05, gz);
// a real conversation: Zoé's first line in the yard, then his
const talk = await ev(() => {
  for (const a of [game.hero, P.npc('zoe')]) a.rig.setFace('neutral');
  const z = P.npc('zoe'); P.go(z.pos.x + 1.2, z.pos.z - 0.6, { tol: 0.4 }); P.face(z.pos.x, z.pos.z); game.step(0.3);
  P.tap('KeyE', 0.05); const out = [];
  for (let i = 0; i < 12 && game.state === 'dialog'; i++) {
    game.step(1.2);
    const sp = game.speaker; out.push({ who: sp === game.hero ? 'hero' : sp?.def?.id, line: game.hud.dialog.full.slice(0, 40), face: sp?.rig?.faceName, heroFace: game.hero.rig.faceName, zoeFace: z.rig.faceName, gaze: !!(sp === game.hero ? game.hero.rig.gazeAt : z.rig.gazeAt) });
    P.tap('KeyE', 0.05); P.tap('KeyE', 0.05);
  }
  return out;
});
check('F4 a conversation sets the faces from its lines (some line not neutral) and the speaker looks at the other', talk.length >= 2 && talk.some((x) => x.face && x.face !== 'neutral') && talk.every((x) => x.gaze), talk);
const after = await ev(() => { for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); } game.step(8); return { hero: game.hero.rig.faceName, zoe: P.npc('zoe').rig.faceName, gz: !!P.npc('zoe').rig.gazeAt }; });
check('F5 after the conversation the faces ease back to neutral and the gaze is let go', after.hero === 'neutral' && after.zoe === 'neutral' && !after.gz, after);
await browser.close();
done();
