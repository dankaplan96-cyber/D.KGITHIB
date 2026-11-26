# RENDER-INV: mapcost.mjs results side by side.   python3 mapsum.py <dir>
import json, sys, glob, os
d = sys.argv[1]
for f in sorted(glob.glob(os.path.join(d, 'mapcost-*.txt'))):
    j = json.load(open(f))
    print(os.path.basename(f), 'load', j['load'], '->', j['loadAfter'], j['errors'])
    for k, v in j['out'].items():
        print('   ', k.ljust(14), 'frames', str(v['framesWithWork']).rjust(4), 'total', str(v['totalMs']).rjust(5), 'ms  max slice', str(v['maxSliceMs']).rjust(6), 'ms  mean', v['meanSliceMs'])
