import * as T from './vendor/three.module.js?build=1b40af8f75d8';
import {armyBearer} from './army-standards.js?build=1b40af8f75d8';
import {groundHeight} from './island-layout.js?build=1b40af8f75d8';
import {ARMY_PRESENTATION as P} from './config.js?build=1b40af8f75d8';
export class TrackingCamera{
 constructor(){this.camera=new T.PerspectiveCamera(58,1,.08,2000);this.target=null;}
 king(e){this.target={kind:'king',id:e.id,country:e.country};}
 army(country){this.target={kind:'army',country};}
 clear(){this.target=null;}
 update(world,width,height){
  if(!this.target||world.result){this.clear();return null;}const t=this.target,c=world.islands[t.country],e=t.kind==='king'?world.get(t.id):armyBearer(world,c);
  if(!e||e.dead||t.kind==='king'&&!e.king){this.clear();return null;}
  const h=t.kind==='army'?c.army.heading:null,dx=h?.x??(c.id?-1:1),dy=h?.y??0,len=Math.hypot(dx,dy)||1,fx=dx/len,fy=dy/len;
  const [back,side,up,ahead]=t.kind==='king'?P.kingCamera:P.soldierCamera;
  const x=e.x-fx*back-fy*side,z=e.y-fy*back+fx*side,base=groundHeight(e);
  this.camera.aspect=width/height;this.camera.position.set(x,Math.max(base+up,groundHeight({x,y:z})+1.1),z);this.camera.lookAt(e.x+fx*ahead,base+1.1,e.y+fy*ahead);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();return this.camera;
 }
}
