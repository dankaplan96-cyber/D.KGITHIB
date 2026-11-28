// Pixel difference of two look2.mjs dumps: pixels that differ at all, by more than 8 and 16 levels (max over R, G, B),
// the largest difference, and the mean over the frame. Optional DIFFPNG=file: a grey map of the differences ×4.
//   node diff.mjs a.raw b.raw
import fs from 'node:fs';
const rd = (f) => { const b = fs.readFileSync(f); const [W, H] = new Int32Array(b.buffer.slice(b.byteOffset, b.byteOffset + 8)); return { W, H, p: b.subarray(8) }; };
const A = rd(process.argv[2]), B = rd(process.argv[3]);
if (A.W !== B.W || A.H !== B.H) { console.log('size differs'); process.exit(1); }
let n = 0, o8 = 0, o16 = 0, max = 0, sum = 0;
const N = A.W * A.H;
for (let i = 0; i < N * 4; i += 4) {
  const m = Math.max(Math.abs(A.p[i] - B.p[i]), Math.abs(A.p[i + 1] - B.p[i + 1]), Math.abs(A.p[i + 2] - B.p[i + 2]));
  if (m) n++; if (m > 8) o8++; if (m > 16) o16++; if (m > max) max = m; sum += m;
}
if (process.env.DIFFPNG) {
  // (a grey PNG of the differences ×4, flipped to screen orientation: GL's rows run bottom-up)
  const zlib = await import('node:zlib');
  const W = A.W, H = A.H, raw = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W + 1)] = 0; for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; const m = Math.max(Math.abs(A.p[i] - B.p[i]), Math.abs(A.p[i + 1] - B.p[i + 1]), Math.abs(A.p[i + 2] - B.p[i + 2])); raw[y * (W + 1) + 1 + x] = Math.min(255, m * 4); } }
  const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(process.env.DIFFPNG, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
console.log(`DIFF ${process.argv[2].split('/').pop()} vs ${process.argv[3].split('/').pop()}: ${n} of ${N} pixels differ (${(100 * n / N).toFixed(2)} %), >8 levels ${o8} (${(100 * o8 / N).toFixed(2)} %), >16 levels ${o16} (${(100 * o16 / N).toFixed(2)} %), max ${max}, mean ${(sum / N).toFixed(3)} levels`);
