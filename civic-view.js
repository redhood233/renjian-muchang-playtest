import * as T from './vendor/three.module.js?build=b9a20aa89d31';
import {CIVILIZATION as V} from './config.js?build=b9a20aa89d31';
import {groundHeight} from './island-layout.js?build=b9a20aa89d31';
import {cityHall} from './civic-sites.js?build=b9a20aa89d31';
// Temporary altar/offerings; replace createAltar via registerAltarModel.
let altarFactory=null;
export function registerAltarModel(factory){altarFactory=factory;}
function createAltar(){const root=new T.Group(),stone=new T.MeshStandardMaterial({color:'#b4b5aa',roughness:1,flatShading:true}),gold=new T.MeshStandardMaterial({color:'#bf9651',roughness:.7});
 const add=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 add(new T.BoxGeometry(1.7,.2,1.5),stone,0,.1,0);add(new T.BoxGeometry(.9,.45,.7),stone,0,.425,0);add(new T.BoxGeometry(1.2,.12,1),gold,0,.71,0);add(new T.OctahedronGeometry(.27),gold,0,1.03,-.22);
 const offering=new T.Group();offering.name='offering';offering.userData={resourceId:'temp.civic.offering',temporary:true};for(let i=0;i<3;i++){const m=new T.Mesh(new T.IcosahedronGeometry(.11,0),gold);m.position.set((i-1)*.2,.85,.25);offering.add(m);}root.add(offering);return root;
}
export class CivicView{
 constructor(view){this.view=view;this.nodes=new Map();this.labels=new Map();}
 clear(){for(const root of this.nodes.values()){this.view.scene.remove(root);const materials=new Set();root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const m of materials)m.dispose();}this.nodes.clear();for(const label of this.labels.values())label.remove();this.labels.clear();}
 label(id,text,point,active){let label=this.labels.get(id);if(!label){label=document.createElement('span');label.style.cssText='position:absolute;transform:translate(-50%,-100%);padding:3px 7px;border:1px solid #c4ae76;border-radius:4px;background:#242d2ddc;color:#f3e5bd;font:12px sans-serif;white-space:nowrap';this.labels.set(id,label);this.view.overlay.append(label);}if(label.textContent!==text)label.textContent=text;const p=this.view.project(point);label.style.left=p.x+'px';label.style.top=(p.y-10)+'px';label.hidden=!active||!this.view.safeRegion||!!this.view.trackingCamera||p.x<0||p.x>this.view.w||p.y<90||p.y>this.view.h-100;}
 update(world){if(this.world!==world){this.clear();this.world=world;}const seen=new Set();
  for(const c of world.islands){const inhabited=world.humans(c.id).length>0,hall=cityHall(c);if(hall){this.label('hall'+c.id,`城市中心${!inhabited?' · 荒废':hall.state==='complete'?'':' · 重建中'}`,hall,true);seen.add('hall'+c.id);}
   const academy=c.buildings.find(b=>b.kind==='academy'&&b.state==='complete');if(academy){const n=world.humans(c.id).filter(e=>e.role==='scholar').length;this.label('school'+c.id,`学院 · 学士${n}`,academy,true);seen.add('school'+c.id);}
   const s=c.shrine;if(s.state==='none'){const old=this.nodes.get(c.id);if(old)old.visible=false;continue;}
   let root=this.nodes.get(c.id);if(!root){root=(altarFactory||createAltar)({country:c.id});root.userData.entity={kind:'shrine',country:c.id};root.userData.resourceId=root.userData.resourceId||'temp.civic.altar';root.userData.temporary=root.userData.temporary??!altarFactory;this.view.scene.add(root);this.nodes.set(c.id,root);this.view.settlements.tint(root,false);this.view.settlements.prepareModel?.(root);}
   root.visible=true;root.position.set(s.x,groundHeight(s),s.y);root.scale.y=s.state==='building'?Math.max(.08,s.progress/V.shrineSeconds):s.state==='repairing'?Math.max(.35,s.health):1;
   this.view.settlements.tint(root,!world.humans(c.id).length);const food=root.getObjectByName('offering');if(food)food.visible=!!s.offerings&&world.time-s.lastOffering<3;
   const state=!inhabited?'荒废':s.state==='building'?`建造 ${Math.floor(s.progress/V.shrineSeconds*100)}%`:s.state==='repairing'?'修缮中':c.research>=V.faithCutoff?'科学时代 · 停供':`已供奉${s.offerings||0}次`;
   this.label('shrine'+c.id,'祭台 · '+state,s,true);seen.add('shrine'+c.id);
  }
  for(const [id,label] of this.labels)if(!seen.has(id))label.hidden=true;
 }
}
