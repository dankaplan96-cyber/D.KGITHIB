// AUTO-FIT: when the chosen graphics preset cannot hold about 50 fps where he plays, one quiet suggestion to lower it.
// The player's choice is never changed here (the automatic resolution adapts within its own bounds, as before).
//
// It watches displayed frames in play only (no menus, scene changes, cinematics, benchmark, tests, hidden window),
// after SETTLE seconds of uninterrupted play; then over WINDOW-second windows: a window is slow when its frame rate is
// under 5/6 of the frame budget's (50 fps for 60, 25 for a 30 fps limit) while the automatic resolution is already at
// its lowest (or off). Two slow windows in a row: the suggestion (the next preset down; on Low with Resolution: Full,
// Resolution: Auto), once per preset, remembered in the settings (fitTold).
//   game.fit.frame(real)   every displayed frame (real: seconds since the last one)
//   game.fit.state()       for tests and the benchmark: { settle, windows, slow, last, told }
import { t } from '../game/i18n.js';
export const SETTLE = 15, WINDOW = 10;
const NEXT = { high: 'medium', medium: 'low' };

export class FitWatch {
  constructor(game) { this.g = game; this.settle = 0; this.t = 0; this.n = 0; this.slow = 0; this.windows = 0; this.last = null; }
  reset() { this.settle = 0; this.t = 0; this.n = 0; this.slow = 0; }
  frame(real) {
    const G = this.g, R = G.renderer;
    if (G.state !== 'play' || G.trans || G.benching || G.testFreeze || G.cutscene || G.preparing || G.background || (typeof document !== 'undefined' && document.hidden)) { this.reset(); return; }
    if (!(real > 0) || real > 0.5) return;   // (a stall: not counted either way)
    if ((this.settle += real) < SETTLE) return;
    this.t += real; this.n++;
    if (this.t < WINDOW) return;
    const fps = this.n / this.t, budget = R.budgetMs || 1000 / 60, want = (1000 / budget) * (5 / 6);
    const floor = !R.autoRes || R.dyn <= R.minDyn() + 0.01;
    this.t = 0; this.n = 0; this.windows++;
    this.last = { fps: +fps.toFixed(1), want: +want.toFixed(1), floor, quality: G.settings.quality };
    if (fps >= want || !floor) { this.slow = 0; return; }
    if (++this.slow < 2) return;
    this.slow = 0;
    this.suggest();
  }
  suggest() {
    const G = this.g, s = G.settings, told = (s.fitTold ||= {});
    const q = s.quality, next = NEXT[q];
    if (told[q]) return false;
    let key = null, vars = null;
    if (next) { key = 'fit_lower'; vars = { q: t('q_' + next) }; }
    else if (s.res === 'full') key = 'fit_res';
    if (!key) return false;
    told[q] = true;
    G.hud?.toast(key, vars, 7000);
    G.saveSettings?.();
    return true;
  }
  state() { return { settle: +this.settle.toFixed(1), windows: this.windows, slow: this.slow, last: this.last, told: { ...(this.g.settings.fitTold || {}) } }; }
}
