import json,sys; tr=json.load(open(sys.argv[1]+'/trace.json'))
for pre in ['sword','hop','jumpS','jumpW','jumpR','walk','stop','pickup']:
  r=[x for x in tr if x['tag'].split('-')[0]==pre]
  if not r: continue
  sink=[(min(x['L'][1]-x['L'][3],x['R'][1]-x['R'][3]),i,x['a'],x['g']) for i,x in enumerate(r)]
  lo=min(sink)
  air=sum(1 for x in r if x['g'] is False)
  print('%-6s frames %3d  lowest ankle %.3f (rest 0.100) at %d %s  frames in air %d  sunk>1cm %d'%(pre,len(r),lo[0],lo[1],lo[2],air,sum(1 for q in sink if q[0]<0.09)))
