// AudioWorklet tap: passes its input through unchanged, records it (16-bit, optional) and flags discontinuities:
// a sample whose second difference is far above the signal's own recent second-difference level (a click/step).
class Tap extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const p = o.processorOptions || {};
    this.rec = !!p.rec; this.id = p.id || 'tap';
    this.K = p.K || 12; this.floor = p.floor || 0.004; this.a = 1 / 256;
    this.st = [0, 1].map(() => ({ p1: 0, p2: 0, e: 1e-8, last: -1e9 }));
    this.ev = []; this.peak = 0; this.over = 0;
    this.CH = 4096; this.buf = this.rec ? new Int16Array(this.CH * 2) : null; this.bi = 0; this.start = -1;
    this.sent = 0;
  }
  process(inputs, outputs) {
    const inp = inputs[0], out = outputs[0];
    const n = out[0].length;
    const f0 = currentFrame;
    if (this.start < 0) this.start = f0;
    for (let c = 0; c < 2; c++) {
      const x = inp[c] || inp[0];
      const o = out[c];
      const S = this.st[c];
      if (!x) { o.fill(0); continue; }
      o.set(x);
      let { p1, p2, e, last } = S;
      for (let i = 0; i < n; i++) {
        const v = x[i];
        const r = v - 2 * p1 + p2;
        const ar = r < 0 ? -r : r;
        const s = Math.sqrt(e);
        if (ar > this.K * s && ar > this.floor && f0 + i - last > 64) {
          last = f0 + i;
          if (this.ev.length < 4000) this.ev.push([f0 + i, c, +r.toFixed(5), +s.toFixed(6), +v.toFixed(5)]);
        }
        e += this.a * (r * r - e);
        const av = v < 0 ? -v : v;
        if (av > this.peak) this.peak = av;
        if (av >= 0.999) this.over++;
        p2 = p1; p1 = v;
      }
      S.p1 = p1; S.p2 = p2; S.e = e; S.last = last;
    }
    if (this.rec) {
      const L = inp[0], R = inp[1] || inp[0];
      for (let i = 0; i < n; i++) {
        const l = L ? L[i] : 0, r = R ? R[i] : 0;
        this.buf[this.bi++] = Math.max(-32768, Math.min(32767, Math.round(l * 32767)));
        this.buf[this.bi++] = Math.max(-32768, Math.min(32767, Math.round(r * 32767)));
      }
      if (this.bi >= this.buf.length) {
        this.port.postMessage({ pcm: this.buf, at: f0 + n - this.CH }, [this.buf.buffer]);
        this.buf = new Int16Array(this.CH * 2); this.bi = 0;
      }
    }
    if ((f0 / n) % 375 === 0 || this.ev.length >= 200) { // ~1 s
      this.port.postMessage({ ev: this.ev, peak: this.peak, over: this.over, frame: f0, start: this.start });
      this.ev = [];
    }
    return true;
  }
}
registerProcessor('tap', Tap);
