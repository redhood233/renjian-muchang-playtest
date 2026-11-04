import {shipFood} from './living-world.js?build=fa5b535c1d7e';
import {CIVILIZATION as V,SETTLEMENT as S,CONFIG as C} from './config.js?build=fa5b535c1d7e';
import {complete} from './settlement.js?build=fa5b535c1d7e';
import {nearestWalkable} from './island-layout.js?build=fa5b535c1d7e';
import {shrinePost,shrineSite} from './civic-sites.js?build=fa5b535c1d7e';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const roofHit=(b,p,r)=>Math.hypot(Math.max(b.footprint.min[0],Math.min(p.x,b.footprint.max[0]))-p.x,Math.max(b.footprint.min[1],Math.min(p.y,b.footprint.max[1]))-p.y)<=r;
export function meteorTargets(w,p,r){
 const ids=new Set(w.islands.flatMap(c=>c.buildings.filter(b=>b.state==='complete'&&roofHit(b,p,r)).map(b=>b.id)));
 return [...new Map([...w.targets(p,r),...w.humans().filter(e=>e.inside&&ids.has(e.houseId))].map(e=>[e.id,e])).values()];
}
export function initCivilization(w){
 w.civicClock=0;w.diplomacy={relation:20,clock:0,tradeTotal:0};
 for(const c of w.islands){c.research=0;c.era=0;c.technologyProduction=1;c.faith=V.faithInitial;c.panic=0;c.residenceClock=0;
  c.project={state:'locked',progress:0,paid:false};c.shrine={state:'none',progress:0,health:1,offering:0,...shrineSite(w,c)};}
}
export function assignHomes(w,c){
 const houses=complete(c,'house').filter(b=>!b.upgrading),count=new Map(houses.map(b=>[b.id,0]));
 for(const e of w.humans(c.id)){
  if(count.has(e.houseId)&&count.get(e.houseId)<S.houseCapacity)count.set(e.houseId,count.get(e.houseId)+1);
  else {e.houseId=null;e.inside=false;}
 }
 for(const e of w.humans(c.id).filter(e=>!e.houseId)){const house=houses.find(b=>count.get(b.id)<S.houseCapacity);if(house){e.houseId=house.id;count.set(house.id,count.get(house.id)+1);}}
}
export function restResident(w,e,c,dt){
 const home=c.buildings.find(b=>b.id===e.houseId&&b.state==='complete'&&b.kind==='house'&&!b.upgrading);
 const rest=home&&!e.soldier&&!e.faithWork&&!e.workSite&&e.rage<=0&&e.joy<=0&&e.sick<=0&&c.panic<.05&&(w.time+e.id*7)%90>80;
 if(!rest){if(e.inside){e.inside=false;const p=nearestWalkable(home||c,c.id,w.blockers());Object.assign(e,p);e.destination={...p};}return false;}
 const entrance=nearestWalkable(home,c.id,w.blockers());e.action='回家休息';
 if(distance(e,entrance)<.35){e.inside=true;e.action='屋内休息';}else w.move(e,entrance,dt,C.walkSpeed);
 return true;
}
export function structureDamage(w,p,r,amount,cause='meteor'){
 let hit=0;
 for(const c of w.islands){const s=c.shrine;if(s.state==='complete'&&distance(s,p)<=r){s.health=Math.max(0,s.health-amount);if(s.health<1){s.state='repairing';s.progress=0;s.repairPaid=false;w.change('shrine-damaged',{country:c.id});}}}
 for(const c of w.islands)for(const b of c.buildings){
  if(b.state!=='complete')continue;
  const x=Math.max(b.footprint.min[0],Math.min(p.x,b.footprint.max[0])),y=Math.max(b.footprint.min[1],Math.min(p.y,b.footprint.max[1]));
  if(Math.hypot(x-p.x,y-p.y)>r)continue;
  hit++;b.health=Math.max(0,(b.health??1)-amount);
  if(cause==='meteor')for(const e of w.humans(c.id).filter(e=>e.inside&&e.houseId===b.id))w.kill(e,cause);
  if(b.health<=0){b.state='planned';b.progress=0;b.clearProgress=0;b.kind=b.special==='hall'?'hall':b.zone==='house'?'house':b.zone;b.upgrading=false;
   for(const e of w.humans(c.id).filter(e=>e.houseId===b.id)){e.inside=false;e.houseId=null;Object.assign(e,nearestWalkable(b,c.id,w.blockers()));}
   if(b.source==='extension'){w.navRevision++;}w.change('building-destroyed',{country:c.id,buildingId:b.id,cause});
  }else w.change('building-damaged',{country:c.id,buildingId:b.id,health:b.health,cause});
 }
 return hit;
}
export function advanceCivilization(w,dt){
 for(const e of w.humans()){e.faithWork=false;e.faithTask=null;e.faithAt=false;}
 for(const c of w.islands){
  c.residenceClock-=dt;if(c.residenceClock<=0){assignHomes(w,c);c.residenceClock=1;}
  const scholars=w.adults(c).filter(e=>e.role==='scholar'&&w.available(e)&&!e.inside&&e.action==='学士 · 学院研究'),academy=complete(c,'academy')[0];
  if(!w.inPrologue&&academy&&scholars.length){
   c.research=Math.min(V.researchLimit,c.research+scholars.length*V.researchPerScholar*dt);
   const era=c.research>=V.thresholds[1]?2:c.research>=V.thresholds[0]?1:0;
   if(era!==c.era){c.era=era;w.message(`${c.name}进入${['冷兵器','热兵器','激光'][era]}时代`);w.change('era-changed',{country:c.id,era});}
  }
  c.technologyProduction=V.production[c.era];
  const project=c.project;
  if(c.research>=V.researchLimit&&academy){
   if(!project.paid&&scholars.length>=V.projectScholars&&c.food>=V.projectFood+w.consumption(c)*8){c.food-=V.projectFood;project.paid=true;project.state='building';w.change('soul-project-started',{country:c.id});}
   if(project.paid&&project.state!=='complete'){
    if(scholars.length>=V.projectScholars&&project.workerReady&&w.supply(c)>8&&c.panic<.1){project.progress=Math.min(V.projectSeconds,project.progress+dt*((c.federated)?1.12:1));project.state='building';}
    else project.state='paused';
    if(project.progress>=V.projectSeconds){project.state='complete';w.change('soul-project-completed',{country:c.id});}
   }
  }else if(project.paid)project.state='paused';
  const s=c.shrine,scientific=c.research>=V.faithCutoff;
  c.faith=Math.max(0,Math.min(100,c.faith-dt*(scientific?1:w.supply(c)>20?.03:0)));
  if(s.state==='none'&&!scientific&&c.faith>=V.faithThreshold&&c.food>=V.shrineCost+w.consumption(c)*15&&w.workers(c).length>2){c.food-=V.shrineCost;s.state='building';w.change('shrine-started',{country:c.id});}
  if(s.state==='repairing'&&!s.repairPaid&&c.food>2+w.consumption(c)*8){c.food-=2;s.repairPaid=true;}
  if(s.state==='building'||s.state==='repairing'&&s.repairPaid){
   if(faithWorker(w,c,dt,'build')){s.progress+=dt;if(s.progress>=V.shrineSeconds){s.state='complete';s.health=1;w.change('shrine-completed',{country:c.id});}}
  }
  s.offering=Math.min(V.offeringSeconds,s.offering+dt);
  if(s.offering>=V.offeringSeconds){
   if(s.state==='complete'&&!scientific&&c.faith>=20&&c.food>=V.offeringFood+w.consumption(c)*15&&faithWorker(w,c,dt,'offering')){s.offering=0;c.food-=V.offeringFood;w.mana+=V.offeringMana;s.offerings=(s.offerings||0)+1;s.lastOffering=w.time;w.change('offering',{country:c.id,personId:s.workerId,x:s.x,y:s.y,food:V.offeringFood,mana:V.offeringMana});}
  }
  // Residents age independently; medicine changes lifespan and epidemic fatality.
  if(!w.inPrologue)for(const e of w.humans(c.id)){e.age=(e.age||0)+dt;if(e.age>=V.lifespan[c.era])w.kill(e,'natural');}
 }
 if(!w.inPrologue){
  w.diplomacy.clock+=dt;
  if(w.diplomacy.clock>=V.tradeSeconds){w.diplomacy.clock%=V.tradeSeconds;
   const [a,b]=w.islands;
   if(!a.army&&!b.army&&w.humans(0).length&&w.humans(1).length&&!w.military.occupation.some(Boolean)){
    const donor=w.supply(a)>w.supply(b)?a:b,receiver=donor===a?b:a;
    const food=Math.min(5,Math.max(0,donor.food-w.consumption(donor)*20),Math.max(0,C.foodLimit-receiver.food));
    if(food>0){donor.food-=food;shipFood(w,donor,receiver,food);w.diplomacy.tradeTotal+=food;w.diplomacy.relation=Math.min(100,w.diplomacy.relation+1);w.change('trade-delivered',{from:donor.id,to:receiver.id,food});}
   }
  }
 }
}
function faithWorker(w,c,dt,task){
 const s=c.shrine,workers=w.workers(c),post=shrinePost(w,c);let worker=workers.find(e=>e.id===s.workerId);
 worker??=workers.sort((a,b)=>distance(a,post)-distance(b,post)||a.id-b.id)[0];s.workerId=worker?.id??null;if(!worker)return false;
 worker.faithWork=true;worker.faithTask=task;worker.inside=false;w.move(worker,post,dt,V.faithWorkerSpeed);worker.faithAt=distance(worker,post)<=V.faithWorkReach;return worker.faithAt;
}
