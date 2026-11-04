import {EraBuildingView} from './era-building-models.js?build=fa5b535c1d7e';
import * as T from './vendor/three.module.js?build=fa5b535c1d7e';
import {FARM_LOTS,PASTURE_LOTS} from './settlement.js?build=fa5b535c1d7e';
import {GEOGRAPHY as G,SETTLEMENT as S} from './config.js?build=fa5b535c1d7e';
import {groundHeight,buildingPlacement} from './island-layout.js?build=fa5b535c1d7e';
// Bind existing authored models to gameplay slots; no asset transforms are edited.
export class SettlementView {
 constructor(root,scene){
  this.scene=scene;this.originals=new Map();this.templates=new Map();this.baseScale=new WeakMap();this.worldTransforms=new WeakMap();this.ground=new Map();this.clones=new Map();
  this.abandoned=new WeakMap();this.eraBuildings=new EraBuildingView(scene);
  const definitions=[FARM_LOTS,PASTURE_LOTS];
  root.traverse(node=>{const name=node.userData.sourceName||node.name;
   for(const [country,lots] of definitions.entries()){const lot=lots.find(b=>b.zone==='house'&&b.sourceNames.includes(name));if(!lot)continue;
    // Shrink every component around the same authored building centre/foot.
    const placement=buildingPlacement(name),box=new T.Box3().setFromObject(node),anchor=new T.Vector3(placement?.origin.x??lot.x,placement?.foot??box.min.y,placement?.origin.y??lot.y),target=new T.Vector3(lot.x,placement?.floor??anchor.y,lot.y),scale=placement?.scale??G.buildingScale;
    const at=node.getWorldPosition(new T.Vector3()).sub(anchor).multiplyScalar(scale).add(target);
    node.parent.worldToLocal(at);node.position.copy(at);node.scale.multiplyScalar(scale);node.updateMatrixWorld(true);
    node.userData.gameplayBuilding=true;node.userData.entity={kind:'building',country,buildingId:lot.id};if(!this.originals.has(lot.id))this.originals.set(lot.id,[]);this.originals.get(lot.id).push(node);this.baseScale.set(node,node.scale.y);this.worldTransforms.set(node,node.matrixWorld.clone());
    if(!lot.special&&!this.templates.has(country))this.templates.set(country,node);
    this.ground.set(lot.id,new T.Box3().setFromObject(node).min.y);
   }
  });
 }
 tint(root,empty){
  let state=this.abandoned.get(root);if(!state){state={value:0};this.abandoned.set(root,state);root.traverse(o=>{if(!o.isMesh)return;const copy=source=>{const m=source.clone(),before=source.onBeforeCompile,key=source.customProgramCacheKey();m.userData.abandonmentOwned=true;m.onBeforeCompile=(shader,renderer)=>{before.call(m,shader,renderer);shader.uniforms.abandoned=state;if(!shader.fragmentShader.includes('uniform float abandoned;')){shader.fragmentShader='uniform float abandoned;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.299,.587,.114))*.58),abandoned);');}};m.customProgramCacheKey=()=>key+'|abandoned';return m;};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});}
  state.value=empty?1:0;
 }
 make(lot,country,borrowed=false){
  const special=FARM_LOTS.find(b=>b.special===lot.kind),sources=borrowed?this.originals.get(special?.id):[this.templates.get(country)];if(!sources?.length||!sources[0])return null;
  const group=new T.Group();for(const source of sources){const model=source.clone(true);model.traverse(o=>{delete o.userData.entity;});this.worldTransforms.get(source).decompose(model.position,model.quaternion,model.scale);model.visible=true;group.add(model);}group.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),fit=Math.min((lot.footprint.max[0]-lot.footprint.min[0])/Math.max(.1,size.x),(lot.footprint.max[1]-lot.footprint.min[1])/Math.max(.1,size.z));
  for(const model of group.children)model.position.sub(new T.Vector3(center.x,box.min.y,center.z));group.scale.setScalar(fit);group.userData.baseFit=fit;group.userData.cloneKind=borrowed?lot.kind:'house';group.userData.entity={kind:'building',country,buildingId:lot.id};
  if(borrowed){group.userData.resourceId='temp.v09.pasture.'+lot.kind;group.userData.temporary=true;}
  group.position.set(lot.x,this.ground.get(lot.id)??groundHeight(lot),lot.y);this.scene.add(group);this.clones.set(lot.id,group);return group;
 }
 dropClone(id){const node=this.clones.get(id);if(!node)return;this.scene.remove(node);node.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.abandonmentOwned)m.dispose();});this.clones.delete(id);}

 update(world){
  if(this.world!==world){this.eraBuildings.clear();for(const node of this.clones.values()){this.scene.remove(node);node.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.abandonmentOwned)m.dispose();});}this.clones.clear();this.world=world;}
  for(const c of world.islands)for(const lot of c.buildings||[]){const era=c.era||0,empty=world.humans(c.id).length===0;if(lot.zone!=='house'){this.eraBuildings.update(lot,c,{visible:lot.state==='complete',growth:1,y:groundHeight(lot),tint:root=>this.tint(root,empty),prepare:this.prepareModel});continue;}
   const visible=lot.state==='complete'||lot.state==='building',growth=lot.state==='complete'?1:Math.max(.05,Math.min(1,lot.progress/S.buildSeconds));
   const original=this.originals.get(lot.id)||[],placeholder=lot.special&&lot.kind==='house',borrowed=!era&&c.id===1&&['hall','academy'].includes(lot.kind);

   for(const node of original){node.visible=visible&&!placeholder&&!era&&!borrowed;node.scale.y=this.baseScale.get(node)*growth;this.tint(node,empty);}
   let clone=this.clones.get(lot.id);if(clone&&borrowed&&clone.userData.cloneKind!==lot.kind){this.dropClone(lot.id);clone=null;}
   if(!era&&visible&&(borrowed||placeholder||!original.length))clone??=this.make(lot,c.id,borrowed);
   this.eraBuildings.update(lot,c,{visible,growth,y:this.ground.get(lot.id)??groundHeight(lot),tint:root=>this.tint(root,empty),prepare:this.prepareModel});
   if(clone){clone.visible=!era&&visible&&(borrowed||!!placeholder||!original.length);clone.scale.y=clone.userData.baseFit*growth;this.tint(clone,empty);}
  }
 }
}
