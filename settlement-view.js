import * as T from './vendor/three.module.js?build=57b3cd365ae7';
import {FARM_LOTS,PASTURE_LOTS} from './settlement.js?build=57b3cd365ae7';
import {SETTLEMENT as S} from './config.js?build=57b3cd365ae7';
import {groundHeight} from './island-layout.js?build=57b3cd365ae7';
// Bind existing authored models to gameplay slots; no asset transforms are edited.
export class SettlementView {
 constructor(root,scene){
  this.scene=scene;this.originals=new Map();this.templates=new Map();this.baseScale=new WeakMap();this.worldTransforms=new WeakMap();this.ground=new Map();this.clones=new Map();
  const definitions=[FARM_LOTS,PASTURE_LOTS];
  root.traverse(node=>{const name=node.userData.sourceName||node.name;
   for(const [country,lots] of definitions.entries()){const lot=lots.find(b=>b.zone==='house'&&b.sourceNames.includes(name));if(!lot)continue;
    node.userData.gameplayBuilding=true;if(!this.originals.has(lot.id))this.originals.set(lot.id,[]);this.originals.get(lot.id).push(node);this.baseScale.set(node,node.scale.y);this.worldTransforms.set(node,node.matrixWorld.clone());
    if(!lot.special&&!this.templates.has(country))this.templates.set(country,node);
    this.ground.set(lot.id,new T.Box3().setFromObject(node).min.y);
   }
  });
 }
 make(lot,country){
  const template=this.templates.get(country);if(!template)return null;
  const group=new T.Group(),model=template.clone(true);this.worldTransforms.get(template).decompose(model.position,model.quaternion,model.scale);model.visible=true;group.add(model);group.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const fit=Math.min((lot.footprint.max[0]-lot.footprint.min[0])/Math.max(.1,size.x),(lot.footprint.max[1]-lot.footprint.min[1])/Math.max(.1,size.z));
  model.position.sub(new T.Vector3(center.x,box.min.y,center.z));group.scale.setScalar(fit);group.userData.baseFit=fit;
  group.position.set(lot.x,this.ground.get(lot.id)??groundHeight(lot),lot.y);this.scene.add(group);this.clones.set(lot.id,group);return group;
 }
 update(world){
  if(this.world!==world){for(const node of this.clones.values())this.scene.remove(node);this.clones.clear();this.world=world;}
  for(const c of world.islands)for(const lot of c.buildings||[]){if(lot.zone!=='house')continue;
   const visible=lot.state==='complete'||lot.state==='building',growth=lot.state==='complete'?1:Math.max(.05,Math.min(1,lot.progress/S.buildSeconds));
   const original=this.originals.get(lot.id)||[],placeholder=lot.special&&lot.kind==='house';
   for(const node of original){node.visible=visible&&!placeholder;node.scale.y=this.baseScale.get(node)*growth;}
   let clone=this.clones.get(lot.id);
   if(visible&&(placeholder||!original.length))clone??=this.make(lot,c.id);
   if(clone){clone.visible=visible&&(!!placeholder||!original.length);clone.scale.y=clone.userData.baseFit*growth;}
  }
 }
}
