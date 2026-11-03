const url = new URL('./rules.json?build=1b40af8f75d8', import.meta.url);
const rules = typeof window === 'undefined' ? JSON.parse(await (await import('node:fs/promises')).readFile(url, 'utf8')) : await (await fetch(url)).json();
import {mapPoint,mapArea} from './world-space.js?build=1b40af8f75d8';
export const GEOGRAPHY=Object.freeze(rules.geography);
export const worldPoint=p=>mapPoint(p,GEOGRAPHY);
export const CONFIG = Object.freeze(rules.config);
export const SKILLS = Object.freeze(rules.skills);
export const CLIMATE = Object.freeze(rules.climate);
export const TEXT = Object.freeze(rules.texts || {});

const areas=a=>Object.fromEntries(Object.entries(a).map(([k,v])=>[k,mapArea(v,GEOGRAPHY,k==='house')]));
export const SETTLEMENT=Object.freeze({...rules.settlement,expansion:areas(rules.settlement.expansion),pastureExpansion:areas(rules.settlement.pastureExpansion)});
export const HUSBANDRY=Object.freeze({...rules.husbandry,pens:rules.husbandry.pens.map(worldPoint)});
export const SOCIETY=Object.freeze(rules.society);
export const WILDLIFE=Object.freeze({...rules.wildlife,homes:rules.wildlife.homes.map(a=>a.map(worldPoint))});

export const MILITARY=Object.freeze(rules.military);
export const CIVILIZATION=Object.freeze(rules.civilization);
export const MODES=Object.freeze(rules.modes);

export const ARMY_PRESENTATION=Object.freeze(rules.armyPresentation);
