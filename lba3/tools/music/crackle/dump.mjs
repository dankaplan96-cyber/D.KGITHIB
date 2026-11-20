// The source files decoded as the game decodes them (decodeAudioData, Electron's Chromium, at the device rate), saved as
// 16-bit stereo WAVs for the null test (nulltest.mjs) and for listening (the A/B's "source" side).
//   node dump.mjs village_b home combat village
import { electron, HERE, RUNS, ELECTRON, GAME } from './env.mjs';
import fs from 'node:fs';
const H = HERE;
const OUT = `${RUNS}/src`; fs.mkdirSync(OUT, { recursive: true });
const prof = `${RUNS}/profile-dump-${Date.now()}`;
const app = await electron.launch({ executablePath: ELECTRON,
  args: [H + '/main.cjs', '--user-data-dir=' + prof], env: { ...process.env, LBA_URL: GAME + 'assets/music/manifest.json' }, timeout: 180000 });
const page = await app.firstWindow();
await page.waitForLoadState('load');
for (const name of process.argv.slice(2)) {
  const n = await page.evaluate(async (name) => {
    const man = await (await fetch('/assets/music/manifest.json')).json();
    window.__ctx = window.__ctx || new AudioContext({ latencyHint: 0.08 });
    const buf = await window.__ctx.decodeAudioData(await (await fetch('/assets/music/' + man.tracks[name].file)).arrayBuffer());
    const L = buf.getChannelData(0), R = buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0);
    const a = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) { a[2 * i] = Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))); a[2 * i + 1] = Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))); }
    window.__a = a; return { len: a.length, sr: buf.sampleRate };
  }, name);
  const parts = [];
  for (let i = 0; i < n.len; i += 1 << 21) {
    parts.push(Buffer.from(await page.evaluate(([i, k]) => { const a = window.__a.subarray(i, i + k); let s = ''; const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let j = 0; j < u.length; j += 0x8000) s += String.fromCharCode.apply(null, u.subarray(j, j + 0x8000)); return btoa(s); }, [i, 1 << 21]), 'base64'));
  }
  const pcm = Buffer.concat(parts), sr = n.sr, hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(sr, 24); hdr.writeUInt32LE(sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(`${OUT}/${name}.wav`, Buffer.concat([hdr, pcm]));
  console.log(name, n.len / 2, 'frames');
}
await app.close();
fs.rmSync(prof, { recursive: true, force: true });
