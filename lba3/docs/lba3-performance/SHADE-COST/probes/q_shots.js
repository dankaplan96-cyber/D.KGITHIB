(async () => {
  // SHADE-COST: the frozen views (views.js) as half-size images, to check what each one shows
  const G = game, RR = G.renderer, r = RR.renderer, gl = r.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, imgs = {};
  for (const [name, set, tick] of SC_VIEWS(G)) {
    await SC_SET(G, set, tick); RR.render();
    const px = new Uint8Array(W * H * 4); r.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const cx = c2.getContext('2d'), im = cx.createImageData(W, H);
    for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    for (let k = 3; k < im.data.length; k += 4) im.data[k] = 255;
    cx.putImageData(im, 0, 0);
    const cv = document.createElement('canvas'); cv.width = W / 2; cv.height = H / 2; cv.getContext('2d').drawImage(c2, 0, 0, W / 2, H / 2);
    imgs[name] = cv.toDataURL('image/png');
  }
  return { text: 'shots', __images: imgs };
})()
