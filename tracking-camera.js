import * as T from './vendor/three.module.js?build=dc9885d9b997';
import {armyBearer} from './army-standards.js?build=dc9885d9b997';
import {groundHeight} from './island-layout.js?build=dc9885d9b997';
import {ARMY_PRESENTATION as P} from './config.js?build=dc9885d9b997';
export class TrackingCamera{
 constructor(){this.camera=new T.PerspectiveCamera(58,1,.08,2000);this.target=null;this.resetOrbit();}
 resetOrbit(){this.orbit={yaw:0,pitch:0,zoom:1};}
 king(e){this.target={kind:'king',id:e.id,country:e.country};this.resetOrbit();}
 army(country){this.target={kind:'army',country};this.resetOrbit();}
 orbitBy(yaw,pitch){this.orbit.yaw=Math.atan2(Math.sin(this.orbit.yaw+yaw),Math.cos(this.orbit.yaw+yaw));this.orbit.pitch=Math.max(P.followPitchMin,Math.min(P.followPitchMax,this.orbit.pitch+pitch));}
 zoomBy(factor){if(Number.isFinite(factor)&&factor>0)this.orbit.zoom=Math.max(P.followZoomMin,Math.min(P.followZoomMax,this.orbit.zoom*factor));}
 clear(){this.target=null;}
 update(world,width,height,facing=()=>null){
  if(!this.target||world.result){this.clear();return null;}const t=this.target,c=world.islands[t.country],e=t.kind==='king'?world.get(t.id):armyBearer(world,c);
  if(!e||e.dead||t.kind==='king'&&!e.king){this.clear();return null;}
  const yaw=t.kind==='king'?facing(e.id):null;
  const h=t.kind==='army'?c.army.heading:Number.isFinite(yaw)?{x:Math.sin(yaw),y:Math.cos(yaw)}:null,dx=h?.x??(c.id?-1:1),dy=h?.y??0,len=Math.hypot(dx,dy)||1,angle=Math.atan2(dx/len,dy/len)+this.orbit.yaw,fx=Math.sin(angle),fy=Math.cos(angle);
  const [back,side,up,ahead]=t.kind==='king'?P.kingCamera:P.soldierCamera;
  const x=e.x-fx*back-fy*side,z=e.y-fy*back+fx*side,base=groundHeight(e);
  this.camera.aspect=width/height;this.camera.fov=58/this.orbit.zoom;this.camera.position.set(x,Math.max(base+up+Math.tan(this.orbit.pitch)*Math.max(2,back),groundHeight({x,y:z})+.65),z);this.camera.lookAt(e.x+fx*ahead,base+1.1,e.y+fy*ahead);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();return this.camera;
 }
}
