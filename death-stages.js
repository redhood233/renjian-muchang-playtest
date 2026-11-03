import {CONFIG as C} from './config.js?build=1b40af8f75d8';
export function corpseAge(b){return Math.max(0,C.corpseSeconds-b.life);}
export function corpseStage(b){return b.life<=0?'gone':corpseAge(b)<C.bodySeconds?'body':'grave';}
