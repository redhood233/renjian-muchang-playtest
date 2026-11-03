import * as T from './vendor/three.module.js?build=ae7840b412f1';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js?build=ae7840b412f1';
import {ERA_BUILDINGS as E} from './config.js?build=ae7840b412f1';
// TEMPORARY: port of Godot world_view.gd _draw_era_building / agriculture.
// Provenance and replacement slots: assets/temporary/era-buildings/manifest.json.
const replacements=new Map();
export function registerEraBuilding(era,kind,factory){replacements.set(`${era}:${kind}`,factory);}
export function eraBuildingFactory(era,kind){return replacements.get(`${era}:${kind}`)||prototype;}
export const eraResourceId=(era,kind)=>`temp.godot-era.${era===1?'modern':'future'}.${kind}`;
function prototype({era,kind,country}){
 const pieces=[],p=E.palettes,light=era===2?p.light:p.glass;
 const add=(geometry,color,x,y,z,rx=0)=>{geometry.rotateX(rx);geometry.translate(x,y,z);const g=geometry.index?geometry.toNonIndexed():geometry,colors=new Float32Array(g.attributes.position.count*3),c=new T.Color(color);for(let i=0;i<colors.length;i+=3)c.toArray(colors,i);g.setAttribute('color',new T.BufferAttribute(colors,3));pieces.push(g);if(g!==geometry)geometry.dispose();};
 const box=(x,y,z,w,h,d,color,rx=0)=>add(new T.BoxGeometry(w,h,d),color,x,y,z,rx);
 if(kind==='field'||kind==='pasture'){
  box(.22,.16,-.15,.32,.24,.4,era===2?p.steel:p.foundation);box(.22,.37,-.12,.23,.21,.22,p.glass);
  for(const x of [.03,.41])for(const z of [-.31,.02])add(new T.OctahedronGeometry(.085),p.foundation,x,.09,z);
  box(0,.06,-.38,.84,.045,.055,p.steel);
  if(era===2){box(.22,.51,-.12,.4,.035,.33,p.light);box(-.28,.18,-.15,.14,.3,.14,p.steel);box(-.28,.36,-.15,.2,.05,.2,p.light);}
 }else{
  const height=kind==='house'?E.heights[era]:E.specialHeights[era];
  box(0,.04,0,1,.08,1,p.foundation);box(0,height/2+.08,0,.92,height,.92,era===1?p.wall:p.steel);
  box(0,height+.12,0,1,.1,1,era===1?(country?p.pastureRoof:p.farmRoof):p.wall);
  for(let floor=0;floor<(era===1?2:3);floor++)for(const x of [-.23,.23])for(const z of [-.465,.465])box(x,.35+floor*height/3,z,.23,.18,.026,light);
  box(0,.26,.47,.24,.36,.03,era===1?p.wood:p.glass);
  if(era===1)box(.25,height+.3,-.25,.17,.35,.18,p.foundation);
  else {box(0,height+.23,0,.7,.08,.7,p.light);box(0,height+.4,0,.055,.3,.055,p.glass);}
  if(kind==='academy'){box(-.14,height+.39,0,.27,.24,.07,p.wall, -.1);box(.14,height+.39,0,.27,.24,.07,p.wall,.1);box(0,height+.4,.04,.025,.27,.05,p.glass);}
  if(kind==='granary')for(const x of [-.28,.28])add(new T.CylinderGeometry(.16,.16,.36,8),p.wall,x,height+.35,0);
  if(kind==='hall')box(0,height+.33,0,.48,.15,.25,country?p.pastureRoof:p.farmRoof);
  if(kind==='windmill'){box(0,height+.42,0,.08,.55,.08,p.steel);box(0,height+.64,0,.7,.06,.06,p.light);}
 }
 const mesh=new T.Mesh(mergeGeometries(pieces),new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));for(const g of pieces)g.dispose();mesh.castShadow=mesh.receiveShadow=true;const root=new T.Group();root.add(mesh);return root;
}
export class EraBuildingView{
 constructor(scene){this.scene=scene;this.models=new Map();}
 remove(id){const record=this.models.get(id);if(!record)return;this.scene.remove(record.root);const materials=new Set(record.materials);record.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const m of materials)m.dispose();this.models.delete(id);}
 clear(){for(const id of [...this.models.keys()])this.remove(id);}
 update(lot,c,{visible,growth,y,prepare,tint}){
  const era=c.era||0,kind=lot.kind,factory=eraBuildingFactory(era,kind),key=`${era}:${kind}`;let record=this.models.get(lot.id);
  if(!era||!visible){this.remove(lot.id);return;}
  if(record&&(record.key!==key||record.factory!==factory)){this.remove(lot.id);record=null;}
  if(!record){const root=factory({era,kind,country:c.id,lot}),materials=[];root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
   const fit=Math.min((lot.footprint.max[0]-lot.footprint.min[0])/Math.max(.01,size.x),(lot.footprint.max[1]-lot.footprint.min[1])/Math.max(.01,size.z));
   const holder=new T.Group();root.position.sub(new T.Vector3(centre.x,bounds.min.y,centre.z));holder.add(root);holder.position.set(lot.x,y,lot.y);holder.scale.setScalar(fit);holder.userData={resourceId:root.userData.resourceId||eraResourceId(era,kind),temporary:root.userData.temporary??!replacements.get(`${era}:${kind}`),era,kind,country:c.id,buildingId:lot.id,entity:{kind:'building',country:c.id,buildingId:lot.id}};
   root.traverse(o=>{if(o.isMesh)materials.push(...(Array.isArray(o.material)?o.material:[o.material]));});record={root:holder,key,factory,materials,fit};this.models.set(lot.id,record);this.scene.add(holder);tint(holder);prepare?.(holder);
  }else tint(record.root);
  record.root.scale.y=record.fit*growth;
 }
}
