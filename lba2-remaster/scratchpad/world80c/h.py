import json, sys
D = json.load(open(sys.argv[1])); R = D['regions']['citadel']; G = R['grid']; F = R['frame']
L = json.load(open('tools/worldscore/ref/citadel.json'))
def ours(x, z):
    ox = x - F['tx']; oz = z - F['tz']
    i = round((ox + G['W0'] / 2) / G['cell'] + G['MARGIN']); j = round((oz + G['D0'] / 2) / G['cell'] + G['MARGIN'])
    return R['heights'][j * G['NX'] + i] / 100
def orig(x, z):
    ox = x - F['tx']; oz = z - F['tz']
    i = round((ox + G['W0'] / 2) / G['cell']); j = round((oz + G['D0'] / 2) / G['cell'])
    if 0 <= i < L['nx'] and 0 <= j < L['nz']: return L['heights'][j * L['nx'] + i] / 100
    return None
for a in sys.argv[2:]:
    x, z = map(float, a.split(','))
    print(f"({x},{z}) ours {ours(x, z):.2f} orig {orig(x, z)}")
