// The whole cast at load (all regions): id, look, the look's race, and the npc's area/room, for the Zeelich/Otringal pass
import fs from 'node:fs';
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath: process.env.SHELL_EXE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
await page.goto('http://127.0.0.1:8257/?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 1500000 });
await page.click('[data-act="new"]', { timeout: 300000 });
const out = await page.evaluate(async () => {
  const C = await import('/src/game/characters.js'); const L = C.LOOKS;
  const looks = Object.fromEntries(Object.entries(L).map(([k, v]) => [k, { race: v.race, outfit: v.outfit, base: v.base || v.poly || null }]));
  const people = game.npcs.map((n) => ({ id: n.def.id, char: n.def.char, race: L[n.def.char]?.race, area: n.def.area || n.area || null, room: n.room?.id || n.def.room || null, region: n.region || n.def.region || null, x: n.pos ? Math.round(n.pos.x) : null, z: n.pos ? Math.round(n.pos.z) : null, story: !!n.def.story, name: n.def.name || null }));
  return { looks, people, keys: Object.keys(game.npcs[0] || {}), defkeys: [...new Set(game.npcs.flatMap((n) => Object.keys(n.def)))] };
});
fs.writeFileSync(process.argv[2] || 'census-z.json', JSON.stringify(out, null, 1));
const by = {}; for (const p of out.people) (by[p.char] ??= []).push(p.id);
console.log('people', out.people.length, 'npc keys', out.keys.join(','), '\ndef keys', out.defkeys.join(','));
console.log(Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([c, ids]) => `${c} (${out.looks[c]?.race}) ×${ids.length}: ${ids.join(',')}`).join('\n'));
await browser.close();
