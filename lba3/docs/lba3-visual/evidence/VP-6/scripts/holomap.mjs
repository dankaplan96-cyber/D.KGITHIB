// VP-6: the holomap (M, a real key press) in every story state that labels it (ISO: the chapter's flags set on a
// new game, the cast placed by the story's own refreshCast), plus a later Citadel chapter and the Zeelich region.
// Per state: a clip of the holomap and the label boxes as drawn (overlaps counted; boxes outside the map counted).
export default async ({ page, ev, shot, log, W }) => {
  const T = process.env.TAG || 'x';
  await ev(() => P.settle());
  const STATES = [
    ['prologue-well', 'well', {}],
    ['prologue-rope', 'well', { intro: true, wellSeen: true, metXil: true }],
    ['ch2-home', 'project', { prologueDone: true, intro: true, c1_started: true }],
    ['ch2-vesk', 'project', { prologueDone: true, intro: true, c1_started: true, c1_home: true, c1_arrived: true }],
    ['ch2-valves', 'project', { prologueDone: true, intro: true, c1_started: true, c1_home: true, c1_arrived: true, c1_task: true, c1_map: true }],
    ['ch2-zoe', 'project', { prologueDone: true, intro: true, c1_started: true, c1_home: true, c1_arrived: true, c1_task: true, c1_water: true, c1_tour: true, c1_needZoe: true }],
    ['ch2-radio', 'project', { prologueDone: true, intro: true, c1_started: true, c1_home: true, c1_arrived: true, c1_task: true, c1_water: true, c1_tour: true, c1_veskGone: true, c1_radio: true }],
    ['ch8-citadel', 'evacuation', { prologueDone: true, intro: true, c1_done: true, c8_started: true }],
  ];
  // the label boxes the holomap draws: the build's own record when it keeps one (hud.holoLabels), else the
  // 0.26.0 rule (centred 14 px above the marker, 600 15px Rubik) measured here
  const boxes = () => ev(() => {
    const hud = game.hud, c = hud.holo, ctx = hud.holoCtx, Wc = c.width, s = hud.mapSize;
    let list = hud.holoLabels;
    if (!list) {
      ctx.font = '600 15px Rubik, system-ui, sans-serif';
      list = hud._markers().filter((m) => !m.minimapOnly && m.label).map((m) => { const x = ((m.x - hud.mapX0) / s) * Wc, y = ((m.z - hud.mapZ0) / s) * Wc, w = ctx.measureText(m.label).width; return { text: m.label, x: x - w / 2, y: y - 14 - 12, w, h: 15 }; });
    }
    let overlaps = 0, outside = 0;
    for (let i = 0; i < list.length; i++) { const a = list[i]; if (a.x < 0 || a.y < 0 || a.x + a.w > Wc || a.y + a.h > Wc) outside++; for (let j = i + 1; j < list.length; j++) { const b = list[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++; } }
    const r = c.getBoundingClientRect();
    return { labels: list.map((b) => b.text + ' @' + [b.x, b.y, b.w].map(Math.round).join(',')), overlaps, outside, onScreenPx: +(15 * r.width / Wc).toFixed(1), fontPx: list[0]?.font ?? 15, clip: { x: r.x, y: r.y, width: r.width, height: r.height } };
  });
  for (const [name, key, flags] of STATES) {
    const st = await ev(([key, flags]) => {
      const G = game; P.settle();
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      const i = G.story.chapters.findIndex((c) => c.key === key);
      Object.assign(G.flags, flags, { chapter: i, chapterKey: key });
      G.hero.hasBall = true;
      G.story.refreshCast(); G.updateObjective();
      if (G.room) G.exitRoom({ x: G.world.well.x + 2, z: G.world.well.z - 2, a: 0 }, true);
      G.step(0.3);
      P.tap('KeyM', 0.3);
      return { state: G.state, room: G.room?.id ?? 'citadel', markers: G.mapMarkers().filter((m) => m.label).map((m) => m.label) };
    }, [key, flags]);
    const b = await boxes();
    log(name, JSON.stringify(st), JSON.stringify(b));
    await shot(`holomap-${name}-${W}-${T}`, { clip: b.clip });
    await ev(() => { P.tap('KeyM', 0.3); P.settle(); });
  }
  // a region: Zeelich (chapter 3's dock) — the holomap there
  const z = await ev(() => { const G = game; Object.assign(G.flags, { chapter: 2, chapterKey: 'zeelich', c2_started: true }); G.story.refreshCast(); G.enterRoom('zeelich', G.story.cur.Z.dock, true); G.step(0.3); P.tap('KeyM', 0.3); return { state: G.state, room: G.room?.id, hero: [G.hero.pos.x, G.hero.pos.z].map(Math.round), map: [G.hud.mapX0, G.hud.mapZ0, G.hud.mapSize] }; });
  const zb = await boxes();
  log('zeelich', JSON.stringify(z), JSON.stringify(zb));
  await shot(`holomap-zeelich-${W}-${T}`, { clip: zb.clip });
};
