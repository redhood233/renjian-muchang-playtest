import {loadModel} from './mobile-runtime.js?build=dc9885d9b997';
import {loadCrown} from './royal-crown.js?build=dc9885d9b997';
import {GLTFLoader} from './vendor/GLTFLoader.js?build=dc9885d9b997';
let pending;
export function loadCharacters(){return pending??=(async()=>{
 await loadCrown();
 const loader=new GLTFLoader();const results=await Promise.all(['farming','livestock'].map(n=>loadModel(new URL('./assets/characters/peasants/'+n+'.glb',import.meta.url).href,n)));
 for(const g of results){for(const name of ['Idle','Walk Forward In Place','Run Forward W Weapons In Place'])if(!g.animations.some(a=>a.name===name))throw Error('角色动作缺失：'+name);}
 return results;
})().catch(e=>{pending=null;throw e;});}
