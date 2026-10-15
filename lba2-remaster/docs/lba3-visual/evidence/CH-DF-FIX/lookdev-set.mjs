// CH-DF-FIX: the lookdev set for one revision (run once on the old files, once on the new), via lookdev-shot.mjs.
//   GAME_URL=http://127.0.0.1:8182/ node lookdev-set.mjs <outdir> <prefix>
// views-*: front, 3/4, side, top and the game camera (doze, look at Twinsen, full stretch, bind pose, grey look);
// close-grey: the grey look pose close up (feet, muzzle, neck root); wake-*: the doze → look transition, the real
// updater run t seconds with Twinsen 3.2 m away (one game-camera panel per instant).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2], PRE = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const shots = [
  ['views-doze', 'hold={"alert":0,"open":0}'],
  ['views-look', 'hero=3,1.2&t=3'],
  ['views-stretch', 'hold={"alert":1,"open":1}'],
  ['views-rest', 'rest=1'],
  ['views-grey-look', 'mat=grey&hero=3,1.2&t=3'],
  ['close-grey', 'mat=grey&tw=0&dist=7&ly=0.9&hero=3,1.2&t=3&views=front:0,3/4:-0.62,side:-1.57,back:3.14,top'],
];
for (const t of [0.1, 0.4, 0.7, 1, 1.4, 2, 3]) shots.push([`wake-${t}`, `hero=3,1.2&t=${t}&gd=9&panel=480x360&views=game:0.9`]);
const args = shots.flatMap(([n, q]) => [path.join(OUT, `${PRE}-${n}.png`), q]);
const here = path.dirname(new URL(import.meta.url).pathname);
console.log(execFileSync('node', [path.join(here, 'lookdev-shot.mjs'), ...args], { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 3000000 }));
