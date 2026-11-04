import * as T from './vendor/three.module.js?build=b9a20aa89d31';
import {groundHeight} from './island-layout.js?build=b9a20aa89d31';
const replacements=new Map(),box=new T.BoxGeometry(1,1,1),spark=new T.OctahedronGeometry(1);
const materials=new Map();
const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshBasicMaterial({color,toneMapped:false}));return materials.get(color);};
// Register before creating residents. Each returned model must be an independent instance.
export function registerWeaponModel(kind,factory){replacements.set(kind,factory);}
export function createWeapon(kind){if(replacements.has(kind))return replacements.get(kind)();const root=new T.Group();root.userData={resourceId:'temp.weapon.'+kind,temporary:true};
 const part=(x,y,z,w,h,d,color)=>{const m=new T.Mesh(box,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);};
 if(kind==='sword'){part(0,0,.5,.09,.045,.8,'#c9d2d4');part(0,0,.07,.35,.07,.07,'#c7a86a');part(0,0,-.08,.07,.08,.25,'#73523d');}
 else{part(0,.05,.23,.17,.19,.64,kind==='laser'?'#688a9a':'#4c5050');part(0,.08,.68,.065,.065,.35,kind==='laser'?'#87e4f4':'#363b3b');part(0,-.13,.15,.09,.25,.11,'#555148');part(0,.12,-.2,.15,.17,.32,kind==='laser'?'#a4b9c6':'#866348');if(kind==='laser')part(0,.18,.28,.18,.025,.35,'#80e6f4');}
 return root;
}
export class CombatEffects{
 constructor(scene){this.scene=scene;this.pool=[];this.active=[];this.seen=new WeakSet();}
 clear(){for(const root of this.pool)root.visible=false;this.active=[];this.seen=new WeakSet();this.world=null;}
 update(world){if(this.world!==world){this.clear();this.world=world;}for(const e of world.visualEvents||[])if(e.id==='actor-hit'&&e.from&&!this.seen.has(e)){this.seen.add(e);this.active.push(e);}this.active=this.active.filter(e=>world.time>=e.time&&world.time-e.time<.22).slice(-128);
  for(const root of this.pool)root.visible=false;
  for(const [i,e] of this.active.entries()){let root=this.pool[i];if(!root){root=new T.Group();root.add(new T.Mesh(box),new T.Mesh(spark));this.scene.add(root);this.pool.push(root);}root.visible=true;const [trail,flash]=root.children,t=world.time-e.time,laser=e.weapon==='laser',melee=e.weapon==='sword',color=laser?'#77e9ff':melee?'#f6e1b5':'#ffd399';trail.material=flash.material=material(color);
   const from=new T.Vector3(e.from.x,groundHeight(e.from)+.9,e.from.y),to=new T.Vector3(e.x,groundHeight(e)+.9,e.y),delta=to.clone().sub(from),length=delta.length();
   if(melee){trail.visible=false;flash.position.copy(to);flash.scale.setScalar(.18*(1-t/.22));flash.rotation.set(t*18,t*12,t*9);}
   else {trail.visible=true;const progress=Math.min(1,t/.12),tail=laser?0:Math.max(0,progress-.22),start=from.clone().addScaledVector(delta,tail),end=from.clone().addScaledVector(delta,laser?1:progress);trail.position.copy(start).lerp(end,.5);trail.lookAt(end);trail.scale.set(laser?.055:.035,laser?.055:.035,Math.max(.02,length*(laser?1:progress-tail)));flash.position.copy(t<.06?from:to);flash.scale.setScalar(t<.06?.12:.08);}
  }
 }
}
