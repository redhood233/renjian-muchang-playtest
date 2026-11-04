import {fieldSlots,assignFieldSlots} from './work-slots.js?build=fa5b535c1d7e';
import {nearestWalkable,islandId} from './island-layout.js?build=fa5b535c1d7e';
import {schoolPost,kingPost,shrineSite} from './civic-sites.js?build=fa5b535c1d7e';
import {structureDamage} from './civilization.js?build=fa5b535c1d7e';
import {WORLD_LIFE as L,CONFIG as C,SETTLEMENT as S} from './config.js?build=fa5b535c1d7e';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pointCache=new WeakMap();
function workPoint(w,p,id){let cache=pointCache.get(w);if(!cache||cache.revision!==w.navRevision){cache={revision:w.navRevision,points:new Map()};pointCache.set(w,cache);}const key=id+':'+p.x+','+p.y;if(!cache.points.has(key)){if(cache.points.size>2048)cache.points.clear();cache.points.set(key,nearestWalkable(p,id,w.blockers()));}return cache.points.get(key);}
export function initLife(w){w.life={drops:[],shipments:[],fireClock:0,diplomacyClock:0,serial:0,burned:[]};for(const c of w.islands){c.cooperation=0;c.grievances=0;c.volcano={...nearestWalkable({x:c.x,y:c.y-12},c.id),heat:0,cooldown:0};c.project.health=1;c.project.site=shrineSite(w,{...c,x:c.x+5});for(const b of c.buildings)b.trees=b.source==='extension'&&c.id===0?L.treesPerLot:0;}}
export function ignite(w,p){const c=w.islandAt(p);if(!c||c.weather.left>0&&['rain','cold'].includes(c.weather.kind)||w.fires.length>=L.maxFires||w.fires.some(f=>distance(f,p)<1))return false;w.fires.push({x:p.x,y:p.y,left:L.fireLifetime,spread:0});return true;}
export function erupt(w,c){const v=c.volcano;if(v.cooldown>0)return false;v.cooldown=L.volcanoCooldown;v.heat=0;for(let i=0;i<L.volcanoStrikes;i++){const a=w.random()*Math.PI*2,r=2+w.random()*L.volcanoRadius,p=nearestWalkable({x:v.x+Math.cos(a)*r,y:v.y+Math.sin(a)*r},c.id,w.blockers());w.pending.push({...p,left:.5+i*.35,volcanic:true});}w.change('volcano-erupted',{country:c.id,...v});return true;}
export function projectDamage(w,p,r,amount){for(const c of w.islands){const q=c.project;if(q.paid&&q.site&&distance(q.site,p)<r+1){q.health=Math.max(0,(q.health??1)-amount);if(q.health===0){Object.assign(q,{state:'locked',paid:false,progress:0,health:1});w.change('soul-project-destroyed',{country:c.id});}}}}
export function dropMeat(w,e,food){w.life.drops.push({id:++w.life.serial,x:e.x,y:e.y,country:e.country,food,left:L.meatLifetime});w.change('meat-dropped',{country:e.country,food,x:e.x,y:e.y});}
export function assignWork(w,dt){if(!w.life)return;for(const e of w.humans()){e.workDuty=null;e.workReady=false;}
 for(const c of w.islands){const pool=w.workers(c).filter(e=>!e.workSite&&!e.gathering),fires=w.fires.filter(f=>w.islandAt(f)?.id===c.id);let offset=0;
  const send=(e,p,task,reach=1.5)=>{e.workDuty=task;e.workTarget={x:p.x,y:p.y};e.inside=false;w.move(e,p,dt,2.5);e.workReady=distance(e,p)<reach;e.action=e.workReady?task:'前往'+task;return e.workReady;};
  if(fires.length&&w.supply(c)>2)for(const e of pool.slice(0,L.firefighters)){const f=fires[offset++%fires.length],p=workPoint(w,{x:f.x+2,y:f.y},c.id);if(send(e,p,'提水灭火',2))f.left-=dt*L.extinguishRate;}
  const project=c.project;if(project.paid&&project.state!=='complete'&&pool[offset]){const e=pool[offset++];project.workerReady=send(e,project.site,'封魂工程施工',2);}else project.workerReady=false;
  const used=new Set(pool.slice(0,offset).map(e=>e.id));
  for(const d of w.life.drops.filter(d=>d.country===c.id&&d.left>0)){
   let e=w.get(d.carrier||d.collector);if(e&&(!w.available(e)||e.workSite||used.has(e.id))){d.carrier=null;d.collector=null;e=null;}
   if(!e)e=pool.filter(e=>!used.has(e.id)).sort((a,b)=>distance(a,d)-distance(b,d))[0];if(!e)continue;d.collector=e.id;used.add(e.id);
   if(!d.carrier){if(send(e,d,'拾取肉食'))d.carrier=e.id;}
   if(d.carrier){const post=kingPost(w,c);if(send(e,post,'搬运肉食')){c.food=Math.max(c.food,Math.min(C.foodLimit*(c.buildings.some(b=>b.kind==='granary'&&b.state==='complete')?S.granaryStorage:1),c.food+d.food));d.left=0;w.change('meat-delivered',{country:c.id,food:d.food,personId:e.id});}else{d.x=e.x;d.y=e.y;}}
  }
  const plots=c.buildings.filter(b=>b.state==='complete'&&b.kind===(c.id===0?'field':'pasture'));
  const remaining=pool.filter(e=>!used.has(e.id));
  if(c.id===0){const assigned=assignFieldSlots(remaining,fieldSlots(w,c,plots));for(const e of remaining){const slot=assigned.get(e.id);if(slot){e.fieldSlot=slot.id;send(e,slot,'田间劳作',.25);}else{e.fieldSlot=null;e.workDuty='等待工作';e.workReady=false;const rest=workPoint(w,{x:c.x-4+(e.id%4)*.8,y:c.y+5+Math.floor(e.id%12/4)*.8},c.id);w.move(e,rest,dt,2);e.action='等待空闲农田';}}}
  else {const flock=w.animals.filter(a=>a.country===c.id&&a.kind==='sheep'&&!a.dead);for(const [i,e] of remaining.entries()){const b=plots[Math.floor(i/10)%Math.max(1,plots.length)],animal=flock[i%Math.max(1,flock.length)];if(b)send(e,workPoint(w,animal?{x:animal.x+Math.cos(e.id*2.4),y:animal.y+Math.sin(e.id*2.4)}:b,c.id),'照料羊群',3);}}

 }
}
export function lifeAction(e){return !!e.workDuty;}
export function advanceLife(w,dt){if(!w.life)return;
 for(const d of w.life.drops){d.left-=dt;if(d.carrier&&!w.get(d.carrier))d.carrier=null;}w.life.drops=w.life.drops.filter(d=>d.left>0);
 for(const c of w.islands){const v=c.volcano;v.cooldown=Math.max(0,v.cooldown-dt);if(c.weather.left>0&&c.weather.kind.startsWith('hot')){v.heat+=dt;if(v.heat>=L.volcanoHeat)erupt(w,c);}else v.heat=0;if(c.weather.left>0&&['rain','cold'].includes(c.weather.kind))w.fires=w.fires.filter(f=>w.islandAt(f)?.id!==c.id);}
 w.life.fireClock+=dt;if(w.life.fireClock>=L.fireSpreadSeconds){w.life.fireClock=0;for(const f of [...w.fires]){const c=w.islandAt(f);if(!c||f.left<=0)continue;const fuels=c.buildings.filter(b=>b.state!=='planned'&&distance(b,f)<L.fireSpreadRadius);for(const b of fuels){structureDamage(w,b,.5,L.fireBuildingDamage,'fire');if(!w.life.burned.includes(b.id)){w.life.burned.push(b.id);ignite(w,b);}}projectDamage(w,f,L.fireSpreadRadius,L.fireBuildingDamage);}}
 for(const s of w.life.shipments){s.left=Math.max(0,s.left-dt);w.move(s,s.to,dt,4);if(distance(s,s.to)<1){s.left=0;}if(s.left<=0){if(distance(s,s.to)>=1){w.islands[s.fromCountry].food+=s.food;continue;}const receiver=w.islands[s.country];if(w.humans(receiver.id).length)receiver.food+=s.food;w.change('trade-arrived',{country:s.country,food:s.food});}}w.life.shipments=w.life.shipments.filter(s=>s.left>0);
 if(w.inPrologue)return;w.life.diplomacyClock+=dt;if(w.life.diplomacyClock<L.diplomacySeconds)return;w.life.diplomacyClock=0;
 const peaceful=!w.islands.some(c=>c.army)&&!w.military.occupation.some(Boolean),fed=w.islands.every(c=>w.supply(c)>10);
 w.diplomacy.relation=Math.max(0,Math.min(100,w.diplomacy.relation+(peaceful&&fed?3:-2)));
 for(const c of w.islands){c.cooperation=Math.max(0,Math.min(100,c.cooperation+(peaceful&&fed?3:-6)));c.federated=c.cooperation>=70&&w.diplomacy.relation>=70;c.tradeBonus=c.federated?1.08:1;
 if(!peaceful)c.grievances=Math.min(100,c.grievances+2);else c.grievances=Math.max(0,c.grievances-.5);
 if(!c.army&&w.truce<=0&&c.exhaustion<45&&c.grievances>20&&w.diplomacy.relation<40&&w.humans(c.id).length>w.humans(1-c.id).length*1.25)w.armyStart(c,w.get(c.kingId),'campaign');}
}
export function shipFood(w,donor,receiver,food){const from=kingPost(w,donor),to=kingPost(w,receiver);w.life.shipments.push({id:++w.life.serial,from,to,...from,country:receiver.id,fromCountry:donor.id,food,left:120,duration:L.shipmentSeconds});}
