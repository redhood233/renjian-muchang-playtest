import {CONFIG as C} from './config.js?build=1ae0e6c83866';
export function corpseAge(b){return Math.max(0,C.corpseSeconds-b.life);}
export function corpseStage(b){return b.life<=0?'gone':corpseAge(b)<C.bodySeconds?'body':'grave';}
