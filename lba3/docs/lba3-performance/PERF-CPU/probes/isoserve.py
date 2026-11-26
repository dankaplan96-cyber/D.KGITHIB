# PERF-CPU: the game served cross-origin isolated (COOP/COEP headers), so performance.now() has ~5 µs resolution
# instead of 100 µs: the probes' per-section milliseconds are then exact enough to compare. The game is unchanged.
#   cd lba3 && python3 docs/lba3-performance/PERF-CPU/probes/isoserve.py 8214 [directory to serve]
import functools
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Iso(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass


handler = functools.partial(Iso, directory=sys.argv[2]) if len(sys.argv) > 2 else Iso
ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 8214), handler).serve_forever()
