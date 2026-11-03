import * as T from './vendor/three.module.js?build=bf17b8d54899';
import {ARMY_PRESENTATION as P} from './config.js?build=bf17b8d54899';
import {groundHeight,walkable} from './island-layout.js?build=bf17b8d54899';
const factories=new Map();
// Art interface: factory({era,country,color}) => Object3D. Local +Z faces
// forward; origin is ground level. Models are cosmetic, never extra soldiers.
export function registerArmyModel(era,factory){factories.set(era,factory);}
export function armyBearer(w,c){const a=c.army;if(!a||a.returning)return null;return a.ids.map(id=>w.get(id)).find(e=>e?.soldier&&!e.garrison&&!e.returning&&!e.joining)||null;}
function prototype({era,color}){
 const g=new T.Group(),materials=[];const material=c=>{const m=new T.MeshStandardMaterial({color:c,roughness:1,flatShading:true});materials.push(m);return m;},team=material(color),dark=material('#343f43'),light=material('#e1d5a7');
 const add=(geo,m,x,y,z)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
 if(era===0){add(new T.CylinderGeometry(.035,.045,2.5,5),dark,0,1.25,0);add(new T.BoxGeometry(.85,.62,.035),team,.39,2.1,0);add(new T.ConeGeometry(.09,.22,4),light,0,2.62,0);}
 else if(era===1){add(new T.BoxGeometry(1.05,.48,1.7),team,0,.54,0);add(new T.BoxGeometry(.92,.55,.8),dark,0,1.03,-.12);for(const x of [-.56,.56])for(const z of [-.56,.56]){const wheel=add(new T.CylinderGeometry(.25,.25,.14,8),dark,x,.3,z);wheel.rotation.z=Math.PI/2;}for(const x of [-.34,.34])add(new T.BoxGeometry(.18,.15,.05),light,x,.57,.88);}
 else {add(new T.OctahedronGeometry(.6,0),team,0,0,0);for(const x of [-.7,.7])for(const z of [-.55,.55]){add(new T.BoxGeometry(.9,.05,.12),dark,x,0,z);const rotor=add(new T.CylinderGeometry(.3,.3,.035,8),light,x,.08,z);rotor.name='rotor';}add(new T.BoxGeometry(.16,.08,.18),light,0,-.45,.3);}
 g.userData.ownedMaterials=materials;return g;
}
export class ArmyStandards{
 constructor(scene){this.scene=scene;this.nodes=new Map();}
 clear(){for(const root of this.nodes.values()){this.scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}this.nodes.clear();}
 update(w){
  for(const c of w.islands){const e=armyBearer(w,c),key=c.id,era=c.era||0;let root=this.nodes.get(key);
   if(root&&(!e||root.userData.era!==era||root.userData.factory!==(factories.get(era)||prototype))){this.scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.nodes.delete(key);root=null;}
   if(!e)continue;
   if(!root){root=new T.Group();const model=(factories.get(era)||prototype)({era,country:c.id,color:P.colors[c.id]});model.scale.setScalar(P.scales[era]);root.add(model);root.userData.era=era;root.userData.factory=factories.get(era)||prototype;root.userData.model=model;root.userData.entity={kind:'army-standard',country:c.id};this.nodes.set(key,root);this.scene.add(root);}
   const a=c.army,h=a.heading||{x:c.id?-1:1,y:0},len=Math.hypot(h.x,h.y)||1,dx=h.x/len,dy=h.y/len;
   const offset=era===0?.35:era===1?P.carLead:0,point=era===0?{x:e.x+dy*offset,y:e.y-dx*offset}:{x:e.x+dx*offset,y:e.y+dy*offset};
   if(!walkable(point,w.blockers())){point.x=e.x;point.y=e.y;}
   root.position.set(point.x,groundHeight(point)+(era===2?P.droneHeight:0),point.y);root.rotation.y=Math.atan2(dx,dy);root.userData.entity.carrierId=e.id;root.userData.carrier=e;root.userData.heading={x:dx,y:dy};
   root.userData.model.userData.update?.(w.time,{carrier:e,army:a});
   if(era===2)root.userData.model.traverse(o=>{if(o.name==='rotor')o.rotation.y=w.time*16;});
  }
 }
}
