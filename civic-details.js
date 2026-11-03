import {CIVILIZATION as V,SOCIETY as R} from './config.js?build=ae7840b412f1';
const state=b=>({none:'尚未建造',planned:'等待重建',clearing:'清理地块',building:'建造中',repairing:'修缮中',complete:'已完工'}[b.state]||b.state);
export function civicDetails(w,pick){const c=w.islands[pick?.country];if(!c)return null;
 if(pick.kind==='shrine'){const s=c.shrine,scientific=c.research>=V.faithCutoff;return {title:'神明祭台',point:s,lines:[state(s),`信仰 ${Math.floor(c.faith)} · 完好度 ${Math.round(s.health*100)}%`,scientific?'科学时代：停止供奉，仍可修缮':`余粮充足且信仰不低于20时，居民到场供奉${V.offeringFood}粮食，获得${V.offeringMana}灵力`,`已完成供奉 ${s.offerings||0} 次`,s.state==='building'||s.state==='repairing'?`施工 ${Math.floor(s.progress/V.shrineSeconds*100)}%`:'']};}
 const b=c.buildings.find(b=>b.id===pick.buildingId);if(!b)return null;
 if(b.special==='hall')return {title:'城市中心',point:b,lines:[state(b),`国王${w.get(c.kingId)?'在位，固定驻于中心门前':'空缺，等待继任'}`,`时代：${['古代','近代','未来'][c.era]} · 不计入民房床位`,b.state==='complete'?'随时代更新建筑外观':'居民将优先重建城市中心',`学院：${c.buildings.some(b=>b.kind==='academy'&&b.state==='complete')?'已启用':'人口50且有富余生产力后启用'}`,`信仰 ${Math.floor(c.faith)}/${V.faithThreshold} · 祭台${state(c.shrine)}`,`已供奉 ${c.shrine.offerings||0} 次${c.research>=V.faithCutoff?' · 科学时代停止供奉':''}`]};
 if(b.special==='academy')return {title:'学院'+(b.kind==='house'?' · 民房占位':''),point:b,lines:[state(b),`人口 ${w.humans(c.id).length}/${R.scholarPopulation} · 学士 ${w.humans(c.id).filter(e=>e.role==='scholar').length}/${R.maxScholars}`,`科研 ${c.research.toFixed(1)}/${V.researchLimit}`,b.kind==='academy'?'学院已启用：有余粮及富余劳力时产生脱产学士':'需要人口、余粮、富余生产力和可腾出的床位，才能改建学院']};
 return {title:({house:'民房',granary:'粮仓',windmill:'生产工坊',field:'农田',pasture:'牧场'}[b.kind]||'建筑'),point:b,lines:[state(b),b.kind==='house'?'完工后提供5个真实床位':'随本国时代更新外观']};
}
