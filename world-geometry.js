import * as T from './vendor/three.module.js?build=a2168afe9bb0';
import {GEOGRAPHY as G} from './config.js?build=a2168afe9bb0';
import {BRIDGE} from './island-layout.js?build=a2168afe9bb0';
// Deform only the transverse axis, preserving the source ramp/height profile.
// The navigation deck uses the same endpoints and width multiplier.
export function expandBridgeMesh(root){
 root.updateMatrixWorld(true);
 const dx=BRIDGE.b.x-BRIDGE.a.x,dy=BRIDGE.b.y-BRIDGE.a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 root.traverse(node=>{
  if(!node.isMesh)return;let bridge=false;for(let p=node;p&&p!==root;p=p.parent)if(p.userData.expandedBridge||p.userData.role==='bridge')bridge=true;
  if(!bridge)return;
  const inverse=node.matrixWorld.clone().invert(),v=new T.Vector3();node.geometry=node.geometry.clone();const position=node.geometry.attributes.position;
  for(let i=0;i<position.count;i++){v.fromBufferAttribute(position,i).applyMatrix4(node.matrixWorld);const d=(v.x-BRIDGE.a.x)*nx+(v.z-BRIDGE.a.y)*ny;v.x+=nx*d*(G.bridgeWidthScale-1);v.z+=ny*d*(G.bridgeWidthScale-1);v.applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z);}
  position.needsUpdate=true;node.geometry.computeVertexNormals();node.geometry.computeBoundingBox();node.geometry.computeBoundingSphere();node.userData.role='bridge';
 });
}
