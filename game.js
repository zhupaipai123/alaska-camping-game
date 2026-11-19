'use strict';
const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d');
const left = document.querySelector('#left');
const right = document.querySelector('#right');
const joystick=document.querySelector('#joystick'), knob=document.querySelector('#joystick-knob'), info=document.querySelector('#species-info');
let speciesTimer=null,birdInfoShown=false,birdInfoPinned=false,infoShownAt=0;
function hideInfo(force=false){if(!force && (birdInfoPinned || speciesTimer || (!info.hidden && Date.now()-infoShownAt<5000)))return;clearTimeout(speciesTimer);speciesTimer=null;info.hidden=true;}
function showInfo(text,delay=0){hideInfo(true);speciesTimer=setTimeout(()=>{info.textContent=text;info.hidden=false;infoShownAt=Date.now();speciesTimer=null;},delay);}
const birdButton = document.querySelector('#bird');
const birdLabel = birdButton.querySelector('.bird-label');
const wolfButton = document.querySelector('#wolf');
const wolfLabel = wolfButton.querySelector('.wolf-label');
const fishButton=document.querySelector('#fish');
const fishLabel=fishButton.querySelector('.fish-label');
const howl = new Audio(assetURL('lone-wolf.mp3'));
const rifle = new Audio(assetURL('rifle.mp3'));
const wind = new Audio(assetURL('wind-birds.mp3'));
const river = new Audio(assetURL('river.mp3'));
const actionCue = new Audio('./assets/action-cloth-20261118.wav');
actionCue.preload='auto';actionCue.volume=.4;
howl.volume = .55; rifle.volume = .75;
wind.loop = river.loop = true; wind.volume = .24; river.volume = .35;
let soundOn=true, audioUnlocked=true, currentAmbience=null;
try { soundOn=localStorage.getItem('camp-sound-muted')!=='1'; } catch (_) {}
const soundButton=document.querySelector('#sound');
const campAudio=createCampAudio(soundButton,true);
soundButton.setAttribute('aria-pressed',String(soundOn)); soundButton.textContent=soundOn?'环境音 🔊':'环境音 🔇';
function playSound(name){if(!soundOn)return;const sound=name==='wolf'?howl:rifle;sound.currentTime=0;sound.play().catch(()=>{});}
function syncAmbience(){
  campAudio.setEnabled(soundOn);campAudio.update(Camp.active?Camp.stage:'none',Camp.snapshot().progress);
  if(Camp.active){wind.pause();river.pause();currentAmbience=null;return;}
  if(!audioUnlocked || !soundOn || document.hidden){wind.pause();river.pause();currentAmbience=null;return;}
  const next=!Camp.active && state.phase==='done' && (state.x>=630 || fishStage!=='travel') ? river : wind;
  if(currentAmbience!==next){wind.pause();river.pause();currentAmbience=next;next.play().then(()=>{if(!soundOn || document.hidden || Camp.active || currentAmbience!==next)next.pause();}).catch(()=>{audioUnlocked=false;currentAmbience=null;});}
}
// A first tap may happen before large images finish loading; start ambience in that gesture.
function unlockMainAmbience(){if(!soundOn)return;if(!audioUnlocked || (!currentAmbience && !Camp.active)){audioUnlocked=true;syncAmbience();}}
document.addEventListener('pointerdown',unlockMainAmbience,{capture:true});
document.addEventListener('keydown',unlockMainAmbience,{capture:true});
document.addEventListener('touchend',unlockMainAmbience,{capture:true,passive:true});
soundButton.addEventListener('click',()=>{soundOn=!soundOn;try{localStorage.setItem('camp-sound-muted',soundOn?'0':'1');}catch(_){} if(soundOn)audioUnlocked=true;soundButton.setAttribute('aria-pressed',String(soundOn));soundButton.textContent=soundOn?'环境音 🔊':'环境音 🔇';if(!soundOn){howl.pause();rifle.pause();}syncAmbience();});
function playActionCue(){if(!soundOn)return;actionCue.currentTime=0;actionCue.play().catch(()=>{});}
document.addEventListener('pointerdown',e=>{const target=e.target.closest('#joystick,#pick,#bird,#wolf,#fish,#process,#camp-action');if(target&&!target.hidden&&!target.disabled)playActionCue();},{capture:true});
document.addEventListener('keydown',e=>{if(!e.repeat&&['Enter',' '].includes(e.key)){const target=e.target.closest?.('#joystick,#pick,#bird,#wolf,#fish,#process,#camp-action');if(target&&!target.hidden&&!target.disabled)playActionCue();}},{capture:true});
const pickButton = document.querySelector('#pick');
const processButton = document.querySelector('#process');
const berryInventory = document.querySelector('#berry-inventory');
const birdInventory = document.querySelector('#bird-inventory');
const fishInventory = document.querySelector('#fish-inventory');
const sources = ["face-cooking-reference.png", "face-eating-lift-reference.png", "face-eating-reference.png", "aim-kneel-closeup-v1.png", "approved-frying-baseline-style.png", "approved-oil-baseline-style.png", "baseline-aerial-clean.webp", "baseline-approved-fire-tea.webp", "baseline-approved-rest.webp", "baseline-bedding-closeup-v1.webp", "baseline-bedding-consistent.webp", "baseline-camp-tent.webp", "baseline-enter-tent-tea-v2.webp", "baseline-enter-tent-tea.webp", "baseline-fire-scrape-sheet-v1.webp", "baseline-fire-tending.webp", "baseline-intro-closeup-v1.webp", "baseline-pitch-rope-atlas.webp", "baseline-shore-camp-panorama.webp", "baseline-unpack-atlas.webp", "bedding-layer-atlas.png", "berry-picking-closeup-v1.png", "bird-flight.webp", "bird-processing-closeup-v1.png", "blueberry-bush.webp", "blueberry-closeup-reference.png", "bottle-action-sheet.webp", "distant-shrub.webp", "eating-lift-v1.png", "evening-back-v2.png", "fish-unhook-sheet.webp", "fishing-action-sheet.png", "grayling.webp", "hunter-aim.webp", "picking-sheet.webp", "ptarmigan.webp", "ridge.webp", "river-reference-v3.webp", "tent-interior-empty.png", "toned-dinner-hands-away-v1.png", "toned-dinner-stone-portrait.png", "unified-cooking.png", "unified-eating.png", "unified-rope.png", "wading-neutral-sheet.webp", "walk-ground.webp", "walking-sheet.webp", "wolf-warning.webp", "wolf.webp"];
const images = new Map();

const state = {x:140, facing:1, picked:false, birdCollected:false, fishCollected:false, phase:'walk', stride:0};
const W=540, H=960, worldWidth=941, backgroundY=450, groundY=1235, berryX=400, birdX=800;
let cameraX=0, previousTime=0, keyboardDirection=0, pointerDirection=0, picking=null;
let berryPreview=false, berryWalkTime=0, wolfClearX=null, wolfWalkTime=0;
let flightTime=0, hitTime=0, processTime=0, shoreTime=0, zoom=0, feathers=[], wolfTime=0, wolfStage='waiting', fishStage='travel', fishTime=0, sceneTime=0, wadeProgress=0;
const savedKey=(location.pathname.endsWith('/camp-preview.html')||new URLSearchParams(location.search).has('camp-preview'))?'camp-unified-review-preview':'camp-unified-review';
let restoredCamp=null;
const campButton=document.querySelector('#camp-action');
const campPreview=new URLSearchParams(location.search).has('camp-preview') || location.pathname.endsWith('/camp-preview.html');
let introTime=0, introActive=true, introHasSave=false;
const controls=document.querySelector('.controls');
controls.style.visibility='hidden';
try {
  const s=JSON.parse(sessionStorage.getItem(savedKey)||'null');
  if(s && Number.isFinite(s.x) && !new URLSearchParams(location.search).has('opening')) {
    restoredCamp=s.camp||null;
    introHasSave=true; introActive=false; controls.style.visibility='visible';
    state.x=Math.max(70,Math.min(worldWidth-70,s.x)); state.facing=s.facing===-1?-1:1;
    state.picked=s.picked===true; berryWalkTime=Math.max(0,Math.min(1.2,Number(s.berryWalkTime)||0));
    state.birdCollected=s.birdCollected===true || ['hitfx','hit','processing','done'].includes(s.phase);
    state.fishCollected=s.fishCollected===true || s.fishStage==='done';
    wolfStage=s.wolfStage==='cleared'?'cleared':'waiting';
    if(wolfStage==='cleared')wolfClearX=Number.isFinite(s.wolfClearX)?s.wolfClearX:state.x;
    if(wolfStage==='cleared')wolfWalkTime=Math.max(0,Math.min(1.2,Number(s.wolfWalkTime)||0));
    fishStage=s.fishStage==='done'?'done':'travel';
    state.phase=['hitfx','processing'].includes(s.phase)?'hit':['walk','noticed','aim1','flight','aim2','hit','done'].includes(s.phase)?s.phase:'walk';
  }
} catch (_) {}
function save(){try{sessionStorage.setItem(savedKey,JSON.stringify({x:state.x,facing:state.facing,picked:state.picked,berryWalkTime,birdCollected:state.birdCollected,fishCollected:state.fishCollected,phase:state.phase,wolfStage,wolfClearX,wolfWalkTime,fishStage,camp:Camp.snapshot()}));}catch(_){}}
function canNotice(){return wolfStage==='cleared'&&state.phase==='walk'&&!picking&&state.x>=birdX-350&&state.x<=birdX-150&&wolfWalkTime>=1.2;}
function canPick(){return !state.picked&&(state.phase==='walk'||state.phase==='done')&&!picking&&state.x>=berryX-135&&state.x<=berryX-55;}
function updateUI(){
  const fishText=fishStage==='arrival'?'钓鱼':fishStage==='ready'?'抛竿':fishStage==='bite'?'收线':fishStage==='caught'?'取水备用':'';
  fishButton.querySelector('span[aria-hidden]').hidden=fishStage==='caught';
  fishButton.hidden=!fishText;fishLabel.textContent=fishText;fishButton.setAttribute('aria-label',fishText||'钓鱼');
  const wolfText=wolfStage==='distant'?'发现狼':wolfStage==='scope'?'警告射击':'';
  wolfButton.hidden=!wolfText; wolfLabel.textContent=wolfText; wolfButton.setAttribute('aria-label',wolfText||'发现狼');
  const label=canNotice()?'发现阿拉斯加雷鸟':state.phase==='noticed'?'瞄准':['aim1','aim2'].includes(state.phase)?'开枪':'';
  birdButton.hidden=!label; birdButton.disabled=state.phase==='flight'; birdLabel.textContent=label;
  birdButton.setAttribute('aria-label',label||'发现阿拉斯加雷鸟');
  processButton.hidden=state.phase!=='hit';
  pickButton.hidden=(!berryPreview&&!canPick())||!!fishText||!['travel','done'].includes(fishStage)||!!label||!['waiting','cleared'].includes(wolfStage);
  pickButton.querySelector('span:last-child').textContent=berryPreview?'采蓝莓':'发现野生蓝莓';
  pickButton.disabled=!canPick(); berryInventory.hidden=!state.picked; birdInventory.hidden=!state.birdCollected; fishInventory.hidden=!state.fishCollected;
}
fishButton.addEventListener('click',()=>{
 if(fishStage==='arrival')fishStage='ready';
 else if(fishStage==='ready'){fishStage='casting';fishTime=0;}
 else if(fishStage==='bite'){fishStage='reeling';fishTime=0;}
 else if(fishStage==='caught'){hideInfo(true);fishStage='filling';fishTime=0;}
 updateUI();
});
wolfButton.addEventListener('click',()=>{
  if(wolfStage==='distant'){
    wolfStage='raising';wolfTime=0;
    playSound('wolf');
  } else if(wolfStage==='scope'){
    howl.pause();wolfStage='retreating';wolfTime=0;
    playSound('rifle');
  }
  updateUI();
});
function scatter(x,y,count){
  for(let i=0;i<count;i++) feathers.push({x,y,vx:(Math.random()-.4)*65,vy:-20-Math.random()*70,age:0,life:1.4+Math.random()*1.5,angle:Math.random()*6});
}
birdButton.addEventListener('click',()=>{
  if(canNotice()){state.phase='noticed';state.facing=1;keyboardDirection=0;resetJoystick();birdInfoShown=true;showInfo('柳雷鸟：阿拉斯加州鸟，冬季羽毛雪白，夏季褐色，耐严寒，善伪装，常在地面觅食。');birdInfoPinned=true;}
  else if(state.phase==='noticed'){state.phase='aim1';}
  else if(state.phase==='aim1'){playSound('rifle');state.phase='flight';flightTime=0;}
  else if(state.phase==='aim2'){
    birdInfoPinned=false;hideInfo(true);
    playSound('rifle');state.birdCollected=true;state.phase='hitfx';hitTime=0;const x=birdX+Math.min(flightTime,1.3)*40+Math.sin(flightTime*1.5)*25;
    const y=groundY-280-Math.min(flightTime,1.1)*90+Math.sin(flightTime*3)*8;
    scatter(x,y,20);
  }
  save();updateUI();
});
processButton.addEventListener('click',()=>{if(state.phase==='hit'){state.phase='processing';processTime=0;feathers=[];scatter(cameraX+90,backgroundY+305,8);save();updateUI();}});
function pick(){if(!canPick())return;state.facing=1;keyboardDirection=0;resetJoystick();if(!berryPreview){berryPreview=true;}else{berryPreview=false;picking={elapsed:0};}updateUI();}
pickButton.addEventListener('click',pick);
function draw(preserveBackground=false){
  if(!preserveBackground)ctx.clearRect(0,0,W,H);
  if(picking && picking.elapsed>.65 && picking.elapsed<2.25){ctx.drawImage(images.get('berry-picking-closeup-v1.png'),0,0,W,H);return;}
  if(berryPreview){ctx.drawImage(images.get('blueberry-closeup-reference.png'),0,0,W,H);return;}
  if(['aim1','aim2','flight','hitfx','hit'].includes(state.phase)){
    ctx.drawImage(images.get('aim-kneel-closeup-v1.png'),0,0,W,H);
    if(state.phase==='flight'||state.phase==='hitfx'){
      const t=state.phase==='flight'?flightTime:hitTime, frame=Math.floor(t/.16)%4;
      const x=345+Math.min(t,1)*105, y=315-Math.min(t,1)*95+(state.phase==='hitfx'?Math.min(t,1)*115:0);
      ctx.save();if(state.phase==='hitfx')ctx.globalAlpha=Math.max(0,1-t/1.5);
      ctx.drawImage(images.get('bird-flight.webp'),frame*543,0,543,724,x,y,90,120);ctx.restore();
    }
    return;
  }
  if(state.phase==='processing'){
    ctx.drawImage(images.get(processTime<2.1?'bird-processing-first-closed.png':'bird-processing-second-approved.png'),0,0,W,H);
    for(const f of feathers){ctx.save();ctx.translate(f.x-cameraX,f.y-backgroundY);ctx.rotate(f.angle+f.age*3);ctx.globalAlpha=Math.max(0,1-f.age/f.life);ctx.fillStyle='#eee8d6';ctx.beginPath();ctx.ellipse(0,0,7,2.4,0,0,Math.PI*2);ctx.fill();ctx.restore();}
    return;
  }
  if(state.phase==='shorewalk'){
    const t=Math.min(1,shoreTime/4),bg=images.get('shore-approach-approved-20261118.png');
    ctx.drawImage(bg,0,0,W,H);
    if(shoreTime<.65){ctx.save();ctx.globalAlpha=1-shoreTime/.65;ctx.drawImage(images.get('bird-processing-second-approved.png'),0,0,W,H);ctx.restore();}
    if(shoreTime>3.25){ctx.save();ctx.globalAlpha=Math.min(1,(shoreTime-3.25)/.75);ctx.drawImage(images.get('river-reference-v3.webp'),0,0,W*1.3,H);ctx.restore();}
    const walk=images.get('walking-sheet.webp'),frame=Math.floor(shoreTime/.15)%4,x=130+20*t,y=850-65*t;
    ctx.save();ctx.globalAlpha=Math.min(1,shoreTime/.65);ctx.drawImage(walk,frame*543,0,543,724,x-112.5,y-300,225,300);ctx.restore();
    return;
  }
  if(wolfStage==='scope'){
    ctx.fillStyle='#172019';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.beginPath();ctx.arc(270,390,220,0,Math.PI*2);ctx.clip();
    ctx.drawImage(images.get('ridge.webp'),410,400,220,220,50,170,440,440);
    ctx.drawImage(images.get('wolf.webp'),50+(510-410)*2,170+(490-400)*2,44,22);
    ctx.strokeStyle='#172019bb';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(50,390);ctx.lineTo(490,390);ctx.moveTo(270,170);ctx.lineTo(270,610);ctx.stroke();
    ctx.restore();ctx.strokeStyle='#45483d';ctx.lineWidth=12;ctx.beginPath();ctx.arc(270,390,220,0,Math.PI*2);ctx.stroke();
    return;
  }
  const floor=groundY-backgroundY;
  const focusX=state.x-cameraX,focusY=floor-90;
  ctx.save();
  ctx.translate((W*.5-focusX)*zoom,(H*.55-focusY)*zoom);
  ctx.translate(focusX,focusY);ctx.scale(1+zoom*.7,1+zoom*.7);ctx.translate(-focusX,-focusY);
  ctx.drawImage(images.get('walk-ground.webp'),-cameraX,-backgroundY);
  let blend=state.picked?Math.max(0,Math.min(1,(state.x-320)/65)):0;
  if(wolfStage==='cleared')blend=Math.max(0,Math.min(1,(500-state.x)/115));
  if(blend>0){ctx.save();ctx.globalAlpha=blend;ctx.drawImage(images.get('ridge.webp'),-cameraX,-backgroundY,941,1672);ctx.restore();}
  const riverTransition=state.phase==='done'?Math.max(0,Math.min(1,(state.x-590)/110)):0;
  const riverBlend=riverTransition>=.5?1:0;
  if(riverBlend>0){ctx.save();ctx.globalAlpha=riverBlend;ctx.drawImage(images.get('river-reference-v3.webp'),0,0,W*1.3,H);ctx.restore();}
  if(riverBlend>0){
    ctx.save();ctx.globalAlpha=.08*riverBlend;ctx.strokeStyle='#edf4e9';ctx.lineWidth=1.2;
    for(let i=0;i<15;i++){const px=(i*173+sceneTime*(4+i%3))%680-70,py=410+(i*61)%300;ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+18,py-2,px+37,py);ctx.stroke();}
    ctx.restore();
  }
  if(fishStage==='travel'&&riverTransition>0&&riverTransition<1){ctx.save();ctx.fillStyle='#202922';ctx.globalAlpha=(1-Math.abs(riverTransition*2-1))*.85;ctx.fillRect(0,0,W,H);ctx.restore();}
  if(['distant','raising','retreating'].includes(wolfStage)){
    ctx.save();ctx.globalAlpha=wolfStage==='retreating'?Math.max(0,1-wolfTime/2):1;
    ctx.drawImage(images.get('wolf.webp'),510-cameraX,490-backgroundY,22,11);ctx.restore();
  }
  const bushX=birdX-cameraX;
  ctx.save();ctx.globalAlpha=wolfStage==='cleared'?(1-blend)*(1-riverBlend):0;
  ctx.drawImage(images.get('distant-shrub.webp'),bushX-115,floor-360,230,100);
  if(['walk','noticed','aim1'].includes(state.phase)){
    ctx.drawImage(images.get('ptarmigan.webp'),bushX-42,floor-329,84,56);
    ctx.save();ctx.beginPath();ctx.rect(bushX-50,floor-299,100,35);ctx.clip();ctx.globalAlpha*=.75;
    ctx.drawImage(images.get('distant-shrub.webp'),bushX-115,floor-345,230,100);ctx.restore();
  }
  ctx.restore();
  if(['flight','aim2'].includes(state.phase)){
    const x=birdX+Math.min(flightTime,1.3)*40+Math.sin(flightTime*1.5)*25-cameraX;
    const y=floor-280-Math.min(flightTime,1.1)*90+Math.sin(flightTime*3)*8;
    const frame=Math.floor(flightTime/.16)%4;
    ctx.drawImage(images.get('bird-flight.webp'),frame*543,0,543,724,x-65,y-60,130,120);
  }
  if(state.phase==='hitfx'){
    const x=birdX+52+Math.sin(flightTime*1.5)*25-cameraX;
    const y=floor-379+Math.min(hitTime,1)*80;
    const frame=Math.floor(hitTime/.16)%4;
    ctx.globalAlpha=Math.max(0,1-hitTime/1.2);ctx.drawImage(images.get('bird-flight.webp'),frame*543,0,543,724,x-60,y-50,120,105);ctx.globalAlpha=1;
  }
  ctx.save();ctx.globalAlpha=(1-blend)*(1-riverBlend);ctx.drawImage(images.get('blueberry-bush.webp'),berryX-cameraX-112,floor-185,224,188);ctx.restore();
  if(!state.picked){ctx.fillStyle='#435673';ctx.strokeStyle='#202c39';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(berryX-cameraX-8,floor-112,5,0,Math.PI*2);ctx.fill();ctx.stroke();}
  const x=state.x-cameraX, moving=!!(keyboardDirection||pointerDirection)&&['walk','done'].includes(state.phase);
  const wade=fishStage==='travel'?0:fishStage==='wading'?wadeProgress:1;
  const actorX=x-22.5*wade,actorFloor=floor-26*wade,actorScale=1-.045*wade;
  let rodGeometry=null;
  ctx.save();ctx.translate(actorX,actorFloor);ctx.scale(state.facing*actorScale,actorScale);
  if(fishStage==='filling') {
    const pose=fishTime<1.1?0:fishTime<5?1:2;
    ctx.drawImage(images.get('bottle-action-sheet.webp'),pose*725,0,725,724,-117.5,-235,235,235);
  } else if(fishStage==='done') {
    ctx.drawImage(images.get('bottle-action-sheet.webp'),1450,0,725,724,-117.5,-235,235,235);
  } else if(fishStage==='unhook'||fishStage==='caught') {
    const pose=fishStage==='caught'?2:fishTime<1.5?0:fishTime<3?1:2;
    ctx.drawImage(images.get('fish-unhook-sheet.webp'),pose*725,0,725,724,-110,-350,350,350);
  } else if(['ready','casting','bite','reeling'].includes(fishStage)) {
    rodGeometry=FishingRig.draw(ctx,images,fishStage,fishTime);
  } else if(['wading','arrival'].includes(fishStage)) {
    // Use complete original poses, avoiding cut seams through waist and legs.
    const im=images.get('wading-neutral-sheet.webp'),frame=moving?Math.floor(state.stride/.22)%4:1;
    ctx.drawImage(im,frame*543,0,543,724,-112.5,-300,225,300);
  } else if(wolfStage==='raising') {
    ctx.drawImage(images.get('hunter-aim.webp'),-92,-300,189,300);
  } else if(wolfStage==='retreating') {
    ctx.drawImage(images.get('wolf-warning.webp'),-100,-300,200,300);
  } else if(['aim1','flight','aim2','hitfx','hit'].includes(state.phase)) {
    ctx.drawImage(images.get('hunter-aim.webp'),-92,-300,189,300);
  } else if(picking){
    let t=picking.elapsed, pose=t<.24?0:t<.48?1:t<.72?2:t<1.42?3:t<1.66?2:t<1.9?1:0;
    ctx.drawImage(images.get('picking-sheet.webp'),pose*543,0,543,724,-112.5,-300,225,300);
  }else if(moving){ctx.drawImage(images.get('walking-sheet.webp'),(Math.floor(state.stride/.15)%4)*543,0,543,724,-112.5,-300,225,300);}
  else ctx.drawImage(images.get('picking-sheet.webp'),0,0,543,724,-112.5,-300,225,300);
  ctx.restore();
  if(wade>0&&fishStage!=='filling'){
    ctx.save();ctx.globalAlpha=.48*wade;ctx.beginPath();ctx.rect(actorX-60,actorFloor-22,120,25);ctx.clip();ctx.drawImage(images.get('river-reference-v3.webp'),0,0,W*1.3,H);ctx.restore();
    ctx.save();ctx.strokeStyle='rgba(208,223,216,.28)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(actorX,actorFloor-21,39,6,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(fishStage==='filling'&&fishTime>=1.1&&fishTime<5){
    ctx.save();ctx.strokeStyle='rgba(223,233,220,.48)';ctx.lineWidth=1.2;
    const radius=8+(fishTime%1.2)*8;ctx.beginPath();
    ctx.ellipse(actorX+80*actorScale,actorFloor-25*actorScale,radius,radius*.23,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(rodGeometry&&['arrival','ready','casting','bite','reeling'].includes(fishStage)){
    const tipX=actorX+rodGeometry.tip.x*actorScale,tipY=actorFloor+rodGeometry.tip.y*actorScale;
    const handX=actorX+rodGeometry.hand.x*actorScale,handY=actorFloor+rodGeometry.hand.y*actorScale;
    const release=1.1,cast=fishStage==='casting'?Math.max(0,Math.min(1,(fishTime-release)/1.65)):1;
    const farX=W-40,farY=actorFloor-58;
    let endX=tipX,endY=tipY+24;
    if(fishStage==='bite'){endX=farX;endY=farY;}
    if(fishStage==='casting'&&fishTime>=release){const u=cast;endX=tipX+(farX-tipX)*u;endY=tipY+(farY-tipY)*u-100*Math.sin(Math.PI*u);}
    if(fishStage==='reeling'){const u=Math.min(1,fishTime/4),pull=u*u*(3-2*u);endX=farX+(handX-farX)*pull;endY=farY+(handY+35-farY)*Math.max(0,(u-.7)/.3);}
    ctx.save();ctx.strokeStyle='rgba(30,41,38,.78)';ctx.lineWidth=1.05;ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo((tipX+endX)/2,(tipY+endY)/2+((fishStage==='casting'&&cast<1)?14:2),endX,endY);ctx.stroke();
    if(fishStage==='casting'&&fishTime>=release&&cast<1){ctx.fillStyle='#c5b39a';ctx.fillRect(endX-1,endY-1,3,3);}
    if(fishStage==='bite'||fishStage==='casting'&&cast===1){const r=8+(sceneTime*14)%18;ctx.strokeStyle='rgba(218,229,226,.5)';ctx.beginPath();ctx.ellipse(farX,farY,r,r*.18,0,0,Math.PI*2);ctx.stroke();}
    if(fishStage==='reeling'&&fishTime>.5){const u=Math.min(1,fishTime/4);ctx.translate(endX,endY);ctx.rotate(Math.max(0,(u-.7)/.3)*Math.PI/2+.07*Math.sin(sceneTime*5));ctx.drawImage(images.get('grayling.webp'),-2,-8,48,17);}
    ctx.restore();
  }
  for(const f of feathers){ctx.save();ctx.translate(f.x-cameraX,f.y-backgroundY);ctx.rotate(f.angle+f.age*3);ctx.globalAlpha=Math.max(0,1-f.age/f.life);ctx.fillStyle='#eee8d6';ctx.beginPath();ctx.ellipse(0,0,7,2.4,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  ctx.restore();
}
function drawIntro(t){
  const bg=images.get('baseline-aerial-clean.webp'), walk=images.get('walking-sheet.webp');
  const approach=Math.max(0,Math.min(1,(t-3)/5));
  const smooth=approach*approach*(3-2*approach);
  // A moving character is composited separately from the still landscape.
  const px=230+t*8, py=655;
  const scale=1+1.65*smooth;
  const camX=(540-540/scale)*0.50,camY=(960-960/scale)*0.68;
  ctx.save();ctx.scale(scale,scale);ctx.translate(-camX,-camY);
  ctx.drawImage(bg,0,0,540,960);
  const h=40, w=30, frame=Math.floor(t/.15)%4;
  ctx.drawImage(walk,frame*543,0,543,724,px-w/2,py-h,w,h);
  ctx.restore();
  // Dissolve to the existing ground-level scene, with its same walking actor.
  if(t>7){ctx.save();ctx.globalAlpha=Math.min(1,(t-7)/.7);ctx.drawImage(images.get('baseline-intro-closeup-v1.webp'),0,0,W,H);ctx.restore();}
  if(t>10){ctx.save();ctx.globalAlpha=Math.min(1,(t-10)/.8);draw(true);ctx.restore();}
}
function tick(now){
 const keys=requiredGroups();
 if(!StagedAssets.requireGroups(keys,images,()=>{previousTime=0;requestAnimationFrame(tick);})){previousTime=0;pointerDirection=keyboardDirection=0;joystickPointer=null;knob.style.transform='translate(-50%, -50%)';joystick.setAttribute('aria-valuenow','0');campAudio.update('none',0);wind.pause();river.pause();currentAmbience=null;return;}
 if(!document.documentElement.dataset.firstFrame)document.documentElement.dataset.firstFrame=String(performance.now()-Number(document.documentElement.dataset.testStart));
 const delta=new URLSearchParams(location.search).has('review-still')?0:(previousTime?Math.min((now-previousTime)/1000,.05):0);previousTime=now;
 if(Camp.active){syncAmbience();Camp.step(document.hidden||new URLSearchParams(location.search).has('review-still')?0:delta);requestAnimationFrame(tick);return;}
 if(introActive){
  syncAmbience();introTime+=delta; state.stride+=delta; drawIntro(introTime);
  if(introTime>=10.8){introActive=false;controls.style.visibility='visible';document.documentElement.dataset.interactive=String(performance.now()-Number(document.documentElement.dataset.testStart));save();}
  requestAnimationFrame(tick);return;
 }
 sceneTime+=delta;syncAmbience();
 if(picking){picking.elapsed+=delta;if(picking.elapsed>=2.75){state.picked=true;picking=null;save();}}
 if(wolfStage==='waiting'&&state.picked&&!picking&&state.x>=385&&berryWalkTime>=1.2){wolfStage='distant';keyboardDirection=0;resetJoystick();}
 if(wolfStage==='raising'){wolfTime+=delta;if(wolfTime>=.8){wolfStage='scope';}}
 if(wolfStage==='retreating'){wolfTime+=delta;if(wolfTime>=2.5){wolfStage='cleared';wolfClearX=state.x;wolfWalkTime=0;keyboardDirection=0;resetJoystick();save();}}
 if(state.phase==='flight'||state.phase==='aim2') flightTime+=delta;
 if(state.phase==='flight'&&flightTime>=1.4){state.phase='aim2';save();}
 if(state.phase==='hitfx'){hitTime+=delta;if(hitTime>=1.5){state.phase='hit';save();}}
 if(fishStage==='travel'&&state.phase==='done'&&state.x>=675){fishStage='wading';fishTime=0;wadeProgress=0;}
 if(fishStage==='wading'){const d=pointerDirection||keyboardDirection;if(d){if(!info.hidden)hideInfo();wadeProgress=Math.max(0,Math.min(1,wadeProgress+d*delta/1.35));state.stride+=delta;}if(wadeProgress>=1){fishStage='arrival';keyboardDirection=0;resetJoystick();fishTime=0;}}
 if(fishStage==='casting'){fishTime+=delta;if(fishTime>=3.5){fishStage='bite';}}
 if(fishStage==='reeling'){fishTime+=delta;if(fishTime>=4){fishStage='unhook';fishTime=0;state.fishCollected=true;showInfo('阿拉斯加茴鱼：喜欢寒冷清澈的河流 阿拉斯加代表性淡水鱼，背鳍如彩色风帆，寿命最长可达32年。');save();}}
 if(fishStage==='unhook'){fishTime+=delta;if(fishTime>=4.5){fishStage='caught';fishTime=0;}}
 if(fishStage==='filling'){fishTime+=delta;if(fishTime>=7.2){fishStage='done';Camp.start();save();requestAnimationFrame(tick);return;}}
 if(state.phase==='processing'){
  processTime+=delta;
  if(processTime<3&&Math.random()<delta*6)scatter(cameraX+90,backgroundY+305,1);
  if(processTime>=4.2){state.phase='shorewalk';shoreTime=0;keyboardDirection=0;resetJoystick();}
 }
 if(state.phase==='shorewalk'){shoreTime+=delta;if(shoreTime>=4){state.phase='done';state.x=675;state.facing=1;shoreTime=4;save();requestAnimationFrame(tick);return;}}
 for(const f of feathers){f.age+=delta;f.x+=f.vx*delta;f.y+=f.vy*delta;f.vy+=35*delta;}feathers=feathers.filter(f=>f.age<f.life);
 const targetZoom=state.phase==='processing'?1:0; zoom+=(targetZoom-zoom)*Math.min(1,delta*3);
 const direction=(state.phase==='walk'||state.phase==='done')&&!picking&&!berryPreview&&['waiting','cleared'].includes(wolfStage)&&fishStage==='travel'?(pointerDirection||keyboardDirection):0;
 if(direction){if(!info.hidden)hideInfo();state.facing=direction;const limit=state.phase==='walk'&&wolfStage==='cleared'?birdX-150:(state.picked?worldWidth-70:berryX-55);const oldX=state.x;const wolfApproach=direction>0&&state.phase==='walk'&&wolfStage==='cleared'&&wolfWalkTime<1.2&&wolfClearX!==null;const speed=wolfApproach?Math.min(185,Math.max(5,(limit-wolfClearX)/1.21)):185;state.x=Math.max(70,Math.min(limit,state.x+direction*speed*delta));if(state.picked&&wolfStage==='waiting'&&state.x>oldX)berryWalkTime=Math.min(1.2,berryWalkTime+delta);if(wolfStage==='cleared'&&state.phase==='walk'&&state.x>oldX)wolfWalkTime=Math.min(1.2,wolfWalkTime+delta);state.stride+=delta;}
 cameraX=Math.max(0,Math.min(worldWidth-W,state.x-W*.42));if(state.phase==='done')cameraX+=100*Math.max(0,Math.min(1,(state.x-590)/110));updateUI();draw();requestAnimationFrame(tick);
}
document.addEventListener('pointerdown', e=>{if(e.target.closest('#joystick,button'))hideInfo();},true);
window.addEventListener('keydown', e=>{if(['ArrowLeft','ArrowRight',' ','e','E'].includes(e.key))hideInfo();},true);
let joystickPointer=null;
function resetJoystick(){joystickPointer=null;pointerDirection=0;knob.style.transform='translate(-50%, -50%)';joystick.setAttribute('aria-valuenow','0');}
function joystickMove(e){if(e.pointerId!==joystickPointer)return;const r=joystick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),limit=r.width*.28,x=Math.max(-limit,Math.min(limit,dx));knob.style.transform=`translate(calc(-50% + ${x}px), -50%)`;pointerDirection=Math.abs(x)<r.width*.06?0:(x>0?1:-1);joystick.setAttribute('aria-valuenow',String(pointerDirection));}
function joystickStop(e){if(e.pointerId!==joystickPointer)return;joystickPointer=null;pointerDirection=0;knob.style.transform='translate(-50%, -50%)';joystick.setAttribute('aria-valuenow','0');save();}
joystick.addEventListener('pointerdown',e=>{if(Camp.active||introActive||picking||!['walk','done'].includes(state.phase))return;e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystickMove(e);});
joystick.addEventListener('pointermove',joystickMove);joystick.addEventListener('pointerup',joystickStop);joystick.addEventListener('pointercancel',joystickStop);joystick.addEventListener('lostpointercapture',joystickStop);
for(const [button,direction] of [[left,-1],[right,1]]){
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(Camp.active||introActive||picking||!['walk','done'].includes(state.phase))return;button.setPointerCapture(e.pointerId);pointerDirection=direction;});
 const stop=()=>{if(pointerDirection===direction)pointerDirection=0;save();};
 button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('lostpointercapture',stop);
}
window.addEventListener('keydown',e=>{
 if(Camp.active||introActive||picking||!['walk','done'].includes(state.phase))return;
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();keyboardDirection=e.key==='ArrowLeft'?-1:1;}
 if((e.key===' '||e.key.toLowerCase()==='e')&&!e.repeat){e.preventDefault();pick();}
});
window.addEventListener('keyup',e=>{if((e.key==='ArrowLeft'&&keyboardDirection===-1)||(e.key==='ArrowRight'&&keyboardDirection===1)){keyboardDirection=0;save();}});
function stop(){Camp.pause();pointerDirection=keyboardDirection=0;joystickPointer=null;knob.style.transform='translate(-50%, -50%)';joystick.setAttribute('aria-valuenow','0');previousTime=0;save();}
window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();syncAmbience();});


function requiredGroups(){
 if(Camp.active){
  const snap=Camp.snapshot(), stage=Camp.stage;
  const map={search:'search',arrived:'search',pitching:'pitch',ropeReady:'pitch',tying:'rope',bedReady:'rope',bedding:'bed',fireReady:'bed',finished:'bed',lighting:'fire',teaReady:'fire',brewing:'tea',rest:'rest',cooking:'dinner',dinnerReady:'dinner',eating:'eating',fireside:'ending',pullback:'ending',ending:'ending'};
  const next={search:'pitch',pitching:'rope',tying:'rope',bedding:'bed',lighting:'fire',brewing:'rest',cooking:'dinner',eating:'ending',pullback:'ending'};
  const out=[map[stage]||'search'];
  if((stage==='search'&&snap.travel>5.7)||(stage!=='search'&&snap.progress>.94))if(next[stage])out.push(next[stage]);
  return out;
 }
 if(introActive){const out=['intro'];if(introTime>=6.8)out.push('close');if(introTime>=9.8)out.push('ground');return out;}
 if(state.phase==='shorewalk')return ['hunt','shoreWalk','ground','wolf','river'];
 if(['aim1','aim2','flight','hitfx','hit','processing'].includes(state.phase)){const out=['hunt'];if(state.phase==='processing'&&processTime>3.9)out.push('shoreWalk','ground','wolf','river');return out;}
 const out=['ground'];
 if(berryPreview||picking)out.push('berry');
 if(state.picked||wolfStage!=='waiting')out.push('wolf');
 if(state.phase==='done'&&(state.x>560||fishStage!=='travel'))out.push('river');
 if(fishStage==='filling'&&fishTime>6.9)out.push('search');
 return out;
}
Camp.init({ctx,images,canvas,button:campButton,onSound:()=>campAudio.strike(),onSave:save,onEnter:()=>{
 introActive=false;controls.style.visibility='hidden';pointerDirection=keyboardDirection=0;
 state.phase='done';fishStage='done';state.picked=state.birdCollected=state.fishCollected=true;
 updateUI();syncAmbience();
}});
if(campPreview){if(!(new URLSearchParams(location.search).has('resume')&&restoredCamp&&Camp.restore(restoredCamp)))Camp.start();}
else if(restoredCamp&&!['birdinfo','fishinfo','fishing','river','aim','berrywalk','processing','shorewalk'].includes(new URLSearchParams(location.search).get('review')))Camp.restore(restoredCamp);
else if(fishStage==='done'&&!['birdinfo','fishinfo','fishing','river','aim','berrywalk','processing','shorewalk'].includes(new URLSearchParams(location.search).get('review')))Camp.start();
const reviewStage=new URLSearchParams(location.search).get('review');
if(reviewStage==='ending'){Camp.restore({stage:'pullback',progress:.98,travel:6});}
if(reviewStage==='processing'){introActive=false;controls.style.visibility='visible';state.phase='processing';state.x=600;state.picked=true;state.birdCollected=true;wolfStage='cleared';fishStage='travel';processTime=Number(new URLSearchParams(location.search).get('seconds'))||0;}
if(reviewStage==='shorewalk'){introActive=false;controls.style.visibility='visible';state.phase='shorewalk';state.x=600;state.picked=true;state.birdCollected=true;wolfStage='cleared';fishStage='travel';shoreTime=Math.max(0,Math.min(4,Number(new URLSearchParams(location.search).get('seconds'))||0));}
if(reviewStage==='berrywalk'){introActive=false;controls.style.visibility='visible';state.x=330;state.phase='walk';state.picked=true;berryWalkTime=0;wolfStage='waiting';fishStage='travel';}
if(reviewStage==='birdinfo'){introActive=false;controls.style.visibility='visible';state.x=600;state.phase='walk';state.picked=true;wolfStage='cleared';fishStage='travel';birdInfoShown=false;}
if(reviewStage==='fishing'){introActive=false;controls.style.visibility='visible';state.x=700;state.phase='done';state.picked=true;wolfStage='cleared';fishStage='arrival';wadeProgress=1;}
if(reviewStage==='fishinfo'){introActive=false;controls.style.visibility='visible';state.x=700;state.phase='done';state.picked=true;wolfStage='cleared';fishStage='unhook';fishTime=3.5;}
if(['pitching','tying','bedding','cooking','lighting','rest'].includes(reviewStage)){const p=new URLSearchParams(location.search).get('progress');Camp.restore({stage:reviewStage,progress:p===null?.78:Math.max(0,Math.min(1,Number(p)||0)),travel:6});}
if(reviewStage==='river'){introActive=false;controls.style.visibility='visible';state.x=560;state.picked=true;state.birdCollected=true;state.phase='done';wolfStage='cleared';fishStage='travel';}
if(reviewStage==='aim'){introActive=false;controls.style.visibility='visible';state.x=650;state.picked=true;state.phase='noticed';wolfStage='cleared';fishStage='travel';}
if(!reviewStage&&introHasSave&&!Camp.active&&['noticed','aim1','flight','aim2'].includes(state.phase)){
 showInfo('柳雷鸟：阿拉斯加州鸟，冬季羽毛雪白，夏季褐色，耐严寒，善伪装，常在地面觅食。');birdInfoPinned=true;birdInfoShown=true;
}
updateUI();
const startGroup=requiredGroups()[0];
if(StagedAssets.requireGroups(requiredGroups(),images,()=>{requestAnimationFrame(tick);StagedAssets.background(images,startGroup);})){requestAnimationFrame(tick);StagedAssets.background(images,startGroup);}
syncAmbience();
