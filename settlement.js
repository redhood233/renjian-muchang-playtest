import {QINGHE,islandId,groundHeight,nearestWalkable} from './island-layout.js?build=a256348c5d71';
import {CONFIG as C,SETTLEMENT as S,HUSBANDRY as H} from './config.js?build=a256348c5d71';

const center = bounds => ({x:(bounds[0][0]+bounds[1][0])/2,y:(bounds[0][1]+bounds[1][1])/2});
const rect = (p,w,h) => ({min:[p.x-w/2,p.y-h/2],max:[p.x+w/2,p.y+h/2]});
const overlaps=(a,b,gap=0)=>a.min[0]<b.max[0]+gap&&a.max[0]>b.min[0]-gap&&a.min[1]<b.max[1]+gap&&a.max[1]>b.min[1]-gap;
const sourceName=o=>o.name.replace(/\.\d{3}$/, '');
export const authoredRoad=o=>/^Path(?: Edge| \|)/.test(o.name)||(o.collections||[]).some(c=>c.startsWith('02 |'));
function fixedLots(){
 const homes=QINGHE.objects.filter(o=>o.name.startsWith('Cottage '));
 const specials=[['Village Hall | MH_Church_01','hall'],['Academy | MH_School_01','academy'],['Granary | MH_Granary_01','granary'],['Windmill | MH_Windmill_02','windmill']];
 const definitions=[...homes.map(o=>[o,'house']),...specials.map(([name,kind])=>[QINGHE.objects.find(o=>sourceName(o)===name),kind]),...QINGHE.objects.filter(o=>/^Wheat Plot \d+$/.test(sourceName(o))).map(o=>[o,'field'])];
 return definitions.filter(([o])=>o).map(([o,kind],i)=>({id:'farm-fixed-'+i,zone:kind==='field'?'field':'house',special:kind==='house'||kind==='field'?null:kind,
  kind:kind==='field'?'field':'house',source:'authored',sourceNames:QINGHE.objects.filter(p=>p.name===o.name||sourceName(p).startsWith(sourceName(o)+'_')||(kind==='field'&&p.name.startsWith('Wheat '+String(Number(sourceName(o).slice(-2))+1).padStart(2,'0')+' |'))).map(p=>p.name),
  ...center(o.bounds),footprint:{min:o.bounds[0].slice(0,2),max:o.bounds[1].slice(0,2),baseY:o.bounds[0][2]},state:'planned',progress:0,clearProgress:0,workers:[],upgradeProgress:0}));
}
// Source scene coordinates are read-only. Houses extend north; fields extend south.
// All authored footprints and roads stay reserved even before their buildings exist.
function extensionLots(authored,country=0){
 const reserved=[...QINGHE.obstacles,...QINGHE.objects.filter(authoredRoad).map(o=>({min:o.bounds[0].slice(0,2),max:o.bounds[1].slice(0,2)})),...authored.map(l=>l.footprint)];
 const lots=[];
 for(const [zone,area] of Object.entries(country===0?S.expansion:S.pastureExpansion)){
  let serial=0;
  for(let y=area.minY;y<=area.maxY+.001;y+=area.spacing)for(let x=area.minX;x<=area.maxX+.001;x+=area.spacing){
   const p={x,y},r=rect(p,area.size,area.size);
   const probes=[p];
   for(const xx of [r.min[0],r.max[0]])for(const yy of [r.min[1],r.max[1]])probes.push({x:xx,y:yy});
   if(probes.some(q=>islandId(q)!==country||groundHeight(q)<-.12)||reserved.some(o=>overlaps(r,o,.35)))continue;
   if(!nearestWalkable(p,country))continue;
   lots.push({id:`${country?'pasture':'farm'}-${zone}-extension-${++serial}`,zone,kind:zone==='house'?'house':zone,source:'extension',sourceNames:[],...p,footprint:r,state:'planned',progress:0,clearProgress:0,workers:[],upgradeProgress:0,special:null});
   reserved.push(r);
  }
 }
 return lots;
}
const radial=(lots,id)=>lots.sort((a,b)=>(a.source==='extension')-(b.source==='extension')||Math.hypot(a.x-QINGHE.centers[id].x,a.y-QINGHE.centers[id].y)-Math.hypot(b.x-QINGHE.centers[id].x,b.y-QINGHE.centers[id].y)||a.id.localeCompare(b.id));
const authored=fixedLots();
export const FARM_LOTS=Object.freeze(radial([...authored,...extensionLots(authored)],0).map(l=>Object.freeze(l)));
const pastoralFixed=QINGHE.objects.filter(o=>o.name.startsWith('牧场建筑 | ')).map((o,i,all)=>({id:'pasture-fixed-'+i,zone:'house',special:i===all.length-1?'academy':i===all.length-2?'granary':i===all.length-3?'hall':null,kind:'house',source:'authored',sourceNames:[o.name],...center(o.bounds),footprint:{min:o.bounds[0].slice(0,2),max:o.bounds[1].slice(0,2),baseY:o.bounds[0][2]},state:'planned',progress:0,clearProgress:0,workers:[],upgradeProgress:0}));
const penLots=H.pens.map((p,i)=>({id:p.id,zone:'pasture',special:null,kind:'pasture',source:'authored',sourceNames:[],x:p.x,y:p.y,footprint:rect(p,2,2),state:'planned',progress:0,clearProgress:0,workers:[],upgradeProgress:0}));
export const PASTURE_LOTS=Object.freeze(radial([...pastoralFixed,...penLots,...extensionLots([...pastoralFixed,...penLots],1)],1).map(l=>Object.freeze(l)));
export function initSettlement(w,c){
 c.buildings=structuredClone(c.id===0?FARM_LOTS:PASTURE_LOTS);c.buildCheck=0;c.research=0;
 for(const zone of ['house',c.id===0?'field':'pasture'])for(const lot of c.buildings.filter(l=>l.zone===zone&&l.source==='authored').slice(0,zone==='house'?S.initialHouses:c.id===0?S.initialFields:1))lot.state='complete';
}
export const complete=(c,kind)=>c.buildings?.filter(b=>b.state==='complete'&&b.kind===kind)||[];
export const housing=c=>complete(c,'house').filter(b=>!b.upgrading).length*S.houseCapacity;
export function nextLot(c,zone){
 const distance=b=>Math.hypot(b.x-c.x,b.y-c.y),near=(a,b)=>distance(a)-distance(b)||a.id.localeCompare(b.id);
 const authored=c.buildings.filter(b=>b.zone===zone&&b.source==='authored').sort(near);
 return authored.find(b=>b.state==='planned')||(!authored.some(b=>b.state!=='complete')?c.buildings.filter(b=>b.zone===zone&&b.source==='extension'&&b.state==='planned').sort(near)[0]:undefined);
}
export function builders(w,c){const active=c.buildings?.find(b=>b.state==='clearing'||b.state==='building');return active?active.workers.filter(id=>w.get(id)&&w.available(w.get(id))):[];}
export function advanceSettlement(w,c,dt){
 for(const b of c.buildings){b.health??=1;if(b.state==='complete'&&b.health<1&&c.food>w.consumption(c)*8&&w.workers(c).length>1){const cost=Math.min(1-b.health,dt*.03);c.food=Math.max(0,c.food-cost);b.health+=cost;}}
 let job=c.buildings.find(b=>b.state==='clearing'||b.state==='building'||b.upgrading);
 if(job){
  const eligible=w.adults(c).filter(e=>w.available(e)&&e.role==='civilian');
  // Retain the assigned worker; replacing them each tick prevents arrival.
  const retained=(job.workers||[]).filter(id=>eligible.some(e=>e.id===id));
  job.workers=[...retained,...eligible.filter(e=>!retained.includes(e.id)).sort((a,b)=>Math.hypot(a.x-job.x,a.y-job.y)-Math.hypot(b.x-job.x,b.y-job.y)||a.id-b.id).map(e=>e.id)].slice(0,S.builders);
  for(const id of job.workers)w.get(id).workSite=job.id;
  const threat=w.animals.find(a=>!a.dead&&a.kind==='beast'&&Math.hypot(a.x-job.x,a.y-job.y)<S.beastBlockRadius);
  if(threat)for(const id of job.workers){const worker=w.get(id);w.move(worker,threat,dt,2);if(Math.hypot(worker.x-threat.x,worker.y-threat.y)<1.4&&worker.attack<=0){w.damage(threat,S.huntDamage,'hunting');worker.attack=S.huntInterval;}}
  const at=nearestWalkable(job,c.id,w.blockers());
  const arrived=[];
  if(!threat&&at)for(const id of job.workers){const worker=w.get(id);worker.inside=false;w.move(worker,at,dt,S.workerSpeed);if(Math.hypot(worker.x-at.x,worker.y-at.y)<=S.workReach)arrived.push(id);worker.action=arrived.includes(id)?'现场施工':'前往工地';}
  if(job.upgrading){
   if(!threat&&arrived.length&&w.housing(c)>=w.humans(c.id).length)job.upgradeProgress+=dt;
   if(job.upgradeProgress>=S.upgradeSeconds){job.kind=job.special;job.upgrading=false;job.workers=[];w.change('building-promoted',{country:c.id,buildingId:job.id,kind:job.kind,placeholder:'house'});job=null;}
  }else if(arrived.length&&!threat){
   const key=job.state==='clearing'?'clearProgress':'progress';job[key]+=dt*arrived.length/S.builders;
   for(const id of job.workers){const e=w.get(id);e.workSite=job.id;}
   if(job.state==='clearing'&&job.clearProgress>=S.clearSeconds){job.state='building';w.change('construction-started',{country:c.id,buildingId:job.id});}
   if(job.state==='building'&&job.progress>=S.buildSeconds){job.state='complete';job.health=1;job.workers=[];w.change('construction-completed',{country:c.id,buildingId:job.id,kind:job.kind});job=null;}
  }
 }
 for(const e of w.humans(c.id))if(e.workSite&&!job?.workers.includes(e.id))e.workSite=null;
 c.buildCheck-=dt;if(c.buildCheck>0||job||!w.humans(c.id).length)return;c.buildCheck=S.planInterval;
 const pop=w.humans(c.id).length,capacity=w.housing(c),workers=w.workers(c).length;
 const spareForSpecial=c.buildings.some(b=>b.state==='complete'&&b.kind==='house'&&b.special&&pop>=S.specials[b.special].population&&w.production(c)>=w.consumption(c)*S.specials[b.special].productionMargin&&w.supply(c)>=S.specials[b.special].reserveSeconds&&capacity-S.houseCapacity<pop);
 const needsHomes=pop>=capacity*S.houseBuildOccupancy&&(capacity<w.populationLimit||spareForSpecial&&capacity<pop+S.houseCapacity);
 const fieldCapacity=complete(c,'field').length*S.workersPerField;
 const needsFields=c.id===0&&fieldCapacity<workers&&(fieldCapacity*C.foodRate*w.climate(c).field<w.consumption(c)*S.foodMargin||w.supply(c)<S.foodReserveSeconds);
 // Replace a reserved placeholder in place only when its beds can be spared.
 for(const b of c.buildings.filter(b=>b.state==='complete'&&b.kind==='house'&&b.special)){
  const threshold=S.specials[b.special];
  if(pop<threshold.population||capacity-S.houseCapacity<pop||w.production(c)<w.consumption(c)*threshold.productionMargin||w.supply(c)<threshold.reserveSeconds)continue;
  if(c.food<threshold.cost+w.consumption(c)*S.buildReserveSeconds||workers<=S.builders)continue;
  c.food-=threshold.cost;b.upgrading=true;b.workers=[];for(const e of w.humans(c.id))if(e.houseId===b.id){e.houseId=null;e.inside=false;}w.change('building-upgrade-started',{country:c.id,buildingId:b.id,kind:b.special});return;
 }
 const flock=w.animals.filter(a=>a.kind==='sheep'&&!a.dead).length,penCapacity=complete(c,'pasture').length*32;
 const needsPasture=c.id===1&&(flock>=penCapacity*.7||penCapacity<Math.ceil(w.consumption(c)*3));
 const lot=nextLot(c,needsHomes?'house':needsFields?'field':needsPasture?'pasture':'');
 if(lot&&workers>S.builders&&c.food>=S.buildFood+w.consumption(c)*S.buildReserveSeconds){
  c.food-=S.buildFood;lot.state=lot.source==='extension'?'clearing':'building';lot.progress=0;lot.clearProgress=0;
  w.change('construction-planned',{country:c.id,buildingId:lot.id,source:lot.source,x:lot.x,y:lot.y});
 }
}
export function settlementSnapshot(c){return(c.buildings||[]).map(b=>({id:b.id,country:c.id,kind:b.kind,zone:b.zone,source:b.source,sourceNames:[...b.sourceNames],promotionTarget:b.special,x:b.x,y:b.y,state:b.state,health:b.health??1,progress:Math.min(1,b.progress/S.buildSeconds),clearProgress:Math.min(1,b.clearProgress/S.clearSeconds),upgrading:!!b.upgrading,upgradeProgress:Math.min(1,b.upgradeProgress/S.upgradeSeconds),footprint:structuredClone(b.footprint)}));}
