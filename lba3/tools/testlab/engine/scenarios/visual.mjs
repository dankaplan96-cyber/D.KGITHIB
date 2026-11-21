// Visual captures (their own suite: screenshots disturb frame timing, so they never run inside a performance window).
// Each action is played with real keys on the street; a strip of screenshots becomes a contact sheet; the game state
// is checked where numbers can say something: the animation that played, transforms that are finite, a ball that was
// released. Whether it LOOKS right (likeness, LBA feel, T-poses mid-blend, clipping) needs a person: every sheet is
// listed under "needs visual judgment", never passed by the tool.
import fs from 'node:fs';
import path from 'node:path';
import { assert, newGame, replay, hold } from './common.mjs';
import { gameState } from '../probe.mjs';
import { sleep } from '../util.mjs';
import { STREET_START } from './core.mjs';

const ev = (page, fn, arg) => page.evaluate(fn, arg);
const ACTIONS = [
  { id: 'idle', label: 'Idle', keys: [], expect: /idle|stand|breath/i },
  { id: 'walk', label: 'Walk', keys: hold('ArrowUp', 0, 1.8), expect: /walk|run|move/i },
  { id: 'turn', label: 'Turning', keys: hold('ArrowLeft', 0, 1.2), expect: /turn|idle|walk/i },
  // (Space jumps in the Athletic behaviour, F2; in Normal it is the action key)
  { id: 'jump', label: 'Jump and landing', keys: [[0, 'tap', 'F2'], [0.4, 'tap', 'Space'], [2.2, 'tap', 'F1']], expect: /jump|fall|land|air/i },
  { id: 'ball', label: 'Ball throw and release', keys: [[0, 'tap', 'KeyF']], expect: /throw|cast|ball/i, ball: true },
  { id: 'sword', label: 'Sword attacks', keys: [[0, 'tap', 'KeyK'], [0.25, 'tap', 'KeyK'], [0.5, 'tap', 'KeyK']], expect: /attack|slash|sword|swing|combo/i, sword: true },
  { id: 'hurt', label: 'Damage reaction', keys: [], hurt: true, expect: /hurt|hit|damage|stagger|knock/i },
];

export const VISUALS = ACTIONS.map((A) => ({
  id: `visual-${A.id}`, title: `Visual capture: ${A.label}`, group: 'visual', suites: ['visual'], session: 'warm', timeoutS: 120,
  method: { realInput: A.keys.length > 0, testApi: true, injectedState: true, preloadedAssets: false },
  async run(ctx) {
    const { page, rec, dir } = ctx;
    if ((await gameState(page)).state !== 'play') await newGame(page);
    await ev(page, (s) => { game.resetCombat?.('drop'); game.exitRoom(s, true, true); const h = game.hero; h.hasBall = true; h.hasSword = true; h.hp = h.maxHp; h.combat?.equip?.('ball'); }, STREET_START);
    if (A.sword) await ev(page, () => game.hero.combat?.equip?.('sword'));
    await sleep(1500);
    const anims = [], ball = [], shots = [];
    const out = path.join(dir, 'evidence', 'visual'); fs.mkdirSync(out, { recursive: true });
    let on = true;
    const watch = (async () => { while (on) { const s = await ev(page, () => ({ a: game.hero.rig?.anim ?? null, b: game.ball?.state })); if (anims.at(-1) !== s.a) anims.push(s.a); if (ball.at(-1) !== s.b) ball.push(s.b); await sleep(40); } })();
    // a close-up around Twinsen (the player's camera is far: the whole frame shows him a few pixels tall), plus one full frame
    const crop = () => page.evaluate(() => { const v = game.hero.pos.clone(); v.y += 0.9; v.project(game.camera); const x = ((v.x + 1) / 2) * innerWidth, y = ((1 - v.y) / 2) * innerHeight, s = Math.round(Math.min(innerHeight, 420)); return { x: Math.max(0, Math.min(innerWidth - s, Math.round(x - s / 2))), y: Math.max(0, Math.min(innerHeight - s, Math.round(y - s * 0.55))), width: s, height: s }; });
    const cap = (async () => { for (let k = 0; k < 8; k++) { const f = `${A.id}-${k}.jpg`; await page.screenshot({ path: path.join(out, f), type: 'jpeg', quality: 75, ...(k === 7 ? {} : { clip: await crop() }) }).catch(() => {}); shots.push(f); await sleep(220); } })();
    if (A.hurt) await ev(page, () => { const h = game.hero; h.invuln = 0; h.damage(1); });
    await replay(page, A.keys);
    await cap; on = false; await watch;
    // transforms: every bone of Twinsen's rig finite and not collapsed to zero scale
    const tf = await ev(page, () => {
      const h = game.hero, root = h.rig?.root || h.rig?.group || h.group || h.mesh || h.obj; if (!root?.traverse) return { bones: 0, bad: 0, note: 'rig root not found' };
      let bones = 0, bad = 0; root.updateMatrixWorld?.(true);
      root.traverse((o) => { if (!o.isBone) return; bones++; const e = o.matrixWorld.elements; if (e.some((v) => !Number.isFinite(v)) || Math.abs(o.matrixWorld.determinant()) < 1e-9) bad++; });
      return { bones, bad };
    });
    assert(rec, 'animation playing', anims.some((a) => a), 'an animation name', anims.join(' → ') || 'none');
    assert(rec, `${A.label}: the expected animation plays`, anims.some((a) => A.expect.test(a || '')), String(A.expect), anims.join(' → '));
    assert(rec, 'bone transforms finite and not collapsed', tf.bones > 0 && tf.bad === 0, 'all finite', tf.bones ? `${tf.bad} bad of ${tf.bones}` : tf.note);
    if (A.ball) assert(rec, 'the ball is released (leaves the hand)', ball.includes('fly'), 'state fly', ball.join(' → '));
    // the contact sheet: the strip in order, for a person to judge
    const sheet = `visual/${A.id}.html`;
    fs.writeFileSync(path.join(dir, 'evidence', sheet), `<!doctype html><meta charset="utf-8"><title>${A.label}</title><style>body{font:14px system-ui;margin:12px;background:#111;color:#ddd}img{width:24%;margin:2px}</style><h3>${A.label} — every 220 ms (close-up around Twinsen; the last one is the full frame)</h3><p>animations: ${anims.join(' → ')}</p>${shots.map((f) => `<img src="${f}">`).join('')}`);
    rec.evidence.push(`evidence/${sheet}`);
    rec.needsVisualJudgment = `Look at evidence/${sheet}: pose, timing, clipping, likeness. The tool does not judge these.`;
  },
}));
