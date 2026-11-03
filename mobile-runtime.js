import {GLTFLoader} from './vendor/GLTFLoader.js?build=a256348c5d71';
import {decodeModelPayload} from './model-payload.js?build=a256348c5d71';
export const mobileMode=typeof window!=='undefined'&&(matchMedia('(pointer:coarse)').matches||Math.min(screen.width,screen.height)<=820||innerWidth<=600);
export const pixelRatio=()=>Math.min(devicePixelRatio||1,mobileMode?1.25:2);
// Public static build: the same lightweight, self-contained models on every device.
export async function loadModel(original,name){
 const url=new URL('./assets/mobile/'+name+'.glb.gz',import.meta.url);
 const response=await fetch(url);
 if(!response.ok)throw Error('场景资源加载失败，请重试：'+name);
 const bytes=await decodeModelPayload(await response.arrayBuffer());
 return new GLTFLoader().parseAsync(bytes,new URL('.',url).href);
}
export function environmentTexture(name,base){return new URL('./assets/mobile/'+name.replace('.png','.webp'),import.meta.url).href;}
