// #67 (SMALLFIX-27-11): every line a talk says, the dialogue box's AND a minor resident's overhead remark (P116,
// walkers.js Remarks). Remarks.talk swaps game.say for a recorder while it runs the talk, so a wrapper on game.say never
// hears a line that went over a head: suites that counted game.say alone undercounted (island-doors' keepers, fixed in
// df4f94e4). hearer(() => page) (a getter: the suites relaunch their page) gives:
//   install()  hooks game.say and game.remarks.show (once per page load: call it after every open() and menu())
//   said()     the lines heard since the last call, flat (strings, as the suites' own said() returned them), with
//              .by: [{ id (the speaker's def.id when known), name (the say key), lines, via: 'box' | 'remark' }]
//   report()   logs HEARD: each speaker heard over the run, its lines in the box and over its head
// Page side only reads; nothing in the game changes.
export function hearer(getPage) {
  const tally = {};
  const pg = () => (typeof getPage === "function" ? getPage() : getPage);
  const install = () => pg().evaluate(() => {
    const G = window.game; if (!G || G.__heard) return !!G;
    G.__heard = true; window._heard = [];
    const sv = G.say;
    G.say = function (n, lines, done, sp, ...a) {
      const who = sp?.def?.id ?? G.npcs?.find((q) => q.def?.name === n)?.def?.id ?? (typeof n === 'string' && n.startsWith('n_') ? n.slice(2) : null);
      window._heard.push({ id: who, name: n, lines: [].concat(lines).map(String), via: 'box' });
      return sv.call(this, n, lines, done, sp, ...a);
    };
    const R = G.remarks;
    if (R) { const sh = R.show; R.show = function (n, rec) { window._heard.push({ id: n?.def?.id ?? null, name: rec?.[0], lines: [].concat(rec?.[1] ?? []).map(String), via: 'remark' }); return sh.call(this, n, rec); }; }
    return true;
  });
  const said = async () => {
    await install();
    const by = await pg().evaluate(() => (window._heard || []).splice(0));
    for (const e of by) { const k = e.id || e.name || '?'; const t = (tally[k] ||= { box: 0, remark: 0 }); t[e.via] += e.lines.length; }
    const out = by.flatMap((e) => e.lines); out.by = by; return out;
  };
  // one line for the log: every speaker heard in the run, its lines by way (box / over the head)
  const report = () => console.log('HEARD ' + (Object.entries(tally).map(([k, t]) => `${k} ${t.box}${t.remark ? ' +' + t.remark + ' overhead' : ''}`).join(', ') || 'nothing'));
  return { install, said, report };
}
// the lines a person said in a said() result (box or remark)
export const linesOf = (heard, id) => (heard.by || []).filter((e) => e.id === id).flatMap((e) => e.lines);
