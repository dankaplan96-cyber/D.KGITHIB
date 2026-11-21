import json,sys,math; tr=json.load(open(sys.argv[1]+'/trace.json'))
# a sole is standing while its ankle is within 5 mm of its rest height (0.100) or below it; slide = its drift in that run
for pre in ['sword','hop','jumpS','jumpW','jumpR','walk','stop','pickup']:
  r=[x for x in tr if x['tag'].split('-')[0]==pre]
  out=[]
  for s in 'LR':
    c0=None; worst=0; n=0
    for x in r:
      X,Y,Z,G=x[s]
      if Y-G<0.105:
        if c0 is None: c0=(X,Z); n+=1
        else: worst=max(worst,math.hypot(X-c0[0],Z-c0[1]))
      else: c0=None
    out.append('%s: %d contacts, max slide %.1f cm'%(s,n,worst*100))
  print('%-6s'%pre,' | '.join(out))
