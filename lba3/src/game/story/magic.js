// MAGIC-LEVELS: how Twinsen's magic grows (docs/lba3-production/MAGIC_LEVELS.md).
//
// As in LBA2, the story raises the level at a few moments and nothing sells it. In LBA2 the only writer of the level
// is a scene script's SET_MAGIC_LEVEL (GERELIFE.CPP), at the end of a quest that hands over a named thing (the
// tunic, the diploma, Sendell's Ball, the Dark Monk's key), and it fills the magic to the new maximum.
// Here level 1 comes with the ball from the cupboard (chapter 1; the hero starts at 1) and stays through
// chapters 1–3. The later steps are below. Each one is given once (its flag ml_<level>), never lowers the level,
// and fills the magic. A save or a chapter begun past a step (a save from before this, a chapter started from a
// test) gets the levels it has earned when it loads or begins (catchUp): a level is never missable.
// A save that bought levels at the old stall keeps them (never lower what the player has); its later moments then
// fill the magic and say so, without a level toast.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/magic.js';

export const MAGIC_MAX = 4;
// level, the chapter its moment is in, and the story flag that says the moment has happened
export const MAGIC_STEPS = [
  { level: 2, chapter: 'dig', moment: (f) => !!f.c4_seals3 },          // the Temple of Bù's three warm discs
  { level: 3, chapter: 'observatory', moment: (f) => !!f.c7_sendell }, // Sendell's light at the observatory
  { level: 4, chapter: 'network', moment: (f) => !!f.c10_done },       // the five stations' code
];
const COLOR = { 2: '#7dff6a', 3: '#ff5a48', 4: '#ffa53a' };
const flag = (n) => 'ml_' + n;

export class MagicLevels extends ChapterBase {
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  // the level the story has given by the chapter in progress (1 before any step)
  due(f = this.f) {
    const at = this.story.indexOf(f);
    let lv = 1;
    for (const s of MAGIC_STEPS) {
      const i = this.idx(s.chapter);
      if (f[flag(s.level)] || (i >= 0 && i < at) || (i === at && s.moment(f))) lv = Math.max(lv, s.level);
    }
    return lv;
  }
  has(level) { return !!this.f[flag(level)]; }
  // the ball's line in the inventory: where its colour came from (a level bought before this: no story to tell)
  ballNote() {
    const lv = Math.max(1, Math.min(MAGIC_MAX, this.game.hero.magicLevel | 0));
    return t(lv === 1 || this.has(lv) ? 'ml_itd_' + lv : 'ml_itd_more');
  }

  // A step's moment. `lines` are said once the level has risen (the bar already shows it), `same` instead when he
  // already had that level (a save that bought it); then the toast, a save and `done`. A second call only runs done.
  grant(level, { lines = null, same = null, done = null } = {}) {
    const g = this.game, f = this.f, h = g.hero;
    if (f[flag(level)]) { done?.(); return false; }
    f[flag(level)] = true;
    const rise = h.magicLevel < level;
    if (rise) h.magicLevel = Math.min(MAGIC_MAX, level);
    h.mp = h.mpMax;
    g.hud.stats?.(h);
    g.audio.play('shard'); g.audio.play('heal');
    g.particles?.burst(h.pos.x, h.pos.y + 1.1, h.pos.z, COLOR[level] || '#ffffff', 36, 3.2);
    const end = () => {
      g.hud.toast(rise ? 'ml_toast_up' : 'ml_toast_full', { n: h.magicLevel, ball: t('ml_ball_' + h.magicLevel) });
      g.save(false);
      done?.();
    };
    const say = rise ? lines : same;
    if (say?.length) this.chain(say, end); else end();
    return true;
  }

  // after a load, and as a chapter begins: the levels of the steps behind him (never lowered; a broken value is put right)
  catchUp(tell = true) {
    const g = this.game, f = this.f, h = g.hero;
    if (!Number.isFinite(h.magicLevel)) h.magicLevel = 1;
    h.magicLevel = Math.max(1, Math.min(MAGIC_MAX, Math.round(h.magicLevel)));
    const lv = this.due();
    for (const s of MAGIC_STEPS) if (s.level <= lv) f[flag(s.level)] = true;
    if (h.magicLevel >= lv) return false;
    h.magicLevel = lv; h.mp = h.mpMax;
    g.hud.stats?.(h);
    if (tell) g.hud.toast('ml_toast_up', { n: lv, ball: t('ml_ball_' + lv) });
    return true;
  }

  // Rector Hougo sees the new colour (the School of Magic, Desert Island), once
  talkFirst(npc) {
    const g = this.game, f = this.f, h = g.hero;
    if (npc.def.id !== 'magus' || h.body === 'zoe' || h.body === 'worker' || f.ml_hougo || !f.ml_2 || !h.hasBall) return false;
    f.ml_hougo = true;
    this.chain([['magus', 'ml_hougo_1'], ['hero', 'ml_tw_hougo'], ['magus', 'ml_hougo_2']], () => g.save(false));
    return true;
  }
}
