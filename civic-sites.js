import {nearestWalkable,walkable,islandId} from './island-layout.js?build=fa5b535c1d7e';
import {CIVILIZATION as V} from './config.js?build=fa5b535c1d7e';
export const cityHall=c=>c.buildings?.find(b=>b.special==='hall');
export function establishCity(c){const hall=cityHall(c);if(!hall)return;hall.kind='hall';hall.state='complete';hall.health=1;c.cityCenter={buildingId:hall.id};}
export function kingPost(w,c){const hall=cityHall(c);return nearestWalkable(hall?{x:hall.x,y:hall.footprint.max[1]+V.kingPostOffset}:c,c.id,w.blockers());}
export function schoolPost(w,c,school,id){return nearestWalkable({x:school.x+(id%3-1)*.7,y:school.footprint.max[1]+.75},c.id,w.blockers());}
export function shrinePost(w,c){return nearestWalkable({x:c.shrine.x,y:c.shrine.y+V.shrineApproach},c.id,w.blockers());}
export function shrineSite(w,c){
 const reserved=(c.buildings||[]).map(b=>b.footprint),base={x:c.x,y:c.y-4},r=.9;
 for(let ring=0;ring<=6;ring++)for(let j=0;j<(ring?12:1);j++){
  const p={x:base.x+Math.cos(j*Math.PI/6)*ring,y:base.y+Math.sin(j*Math.PI/6)*ring};
  if(islandId(p)!==c.id||reserved.some(b=>p.x+r>b.min[0]&&p.x-r<b.max[0]&&p.y+r>b.min[1]&&p.y-r<b.max[1]))continue;
  if([[0,0],[r,r],[-r,r],[r,-r],[-r,-r]].every(([x,y])=>walkable({x:p.x+x,y:p.y+y},w.blockers())))return p;
 }
 return nearestWalkable(base,c.id,w.blockers());
}
