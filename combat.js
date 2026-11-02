import {walkable,reachable,segmentClear,onBridge,nearestWalkable} from './island-layout.js?build=57b3cd365ae7';
import {MILITARY as M,CIVILIZATION as V,CONFIG as C} from './config.js?build=57b3cd365ae7';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function weapon(w,e){const era=e.kind==='human'?(w.islands[e.country].era||0):0;return {range:V.weaponRange[era],cooldown:V.weaponCooldown[era],kind:V.weapons[era]};}
export function strike(w,e,v,dt,damage){
 if(!v||v.dead||v.inside)return;
 const profile=weapon(w,e),gap=dist(e,v),reach=e.kind==='undead'?1.15:profile.range;
 if(gap>reach){
  const angle=gap>.01?Math.atan2(e.y-v.y,e.x-v.x):(e.id*2.399),radius=Math.min(reach*.85,Math.max(.8,reach-.25));
  const destination={x:v.x+Math.cos(angle)*radius,y:v.y+Math.sin(angle)*radius};
  w.move(e,walkable(destination,w.blockers())?destination:nearestWalkable(destination,null,w.blockers()),dt,C.soldierSpeed);
 }
 if(dist(e,v)<=reach+.08&&e.attack<=0&&segmentClear(e,v,w.blockers())){
  const hp=v.hp;w.damage(v,damage,e.kind==='undead'?'undead':'war');
  if(v.hp<hp)w.visualEvents.push({id:'actor-hit',attackerId:e.id,targetId:v.id,x:v.x,y:v.y,time:w.time,weapon:profile.kind});
  e.attack=(e.kind==='undead'?C.attackInterval:profile.cooldown)*(e.soldier&&e.rage>0?.6:1);
 }
}
export function formation(w,c,ids,anchor){
 const bridge=onBridge(anchor),columns=bridge?1:3,spacing=M.spacing;
 return ids.map((id,i)=>{const row=Math.floor(i/columns),lane=i%columns-(columns-1)/2;
  return nearestWalkable({x:anchor.x+(c.id?1:-1)*row*spacing,y:anchor.y+lane*spacing},null,w.blockers());});
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
