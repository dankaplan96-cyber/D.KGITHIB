// Every resident of the Citadel, every stop of its round: does what it does look right?
//   geometry  from the stop, in the direction it faces, a ray at hand height (and one slanting down for work on the
//             ground) finds the nearest real surface (characters ignored): the gap between the resident and what it
//             tends, waters, draws from, warms at, browses, sets down on or knocks at. A gap the arms cannot bridge
//             (> 1 m; 1.2 m to a door) is a resident working on air. A stop inside another object is caught too.
//   picture   the resident is put at that stop (its own reset: the same pose and animation its round gives it there),
//             Twinsen is hidden, and a close-up is taken: a person judges the pose, the hands and the timing.
// Only the Citadel (chapters 1–2): no later area is visited.
import fs from 'node:fs';
import path from 'node:path';
import { assert, newGame } from './common.mjs';
import { gameState } from '../probe.mjs';
import { sleep, writeJson } from '../util.mjs';
import { STREET_START } from './core.mjs';

// how far in front and how high a resident's hands work, per act (walkers.js: act → animation)
const REACH = { tend: { h: 0.35, down: true, max: 1.0 }, water: { h: 0.5, down: true, max: 1.0 }, draw: { h: 0.9, max: 1.0 }, dip: { h: 0.8, max: 1.0 },
  warm: { h: 1.0, max: 1.0 }, browse: { h: 0.95, max: 1.0 }, put: { h: 0.7, down: true, max: 1.3, ground: true }, knock: { h: 1.25, max: 1.2 } };

export const npcSurvey = {
  id: 'npc-survey', title: 'Residents: every activity checked and photographed', group: 'visual', suites: ['npcs'], session: 'warm', timeoutS: 1500,
  method: { realInput: false, testApi: true, injectedState: true, preloadedAssets: false },
  async run(ctx) {
    const { page, rec, dir } = ctx;
    if ((await gameState(page)).state !== 'play') await newGame(page);
    await page.evaluate((s) => { game.resetCombat?.('drop'); game.exitRoom(s, true, true); }, STREET_START);
    await sleep(3000);
    // 1. the list and the geometry check, all in the page
    const list = await page.evaluate(async (REACH) => {
      const THREE = await import('/vendor/three/build/three.module.min.js');
      const G = game, W = G.walkers, res = (W?.res || []).filter((r) => r.stops?.length);
      const chars = new Set([G.hero.rig?.root, ...G.npcs.map((n) => n.rig?.root), ...(G.enemies || []).map((e) => e.rig?.root)].filter(Boolean));
      const isChar = (o) => { for (let x = o; x; x = x.parent) if (chars.has(x)) return true; return false; };
      const ray = new THREE.Raycaster(); ray.far = 4;
      // (each mesh on its own: a few special objects — skinned, batched — throw in three's raycast; they are skipped, not fatal)
      const meshes = []; G.scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && !o.isSkinnedMesh && !o.isBatchedMesh && o.geometry?.attributes?.position) meshes.push(o); });
      const cast = () => { const all = []; for (const m of meshes) { try { ray.intersectObject(m, false, all); } catch {} } return all.sort((a, b) => a.distance - b.distance); };
      const hit = (o, d) => { ray.set(o, d.normalize()); for (const h of cast()) { if (!h.object.visible || isChar(h.object) || h.object.isSprite || h.object.isLine || h.object.isPoints) continue; return h; } return null; };
      const out = [];
      // (residents carry no id of their own: their def's id, else their stops' prefix; they are found again by index)
      const nameOf = (r) => r.def?.id || r.name || (r.stops[0]?.id || '?').split('_')[0];
      for (const r of res) for (let i = 0; i < r.stops.length; i++) try {
        const s = r.stops[i], R = REACH[s?.act];
        if (!R || s.a == null) continue;
        const y = G.physics.groundAt(s.x, s.z), dx = Math.sin(s.a), dz = Math.cos(s.a);
        const flat = hit(new THREE.Vector3(s.x, y + R.h, s.z), new THREE.Vector3(dx, 0, dz));
        const slant = R.down ? hit(new THREE.Vector3(s.x, y + 1.0, s.z), new THREE.Vector3(dx, -0.8, dz)) : null;
        const horiz = (h) => (h ? Math.hypot(h.point.x - s.x, h.point.z - s.z) : null);
        const gaps = [horiz(flat), horiz(slant)].filter((v) => v != null);
        // the slanting ray reaches the ground at about 1.25 m anyway: a hit on the ground itself is not a thing to tend
        const slantOnGround = slant && Math.abs(slant.point.y - G.physics.groundAt(slant.point.x, slant.point.z)) < 0.05;
        // (setting something down on the ground is fine: there the ground counts)
        const gap = gaps.length ? Math.min(...gaps.filter((g, k) => R.ground || !(k === 1 && slantOnGround) || gaps.length === 1)) : null;
        // standing inside something: a short ray up from the feet hits a surface at once
        const inside = hit(new THREE.Vector3(s.x, y + 0.05, s.z), new THREE.Vector3(0, 1, 0));
        out.push({ who: nameOf(r), k: W.res.indexOf(r), char: r.def?.char || '', stop: s.id, i, act: s.act, x: +s.x.toFixed(2), z: +s.z.toFixed(2), a: +s.a.toFixed(3),
          gap: gap != null ? +gap.toFixed(2) : null, max: R.max, hitWhat: (flat || slant)?.object?.name || (flat || slant)?.object?.parent?.name || '', insideAt: inside && inside.distance < 1.2 ? +inside.distance.toFixed(2) : null, stage: s.stage ?? null });
      } catch (e) { out.push({ who: nameOf(r), k: W.res.indexOf(r), i, error: String(e.stack || e).split(/\n/).slice(0, 3).join(' | ') }); }
      return out;
    }, REACH);
    if (!list.length) throw new Error('no residents with rounds found in the Citadel');
    // 2. the pictures: each stop with its act, the resident put there by its own reset, Twinsen hidden
    const shots = path.join(dir, 'evidence', 'npcs'); fs.mkdirSync(shots, { recursive: true });
    await page.evaluate(() => { game.hero.rig.root.traverse((o) => { o.userData.__tlLayers = o.layers.mask; o.layers.set(31); }); });
    for (const S of list) {
      if (ctx.stopped()) break;
      if (S.error) continue;
      const got = await page.evaluate(({ k, i }) => {
        const r = game.walkers.res[k]; if (!r) return null;
        r.ri = i; let p; try { p = r.reset(); } catch {} const s0 = r.stops[r.ri] || r.stops[i]; p = p && p.x != null ? p : { x: s0.x, z: s0.z, a: s0.a ?? r.angle };
        r.pos.set(p.x, game.physics.groundAt(p.x, p.z), p.z); r.angle = p.a;
        const s = r.stops[r.ri];
        // Twinsen (hidden) 4.5 m to the resident's side and a little behind, facing it: the follow camera sees the resident in profile, with what it works on
        const a = r.angle + 1.9, hx = p.x + Math.sin(a) * 4.5, hz = p.z + Math.cos(a) * 4.5;
        game.hero.pos.set(hx, game.physics.groundAt(hx, hz), hz); game.hero.angle = Math.atan2(p.x - hx, p.z - hz); game.camRig.recenter?.();
        return { stop: s.id, act: s.act };
      }, S);
      if (!got) continue;
      S.shownStop = got.stop;   // (a stop of another stage of the town is skipped by reset: the stop actually shown)
      await sleep(1600);
      const clip = await page.evaluate((k) => { const r = game.walkers.res[k]; const v = r.pos.clone(); v.y += 1.0; v.project(game.camera); const s = 340; const x = ((v.x + 1) / 2) * innerWidth, y = ((1 - v.y) / 2) * innerHeight; return { x: Math.max(0, Math.min(innerWidth - s, Math.round(x - s / 2))), y: Math.max(0, Math.min(innerHeight - s, Math.round(y - s / 2))), width: s, height: s, onScreen: v.z < 1 && x > 0 && x < innerWidth && y > 0 && y < innerHeight }; }, S.k);
      S.file = `${S.who}-${S.i}.jpg`;
      S.onScreen = clip.onScreen;
      await page.screenshot({ path: path.join(shots, S.file), type: 'jpeg', quality: 78, clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } }).catch(() => { S.file = null; });
    }
    await page.evaluate(() => { game.hero.rig.root.traverse((o) => { if (o.userData.__tlLayers != null) o.layers.mask = o.userData.__tlLayers; }); for (const r of game.walkers.res) if (r.stops?.length) try { r.reset(); } catch {} });
    // 3. verdicts: numbers say "gap" and "inside"; the look is for a person
    const errs = list.filter((s) => s.error); for (const s of errs) assert(rec, `${s.who} stop ${s.i}: checked`, false, 'no error', s.error);
    const far = list.filter((s) => !s.error && (s.gap == null || s.gap > s.max)), inside = list.filter((s) => !s.error && s.insideAt != null);
    rec.npcs = list; rec.needsVisualJudgment = 'Look at evidence/npcs/index.html: every resident at every activity, with its measured gap.';
    for (const s of far) assert(rec, `${s.who} · ${s.act} at ${s.stop}: within reach`, false, `≤ ${s.max} m to what it works on`, s.gap == null ? 'nothing within 4 m in front' : `${s.gap} m${s.hitWhat ? ' (to ' + s.hitWhat + ')' : ''}`);
    for (const s of inside) assert(rec, `${s.who} at ${s.stop}: not standing inside an object`, false, 'free above the feet', `a surface ${s.insideAt} m above the feet`);
    assert(rec, 'stops checked', list.length > 0, '> 0', `${list.length} stops of ${new Set(list.map((s) => s.who)).size} residents · ${far.length} out of reach · ${inside.length} inside something`);
    writeJson(path.join(dir, 'evidence', 'npcs', 'survey.json'), list);
    fs.writeFileSync(path.join(shots, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Residents survey</title><style>body{font:13px system-ui;background:#111;color:#ddd;margin:10px}div{display:inline-block;width:250px;margin:3px;vertical-align:top}img{width:250px}.bad{color:#ff7a7a}</style><h3>Residents at their activities (gap = distance from the resident to the nearest surface in front, at hand height)</h3>${list.map((s) => `<div>${s.file ? `<img src="${s.file}">` : '(no picture)'}<br><b>${s.who}</b> · ${s.act} · ${s.shownStop || s.stop}<br><span class="${s.gap == null || s.gap > s.max ? 'bad' : ''}">gap ${s.gap ?? '—'} m</span>${s.insideAt != null ? ' <span class="bad">inside?</span>' : ''}${s.onScreen === false ? ' (off screen)' : ''}</div>`).join('')}`);
    rec.evidence.push('evidence/npcs/index.html', 'evidence/npcs/survey.json');
  },
};

export const NPC_SURVEY = [npcSurvey];
