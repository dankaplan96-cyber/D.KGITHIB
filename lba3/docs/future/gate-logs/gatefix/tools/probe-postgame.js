(() => { const G = game; const r0 = { chapter: G.flags.chapterKey, room: G.room?.id ?? 'citadel', state: G.state, obj: document.querySelector('#pause-objective')?.textContent || '' };
  const out = P.exitTo(G.room?.exits?.[0]?.to); const r1 = { exit: out.r, room: G.room?.id ?? 'citadel', state: G.state };
  return { r0, r1 }; })()
