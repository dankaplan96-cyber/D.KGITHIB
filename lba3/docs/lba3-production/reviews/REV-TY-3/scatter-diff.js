const o=require(process.argv[2]), n=require(process.argv[3]);
const PUMP={x:-42,z:65}, SHOP={x:-102.8,z:33.9}, GARDEN={x:-60,z:83.5}, BEDS=[[1.6,-4.2],[2.4,-2.2]];
const CLEAR=[{x0:PUMP.x-2.1,x1:PUMP.x+2.0,z0:PUMP.z-1.6,z1:PUMP.z+1.9},{x0:SHOP.x-3.4,x1:SHOP.x+1.8,z0:SHOP.z-1.6,z1:SHOP.z+1.7},...BEDS.map(([bx,bz])=>({x0:GARDEN.x+bx-1.1,x1:GARDEN.x+bx+1.1,z0:GARDEN.z+bz-0.65,z1:GARDEN.z+bz+0.65}))];
const inC=(x,z)=>CLEAR.findIndex(r=>x>r.x0&&x<r.x1&&z>r.z0&&z<r.z1);
const k=(a)=>a[0]+'@'+a[1]+','+a[2];
const nm=new Map(n.inst.map(a=>[k(a),a])), om=new Map(o.inst.map(a=>[k(a),a]));
const removed=[], shrunk=[], added=[], changed=[];
for(const a of o.inst){const b=nm.get(k(a)); if(!b) removed.push(a); else if(a[3]>0.01&&b[3]<0.01) shrunk.push(a); else if(Math.abs(a[3]-b[3])>1e-3) changed.push([a,b]);}
for(const b of n.inst){ if(!om.has(k(b))) added.push(b);}
const kind=(a)=>a[0].split('|')[2]+'v';
console.log('old inst',o.inst.length,'new',n.inst.length,'removed(absent)',removed.length,'shrunk',shrunk.length,'scale-changed',changed.length,'added',added.length);
const sumBy=(arr)=>{const m={};for(const a of arr){const c=inC(a[1],a[2]);const key=(c<0?'OUTSIDE':'clear'+c);m[key]=(m[key]||0)+1;}return m;};
console.log('shrunk by place', JSON.stringify(sumBy(shrunk)));
console.log('removed by place', JSON.stringify(sumBy(removed)));
// removed outside: cluster them
const out=removed.filter(a=>inC(a[1],a[2])<0);
const cl=[]; for(const a of out){let c=cl.find(c=>Math.hypot(c.x-a[1],c.z-a[2])<8); if(!c){c={x:a[1],z:a[2],n:0,xs:[],zs:[]};cl.push(c);} c.n++; c.xs.push(a[1]); c.zs.push(a[2]);}
for(const c of cl) console.log('  removed-outside cluster n='+c.n+' x '+Math.min(...c.xs).toFixed(1)+'..'+Math.max(...c.xs).toFixed(1)+' z '+Math.min(...c.zs).toFixed(1)+'..'+Math.max(...c.zs).toFixed(1));
console.log('shrunk details', JSON.stringify(shrunk.map(a=>[a[0].split('|').slice(1).join('|'),a[1],a[2],a[3]])));
console.log('added', JSON.stringify(added.slice(0,10)));
// colliders
const ck=(c)=>c.join(',');
const oc=new Set(o.cols.map(ck)), ncs=new Set(n.cols.map(ck));
const cr=o.cols.filter(c=>!ncs.has(ck(c))), ca=n.cols.filter(c=>!oc.has(ck(c)));
console.log('colliders removed', cr.length, JSON.stringify(cr));
console.log('colliders added', ca.length, JSON.stringify(ca));
