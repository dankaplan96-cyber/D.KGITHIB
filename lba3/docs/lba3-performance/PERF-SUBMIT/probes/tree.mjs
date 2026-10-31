// PERF-SUBMIT: a saved profile (prof.mjs OUT=) as a call tree under a function: ms per frame, inclusive, children
// merged by name, to DEPTH levels, children under MIN ms/frame left out.
//   node tree.mjs /dev/shm/ps-prof.json 'setProgram' [DEPTH=4] [MIN=0.02] [CALLERS=1: who calls it, upward]
import { readFileSync } from 'node:fs';
const [file, root = 'frame'] = process.argv.slice(2), DEPTH = +(process.env.DEPTH || 4), MIN = +(process.env.MIN || 0.02);
const { profile, frames } = JSON.parse(readFileSync(file, 'utf8'));
const byId = new Map(); for (const n of profile.nodes) byId.set(n.id, n);
const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const name = (n) => { const f = n.callFrame; const u = (f.url || '').replace(/^.*\/(src|vendor)\//, '$1/').replace(/^.*three\.module\.min\.js/, 'three.module').replace(/^.*three\.core\.js/, 'three.core'); return `${f.functionName || '(anon)'} ${u}:${f.lineNumber + 1}`; };
const T = { k: root, ms: 0, kids: new Map() };
for (let i = 0; i < profile.samples.length; i++) {
  const dt = (profile.timeDeltas[i + 1] ?? 0) / 1000;
  const stack = []; for (let id = profile.samples[i]; id != null; id = parent.get(id)) stack.push(byId.get(id));
  if (!process.env.CALLERS) stack.reverse();
  // the outermost frame of `root` (by function name, or name + file:line)
  const ri = stack.findIndex((n) => n.callFrame.functionName === root || name(n) === root);
  if (ri < 0) continue;
  T.ms += dt;
  let t = T;
  for (let j = ri + 1; j < stack.length && j - ri <= DEPTH; j++) { const k = name(stack[j]); let c = t.kids.get(k); if (!c) t.kids.set(k, (c = { k, ms: 0, kids: new Map() })); c.ms += dt; t = c; }
}
const pr = (t, ind) => { console.log(`${(t.ms / frames).toFixed(3).padStart(8)}  ${ind}${t.k}`); for (const c of [...t.kids.values()].sort((a, b) => b.ms - a.ms)) if (c.ms / frames >= MIN) pr(c, ind + '  '); };
pr(T, '');
