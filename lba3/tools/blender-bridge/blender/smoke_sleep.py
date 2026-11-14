# Smoke-test helper (tools/blender-bridge/smoke.mjs): sleeps for argv[1] seconds inside Blender, to test the bridge's
# timeout (it must terminate this Blender, and only it) and its one-job-at-a-time lock.
import sys
import time

time.sleep(float(sys.argv[1]) if len(sys.argv) > 1 else 3600)
