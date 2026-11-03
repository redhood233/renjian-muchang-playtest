import {GameLibrary,MODE_NAMES,createGame,restoreGame,modeOf,clockLabel} from './game-modes.js?build=b210d042c6ea';
import {releaseHint,positionReleaseHint} from './release-hint.js?build=b210d042c6ea';
import {pixelRatio} from './mobile-runtime.js?build=b210d042c6ea';
import {targetPreview} from './target-preview.js?build=b210d042c6ea';
import {GameAudio} from './game-audio.js?build=b210d042c6ea';
import {PROLOGUE} from './prologue-data.js?build=b210d042c6ea';
import {CampaignWorld} from './campaign.js?build=b210d042c6ea';
import {PrologueView} from './prologue-view.js?build=b210d042c6ea';
import {PauseState} from './pause-state.js?build=b210d042c6ea';
import {CameraControls,DEFAULT_CAMERA} from './camera-controls.js?build=b210d042c6ea';
import {WorldView} from './scene.js?v=16.3&build=b210d042c6ea';
import {World,distance} from './engine.js?build=b210d042c6ea';
import {CONFIG as C,SKILLS} from './config.js?build=b210d042c6ea';
import {GameInput} from './input.js?build=b210d042c6ea';
import {$,art,palettes,islandName,showHome,dialog,guide,ending,buildCards} from './ui.js?build=b210d042c6ea';
const canvas=$('world'),view=new WorldView(canvas),saveKey=`rjmc-full-save-v${C.version}`;
let world=new World(),running=false,group=0,selected=null,target=null,selectedResident=null,hoverSkill=null,expanded=false,weather='rain',resultShown=false,lastFrame=0,lastSave=0,lastSoul=0,toastEnd=0,saved=null,settings={sound:true,music:true,vibration:true};
const camera={...DEFAULT_CAMERA};
let browserStorage;try{browserStorage=localStorage;}catch{}
const library=new GameLibrary(browserStorage);
try{settings={...settings,...JSON.parse(localStorage.getItem('rjmc-settings')||'{}')};saved=library.saves[library.latest]||null;}catch{saved=null;}
function toast(t){$('toast').textContent=t.replaceAll('青禾岛','农耕岛').replaceAll('白鹿岛','畜牧岛');$('toast').hidden=false;toastEnd=performance.now()+C.toastMs;}
const gameAudio=new GameAudio();
let lastPointerType=matchMedia('(pointer:coarse)').matches?'touch':'mouse';
function unlockAudio(){gameAudio.setSettings(settings);gameAudio.unlock();}
document.addEventListener('pointerdown',e=>{if(['mouse','touch','pen'].includes(e.pointerType))lastPointerType=e.pointerType;unlockAudio();},{capture:true});
document.addEventListener('keydown',unlockAudio,{capture:true});
document.addEventListener('visibilitychange',()=>gameAudio.update([],{paused:running&&!world.result&&(pauseState.paused||world.phase==='ready'),hidden:document.hidden}));
window.addEventListener('pagehide',()=>gameAudio.track.update(settings.music,true));
function audioSetting(key){settings[key]=!settings[key];gameAudio.setSettings(settings);try{localStorage.setItem('rjmc-settings',JSON.stringify(settings));}catch{}menu();}

function save(){if(!running||world.result||world.phase==='finale'||world.phase==='ready'||world.pending.length)return;try{saved=library.save(world);world.saveRequested=false;lastSave=world.time;}catch{if(!world.pending.length)toast('保存失败，请检查浏览器存储');}}
function clearPick(){selected=null;target=null;selectedResident=null;hoverSkill=null;expanded=false;input?.clear();$('detail').hidden=true;updateUI();}
const pauseState=new PauseState();
let modalKind='',story=null;

function syncPause(){world.paused=pauseState.paused||!!world.dialogue||world.phase==='ready'||document.hidden;}
function openModal(kind){modalKind=kind;if(running)pauseState.open('dialog');clearPick();syncPause();}
function closeModal(){modalKind='';$('dialog').hidden=true;pauseState.close('dialog');syncPause();input.clear();updateUI();if(running)$('menu').focus({preventScroll:true});}
function togglePause(){if(!running||world.result||modalKind||story?.blocksInput)return;pauseState.toggle();clearPick();syncPause();updateUI();}
function help(fromHome=false,fresh=false){openModal(fromHome?'home-help':fresh?'intro':'help');dialog(guide(world.inPrologue||fromHome?PROLOGUE.challengeSouls:world.goal,world.session?.mode==='sandbox'&&!fromHome?Infinity:PROLOGUE.challengeSeconds),[{label:fresh?'进入人间':'返回',primary:true,action:fromHome||fresh?closeModal:menu}],'guide');}
function menu(){if(!running||world.result||story?.blocksInput)return;openModal('menu');dialog(`<div class="menu-heading"><img class="menu-portrait" src="assets/ui/compact/approved-${art[group]}.webp" alt="当前神明"><div><small>人间牧场</small><h2>游戏菜单</h2><p>暂歇片刻，再执神谕</p><small>BGM：<a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100565" target="_blank" rel="noopener">Corncob — Kevin MacLeod</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></small></div></div>`,[{label:'返回游戏',primary:true,action:closeModal},{label:'玩法说明',action:()=>help()},{label:'音效：'+(settings.sound?'开':'关'),action:()=>audioSetting('sound')},{label:'背景音乐：'+(settings.music?'开':'关'),action:()=>audioSetting('music')},{label:'重新开始',action:restart},{label:'保存并返回首页',action:home}],'game-menu');}
function renderHome(){showHome(library.latest?MODE_NAMES[library.latest]:null,{story:chooseStory,sandbox:()=>selectMode('sandbox'),continue:()=>begin(true,library.latest),help:()=>help(true)});}
function chooseStory(){if(!library.profile.hasEnteredStory)begin(false,'prologue');else chapters();}
function chapters(){openModal('chapters');dialog('<h2>剧情模式</h2><p>选择关卡</p>',[{label:'序章 · 见习上帝'+(library.profile.prologueCompleted?' · 已完成':''),primary:!library.profile.prologueCompleted,action:()=>selectMode('prologue')},{label:'第一关 · 灵魂考核'+(library.profile.level1Completed?' · 已完成':''),primary:library.profile.prologueCompleted,action:()=>selectMode('level1')},{label:'返回主界面',action:()=>{closeModal();renderHome();}}],'chapter-menu');}
function selectMode(mode){if(!view.ready){toast('岛屿尚未加载完成');return;}if(!library.saves[mode]){begin(false,mode);return;}openModal('mode-start');dialog('<h2>'+MODE_NAMES[mode]+'</h2><p>已保存一局进度</p>',[{label:'继续'+MODE_NAMES[mode],primary:true,action:()=>begin(true,mode)},{label:'开始新局',action:()=>restart(mode)},{label:'返回',action:()=>mode==='sandbox'?(closeModal(),renderHome()):chapters()}]);}
function restart(mode=modeOf(world)){if(typeof mode!=='string')mode=modeOf(world);openModal('restart');dialog('<h2>重新开始'+MODE_NAMES[mode]+'？</h2><p>只替换这个模式的当前进度。</p>',[{label:'开始新局',primary:true,action:()=>begin(false,mode)},{label:'取消',action:()=>running?menu():mode==='sandbox'?(closeModal(),renderHome()):chapters()}]);}
function home(){if(!world.result&&world.pending.length){toast('陨石尚未落地，请继续游戏后保存');return;}save();pauseState.reset(true);modalKind='';world.paused=true;running=false;clearPick();$('dialog').hidden=true;$('hud').hidden=true;story.root.hidden=true;renderHome();}
function finishPrologue(){if(!world.inPrologue)return;const completed=world.phase==='ready';if(completed)library.complete('prologue');library.clear('prologue');pauseState.reset(true);world.paused=true;running=false;clearPick();story.root.hidden=true;$('hud').hidden=true;renderHome();chapters();}
function begin(load=false,mode='prologue'){if(!view.ready){toast('岛屿尚未加载完成');return;}try{world=load?restoreGame(library.saves[mode]):createGame(mode);}catch(e){toast(e.message);return;}library.enter(mode);pauseState.reset(load);modalKind='';syncPause();view.clearVisuals();running=true;resultShown=false;group=0;lastSoul=world.souls;lastSave=world.time;controls.reset(false);clearPick();$('home').hidden=true;$('hud').hidden=false;$('dialog').hidden=true;cards();if(load){syncPause();updateUI();}else{syncPause();save();}}

function cards(){buildCards(group,g=>{
 if(modalKind||story?.blocksInput||!world.visibleGod?.(g)&&world.inPrologue)return;

 if(g===group){const b=$('gods').querySelector('.active');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)b.animate([{translate:'0 0'},{translate:'0 -7px'},{translate:'0 0'}],{duration:260});return;}
 group=g;clearPick();cards();
},id=>{if(modalKind||story?.blocksInput||world.inPrologue&&!world.allowedSkill(id))return;if(world.paused){toast('已暂停，继续游戏后可选择技能');return;}const next=selected===id?null:id;clearPick();selected=next;expanded=false;updateUI();},id=>{hoverSkill=id;note();});updateUI();}
function note(){const id=selected||hoverSkill,s=SKILLS.find(s=>s.id===id);const box=$('skillNote');box.hidden=!s||!!target||selected==='weather'||!running||!$('dialog').hidden;if(box.hidden)return;const noteKey=s.id+':'+expanded;if(box.dataset.key===noteKey)return;box.dataset.key=noteKey;box.innerHTML=`<button class="x" aria-label="关闭技能说明">×</button><div class="skill-note-heading"><h3>${s.name}</h3><small>冷却 ${s.cd} 秒</small></div><p class="skill-note-summary">${s.desc}</p><button class="secondary" aria-expanded="${expanded}">${expanded?'收起详情':'查看详情'}</button>${expanded?`<p class="skill-note-extra">${s.id==='rage'?'单体 · 瞄准最近的健康成年人':'范围 '+(s.r===0?'整座岛屿':s.r+' 米')} · 消耗 ${s.cost} 灵力<br>无效释放不扣费。</p>`:''}`;box.querySelector('.x').onclick=clearPick;box.querySelector('.secondary').onclick=()=>{expanded=!expanded;note();};}
function detail(){const e=world.get(selectedResident);if(!e||e.dead||e.hp<=0||selected){selectedResident=null;$('detail').hidden=true;return;}const states=[e.sick>0?'染病 '+Math.ceil(e.sick)+'秒':'',e.starve>0?'饥饿':'',e.bless>0?'增产 '+Math.ceil(e.bless)+'秒':'',e.joy>0?'欢愉 '+Math.ceil(e.joy)+'秒':''].filter(Boolean);const detailKey=[e.id,e.hp,e.action,e.adult,Math.ceil(e.growth),...states].join('|');if($('detail').dataset.key!==detailKey){$('detail').dataset.key=detailKey;$('detail').innerHTML=`<button class="x" aria-label="关闭居民详情">×</button><h3>${e.kind==='undead'?'亡灵':e.king?'国王':e.soldier?'士兵':e.role==='scholar'?'学士':e.adult?'成年居民':'幼年居民'} · ${islandName(e.country)}</h3><p>${e.action||'活动中'}</p><p>生命 ${Math.ceil(e.hp)}${e.kind==='human'&&!e.adult?' · '+Math.max(0,Math.ceil(C.growthSeconds-e.growth))+'秒成年':''}</p>${states.length?'<p>'+states.join(' · ')+'</p>':''}`;$('detail').querySelector('button').onclick=()=>{selectedResident=null;detail();};}$('detail').hidden=false;const p=view.project(e);$('detail').style.left=Math.max(12,Math.min(innerWidth-292,p.x+20))+'px';$('detail').style.top=Math.max(165,Math.min(innerHeight-260,p.y-90))+'px';}
function point(p){view.cameraAt(camera);return view.unproject(p);}
function aim(p){target=p&&selected&&document.elementFromPoint(p.x,p.y)===canvas?point(p):null;note();}
function cast(p){if(!selected||world.paused||story?.blocksInput||document.elementFromPoint(p.x,p.y)!==canvas)return;const loc=point(p);if(!loc)return;const id=selected,r=world.cast(id,loc,weather);if(!r.ok){toast(r.message);return;}if(settings.vibration)navigator.vibrate?.(id==='meteor'?25:10);clearPick();}
const controls=new CameraControls(canvas,camera,{enabled:()=>running&&$('dialog').hidden&&!world.result&&!story?.blocksInput,project:p=>{view.cameraAt(camera);return view.panPoint(p);},threshold:C.dragPixels,onTap:p=>{if(selected)return;view.cameraAt(camera);let hit=view.pick(p);if(!hit&&matchMedia('(pointer:coarse)').matches){hit=world.entities.filter(e=>!e.dead&&!e.inside).map(e=>({e,p:view.project(e)})).map(v=>({...v,d:Math.hypot(v.p.x-p.x,v.p.y-p.y)})).filter(v=>v.d<22).sort((a,b)=>a.d-b.d)[0]?.e;}selectedResident=hit?.id===selectedResident?null:hit?.id??null;detail();}});
const input=new GameInput(canvas,{controls,enabled:()=>running&&$('dialog').hidden&&!world.result&&!story?.blocksInput,aiming:()=>!!selected&&!world.paused,aim,release:cast,cancel:clearPick});
story=new PrologueView({changed:()=>{clearPick();cards();syncPause();if(world.inPrologue&&world.phase!=='finale'&&world.phase!=='ready'&&!world.pending.length)save();},focus:p=>{if(p)controls.focus(p.x,p.y,3);},project:p=>view.project(p),continueGame:finishPrologue});
canvas.addEventListener('pointerleave',()=>{if(input.owner===null)aim(null);});
function setText(node,value){const text=String(value);if(node.textContent!==text)node.textContent=text;}
let previousMana=null;
function layoutAimHint(){positionReleaseHint($('aimHint'),{header:document.querySelector('.altar-bar'),task:document.querySelector('.prologue-task'),portrait:matchMedia('(orientation:portrait)').matches});}
function updateUI(){if(!running)return;$('skills').dataset.god=['生命 · 神谕','天气 · 神谕','死亡 · 神谕'][group];const m=Math.floor(world.mana);if(previousMana!==null&&m!==previousMana){$('godFire').animate(m<previousMana?[{transform:'scale(.78)',opacity:.55},{transform:'scale(1)',opacity:1}]:[{filter:'brightness(1.3)'},{filter:'brightness(1)'}],{duration:400});}previousMana=m;$('soulFill').setAttribute('y',String(80-54*Math.min(1,world.score/world.goal)));$('timer').classList.toggle('urgent',!world.inPrologue&&world.remaining<=60);$('mana').textContent=Math.floor(world.mana);$('souls').textContent=world.score;$('goal').textContent=Number.isFinite(world.goal)?world.goal:'自由';$('timer').textContent=clockLabel(world);const stopped=world.paused&&!modalKind&&!world.result&&!world.dialogue&&world.phase!=='ready';$('paused').hidden=!stopped;$('pauseToggle').classList.toggle('is-paused',world.paused);$('pauseToggle').setAttribute('aria-label',world.paused?'继续游戏':'暂停游戏');$('pauseToggle').disabled=!!modalKind||!!world.result||!!story?.blocksInput;
for(const b of $('gods').querySelectorAll('[data-group]'))b.hidden=!!world.inPrologue&&!world.visibleGod(+b.dataset.group);
if(!$('countries').children.length){for(let i=0;i<2;i++){const b=document.createElement('button');b.className='country '+(i?'pasture':'farm');b.innerHTML=`<img src="assets/ui/island-${i?'pasture':'farm'}.svg" alt=""><span class="country-title"><strong>${islandName(i)}</strong><span class="population"></span></span><small class="stats"><span class="supply"></span><span class="production"></span></small>`;b.onclick=()=>{if(!selected){const c=world.islands[i];controls.focus(c.x,c.y);toast(`${islandName(i)}：住房 ${world.humans(i).length}/${world.housing(c)} · ${['冷兵器','热兵器','激光'][c.era]} · 研究 ${Math.floor(c.research)}/85${c.army?' · '+({mustering:'部队集结',advancing:'作战推进'}[c.army.state]||'返乡'):''}${c.project.state==='building'?' · 封魂工程施工中':''}`);}};$('countries').append(b);}}
[...$('countries').children].forEach((b,i)=>{const c=world.islands[i],s=world.supply(c),r=world.netFood(c),bad=world.humans(i).length>0&&s<8;b.classList.toggle('danger',bad);setText(b.querySelector('.population'),'人口 '+world.humans(i).length);setText(b.querySelector('.supply'),'口粮 '+(Number.isFinite(s)?Math.floor(s)+'秒':'—'));setText(b.querySelector('.production'),' · '+(r>=0?'+':'')+r.toFixed(1)+'/秒');});
for(const b of $('skills').children){const s=SKILLS.find(s=>s.id===b.dataset.skill);b.hidden=!!world.inPrologue&&!world.allowedSkill(s.id);b.classList.toggle('active',selected===s.id);b.classList.toggle('unaffordable',world.mana<s.cost);b.querySelector('.cooldown').textContent=world.cooldowns[s.id]>0?Math.ceil(world.cooldowns[s.id])+'s':'';}
$('weather').hidden=selected!=='weather';$('aimHint').hidden=!selected||!$('dialog').hidden;$('aimHint').textContent=target&&world.validate(selected,target,weather)|| releaseHint(lastPointerType);layoutAimHint();note();detail();
if(world.result&&!resultShown){resultShown=true;modalKind='ending';pauseState.open('dialog');syncPause();selected=null;target=null;selectedResident=null;input.clear();if(world.result==='success')library.complete(modeOf(world));library.clear(modeOf(world));saved=library.saves[library.latest]||null;ending(world,()=>begin(false,modeOf(world)),home);}}

$('weather').innerHTML=[['normal','晴天','正常'],['rain','降雨','增产 · 灭火'],['hot','酷热','减产'],['cold','寒冷','减产']].map(([k,n,d])=>`<button data-weather="${k}" class="${k===weather?'active':''}">${n}<small>${d}</small></button>`).join('');$('weather').querySelectorAll('button').forEach(b=>b.onclick=()=>{weather=b.dataset.weather;target=null;$('weather').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));});
$('menu').onclick=()=>modalKind==='menu'?closeModal():menu();$('pauseToggle').onclick=togglePause;$('resetView').onclick=()=>{controls.reset();toast('视角已复位');};
function suspend(){pauseState.suspend();clearPick();syncPause();save();updateUI();}
function resize(){view.renderer.setPixelRatio(pixelRatio());view.resize(innerWidth,innerHeight);if(running){input.clear();syncPause();layoutAimHint();}}window.addEventListener('resize',resize);resize();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)suspend();});window.addEventListener('pagehide',save);
document.addEventListener('keydown',e=>{
 if(story?.keydown(e))return;
 if(e.key==='Escape'){
  if(modalKind==='ending')return;
  if(modalKind){e.preventDefault();if(modalKind==='help'||(modalKind==='restart'&&running))menu();else closeModal();return;}
  if(selected||selectedResident!==null)clearPick();else if(running)menu();
 }
 if(e.code==='Space'&&running&&!world.result){e.preventDefault();if(!e.repeat&&!modalKind)togglePause();}
});
const soulArrivals=new WeakSet();
let uiTime=0;function frame(now){const dt=lastFrame?Math.min(.25,(now-lastFrame)/1000):0;lastFrame=now;if(running)story.update(world,dt,camera);if(running&&!world.paused){world.step(dt*(world.speed||1));world.advancePresentation?.(dt);syncPause();if(!world.inPrologue&&(world.time-lastSave>=C.saveInterval||world.saveRequested&&!world.pending.length))save();}if(world.effects.some(e=>{if(!e.soul||e.life>=.18||soulArrivals.has(e))return false;soulArrivals.add(e);return true;})){$('soulBottle').animate([{filter:'brightness(1.8)',transform:'translateY(-3px)'},{filter:'brightness(1)',transform:'translateY(0)'}],{duration:550});lastSoul=world.souls;}if(now>toastEnd)$('toast').hidden=true;world.events.length=0;controls.update(dt);const soulRect=$('soulBottle').getBoundingClientRect();view.soulTarget={x:soulRect.x+soulRect.width/2,y:soulRect.y+soulRect.height/2};view.selection={resident:selectedResident,...targetPreview(world,selected,target,weather),color:palettes[group][2],valid:target&&!world.validate(selected,target,weather)};const top=document.querySelector('.altar-bar').getBoundingClientRect().bottom+12,bottom=document.querySelector('footer').getBoundingClientRect().top-20;view.safeRegion=running?{top,bottom}:null;gameAudio.update(world.visualEvents||[],{paused:running&&!world.result&&(pauseState.paused||world.phase==='ready'),hidden:document.hidden,world:running?world:null});view.render(world,camera,SKILLS.find(s=>s.id===selected),target);if(running){if(selectedResident!==null)detail();}uiTime+=dt;if(uiTime>.12){updateUI();uiTime=0;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
async function loadIsland(){$('assetLoading').hidden=false;$('assetRetry').hidden=true;try{await view.load();$('assetLoading').hidden=true;}catch(e){console.error(e);$('assetStatus').textContent='岛屿加载失败，请重试。';$('assetRetry').hidden=false;}}$('assetRetry').onclick=loadIsland;renderHome();loadIsland();
