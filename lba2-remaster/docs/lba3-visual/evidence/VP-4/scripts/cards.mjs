// VP-4: every chapter start that shows a title card. Chapter 2 through the prologue's own ending (endPrologue, in the
// well); the others ISO: the previous chapter set by flags, then the chapters' own call
// (startTransition(() => story.nextChapter())). Game time is stepped 0.1 s per 0.1 s of real time so the card's CSS
// fade runs roughly as in play (shots wait for the CSS fades to finish: VP-5/scripts/run.mjs). Per 0.1 s: card shown/opacity, dialogue box, speech bubble, state. Shots: the card at 1.5 s
// and the first frame with a dialogue line once the screen has cleared (no black fade over it). Overlap = frames with
// the line or its bubble while the card shows (or is still fading out) and the screen is not black.
export default async ({ page, ev, shot, log, W }) => {
  const T = process.env.TAG || 'x';
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
  await ev(() => P.settle());
  const keys = await ev(() => game.story.chapters.map((c) => c.key));
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i];
    if (ONLY && !ONLY.includes(key)) continue;
    const start = await ev(([i]) => {
      const G = game; P.settle();
      document.querySelector('#chapter').classList.remove('show');
      const prev = G.story.chapters[i - 1];
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      Object.assign(G.flags, { intro: true, prologueDone: true, chapter: i - 1, chapterKey: prev.key });
      G.hero.hasBall = true; G.hero.swapBody?.('twinsen');
      G.story.refreshCast();
      if (i === 1) { G.enterRoom('well', null, true); G.step(0.2); P.settle(); G.flags.inWell = true; prev.endPrologue(); return 'endPrologue'; }
      G.startTransition(() => G.story.nextChapter());
      return 'startTransition(nextChapter)';
    }, [i]);
    const rows = []; let shotLine = false, lineAt = null, cardOn = null, cardOff = null, overlap = 0;
    for (let k = 0; k < 70; k++) {
      const r = await ev(() => {
        game.step(0.1);
        const c = document.querySelector('#chapter'), d = document.querySelector('#dialog');
        return { t: 0, card: c.classList.contains('show'), op: +(+getComputedStyle(c).opacity).toFixed(2), dlg: !d.classList.contains('hidden'), bub: game.bubble.visible, st: game.state, fade: +(+(document.querySelector('#fade').style.opacity || 0)).toFixed(2), txt: d.classList.contains('hidden') ? '' : d.querySelector('.text').textContent.slice(0, 40), title: c.textContent };
      });
      await page.waitForTimeout(100);
      r.t = +((k + 1) * 0.1).toFixed(1); rows.push(r);
      if (r.card && cardOn == null) cardOn = r.t;
      if (!r.card && cardOn != null && cardOff == null) cardOff = r.t;
      // over the card: shown, or less than its 0.9 s CSS fade-out since it was hidden (game time; the compositor's
      // own opacity lags far behind under load)
      if ((r.dlg || r.bub) && r.fade < 0.5 && (r.card || (cardOff != null && r.t - cardOff < 0.9))) overlap++;
      if (k === 14) await shot(`card-${key}-1.5s-${W}-${T}`);
      if (r.dlg && lineAt == null) lineAt = r.t;
      if (r.dlg && r.fade < 0.05 && !shotLine) { shotLine = true; await shot(`card-${key}-first-line-${W}-${T}`); }
      if (shotLine && (cardOff != null || cardOn == null) && k >= 15) break;
    }
    log(key, start, JSON.stringify({ title: rows.find((r) => r.card)?.title, cardOn, cardOff, lineAt, framesWithLineOrBubbleOverCard: overlap }));
    log('  ' + rows.map((r) => `${r.t}:${r.card ? 'C' : '-'}${r.dlg ? 'D' : ''}${r.bub ? 'B' : ''}${r.fade > 0.05 ? 'f' + r.fade : ''}/${r.st}`).join(' '));
    await ev(() => P.settle());
  }
};
