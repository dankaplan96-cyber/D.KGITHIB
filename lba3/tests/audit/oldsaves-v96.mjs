// RELEASE-AUDIT-v96 probe: saves made by PLAYING v75 (RELEASE-AUDIT-v75's chain, one per segment) continued in v96, as
// a player's browser holds them when the same page updates. Each save's storage is re-keyed from v75's server address
// to this server's, then: title → Continue (a click), 4 s of game time, and the state read: play, the chapter, the
// room, the objective, Twinsen on the ground, then 3 s of walking forward (Up held) to see that he moves.
//   SAVES=<dir with save-NN.json> LIST=02,05,08 node tests/audit/oldsaves-v96.mjs
import { launch, open, menu, checker } from '../lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker({ info: 'always' });
const DIR = process.env.SAVES, LIST = (process.env.LIST || '02,05,08,11,13').split(',');
const URL0 = (process.env.GAME_URL || 'http://localhost:8123/').replace(/\/$/, '');
for (const n of LIST) {
  const src = JSON.parse(fs.readFileSync(path.join(DIR, `save-${n}.json`), 'utf8'));
  for (const o of src.origins) o.origin = URL0;
  const tmp = `/dev/shm/t986-audit/oldsave-${n}.json`; fs.writeFileSync(tmp, JSON.stringify(src));
  const { browser, page } = await launch({ storageState: tmp });
  try {
    await open(page, '?nocine');
    const hasCont = await page.evaluate(() => !document.querySelector('[data-act="continue"]')?.classList.contains('hidden'));
    await menu(page, 'continue');
    const r = await page.evaluate(() => {
      game.testFreeze = true; for (let i = 0; i < 40; i++) { game.step(0.1); if (game.state !== 'play') P.settle(); }
      const h = game.hero, g0 = game.physics.groundAt(h.pos.x, h.pos.z, h.pos.y + 1);
      const at0 = { x: h.pos.x, z: h.pos.z };
      game.input.keys.add('ArrowUp'); game.step(3); P.release(); game.step(0.3);
      return { state: game.state, chapter: game.story?.cur?.key, room: game.room?.id || 'outdoors', obj: (document.querySelector('#objective')?.textContent || '').slice(0, 90),
        onGround: Math.abs(h.pos.y - g0) < 0.35, moved: +Math.hypot(h.pos.x - at0.x, h.pos.z - at0.z).toFixed(2), hp: h.hp, clovers: h.clovers };
    });
    console.log(`v75 save-${n}:`, JSON.stringify(r));
    check(`v75 save-${n} → v96: Continue offered, play, an objective, on the ground, walks (${r.chapter}, ${r.room})`, hasCont && r.state === 'play' && r.obj.length > 3 && r.onGround && r.moved > 0.5, r);
  } catch (e) { check(`v75 save-${n} → v96: loads`, false, e.message.split('\n')[0]); }
  await browser.close();
}
await done();
