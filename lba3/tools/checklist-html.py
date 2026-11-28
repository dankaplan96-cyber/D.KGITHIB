import sys, html
src, out = sys.argv[1], sys.argv[2]
rows = []
for line in open(src, encoding='utf-8').read().split('\n'):
    t = html.escape(line.strip())
    t = __import__('re').sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    if line.startswith('# '): rows.append(f'<h1>{t[2:]}</h1>')
    elif line.startswith('## '): rows.append(f'<h2>{t[3:]}</h2>')
    elif line.startswith('- [x] '): rows.append(f'<div class="i done"><span class="b">✓</span>{t[6:]}</div>')
    elif line.startswith('- [ ] '): rows.append(f'<div class="i"><span class="b"></span>{t[6:]}</div>')
    elif line.startswith('- '): rows.append(f'<div class="i plain">{t[2:]}</div>')
    elif t: rows.append(f'<p>{t}</p>')
css = """body{margin:0;font:16px/1.5 Rubik,system-ui,sans-serif;background:#eaf4fb;color:#10202e;padding:16px 18px}
@media(prefers-color-scheme:dark){body{background:#0d1a24;color:#e6eef5}.i{border-color:#24384c!important}.b{border-color:#9cb0c0!important}}
h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:20px 0 6px;color:#2f7fc1}p{margin:2px 0;opacity:.8;font-size:14px}
.i{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #d3e2ee}
.b{flex:none;width:20px;height:20px;border:2px solid #4f6475;border-radius:5px;display:grid;place-items:center;font-size:13px;color:#fff;margin-top:2px}
.done .b{background:#2e8a57;border-color:#2e8a57}.done{opacity:.75}.plain{padding-inline-start:30px}"""
open(out, 'w', encoding='utf-8').write(f'<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>צ\'ק ליסט LBA3</title><style>{css}</style></head><body>' + '\n'.join(rows) + '</body></html>')
