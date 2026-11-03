import {BRIDGE,walkable,reachable,segmentClear,onBridge,nearestWalkable} from './island-layout.js?build=bf17b8d54899';
import {MILITARY as M,CIVILIZATION as V,CONFIG as C} from './config.js?build=bf17b8d54899';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const formationCache=new WeakMap();
export function weapon(w,e){const era=e.kind==='human'?(w.islands[e.country].era||0):0;return {range:V.weaponRange[era],cooldown:V.weaponCooldown[era],kind:V.weapons[era]};}
export function strike(w,e,v,dt,damage,slot=null){
 if(!v||v.dead||v.inside)return;
 const profile=weapon(w,e),gap=dist(e,v),reach=e.kind==='undead'?1.15:profile.range;
 if(gap>reach){
  const angle=gap>.01?Math.atan2(e.y-v.y,e.x-v.x):(e.id*2.399),radius=Math.min(reach*.85,Math.max(.8,reach-.25));
  const destination={x:v.x+Math.cos(angle)*radius,y:v.y+Math.sin(angle)*radius};
  if(slot&&dist(destination,slot)>M.combatLeash){const d=dist(destination,slot);destination.x=slot.x+(destination.x-slot.x)*M.combatLeash/d;destination.y=slot.y+(destination.y-slot.y)*M.combatLeash/d;}
  w.move(e,walkable(destination,w.blockers())?destination:nearestWalkable(destination,null,w.blockers()),dt,C.soldierSpeed);
 }
 if(dist(e,v)<=reach+.08&&e.attack<=0&&segmentClear(e,v,w.blockers())){
  const hp=v.hp;w.damage(v,damage,e.kind==='undead'?'undead':'war');
  if(v.hp<hp)w.visualEvents.push({id:'actor-hit',attackerId:e.id,targetId:v.id,x:v.x,y:v.y,from:{x:e.x,y:e.y},time:w.time,weapon:profile.kind});
  e.attack=(e.kind==='undead'?C.attackInterval:profile.cooldown)*(e.soldier&&e.rage>0?.6:1);
 }
}
export function formation(w,c,ids,anchor,heading=null){
 const bridge=onBridge(anchor)||ids.some(id=>{const e=w.get(id);return e&&onBridge(e);}),columns=bridge?M.bridgeColumns:M.landColumns,spacing=M.formationSpacing;
 const key=[w.navRevision,c.id,columns,anchor.x,anchor.y,heading?.x,heading?.y,ids.join(',')].join('|');
 let cache=formationCache.get(w);if(!cache){cache=new Map();formationCache.set(w,cache);}if(cache.has(key))return cache.get(key);
 let dx=heading?.x??(c.id?-1:1),dy=heading?.y??0;
 if(bridge){dx=(BRIDGE.b.x-BRIDGE.a.x)*(c.id?-1:1);dy=(BRIDGE.b.y-BRIDGE.a.y)*(c.id?-1:1);}
 const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;const slots=[],extra=w.blockers();
 for(let i=0;i<ids.length;i++){const row=Math.floor(i/columns),count=Math.min(columns,ids.length-row*columns),lane=i%columns-(count-1)/2;
  const wanted={x:anchor.x-dx*row*spacing-dy*lane*spacing,y:anchor.y-dy*row*spacing+dx*lane*spacing};
  let q=nearestWalkable(wanted,null,extra);
  if(slots.some(p=>dist(p,q)<M.spacing+.05)){
   let best=null,bestScore=Infinity;
   for(let r=1;r<=4;r++)for(let j=0;j<12;j++){const angle=j*Math.PI/6,candidate={x:wanted.x+Math.cos(angle)*r*.55,y:wanted.y+Math.sin(angle)*r*.55};if(slots.some(p=>dist(p,candidate)<M.spacing+.05)||!reachable(candidate,extra))continue;const score=dist(candidate,wanted);if(score<bestScore){best=candidate;bestScore=score;}}
   if(best)q=best;
  }
  slots.push(q);
 }
 if(cache.size>64)cache.clear();cache.set(key,slots);return slots;
}
// A spatial hash bounds the work to neighbours. Only legal, clear short moves
// are accepted, so separation cannot push an actor through a house or off a bridge.
export function separate(w,dt){
 const actors=w.entities.filter(e=>!e.dead&&!e.inside),size=M.spacing;
 for(let iteration=0;iteration<2;iteration++){
  const buckets=new Map();for(const e of actors){const key=Math.floor(e.x/size)+','+Math.floor(e.y/size);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(e);}
  for(const e of actors){const ix=Math.floor(e.x/size),iy=Math.floor(e.y/size);for(let x=ix-1;x<=ix+1;x++)for(let y=iy-1;y<=iy+1;y++)for(const other of buckets.get(x+','+y)||[]){
   if(other.id<=e.id||!(e.soldier||other.soldier||e.kind==='undead'||other.kind==='undead'))continue;
   const d=dist(e,other);if(d>=size)continue;
   const a=d>.0001?Math.atan2(e.y-other.y,e.x-other.x):((e.id*97+other.id*31)%360)*Math.PI/180;
   const amount=Math.min((size-d)*.5,dt*M.separationSpeed),dx=Math.cos(a)*amount,dy=Math.sin(a)*amount;
   for(const [actor,sign] of [[e,1],[other,-1]]){const q={x:actor.x+dx*sign,y:actor.y+dy*sign};if(reachable(q,w.blockers())&&segmentClear(actor,q,w.blockers())){actor.x=q.x;actor.y=q.y;if(actor._route)actor._route.dirty=true;}}
  }}
 }
}
