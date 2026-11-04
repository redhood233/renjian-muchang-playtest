import {nearestWalkable,reachable} from './island-layout.js?build=dc9885d9b997';
import {SETTLEMENT as S} from './config.js?build=dc9885d9b997';
const caches=new WeakMap();
export function fieldSlots(w,c,plots){let cache=caches.get(w);if(!cache){cache=new Map();caches.set(w,cache);}const key=c.id+':'+w.navRevision+':'+plots.map(b=>b.id).join(',');if(cache.has(key))return cache.get(key);
 const slots=[];for(const b of plots)for(let i=0;i<S.workersPerField;i++){const dx=(i%2?1:-1)*.34,dy=(Math.floor(i/2)-(Math.ceil(S.workersPerField/2)-1)/2)*.68,wanted={x:b.x+dx,y:b.y+dy},p=nearestWalkable(wanted,c.id,w.blockers());if(!p||!reachable(p,w.blockers())||slots.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<.61))continue;slots.push({...p,id:b.id+':'+i,buildingId:b.id});}
 if(cache.size>32)cache.clear();cache.set(key,slots);return slots;
}
export function assignFieldSlots(people,slots){const result=new Map(),taken=new Set();for(const e of people){const slot=slots.find(s=>s.id===e.fieldSlot&&!taken.has(s.id));if(slot){result.set(e.id,slot);taken.add(slot.id);}}
 for(const e of people)if(!result.has(e.id)){const free=slots.find(s=>!taken.has(s.id));if(free){result.set(e.id,free);taken.add(free.id);}}
 return result;
}
