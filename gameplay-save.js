import {HUSBANDRY as H} from './config.js?build=fa5b535c1d7e';
import {FARM_LOTS,PASTURE_LOTS} from './settlement.js?build=fa5b535c1d7e';
const finite=(v,min=0)=>Number.isFinite(v)&&v>=min;
export function validGameplayState(s){
 if(s.social&&(!Array.isArray(s.social.messages)||s.social.messages.length>80||!Array.isArray(s.social.parties)||s.social.parties.length>2||!Number.isSafeInteger(s.social.readId)||s.social.readId<0||s.social.messages.some(m=>!Number.isSafeInteger(m.id)||typeof m.text!=='string'||m.text.length>500)||s.social.parties.some(p=>!Array.isArray(p.ids)||!Array.isArray(p.slots)||p.ids.length!==p.slots.length||!Array.isArray(p.attended)||!Number.isFinite(p.left)||p.slots.some(q=>!Number.isFinite(q.x)||!Number.isFinite(q.y)))))return false;

 if(!s.life||!Array.isArray(s.life.drops)||!Array.isArray(s.life.shipments)||!Array.isArray(s.life.burned)||[...s.life.drops,...s.life.shipments].some(d=>!Number.isFinite(d.x)||!Number.isFinite(d.y)||!finite(d.food)||!finite(d.left))||s.islands.some(c=>!c.volcano||!Number.isFinite(c.volcano.x)||!Number.isFinite(c.volcano.y)))return false;
 if(!Array.isArray(s.animals)||!Array.isArray(s.islands?.[0]?.buildings)||!Array.isArray(s.islands?.[1]?.pens)||!Number.isInteger(s.navRevision)||s.navRevision<0||!Array.isArray(s.beastBirthCredit)||s.beastBirthCredit.length!==2||!s.beastBirthCredit.every(v=>finite(v)))return false;
 if(!Number.isSafeInteger(s.serial)||s.serial<Math.max(0,...s.entities.map(e=>e.id),...s.animals.map(a=>a.id)))return false;
 for(const e of s.entities){if(!['civilian','king','scholar'].includes(e.role)||!['joy','rage','wounded','appetite'].every(key=>finite(e[key])))return false;
  if(e._route&&(!Number.isSafeInteger(e._route.key)||!Number.isSafeInteger(e._route.revision)||!Array.isArray(e._route.nodes)||e._route.nodes.length>1000||e._route.nodes.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))))return false;
 }
 for(const c of s.islands){const definitions=c.id===0?FARM_LOTS:PASTURE_LOTS,lots=c.buildings;
 if(!Array.isArray(lots)||lots.length!==definitions.length||new Set(lots.map(b=>b.id)).size!==lots.length)return false;
 for(const b of lots){const expected=definitions.find(l=>l.id===b.id);
  if(!expected||b.x!==expected.x||b.y!==expected.y||b.zone!==expected.zone||b.source!==expected.source||!['planned','clearing','building','complete'].includes(b.state)||!(b.zone==='field'?['field']:b.zone==='pasture'?['pasture']:expected.special?['house',expected.special]:['house']).includes(b.kind)||!finite(b.health??1)||b.health>1||!finite(b.progress)||!finite(b.clearProgress)||!finite(b.upgradeProgress)||!Array.isArray(b.workers))return false;
  for(const key of ['min','max'])if(!Array.isArray(b.footprint?.[key])||b.footprint[key].some((v,i)=>v!==expected.footprint[key][i])||b.footprint[key].length!==2)return false;
 }
 if(c.cityCenter&&c.cityCenter.buildingId!==lots.find(b=>b.special==='hall')?.id)return false;
 if(!finite(c.research)||c.research>85||![0,1,2].includes(c.era)||!finite(c.panic)||c.panic>1||!finite(c.faith)||c.faith>100)return false;
 if(!c.project||!['locked','building','paused','complete'].includes(c.project.state)||!finite(c.project.progress)||typeof c.project.paid!=='boolean')return false;
 if(c.shrine&&(!Number.isFinite(c.shrine.x)||!Number.isFinite(c.shrine.y)||c.shrine.offerings!==undefined&&(!Number.isInteger(c.shrine.offerings)||c.shrine.offerings<0)))return false;
 if(!c.shrine||!['none','building','repairing','complete'].includes(c.shrine.state)||!finite(c.shrine.health)||!finite(c.shrine.progress)||!finite(c.shrine.offering))return false;
 const homes=new Map();for(const e of s.entities.filter(e=>e.country===c.id&&e.kind==='human')){if(!finite(e.age)||typeof e.inside!=='boolean')return false;
  if(e.houseId!==null){const home=lots.find(b=>b.id===e.houseId);if(!home||home.state!=='complete'||home.kind!=='house'||home.upgrading)return false;homes.set(e.houseId,(homes.get(e.houseId)||0)+1);if(homes.get(e.houseId)>5)return false;}
  if(e.inside&&!e.houseId)return false;
 }
 if(c.army){const a=c.army;if(!Array.isArray(a.ids)||!a.ids.length||new Set(a.ids).size!==a.ids.length||a.ids.some(id=>!s.entities.some(e=>e.id===id&&e.country===c.id&&e.soldier))||!['campaign','raid','defend','liberation'].includes(a.operation)||!finite(a.rations)||!finite(a.cargo)||!finite(a.musterElapsed)||!finite(a.reinforce))return false;
  if(a.front&&(!Number.isFinite(a.front.x)||!Number.isFinite(a.front.y)))return false;
  if(a.heading&&(!Number.isFinite(a.heading.x)||!Number.isFinite(a.heading.y)))return false;
  if(a.orderState&&!['mustering','marching','regrouping','engaging'].includes(a.orderState))return false;
  if(a.front?._route){const r=a.front._route;if(!Number.isSafeInteger(r.key)||!Number.isSafeInteger(r.revision)||!Array.isArray(r.nodes)||r.nodes.length>1000||r.nodes.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;}
 }
 }
 if(!s.session||!['challenge','sandbox'].includes(s.session.mode)||!finite(s.session.seconds,.001)||!finite(s.session.souls,1))return false;
 const m=s.military;if(!m||!Array.isArray(m.sites)||m.sites.length!==3||!Array.isArray(m.occupation)||m.occupation.length!==2)return false;
 for(const p of m.sites)if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||![null,0,1].includes(p.owner)||!finite(p.stock)||!finite(p.progress))return false;
 for(const [subject,o] of m.occupation.entries())if(o&&(![0,1].includes(o.owner)||o.owner===subject||!Array.isArray(o.ids)||new Set(o.ids).size!==o.ids.length||o.ids.some(id=>!s.entities.some(e=>e.id===id&&e.country===o.owner&&e.garrison))))return false;
 if(JSON.stringify(s.islands[1].pens)!==JSON.stringify(H.pens))return false;
 for(const c of s.islands)if(!['warIntent','exhaustion','unrest','leaderVacancy','scholarClock'].every(k=>finite(c[k],k==='scholarClock'?-1:0))||c.exhaustion>100||c.kingId!==null&&!Number.isSafeInteger(c.kingId))return false;
 return true;
}
