#!/usr/bin/env node
// Smoke test of the Blender bridge (a few minutes, no game needed):  node tools/blender-bridge/smoke.mjs
// discovery; path rules; a tiny prop through import / inspect / validate / preview / export (polyprop and glb) in a
// folder whose name has spaces and Hebrew letters; the export read back; the timeout (kills only our Blender); the lock.
import fs from 'node:fs';
import path from 'node:path';
import { discover, runJob, validateJob, WORK, GAME_ROOT } from './bridge.mjs';

let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? '  ' + JSON.stringify(info).slice(0, 240) : ''}`); return ok; };
const throws = (f) => { try { f(); return null; } catch (e) { return e.message; } };

const B = discover();
check('discover: a blender.exe with its version', B.exe && /^\d+\.\d+/.test(B.version), { exe: B.exe, version: B.version, how: B.how });
if (!B.exe) process.exit(1);
check('discover: an explicit bad path is not taken', discover('C:/no/such/blender.exe').exe !== 'C:/no/such/blender.exe');

// a 0.6 x 0.4 x 0.3 m box, one material, as an lba3-polyprop, in an awkward folder
const DIR = path.join(WORK, 'smoke', 'תיקייה עם רווח');
fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true });
const hw = 0.3, h = 0.3, hd = 0.2, pos = [], nrm = [], uv = [], idx = [];
const face = (n, corners) => { const o = pos.length / 3; for (const c of corners) { pos.push(...c); nrm.push(...n); uv.push(0, 0); } idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };
face([0, 0, 1], [[-hw, 0, hd], [hw, 0, hd], [hw, h, hd], [-hw, h, hd]]); face([0, 0, -1], [[hw, 0, -hd], [-hw, 0, -hd], [-hw, h, -hd], [hw, h, -hd]]);
face([1, 0, 0], [[hw, 0, hd], [hw, 0, -hd], [hw, h, -hd], [hw, h, hd]]); face([-1, 0, 0], [[-hw, 0, -hd], [-hw, 0, hd], [-hw, h, hd], [-hw, h, -hd]]);
face([0, 1, 0], [[-hw, h, hd], [hw, h, hd], [hw, h, -hd], [-hw, h, -hd]]); face([0, -1, 0], [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]]);
const src = path.join(DIR, 'box.polyprop.json');
fs.writeFileSync(src, JSON.stringify({ format: 'lba3-polyprop', version: 1, name: 'smoke_box', footprint: { hw, hd, top: h }, textureDir: 'textures', parts: [{ material: { key: 'flat:#8a6a3a', recipe: null, color: '#8a6a3a', roughness: 0.7, metalness: 0 }, pos, nrm, uv, idx }] }));
const rel = (p) => path.relative(GAME_ROOT, p);

check('paths: output into assets/ is refused', /must be under/.test(throws(() => validateJob({ op: 'export', input: rel(src), output: 'assets/poly/x.json' })) || ''));
check('paths: output outside the project is refused', /must be under/.test(throws(() => validateJob({ op: 'inspect', input: rel(src), output: 'C:/Windows/Temp/x.json' })) || ''));
check('paths: overwriting the input is refused', /overwrite an input|must be under/.test(throws(() => validateJob({ op: 'export', input: rel(src), output: rel(src) })) || ''));
check('schema: unknown field refused', /unknown field/.test(throws(() => validateJob({ op: 'inspect', input: rel(src), output: rel(path.join(DIR, 'a.json')), bogus: 1 })) || ''));

const steps = [
  { op: 'import', input: rel(src), blend: rel(path.join(DIR, 'box.blend')) },
  { op: 'inspect', input: rel(path.join(DIR, 'box.blend')), output: rel(path.join(DIR, 'box.inspect.json')) },
  { op: 'validate', input: rel(path.join(DIR, 'box.blend')), output: rel(path.join(DIR, 'box.validate.json')), options: { expectSize: [0.6, 0.3, 0.4] } },
  { op: 'preview', input: rel(path.join(DIR, 'box.blend')), output: rel(path.join(DIR, 'previews')), options: { resolution: 128, samples: 4 } },
  { op: 'export', input: rel(path.join(DIR, 'box.blend')), output: rel(path.join(DIR, 'box.out.polyprop.json')) },
  { op: 'export', input: rel(path.join(DIR, 'box.blend')), output: rel(path.join(DIR, 'box.out.glb')), options: { format: 'glb' } },
  { op: 'inspect', input: rel(path.join(DIR, 'box.out.polyprop.json')), output: rel(path.join(DIR, 'box.out.inspect.json')) },
];
for (const j of steps) {
  let r; try { r = await runJob(j, { blender: B, timeout: 300 }); } catch (e) { r = { ok: false, errors: [e.message] }; }
  if (!check(`job ${j.op} runs (exit 0, result ok)`, r.ok, r.ok ? r.result.summary : r.errors)) break;   // (the next steps read this one's output)
}
const exists = (f) => fs.existsSync(path.join(DIR, f)) && fs.statSync(path.join(DIR, f)).size > 0;
check('outputs: .blend, reports, 8 views + sheet, polyprop, glb', ['box.blend', 'box.inspect.json', 'box.validate.json', 'box.out.polyprop.json', 'box.out.glb', 'previews/sheet.png', 'previews/neutral-front.png', 'previews/textured-threequarter.png'].every(exists));
const ex = fs.existsSync(path.join(DIR, 'box.out.polyprop.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'box.out.polyprop.json'), 'utf8')) : null;
check('export: the polyprop keeps the size (game axes) and 12 triangles', ex && ex.bbox.size.every((v, i) => Math.abs(v - [0.6, 0.3, 0.4][i]) < 1e-4) && ex.triangles === 12, ex && { size: ex.bbox.size, tris: ex.triangles });
check('export: the material recipe survives the round trip', ex && ex.parts[0].material.key === 'flat:#8a6a3a' && ex.parts[0].material.color === '#8a6a3a');
const back = fs.existsSync(path.join(DIR, 'box.out.inspect.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'box.out.inspect.json'), 'utf8')) : null;
check('export: Blender reads the exported file back at the same size', back && back.totals.bboxGame.size.every((v, i) => Math.abs(v - [0.6, 0.3, 0.4][i]) < 1e-4), back?.totals?.bboxGame);

// timeout: a job that sleeps an hour, given 8 s; its Blender must be gone afterwards
const sleeper = { op: 'script', script: 'tools/blender-bridge/blender/smoke_sleep.py', args: ['3600'], timeout: 8 };
const t0 = Date.now(), rt = await runJob(sleeper, { blender: B });
check('timeout: the job is stopped after its timeout', rt.exitCode === 'timeout' && Date.now() - t0 < 60000, { exit: rt.exitCode, s: rt.seconds });
// lock: while one job holds it, a --no-wait job is refused
const long = runJob({ ...sleeper, args: ['6'], timeout: 60 }, { blender: B });
await new Promise((r) => setTimeout(r, 1500));
let refused = null; try { await runJob({ ...sleeper, args: ['1'] }, { blender: B, wait: false }); } catch (e) { refused = e.message; }
check('lock: a second job does not run at the same time', /another Blender job is running/.test(refused || ''), refused);
const lr = await long;
check('lock: the first job still finishes', lr.ok, lr.errors);
console.log(fails ? `SMOKE FAILED (${fails})` : 'SMOKE PASSED');
process.exit(fails ? 1 : 0);
