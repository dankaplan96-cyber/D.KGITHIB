# RENDER-INV: print an audit.mjs JSON result as a table.   python3 show.py audit-*.json
import json, sys
d = json.load(open(sys.argv[1]))
print('load', d['load'], d['loadAfter'], 'errors', d['errors'])
print('loadTimes', d.get('loadTimes'))
for k, s in d['scenes'].items():
    m = s['med']
    print(f"\n== {k} room={s['room']} state={s['state']} visitedShown={s['visitedShown']}/{s['sceneObjects']} lights={s['lights']} npcsPresent={s['npcsPresent']}/{s['npcsTotal']} worldUpd={s['worldUpdaters']} roomUpd={s['roomUpdaters']} mem={s['mem']}")
    print('  med', m)
    for a, v in sorted(s['drawsByArea'].items(), key=lambda kv: -(kv[1].get('main', 0) + kv[1].get('shadow', 0))):
        print('   ', a, v)
if 'cycles' in d:
    print('\ncycles', json.dumps(d['cycles']))
if 'inventoryStreet' in d:
    print('\ninvStreet', json.dumps(d['inventoryStreet']))
