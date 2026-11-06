export default async ({ ev, shot, log }) => {
  log(await ev(() => P.settle()));
  log(await ev(() => ({ st: P.state(), room: game.room?.id, cam: game.camera.position.toArray().map(v=>+v.toFixed(2)), npcs: game.npcs.filter(n=>n.present).map(n=>n.def.id), hud: [...document.querySelectorAll('body > div')].filter(e=>!e.classList.contains('hidden')).map(e=>e.id) })));
  await shot('probe-house-start');
};
