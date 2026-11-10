// RELEASE-AUDIT v75, the user's P7 ("in Zoé's part you can switch to running now"): from the chain's save at the start
// of segment 05 (chapter 2, before Vesk's tour), by input to Zoé in the project office, then every way a player picks a
// behaviour: F1-F4 and 1-4, the Ctrl menu (held, arrows, released) and a click on the HUD's behaviour icons. She must
// stay Discreet. Run with: LOAD=<save-04.json> node tests/lib/seg.mjs tests/audit/p7-zoe-behaviour.mjs

export const steps = [
  ['continue', () => P.settle()],
  ['Vesk: the tour', () => ({ ...P.talk('vesk', { run: true }), fail: game.flags.c1_tour ? null : 'tour' })],
  ['Zoé at the gate', () => { const r = P.talk('zoe', { run: true }); P.wait(1); P.settle(); return { ...r, room: game.room?.id, body: game.hero.body, beh: game.hero.behaviour, fail: game.room?.id === 'projoffice' ? null : 'not in the office' }; }],
  ['F1-F4 and 1-4 pressed', () => {
    const h = game.hero, seen = [];
    for (const k of ['F1', 'F2', 'F3', 'F4', 'Digit1', 'Digit2', 'Digit3', 'Digit4']) { P.tap(k, 0.3); seen.push(k + ':' + h.behaviour); }
    return { seen, fail: seen.every((s) => s.endsWith(':discreet')) ? null : 'behaviour changed' };
  }],
  ['the Ctrl menu', () => {
    const h = game.hero, I = game.input, seen = [];
    for (const arrow of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) {
      I.keys.add('ControlLeft'); I.taps.add('ControlLeft'); game.step(0.3);
      I.keys.add(arrow); I.taps.add(arrow); game.step(0.1); I.keys.delete(arrow); game.step(0.1);
      I.keys.delete('ControlLeft'); game.step(0.3); seen.push(arrow + ':' + h.behaviour + ':' + game.state);
    }
    return { seen, fail: seen.every((s) => s.includes(':discreet:')) ? null : 'behaviour changed' };
  }],
  ['the HUD icons clicked', () => {
    const h = game.hero, els = [...document.querySelectorAll('#behaviour .beh')], seen = [];
    for (const el of els) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); game.step(0.2); seen.push(el.dataset.b + ':' + h.behaviour); }
    return { icons: els.length, seen, fail: seen.every((s) => s.endsWith(':discreet')) ? null : 'behaviour changed' };
  }],
];
