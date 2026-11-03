import {MILITARY as M,CONFIG as C,SETTLEMENT as S} from './config.js?build=a256348c5d71';
import {complete} from './settlement.js?build=a256348c5d71';
import {BRIDGE,islandId,nearestWalkable} from './island-layout.js?build=a256348c5d71';
import {formation,strike,weapon} from './combat.js?build=a256348c5d71';
import {structureDamage} from './civilization.js?build=a256348c5d71';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const living=(w,a)=>a.ids.map(id=>w.get(id)).filter(e=>e?.soldier&&!e.garrison);
const fighting=e=>e&&!e.dead&&e.soldier&&!e.returning;
export function initMilitary(w){
 const points=[BRIDGE.a,{x:(BRIDGE.a.x+BRIDGE.b.x)/2,y:(BRIDGE.a.y+BRIDGE.b.y)/2},BRIDGE.b];
 w.military={clock:0,sites:points.map((p,id)=>({id,...nearestWalkable(p),owner:null,progress:0,claimant:null,built:false,stock:0})),occupation:[null,null],battles:0};
}
export function activeInvaders(w,c){return w.entities.filter(e=>fighting(e)&&!e.garrison&&e.country!==c.id&&islandId(e)===c.id);}
function recruits(w,c){return w.adults(c).filter(e=>w.available(e)&&e.role==='civilian'&&!e.workSite).sort((a,b)=>a.id-b.id);}
function reserve(w,c){return Math.max(C.keepAdults,Math.ceil(w.adults(c).length*M.reserveFraction));}
export function armyCheck(w,c){
 if(w.truce>0)return '双方停战保护中';if(c.army)return '本岛队伍尚未返乡';
 if(w.time-c.lastArmy<C.armyInterval&&!activeInvaders(w,c).length)return '本岛正在休整';
 if(recruits(w,c).length<=reserve(w,c))return '成年劳动力不足，需留人口生产与繁衍';
 return '';
}
function safeMuster(w,c){
 const enemies=activeInvaders(w,c),nearest=enemies.sort((a,b)=>distance(a,c)-distance(b,c))[0];
 const dx=nearest?c.x-nearest.x:c.id?6:-6,dy=nearest?c.y-nearest.y:0,len=Math.hypot(dx,dy)||1;
 return nearestWalkable({x:c.x+dx/len*5,y:c.y+dy/len*5},c.id,w.blockers());
}
export function startArmy(w,c,p,operation=null){
 const error=armyCheck(w,c);if(error)return false;
 const king=w.get(c.kingId),host=w.military.occupation[c.id],enemy=w.islands[1-c.id];
 operation??=host?'liberation':activeInvaders(w,c).length?'defend':w.supply(c)<M.raidReserveSeconds?'raid':'campaign';
 const troops=draft(w,c,operation);if(!troops.length)return false;
 const ration=operation==='raid'||operation==='liberation'||operation==='defend'?0:troops.length*M.rationPerSoldier*M.rationsSeconds;
 if(ration>0&&c.food<ration+w.consumption(c)*4)return false;
 c.food-=ration;
 c.army={kingId:king?.id??null,ids:troops.map(e=>e.id),left:operation==='raid'?M.raidDuration:M.duration,start:troops.length,returning:false,state:'mustering',operation,muster:safeMuster(w,c),musterElapsed:0,reinforce:0,rations:ration,cargo:0,capture:0,targetSite:c.id===0?0:2,raidDone:false};
 for(const e of troops){e.soldier=true;e.returning=false;e.inside=false;e.targetId=null;}
 if(king){king.commanding=true;w.visualEvents.push({id:'royal-command',x:king.x,y:king.y,time:w.time,kingId:king.id,targets:troops.map(e=>({id:e.id,x:e.x,y:e.y}))});}
 c.lastArmy=w.time;w.military.battles++;w.change('army-mobilized',{country:c.id,operation,ids:[...c.army.ids]});w.message(`${c.name}${troops.length}人集结，准备${operation==='raid'?'抢粮':operation==='liberation'?'驱逐驻军':'作战'}`);return true;
}
export function draft(w,c,operation=null){
 operation??=w.military.occupation[c.id]?'liberation':activeInvaders(w,c).length?'defend':w.supply(c)<M.raidReserveSeconds?'raid':'campaign';
 const pool=recruits(w,c),want=Math.min(operation==='raid'?M.raidMax:M.maxTroops,Math.max(2,Math.floor(w.adults(c).length*M.troopFraction)));
 return pool.slice(0,Math.max(0,Math.min(want,pool.length-reserve(w,c))));
}

function returning(w,c,a,dt){
 const troops=living(w,a),slots=formation(w,c,a.ids,nearestWalkable(c,c.id,w.blockers()));
 for(const e of troops){e.returning=true;e.returnOrder??=slots[a.ids.indexOf(e.id)];e.order=e.returnOrder;
  if(distance(e,e.order)<1.8){const share=1/Math.max(1,living(w,a).length),loot=a.cargo*share,rations=a.rations*share;
   const capacity=C.foodLimit*(complete(c,'granary').length?S.granaryStorage:1);c.food=Math.max(c.food,Math.min(capacity,c.food+loot+rations));a.cargo-=loot;a.rations-=rations;
   e.soldier=false;e.returning=false;e.targetId=null;e.order=null;e.returnOrder=null;e.action='自动生产';a.delivered=(a.delivered||0)+loot;
  }
 }
 a.ids=a.ids.filter(id=>w.get(id)?.soldier);
 if(!a.ids.length){
  w.change('army-returned',{country:c.id,loot:a.delivered||0,survivors:troops.length});
  const king=w.get(a.kingId);if(king)king.commanding=false;c.army=null;c.lastArmy=w.time;
 }
}
function resupply(w,c,a,troops,dt){
 const need=troops.length*M.rationPerSoldier*dt;a.rations=Math.max(0,a.rations-need);
 const near=w.military.sites.find(s=>s.built&&s.owner===c.id&&troops.some(e=>distance(e,s)<4));
 if(near){const route=c.id===0?w.military.sites.slice(0,near.id+1):w.military.sites.slice(near.id);if(route.every(s=>s.owner===c.id&&s.built)){
  const shipment=Math.min(Math.max(0,c.food-w.consumption(c)*8),M.siteCapacity-near.stock,dt*2);c.food-=shipment;near.stock+=shipment;
  const take=Math.min(near.stock,Math.max(0,troops.length*M.rationPerSoldier*M.rationsSeconds-a.rations));near.stock-=take;a.rations+=take;
 }}
}
function occupy(w,c,a){
 const subject=1-c.id,troops=living(w,a),guards=troops.slice(0,Math.min(M.maxGarrison,Math.max(1,Math.floor(troops.length/3))));
 const posts=formation(w,c,guards.map(e=>e.id),nearestWalkable({x:w.islands[subject].x,y:w.islands[subject].y+2},subject,w.blockers()));
 for(const [i,e] of guards.entries()){e.garrison=true;e.returning=false;e.post=posts[i];e.order=e.post;e.targetId=null;}
 w.military.occupation[subject]={owner:c.id,ids:guards.map(e=>e.id),remaining:M.occupationSeconds};a.ids=a.ids.filter(id=>!guards.some(e=>e.id===id));
 w.change('island-occupied',{country:c.id,subject,garrisonIds:guards.map(e=>e.id)});w.message(`${c.name}攻占敌方城镇，留下驻军`);w.retreat(c);
}
function orders(w,c,a,troops,anchor){
 const hostile=w.entities.filter(e=>!e.dead&&!e.inside&&!e.returning&&e.country!==c.id&&(e.soldier||e.kind==='undead'||a.operation==='raid'&&e.adult));
 a.front??={...a.muster};a.heading??={x:c.id?-1:1,y:0};
 let front=a.state==='mustering'?a.muster:a.front;
 let slots=formation(w,c,a.ids,front,a.heading);
 const present=troops.filter(e=>!e.joining),ready=present.filter(e=>distance(e,slots[a.ids.indexOf(e.id)])<M.cohesionRadius).length;
 const engaged=present.some(e=>hostile.some(v=>distance(e,v)<=weapon(w,e).range*.95));
 if(a.state!=='mustering'){
  if(engaged)a.orderState='engaging';
  else if(ready>=Math.ceil(present.length*M.cohesionFraction)){
   const before={...a.front};w.move(a.front,anchor,M.decisionSeconds,M.marchSpeed);
   const dx=a.front.x-before.x,dy=a.front.y-before.y;if(Math.hypot(dx,dy)>.01)a.heading={x:dx,y:dy};
   a.orderState='marching';slots=formation(w,c,a.ids,a.front,a.heading);
  }else a.orderState='regrouping';
 }else {a.front={...a.muster};a.orderState='mustering';}
 const assigned=new Map();
 for(const e of troops){e.order=slots[a.ids.indexOf(e.id)];const reach=weapon(w,e).range+M.combatLeash;let targets=hostile.filter(v=>distance(e.order,v)<reach+.5&&distance(e,v)<reach+1);
  if(a.operation==='liberation')targets=targets.filter(v=>v.garrison);else if(a.operation==='defend')targets=targets.filter(v=>v.soldier||v.kind==='undead');
  targets.sort((x,y)=>(Number(y.soldier)-Number(x.soldier))*4+((assigned.get(x.id)||0)-(assigned.get(y.id)||0))*2+distance(e,x)-distance(e,y));
  const old=targets.find(v=>v.id===e.targetId),target=old&&distance(e,old)<6?old:targets[0];e.targetId=target?.id??null;if(target)assigned.set(target.id,(assigned.get(target.id)||0)+1);
 }
}
export function advanceMilitary(w,dt){
 const military=w.military;
 for(const c of w.islands){
  const invaders=activeInvaders(w,c);c.panic=Math.max(0,Math.min(M.panicLoss,(c.panic||0)+(invaders.length?dt*.08:-dt*.1)));
  const occupation=military.occupation[c.id];
  if(occupation){occupation.ids=occupation.ids.filter(id=>w.get(id)?.garrison);occupation.remaining-=dt;
   if(!occupation.ids.length||occupation.remaining<=0){for(const id of occupation.ids){const e=w.get(id);e.garrison=false;e.returning=true;}military.occupation[c.id]=null;w.change('occupation-ended',{country:c.id});}
  }
  const a=c.army;if(!a)continue;const previous=a.ids.length;a.ids=a.ids.filter(id=>w.get(id)?.soldier&&!w.get(id).garrison);if(previous&&a.ids.length<previous)a.cargo*=a.ids.length/previous;
  const troops=living(w,a);if(!troops.length){const king=w.get(a.kingId);if(king)king.commanding=false;c.army=null;continue;}
  a.left-=dt;a.reinforce+=dt;
  if(w.truce>0||a.left<=0||troops.length<Math.max(1,Math.ceil(a.start*.3)))w.retreat(c);
  if(a.returning){returning(w,c,a,dt);continue;}
  resupply(w,c,a,troops,dt);
  if(a.reinforce>=M.reinforceSeconds&&a.operation!=='raid'){
   a.reinforce=0;const pool=recruits(w,c),limit=Math.min(M.maxTroops,Math.floor(w.adults(c).length*M.troopFraction));
   const more=pool.slice(0,Math.max(0,Math.min(limit-troops.length,pool.length-reserve(w,c),3)));
   if(c.food>w.consumption(c)*8)for(const e of more){e.soldier=true;e.inside=false;e.returning=false;e.joining=true;e.order=a.muster;a.ids.push(e.id);w.change('army-reinforced',{country:c.id,personId:e.id});}
  }
  if(a.state==='mustering'){
   a.musterElapsed+=dt;if(invaders.some(e=>distance(e,a.muster)<6))a.muster=safeMuster(w,c);
   const slots=formation(w,c,a.ids,a.muster),ready=troops.filter(e=>distance(e,slots[a.ids.indexOf(e.id)])<1.3).length;
   if(ready>=Math.ceil(troops.length*.8)||a.musterElapsed>=M.musterTimeout){a.state='advancing';w.change('army-departed',{country:c.id});}
  }
  let anchor=a.muster;
  if(a.state!=='mustering'){
   if(a.operation==='liberation')anchor=w.get(military.occupation[c.id]?.ids[0])||nearestWalkable(c,c.id,w.blockers());
   else if(a.operation==='defend')anchor=invaders[0]||nearestWalkable(c,c.id,w.blockers());
   else if(a.operation==='raid')anchor=nearestWalkable(w.islands[1-c.id],1-c.id,w.blockers());
   else if(a.targetSite>=0&&a.targetSite<=2)anchor=military.sites[a.targetSite];
   else anchor=nearestWalkable(w.islands[1-c.id],1-c.id,w.blockers());
   const nearby=troops.filter(e=>distance(e,anchor)<3),contested=w.entities.some(e=>fighting(e)&&e.country!==c.id&&distance(e,anchor)<5);
   if(a.operation==='campaign'&&nearby.length&&!contested){
    if(a.targetSite>=0&&a.targetSite<=2){const site=military.sites[a.targetSite];
     if(site.owner===c.id&&site.built){a.targetSite+=c.id===0?1:-1;a.capture=0;}
     else if(a.rations>0&&c.food>M.siteCost){if(site.claimant!==c.id){site.claimant=c.id;site.progress=0;}site.progress+=dt*Math.min(3,nearby.length)/2;
      if(site.progress>=M.captureSeconds){c.food-=M.siteCost;site.owner=c.id;site.built=true;site.stock=0;site.progress=0;w.change('supply-site-built',{country:c.id,siteId:site.id,x:site.x,y:site.y});}
     }
    }else {a.capture+=dt*Math.min(3,nearby.length)/2;if(a.capture>=M.capitalSeconds)occupy(w,c,a);}
   }
   if(a.operation==='raid'&&nearby.length&&!a.raidDone){const enemy=w.islands[1-c.id],loot=Math.min(enemy.food,troops.length*M.lootPerSoldier);enemy.food-=loot;a.cargo+=loot;a.raidDone=true;
    const house=enemy.buildings.find(b=>b.state==='complete'&&b.kind==='house');if(house){structureDamage(w,house,.1,.6,'raid');w.fires.push({x:house.x,y:house.y,left:C.fireSeconds});}w.change('raid-looted',{country:c.id,victim:enemy.id,food:loot});w.retreat(c);}
   if(a.operation==='liberation'&&!military.occupation[c.id])w.retreat(c);
   if(a.operation==='defend'&&!invaders.length)w.retreat(c);
   if(a.rations<=0&&a.operation==='campaign'&&!w.inPrologue){a.dry=(a.dry||0)+dt;if(a.dry>20)w.retreat(c);}else a.dry=0;
  }
  a.anchor={x:anchor.x,y:anchor.y};
 }
 military.clock-=dt;if(military.clock>0)return;military.clock=M.decisionSeconds;
 for(const c of w.islands){const a=c.army;if(a&&!a.returning)orders(w,c,a,living(w,a),a.anchor||a.muster);
  if(!a&&!w.inPrologue&&w.truce<=0){const king=w.get(c.kingId);if(king&&activeInvaders(w,c).length)startArmy(w,c,king,'defend');
   else if(king&&military.occupation[c.id]&&w.adults(c).length>military.occupation[c.id].ids.length*3)startArmy(w,c,king,'liberation');
   else if(king&&w.supply(c)<M.raidReserveSeconds&&w.islands[1-c.id].food>15)startArmy(w,c,king,'raid');
  }
 }
}
export function soldierAction(w,e,c,dt){
 const a=c.army;
 const beast=w.animals.find(v=>!v.dead&&v.kind==='beast'&&distance(v,e)<3);
 if(beast&&!e.returning){e.action='清理袭击部队的野兽';strike(w,e,beast,dt,C.soldierDamage);return;}
 if(e.garrison){const subject=w.islands[1-c.id],enemy=w.entities.filter(v=>fighting(v)&&v.country!==c.id&&distance(v,e.post||subject)<6).sort((x,y)=>distance(e,x)-distance(e,y))[0];e.action='驻军警戒';if(enemy)strike(w,e,enemy,dt,C.soldierDamage);else w.move(e,e.post,dt,C.soldierSpeed);return;}
 const detached=!a||!a.ids.includes(e.id);
 if(detached){e.returning=true;e.order=nearestWalkable(c,c.id,w.blockers());}
 if(e.returning||a?.returning){e.action='停战返乡';w.move(e,e.order||c,dt,C.soldierSpeed);if(detached&&distance(e,e.order)<1){e.soldier=false;e.returning=false;}return;}
 if(e.joining){e.action='增援集结';w.move(e,a.muster,dt,C.soldierSpeed);if(distance(e,a.muster)<2)e.joining=false;return;}
 const target=w.get(e.targetId);
 if(target&&!target.inside&&!target.returning){e.action='交战中';strike(w,e,target,dt,C.soldierDamage,e.order);}else{e.action=a.state==='mustering'?'城内集结':a.orderState==='regrouping'?'等待队友整队':'列队推进';if(e.order)w.move(e,e.order,dt,C.soldierSpeed);}
}
