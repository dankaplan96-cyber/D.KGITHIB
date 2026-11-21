import json,statistics as st,sys
for d in sys.argv[1:]:
  h=json.load(open(d+'/hidden.json'))
  print('==',d,'spots',h['spots'],'views',h['views'],'area tris',h['triangles'],'hidden',h['hidden'],h['hiddenPct'],'% · ds',h['dsTris'],'ds back never',h['dsBackNeverSeen'],'· area',h['setup'].get('area',{}).get('start'))
  c=json.load(open(d+'/cost.json'))
  for q,rounds in c.items():
    for name in 'AB':
      R=[r['m'] for r in rounds if r['tag']==name]; n=len(R[0])
      g=[st.median([r[i]['gpuP50'] for r in R if r[i]['gpuP50'] is not None]) for i in range(n)]
      g95=[st.median([r[i]['gpuP95'] for r in R if r[i]['gpuP95'] is not None]) for i in range(n)]
      tr=st.mean([R[0][i]['tris'] for i in range(n)]); ca=st.mean([R[0][i]['calls'] for i in range(n)]); f=st.mean([st.median([r[i]['frameP50'] for r in R]) for i in range(n)]); f95=st.mean([st.median([r[i]['frameP95'] for r in R]) for i in range(n)])
      print('  %-6s %s gpu p50 %.2f p95 %.2f ms · frame p50 %.2f p95 %.2f · tris %d · calls %.0f'%(q,name,st.mean(g),st.mean(g95),f,f95,tr,ca))
