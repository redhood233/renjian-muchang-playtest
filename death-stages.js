import {CONFIG as C} from './config.js?build=ae7840b412f1';
export function corpseAge(b){return Math.max(0,C.corpseSeconds-b.life);}
export function corpseStage(b){return b.life<=0?'gone':corpseAge(b)<C.bodySeconds?'body':'grave';}
