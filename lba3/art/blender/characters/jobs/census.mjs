// Citadel's people in chapter 1 and chapter 2: id, look (char), talk lines?, where, and how close to the places Twinsen passes
import fs from 'node:fs';
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath: process.env.SHELL_EXE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const ev = (f, a) => page.evaluate(f, a);
await page.goto('http://127.0.0.1:8257/?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing, null, { timeout: 1500000 });
await page.click('[data-act="new"]', { timeout: 300000 });
const out = {};
for (const ch of [1, 2]) {
  out['ch' + ch] = await ev((ch) => {
    const G = game; G.testFreeze = true; const ta = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } };
    ta(); if (ch === 1) { G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); } else { G.story.nextChapter(); }
    G.step(0.5); ta(); G.exitRoom({ x: -42, z: -2, a: 0 }, true, true); G.step(1);
    return { chapter: G.flags.chapter, people: G.npcs.filter((n) => n.pos && n.present !== false && n.group?.visible !== false).map((n) => ({ id: n.def.id, char: n.def.char, room: n.room?.id || n.def.room || null, x: Math.round(n.pos.x), z: Math.round(n.pos.z), walker: !!(n.def.route || n.def.walk || n.round), story: !!n.def.story, talk: !!(n.def.lines || n.def.talk || n.def.dialog) })) };
  }, ch);
}
fs.writeFileSync('census.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) { const by = {}; for (const p of v.people) (by[p.char] ??= []).push(p.id); console.log(k, 'chapter', v.chapter, 'people', v.people.length); console.log(Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([c, ids]) => `${c}×${ids.length}: ${ids.join(',')}`).join('\n')); }
await browser.close();
