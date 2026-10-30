# Writes the game's page for publishing as a claude.ai Artifact: the publisher wraps the page in its own
# <!doctype html><head><body> skeleton, so this keeps index.html's contents without those outer tags.
#   python3 tools/artifact-page.py <out.html>
import re
import sys

src = open('index.html', encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', src, re.S).group(1)
head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', '', head)  # (the skeleton has its own)
# Artifacts serve only web media types, so the baked geometry is published as assets/bake.wasm (fetched as
# raw bytes, never compiled) and the page tells the game where it is.
head = "<script>window.LBA_BAKE_URL = 'assets/bake.wasm';</script>\n  " + head.strip()
open(sys.argv[1], 'w', encoding='utf-8').write(head + '\n' + body.strip() + '\n')
