// page-side: what of the HUD's prompt and weapon pill a player sees, read after every running CSS transition has
// finished (under load the compositor runs far behind the stepped game). shown = the element's state when its fades
// end: computed opacity > 0.05, in the viewport, HUD not hidden.
export const VIS = `(() => { const out = {}; const hud = document.querySelector('#hud');
  for (const id of ['prompt', 'weapon']) { const e = document.querySelector('#' + id), s = getComputedStyle(e), r = e.getBoundingClientRect();
    const shown = !hud.classList.contains('hidden') && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 0;
    out[id] = shown ? (e.textContent.trim() || '(empty)') + ' op' + (+s.opacity).toFixed(2) + ' @' + [r.x, r.y, r.width, r.height].map(Math.round).join(',') : ''; }
  const d = document.querySelector('#dialog'); if (!d.classList.contains('hidden')) { const r = d.getBoundingClientRect(), n = d.querySelector('.next').getBoundingClientRect(); out.dialog = [r.x, r.y, r.width, r.height].map(Math.round).join(','); out.next = [n.x, n.y, n.width, n.height].map(Math.round).join(','); }
  // the logical state too (what the page will show once its fades end): the prompt's / pill's .show, the HUD's .busy
  out.cls = 'prompt' + (document.querySelector('#prompt').classList.contains('show') ? '.show' : '') + ' weapon' + (document.querySelector('#weapon').classList.contains('show') ? '.show' : '') + (hud.classList.contains('busy') ? ' hud.busy' : '');
  out.state = game.state; return out; })()`;
// wait until no CSS transition is running (≤ 6 s)
export const settleCss = (page) => page.waitForFunction(() => !document.getAnimations().some((a) => a.constructor.name === 'CSSTransition' && a.playState === 'running'), null, { timeout: 6000, polling: 100 }).catch(() => {});
