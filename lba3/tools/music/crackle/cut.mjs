// Cut a matched A/B pair for listening: the source (decoded file, scaled to the game's music-bus level) and the game's
// music-bus capture of the same passage, sample-aligned (positions from nulltest.mjs).
//   node cut.mjs <out.wav> <in.wav> <startFrame in that file> <seconds> [gain] [loopStart,loopEnd samples]
import fs from 'node:fs';
const [out, inp, start, secs, gain, loop] = process.argv.slice(2);
const b = fs.readFileSync(inp), sr = b.readUInt32LE(24);
const pcm = new Int16Array(b.buffer, b.byteOffset + 44, (b.length - 44) / 2);
const n = Math.round(+secs * sr), g = +(gain || 1), s0 = +start;
const [LS, LE] = (loop || '0,0').split(',').map(Number);
const o = new Int16Array(n * 2);
for (let i = 0; i < n; i++) {
  let j = s0 + i; if (LE && j >= LE) j -= LE - LS;
  for (let c = 0; c < 2; c++) o[2 * i + c] = Math.max(-32768, Math.min(32767, Math.round(pcm[2 * j + c] * g)));
}
// 5 ms fades at both ends so the cut itself does not click
const F = Math.round(0.005 * sr); for (let i = 0; i < F; i++) for (let c = 0; c < 2; c++) { o[2 * i + c] = Math.round(o[2 * i + c] * i / F); o[2 * (n - 1 - i) + c] = Math.round(o[2 * (n - 1 - i) + c] * i / F); }
const data = Buffer.from(o.buffer), h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
fs.writeFileSync(out, Buffer.concat([h, data]));
console.log(out, n, 'frames');
