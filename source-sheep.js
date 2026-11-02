import {GEOGRAPHY as G} from './config.js?build=a2168afe9bb0';
import {loadModel,environmentTexture} from './mobile-runtime.js?build=a2168afe9bb0';
import * as T from './vendor/three.module.js?build=a2168afe9bb0';
import {GLTFLoader} from './vendor/GLTFLoader.js?build=a2168afe9bb0';
import {clone} from './vendor/SkeletonUtils.js?build=a2168afe9bb0';
export class SourceSheep {
 async load(root,meta){
  const gltf=await loadModel(new URL('./assets/islands/v09/sheep.glb',import.meta.url).href,'sheep');
  const clip=gltf.animations.find(a=>a.name.includes('Sheep_Idle'));
  if(!clip)throw new Error('羊群待机动作缺失');
  this.actors=[];const basis=new T.Matrix4().makeRotationX(-Math.PI/2);
  for(const [i,p] of meta.sheep.entries()){
   const holder=new T.Group(),model=clone(gltf.scene),m=new T.Matrix4().set(...p.matrix.flat());
   m.multiply(new T.Matrix4().makeTranslation(...p.offset.map(x=>-x)));
   holder.applyMatrix4(basis.clone().multiply(m).multiply(basis.clone().invert()));
   model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   model.scale.multiplyScalar(1/G.scale);holder.add(model);root.add(holder);const mixer=new T.AnimationMixer(model);mixer.clipAction(clip).play();this.actors.push({mixer,phase:(i%3)*clip.duration/3});
  }
 }
 update(time){for(const a of this.actors||[])a.mixer.setTime(time+a.phase);}
}
