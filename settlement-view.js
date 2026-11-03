import * as T from './vendor/three.module.js?build=b210d042c6ea';
import {FARM_LOTS,PASTURE_LOTS} from './settlement.js?build=b210d042c6ea';
import {GEOGRAPHY as G,SETTLEMENT as S} from './config.js?build=b210d042c6ea';
import {groundHeight} from './island-layout.js?build=b210d042c6ea';
// Bind existing authored models to gameplay slots; no asset transforms are edited.
export class SettlementView {
 constructor(root,scene){
  this.scene=scene;this.originals=new Map();this.templates=new Map();this.baseScale=new WeakMap();this.worldTransforms=new WeakMap();this.ground=new Map();this.clones=new Map();
  this.abandoned=new WeakMap();
  const definitions=[FARM_LOTS,PASTURE_LOTS];
  root.traverse(node=>{const name=node.userData.sourceName||node.name;
   for(const [country,lots] of definitions.entries()){const lot=lots.find(b=>b.zone==='house'&&b.sourceNames.includes(name));if(!lot)continue;
    // Shrink every component around the same authored building centre/foot.
    const box=new T.Box3().setFromObject(node),anchor=new T.Vector3(lot.x,lot.footprint.baseY??box.min.y,lot.y);
    const at=node.getWorldPosition(new T.Vector3()).sub(anchor).multiplyScalar(G.buildingScale).add(anchor);
    node.parent.worldToLocal(at);node.position.copy(at);node.scale.multiplyScalar(G.buildingScale);node.updateMatrixWorld(true);
    node.userData.gameplayBuilding=true;if(!this.originals.has(lot.id))this.originals.set(lot.id,[]);this.originals.get(lot.id).push(node);this.baseScale.set(node,node.scale.y);this.worldTransforms.set(node,node.matrixWorld.clone());
    if(!lot.special&&!this.templates.has(country))this.templates.set(country,node);
    this.ground.set(lot.id,new T.Box3().setFromObject(node).min.y);
   }
  });
 }
 tint(root,empty){
  let state=this.abandoned.get(root);if(!state){state={value:0};this.abandoned.set(root,state);root.traverse(o=>{if(!o.isMesh)return;const copy=source=>{const m=source.clone(),before=source.onBeforeCompile,key=source.customProgramCacheKey();m.userData.abandonmentOwned=true;m.onBeforeCompile=(shader,renderer)=>{before.call(m,shader,renderer);shader.uniforms.abandoned=state;if(!shader.fragmentShader.includes('uniform float abandoned;')){shader.fragmentShader='uniform float abandoned;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.299,.587,.114))*.58),abandoned);');}};m.customProgramCacheKey=()=>key+'|abandoned';return m;};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});}
  state.value=empty?1:0;
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
  if(this.world!==world){for(const node of this.clones.values()){this.scene.remove(node);node.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.abandonmentOwned)m.dispose();});}this.clones.clear();this.world=world;}
  for(const c of world.islands)for(const lot of c.buildings||[]){if(lot.zone!=='house')continue;
   const visible=lot.state==='complete'||lot.state==='building',growth=lot.state==='complete'?1:Math.max(.05,Math.min(1,lot.progress/S.buildSeconds));
   const original=this.originals.get(lot.id)||[],placeholder=lot.special&&lot.kind==='house';
   const empty=world.humans(c.id).length===0;
   for(const node of original){node.visible=visible&&!placeholder;node.scale.y=this.baseScale.get(node)*growth;this.tint(node,empty);}
   let clone=this.clones.get(lot.id);
   if(visible&&(placeholder||!original.length))clone??=this.make(lot,c.id);
   if(clone){clone.visible=visible&&(!!placeholder||!original.length);clone.scale.y=clone.userData.baseFit*growth;this.tint(clone,empty);}
  }
 }
}
