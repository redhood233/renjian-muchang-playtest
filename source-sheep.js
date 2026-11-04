import {loadModel} from './mobile-runtime.js?build=fa5b535c1d7e';
import * as T from './vendor/three.module.js?build=fa5b535c1d7e';
// Reuse the approved sheep asset. Bake its idle pose once; residents' sheep
// share static geometry rather than paying for a skeleton and mixer each frame.
export class SourceSheep {
 async load(){
  const gltf=await loadModel(new URL('./assets/islands/v09/sheep.glb',import.meta.url).href,'sheep');
  const clip=gltf.animations.find(a=>a.name.includes('Sheep_Idle'));if(!clip)throw Error('羊群待机动作缺失');
  const mixer=new T.AnimationMixer(gltf.scene);mixer.clipAction(clip).play();mixer.setTime(.35);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  const root=new T.Group(),v=new T.Vector3();gltf.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone(),position=geometry.attributes.position;for(let i=0;i<position.count;i++){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);position.setXYZ(i,v.x,v.y,v.z);}for(const name of ['skinIndex','skinWeight'])geometry.deleteAttribute(name);geometry.morphAttributes={};geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,o.material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);});
  const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3()),scale=1.4/Math.max(.01,size.y);
  for(const mesh of root.children){mesh.geometry.translate(-centre.x,-bounds.min.y,-centre.z);mesh.geometry.scale(scale,scale,scale);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();}
  this.template=root;this.actors=[];mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
 }
 create(){const root=this.template.clone(true);root.userData={resourceId:'approved.sheep',source:'assets/islands/v09/sheep.glb'};return root;}
 update(){}
}
