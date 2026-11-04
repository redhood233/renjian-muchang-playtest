import * as T from './vendor/three.module.js?build=dc9885d9b997';
import {groundHeight} from './island-layout.js?build=dc9885d9b997';
const replacements=new Map();
export function registerLifeModel(kind,factory){replacements.set(kind,factory);}
function prototype(kind,country){const root=new T.Group(),color=country?'#608ba6':'#b76b4f',add=(geo,tint,x,y,z)=>{const m=new T.Mesh(geo,new T.MeshStandardMaterial({color:tint,roughness:1}));m.position.set(x,y,z);root.add(m);return m;};
 if(kind==='volcano'){add(new T.ConeGeometry(2.2,2,7,1,true),'#716b67',0,1,0);add(new T.CylinderGeometry(.5,.5,.08,8),'#dc6a36',0,1.9,0);}
 else if(kind==='trees'){for(let i=0;i<4;i++){add(new T.CylinderGeometry(.07,.1,.7,4),'#81654a',(i%2-.5)*1.1,.35,(Math.floor(i/2)-.5)*1.1);add(new T.ConeGeometry(.5,1.3,5),'#648451',(i%2-.5)*1.1,1.1,(Math.floor(i/2)-.5)*1.1);}}
 else if(kind==='meat'||kind==='shipment'){add(new T.BoxGeometry(.5,.3,.4),kind==='meat'?'#d7947a':'#c9ab70',0,.3,0);}
 else{add(new T.BoxGeometry(kind==='project'?1.5:1.8,.45,1.2),'#969a93',0,.225,0);add(new T.ConeGeometry(.9,.9,4),color,0,.9,0);if(kind==='project')add(new T.OctahedronGeometry(.4),'#9dd4eb',0,1.8,0);else add(new T.BoxGeometry(.05,1.7,.05),color,.8,.85,0);}
 root.userData={temporary:true,resourceId:'temp.life.'+kind};return root;
}
export class LifeView{
 constructor(scene){this.scene=scene;this.models=new Map();}
 clear(){for(const root of this.models.values()){this.scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}this.models.clear();}
 update(w){if(this.world!==w){this.clear();this.world=w;}const records=[];
 for(const c of w.islands){records.push({id:'volcano'+c.id,kind:'volcano',country:c.id,...c.volcano});if(c.project.paid)records.push({id:'project'+c.id,kind:'project',country:c.id,...c.project.site,growth:Math.max(.15,c.project.progress/45)});for(const b of c.buildings)if(b.source==='extension'&&b.trees>0&&b.state!=='complete')records.push({id:b.id,kind:'trees',country:c.id,x:b.x,y:b.y,growth:Math.max(.1,1-b.clearProgress/4)});}
 for(const p of w.military.sites)if(p.built||p.progress>0)records.push({id:'site'+p.id,kind:'camp',country:p.owner??p.claimant??0,x:p.x,y:p.y,growth:p.built?1:Math.max(.1,p.progress/8)});
 for(const d of w.life?.drops||[])records.push({...d,id:'meat'+d.id,kind:'meat'});for(const d of w.life?.shipments||[])records.push({...d,id:'shipment'+d.id,kind:'shipment'});
 const live=new Set();for(const r of records){live.add(r.id);let root=this.models.get(r.id);if(root&&root.userData.country!==r.country){this.scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.models.delete(r.id);root=null;}if(!root){root=(replacements.get(r.kind)||prototype)(r.kind,r.country);this.scene.add(root);this.models.set(r.id,root);root.userData.country=r.country;}root.position.set(r.x,groundHeight(r),r.y);root.scale.y=r.growth??1;root.userData.entity={kind:r.kind==='project'?'project':r.kind,country:r.country,x:r.x,y:r.y};}
 for(const [id,root] of this.models)if(!live.has(id)){this.scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.models.delete(id);}
 }
}
