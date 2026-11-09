# -*- coding: utf-8 -*-
"""Build a single-file demo (demo/demo.html) that runs entirely in the browser.

The demo uses demo/mock-api.js instead of server.py, so it can be opened on
any phone/tablet for a quick trial. Data is stored only in that browser.

    python demo/build_demo.py
"""
import base64
import os

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(HERE, "..", "static")


def read(*p):
    with open(os.path.join(*p), encoding="utf-8") as f:
        return f.read()


icon = "data:image/svg+xml;base64," + base64.b64encode(read(STATIC, "icon.svg").strip().encode()).decode()
html = read(STATIC, "index.html")
css = read(STATIC, "style.css")
app = read(STATIC, "app.js").replace('"icon.svg"', '"' + icon + '"')
mock = read(HERE, "mock-api.js")

banner = """
  <div class="demo-banner">
    <b>גרסת הדגמה</b> · כניסה: <span dir="ltr">admin / admin</span> (מנהל) או <span dir="ltr">nurse1 / 1234</span> (אח כללי)
    · הנתונים נשמרים רק במכשיר זה
    <button type="button" onclick="nsDemoReset()">איפוס נתונים</button>
  </div>"""
demo_css = """
.demo-banner { background: #fff3dc; color: #6b4300; font-size: 14px; padding: 8px 12px; text-align: center; line-height: 1.6; }
.demo-banner button { font: inherit; font-size: 13px; margin-inline-start: 6px; padding: 2px 10px; border-radius: 8px;
  border: 1px solid #b26a00; background: transparent; color: inherit; cursor: pointer; }
"""

html = html.replace(', viewport-fit=cover', '')
html = html.replace('<link rel="icon" href="icon.svg" type="image/svg+xml">', f'<link rel="icon" href="{icon}" type="image/svg+xml">')
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + demo_css + "</style>")
html = html.replace('src="icon.svg"', f'src="{icon}"')
html = html.replace("<title>אח כללי - דיווח משמרת</title>", "<title>אח כללי – גרסת הדגמה</title>")
html = html.replace("<body>", "<body>" + banner, 1)
html = html.replace('<script src="app.js"></script>', "<script>\n" + mock + "\n</script>\n<script>\n" + app + "\n</script>")

assert "app.js" not in html.split("<script>")[0] and 'href="style.css"' not in html
out = os.path.join(HERE, "demo.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print("wrote", out, len(html), "bytes")
