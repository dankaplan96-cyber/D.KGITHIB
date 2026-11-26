# fragmented MP4 from Chrome's MediaRecorder: the moov's durations hold only the first fragment's. Set mvhd, tkhd, mdhd
# and mehd to the whole length (from the last fragment of each track: tfdt + its samples' durations).
import struct, sys
src, dst = sys.argv[1], sys.argv[2]
d = bytearray(open(src, 'rb').read())
def boxes(off, end):
    while off < end:
        sz, t = struct.unpack('>I4s', d[off:off+8]); h = 8
        if sz == 1: sz = struct.unpack('>Q', d[off+8:off+16])[0]; h = 16
        yield off, sz, t.decode('latin1'), h
        off += sz
top = list(boxes(0, len(d)))
moov = next(b for b in top if b[2] == 'moov')
# track info: id → timescale, default sample duration (trex)
tracks = {}; mvhd_ts = None; trex = {}
def walk(off, sz, h, path):
    global mvhd_ts
    for o, s, t, hh in boxes(off + h, off + sz):
        if t in ('trak', 'mdia', 'mvex', 'minf', 'stbl', 'edts'): walk(o, s, hh, path + [t])
        if t == 'mvhd':
            v = d[o+8]; mvhd_ts = struct.unpack('>I', d[o+20:o+24] if v == 0 else d[o+28:o+32])[0]
        if t == 'trex': tid, _, dur = struct.unpack('>III', d[o+12:o+24]); trex[tid] = dur
walk(*moov[:2], moov[3], [])
# last fragment end per track
end = {}
for off, sz, t, h in top:
    if t != 'moof': continue
    for o2, s2, t2, h2 in boxes(off + h, off + sz):
        if t2 != 'traf': continue
        tid = base = None; total = 0; defdur = None
        for o3, s3, t3, h3 in boxes(o2 + h2, o2 + s2):
            if t3 == 'tfhd':
                fl = struct.unpack('>I', d[o3+8:o3+12])[0] & 0xffffff; tid = struct.unpack('>I', d[o3+12:o3+16])[0]; p = o3 + 16
                if fl & 1: p += 8
                if fl & 2: p += 4
                if fl & 8: defdur = struct.unpack('>I', d[p:p+4])[0]
            if t3 == 'tfdt':
                v = d[o3+8]; base = struct.unpack('>Q', d[o3+12:o3+20])[0] if v == 1 else struct.unpack('>I', d[o3+12:o3+16])[0]
            if t3 == 'trun':
                fl = struct.unpack('>I', d[o3+8:o3+12])[0] & 0xffffff; n = struct.unpack('>I', d[o3+12:o3+16])[0]; p = o3 + 16
                if fl & 1: p += 4
                if fl & 4: p += 4
                per = sum(bool(fl & b) for b in (0x100, 0x200, 0x400, 0x800)) * 4
                dd = defdur or trex.get(tid, 0)
                for i in range(n):
                    total += struct.unpack('>I', d[p:p+4])[0] if fl & 0x100 else dd; p += per
        end[tid] = (base or 0) + total
# timescales per track (mdhd) in trak order with their tkhd ids
def setdur(o, v, at0, at1, val):
    if v == 1: d[o+at1:o+at1+8] = struct.pack('>Q', val)
    else: d[o+at0:o+at0+4] = struct.pack('>I', min(val, 0xffffffff))
longest = 0
for o, s, t, h in boxes(moov[0] + moov[3], moov[0] + moov[1]):
    if t != 'trak': continue
    tid = ts = None; tk = md = None
    def find(off, sz, hh):
        global tk_, md_
        for o2, s2, t2, h2 in boxes(off + hh, off + sz):
            yield o2, s2, t2, h2
            if t2 in ('mdia',): yield from find(o2, s2, h2)
    items = list(find(o, s, h))
    for o2, s2, t2, h2 in items:
        if t2 == 'tkhd': tk = o2; v = d[o2+8]; tid = struct.unpack('>I', d[o2+20:o2+24] if v == 0 else d[o2+28:o2+32])[0]
        if t2 == 'mdhd': md = o2; v = d[o2+8]; ts = struct.unpack('>I', d[o2+20:o2+24] if v == 0 else d[o2+28:o2+32])[0]
    secs = end.get(tid, 0) / ts; longest = max(longest, secs)
    setdur(md, d[md+8], 24, 32, end.get(tid, 0))
    setdur(tk, d[tk+8], 28, 36, round(secs * mvhd_ts))
    print('track', tid, 'timescale', ts, 'seconds', round(secs, 2))
for o, s, t, h in boxes(moov[0] + moov[3], moov[0] + moov[1]):
    if t == 'mvhd': setdur(o, d[o+8], 24, 32, round(longest * mvhd_ts))
    if t == 'mvex':
        for o2, s2, t2, h2 in boxes(o + h, o + s):
            if t2 == 'mehd': setdur(o2, d[o2+8], 12, 12, round(longest * mvhd_ts))
open(dst, 'wb').write(d); print('mvhd timescale', mvhd_ts, 'length', round(longest, 2))
