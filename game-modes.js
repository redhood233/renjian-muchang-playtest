import {World} from './engine.js?build=b210d042c6ea';
import {CampaignWorld} from './campaign.js?build=b210d042c6ea';
import {CONFIG as C,MODES} from './config.js?build=b210d042c6ea';
import {assignHomes} from './civilization.js?build=b210d042c6ea';
export const MODE_NAMES={prologue:'序章',level1:'第一关',sandbox:'沙盒模式'};
export function modeOf(world){return world.campaign?(world.inPrologue?'prologue':'level1'):world.session?.mode==='sandbox'?'sandbox':world.session?.entryMode||'level1';}
export function createGame(mode,seed=Date.now()){
 if(!Object.hasOwn(MODE_NAMES,mode))throw Error('未知游戏模式');
 if(mode==='prologue'){const world=new CampaignWorld(seed);world.session.entryMode=mode;return world;}
 const rule=MODES[mode],world=new World(seed,{mode:mode==='sandbox'?'sandbox':'challenge',duration:rule.duration,goal:rule.goal});
 world.session.entryMode=mode;
 for(const c of world.islands){
  while(world.humans(c.id).length<rule.initialPopulation)world.spawn('human',c,true);
  if(world.humans(c.id).length!==rule.initialPopulation)throw Error('模式开局人口不能少于基础世界人口');
  for(const b of c.buildings){b.state='planned';b.progress=0;b.clearProgress=0;b.kind=b.zone==='house'?'house':b.zone;b.upgrading=false;b.health=1;}
  for(const b of c.buildings.filter(b=>b.source==='authored'&&b.zone==='house').slice(0,rule.initialHouses))b.state='complete';
  for(const b of c.buildings.filter(b=>b.source==='authored'&&b.zone===(c.id===0?'field':'pasture')).slice(0,c.id===0?rule.initialFields:rule.initialPastures))b.state='complete';
  c.food=rule.initialFood;c.army=null;c.warIntent=0;assignHomes(world,c);
 }
 world.mana=rule.initialMana;return world;
}
export function restoreGame(json){return CampaignWorld.restore(json);}
const PROFILE_KEY='rjmc-full-profile-v1',PREFIX=`rjmc-full-save-v${C.version}`;
const fresh=()=>({version:1,hasEnteredStory:false,prologueCompleted:false,level1Completed:false,lastMode:null});
// Storage can be disabled on phones. Progress remains usable for this session.
export class GameLibrary {
 constructor(storage){this.storage=storage;this.profile=fresh();this.saves={};
  try{const p=JSON.parse(storage?.getItem(PROFILE_KEY)||'null');if(p?.version===1){for(const key of ['hasEnteredStory','prologueCompleted','level1Completed'])this.profile[key]=p[key]===true;if(Object.hasOwn(MODE_NAMES,p.lastMode))this.profile.lastMode=p.lastMode;}}catch{}
  for(const mode of Object.keys(MODE_NAMES)){try{const raw=storage?.getItem(PREFIX+':'+mode);if(raw){const world=restoreGame(raw);if(modeOf(world)===mode)this.saves[mode]=raw;}}catch{}}
  try{const old=storage?.getItem(PREFIX);if(old){const world=restoreGame(old),mode=modeOf(world);if(!this.saves[mode]){this.saves[mode]=old;this.write(PREFIX+':'+mode,old);}this.profile.lastMode??=mode;if(mode!=='sandbox')this.profile.hasEnteredStory=true;if(world.campaign?.phase==='challenge')this.profile.prologueCompleted=true;this.persist();}}catch{}
 }
 write(key,value){try{this.storage?.setItem(key,value);}catch{}}
 persist(){this.write(PROFILE_KEY,JSON.stringify(this.profile));}
 enter(mode){this.profile.lastMode=mode;if(mode!=='sandbox')this.profile.hasEnteredStory=true;this.persist();}
 complete(mode){if(mode==='prologue')this.profile.prologueCompleted=true;if(mode==='level1')this.profile.level1Completed=true;this.persist();}
 save(world){const mode=modeOf(world),raw=world.serialize();this.saves[mode]=raw;this.write(PREFIX+':'+mode,raw);this.enter(mode);return raw;}
 clear(mode){delete this.saves[mode];try{this.storage?.removeItem(PREFIX+':'+mode);const old=this.storage?.getItem(PREFIX);if(old&&modeOf(restoreGame(old))===mode)this.storage?.removeItem(PREFIX);}catch{}}
 get latest(){return this.saves[this.profile.lastMode]?this.profile.lastMode:Object.keys(MODE_NAMES).find(mode=>this.saves[mode])||null;}
}
export function clockLabel(world){if(world.inPrologue)return '序章';if(!Number.isFinite(world.remaining))return '无限时';const t=Math.ceil(world.remaining);return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
