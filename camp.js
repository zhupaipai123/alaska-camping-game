'use strict';
// Each click owns one bounded action. Scene objects keep their positions between actions.
const Camp=(()=>{
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const mix=(a,b,t)=>a+(b-a)*t;
 const ease=t=>(t=clamp(t))*t*(3-2*t);
 const labels={arrived:'搭帐篷',pitching:'搭帐篷',ropeReady:'拉风绳',tying:'拉风绳',bedReady:'铺睡垫和睡袋',bedding:'铺睡垫和睡袋',fireReady:'去点篝火',lighting:'去点篝火',teaReady:'煮蓝莓茶',brewing:'煮蓝莓茶',rest:'准备晚餐',dinnerReady:'吃晚餐',fireside:'美妙的大自然'};
 const duration={pitching:6.5,tying:9.5,bedding:5.5,lighting:4.8,brewing:8-5.6/6,cooking:12.4,eating:6,pullback:7};
 let onSound=()=>{};
 let ctx,images,button,canvas,onSave,onEnter,stage='none',progress=0,travel=0,clock=0,entry=null,saveClock=0,endingSeconds=0;
 const cached=new Map();
 function init(o){onSound=o.onSound||(()=>{});({ctx,images,button,canvas,onSave,onEnter}=o);button.addEventListener('click',begin);syncUI();}
 function begin(){const next={arrived:'pitching',ropeReady:'tying',bedReady:'bedding',fireReady:'lighting',teaReady:'brewing',rest:'cooking',dinnerReady:'eating',fireside:'pullback'}[stage];if(!next)return;stage=next;progress=0;syncUI();onSave();}
 function pause(){if(onSave)onSave();} // browser visibility pauses dt, never cancels the chosen step
 function start(){entry=document.createElement('canvas');entry.width=540;entry.height=960;entry.getContext('2d').drawImage(canvas,0,0);stage='search';travel=progress=0;onEnter();syncUI();onSave();}
 function restore(s){if(!s||!['search','arrived','pitching','ropeReady','tying','bedReady','bedding','finished','fireReady','lighting','teaReady','brewing','rest','cooking','dinnerReady','eating','fireside','pullback','ending'].includes(s.stage))return false;stage=s.stage;progress=clamp(Number(s.progress)||0);travel=clamp(Number(s.travel)||0,0,6);onEnter();syncUI();return true;}
 function snapshot(){return {version:3,stage,progress,travel};}
 function syncUI(){button.hidden=!labels[stage]||!!duration[stage];button.disabled=!!duration[stage];if(labels[stage])button.textContent=labels[stage];button.setAttribute?.('aria-busy',duration[stage]?'true':'false');const caption=document.querySelector('#search-caption');caption.hidden=!['search','rest'].includes(stage);caption.classList.toggle('rest-caption',stage==='rest');caption.textContent=stage==='rest'?'休息一会':'寻找露营地点';}
 function step(dt){
  if(stage==='none')return false;dt=Math.max(0,Number(dt)||0);clock+=dt;saveClock+=dt;if(stage==='ending')endingSeconds+=dt;
  if(stage==='search'){travel=clamp(travel+dt,0,6);if(travel===6){stage='arrived';syncUI();onSave();}}
  else if(duration[stage]){const before=progress;progress=clamp(progress+dt/duration[stage]);if(stage==='lighting'){for(const t of [.38,1.50])if(before*4.8<t&&progress*4.8>=t)onSound('strike');}if(progress>=1){stage={pitching:'ropeReady',tying:'bedReady',bedding:'fireReady',lighting:'teaReady',brewing:'rest',cooking:'dinnerReady',eating:'fireside',pullback:'ending'}[stage];progress=0;if(stage==='ending')endingSeconds=0;syncUI();onSave();}}
  if(saveClock>.5){saveClock=0;onSave();}
  const desc=document.querySelector('#action-caption');if(desc){let txt='';if(stage==='cooking'){txt=progress<1.5/12.4?'架烤盘':progress<2.8/12.4?'倒油':progress<5.2/12.4?'放入鱼和雷鸟肉':progress<10/12.4?'煎制':'盛盘';}else if(stage==='eating')txt='吃晚餐';desc.hidden=!txt;desc.textContent=txt;}render();return true;
 }
 function shadow(x,y,w,alpha=.18){ctx.save();ctx.fillStyle=`rgba(28,30,24,${alpha})`;ctx.beginPath();ctx.ellipse(x,y,w,w*.12,0,0,Math.PI*2);ctx.fill();ctx.restore();}
 function cover(name){const im=images.get(name),s=Math.max(540/im.width,960/im.height);ctx.drawImage(im,(540-im.width*s)/2,(960-im.height*s)/2,im.width*s,im.height*s);}
 function route(t){
  const pts=[[220,790],[455,740],[715,687],[1040,675]],q=clamp(t/5.65)*3,i=Math.min(2,Math.floor(q)),f=q-i;
  const x=mix(pts[i][0],pts[i+1][0],f),y=mix(pts[i][1],pts[i+1][1],ease(f));return {x,y,camera:clamp(x-150,0,900)};
 }
 function panorama(camera=890){ctx.drawImage(images.get('baseline-shore-camp-panorama.webp'),-camera,0,1440,960);}
 function cell(name,i,cols=4,rows=1){const key=`${name}:${i}:${cols}:${rows}`;if(cached.has(key))return cached.get(key);const im=images.get(name),w=im.width/cols,h=im.height/rows,c=document.createElement('canvas');c.width=543;c.height=724;const g=c.getContext('2d');g.drawImage(im,(i%cols)*w,Math.floor(i/cols)*h,w,h,0,0,543,724);cached.set(key,c);return c;}
 function walker(x,y,h,t,settle=0){
  const walk=images.get('walking-sheet.webp'),sw=walk.width/4;
  const cycle=t/.66,frame=Math.floor(cycle*4)%4;
  const bob=Math.sin(cycle*Math.PI*4)*1.5*(1-settle);
  if(settle<.5){ctx.drawImage(walk,frame*sw,0,sw,walk.height,x-h*sw/walk.height/2,y-h+bob,h*sw/walk.height,h);}
  if(settle>=.5){drawPrep(0,x-123,y-409,337.5,450);}
 }
 function search(){const r=route(travel);panorama(r.camera);const x=r.x-r.camera,y=r.y;
  shadow(x,y-2,46,.12);walker(x,y,285,travel,ease((travel-5.5)/.5));
  const depth=28*(1-ease(travel/1.65));
  if(depth>0){ctx.save();ctx.beginPath();ctx.rect(x-60,y-depth,120,depth+5);ctx.clip();ctx.globalAlpha=.73;panorama(r.camera);ctx.restore();ctx.save();ctx.strokeStyle='#c8d2ccaa';ctx.lineWidth=1.3;for(let i=0;i<3;i++){const rad=16+(travel*27+i*13)%38;ctx.globalAlpha=(1-travel/1.65)*.55;ctx.beginPath();ctx.ellipse(x,y-depth,rad,rad*.19,0,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  if(entry&&travel<.65){ctx.save();ctx.globalAlpha=1-ease(travel/.65);ctx.drawImage(entry,0,0);ctx.restore();}
 }
 // Unpacking atlas is normalized by its ground contact, not by opaque bounding-box height.
 const prepRects=[[0,0,384,512],[384,0,384,512],[768,0,384,512],[1152,0,384,512],[0,512,320,512],[320,512,320,512],[640,512,368,512],[1008,512,528,512]];
 const prepOffsets=[0,32,54,93,88,91,13,9];
 function prepFrame(i){const key='prep'+i;if(cached.has(key))return cached.get(key);const c=document.createElement('canvas');c.width=543;c.height=724;const g=c.getContext('2d'),r=prepRects[i],s=1.1;g.drawImage(images.get('baseline-unpack-atlas.webp'),...r,prepOffsets[i],140,r[2]*s,r[3]*s);cached.set(key,c);return c;}
 const prepPose=[
 [[260,206],[255,270],[246,362],[230,470],[241,573],[238,657],[300,657],[315,435],[273,448],[170,373]],
 [[254,207],[249,270],[242,362],[230,470],[233,573],[235,657],[300,657],[250,312],[245,361],[327,430]],
 [[266,248],[252,300],[225,385],[230,482],[231,575],[231,657],[293,657],[292,435],[322,424],[345,505]],
 [[265,350],[243,396],[207,449],[217,520],[230,592],[230,657],[298,657],[301,470],[325,461],[350,545]],
 [[244,352],[220,397],[188,443],[208,521],[231,588],[230,657],[296,657],[265,433],[286,400],[350,545]],
 [[267,383],[241,425],[204,469],[208,531],[230,600],[230,657],[296,657],[291,601],[255,596],[350,545]],
 [[247,394],[225,440],[178,490],[198,560],[218,621],[231,657],[296,657],[306,590],[249,620],[60,545]],
 [[267,414],[242,460],[190,501],[196,570],[216,628],[231,657],[296,657],[317,630],[274,635],[60,545]]
 ];
 function drawPrep(p,x=27,y=266,w=337.5,h=450){const i=Math.min(7,Math.floor(clamp(p)*8));ctx.drawImage(prepFrame(i),x,y,w,h);}
 function pack(){const im=images.get('baseline-unpack-atlas.webp');ctx.drawImage(im,1022,758,90,225,32,543,53,132);}
 const pitchPose=[
 [[110,280],[110,338],[110,390],[130,480],[110,575],[90,646],[168,648],[230,476],[212,567],[224,654],[520,654],[380,590]],
 [[106,225],[106,300],[105,360],[105,440],[92,540],[90,646],[168,648],[230,375],[219,493],[224,654],[520,654],[380,514]],
 [[161,151],[161,230],[124,305],[123,403],[90,533],[90,646],[168,648],[231,296],[212,427],[224,654],[520,654],[380,447]],
 [[137,86],[137,164],[105,240],[109,357],[100,505],[90,646],[168,648],[230,236],[213,369],[224,654],[520,654],[380,400]]
 ];
 function pitchImage(p){const i=Math.min(3,Math.floor(clamp(p)*4));ctx.drawImage(cell('baseline-pitch-rope-atlas.webp',i,4,2),82,337,375,375);}
 function atlasFrame(name,index,cols,rows){
  const im=images.get(name),sw=im.width/cols,sh=im.height/rows;
  const sx=(index%cols)*sw+2,sy=Math.floor(index/cols)*sh+2,iw=sw-4,ih=sh-4;
  const scale=Math.max(540/iw,960/ih),w=iw*scale,h=ih*scale;
  ctx.fillStyle="#30352f";ctx.fillRect(0,0,540,960);ctx.drawImage(im,sx,sy,iw,ih,(540-w)/2,(960-h)/2,w,h);
  // Overlay only the eyes/upper face; retain the original action, props and scenery.
  const faces={
   'unified-cooking.png':{asset:'face-cooking-reference.png',indices:[2],cx:283,cy:335,rx:37,ry:36},
   'eating-lift-v1.png':{asset:'face-eating-lift-reference.png',indices:[0,1,2,3],cx:226,cy:339,rx:38,ry:36},
   'unified-eating.png':{asset:'face-eating-reference.png',indices:[2,3],cx:226,cy:339,rx:38,ry:36}
  },face=faces[name];
  if(face&&face.indices.includes(index)){
   const dx=(540-w)/2,dy=(960-h)/2,fx=dx+(face.cx-2)*scale,fy=dy+(face.cy-2)*scale;
   ctx.save();ctx.beginPath();ctx.ellipse(fx,fy,face.rx*scale,face.ry*scale,0,0,Math.PI*2);ctx.clip();
   ctx.drawImage(images.get(face.asset),sx,sy,iw,ih,dx,dy,w,h);ctx.restore();
  }
 }
 function sequence(name,p,cols,rows){
  const n=cols*rows,i=Math.min(n-1,Math.floor(clamp(p)*n));
  atlasFrame(name,i,cols,rows);
 }
 function pitch(p){panorama();const seconds=p*12;shadow(260,707,190,.13);
  if(seconds<7.5){drawPrep(ease(seconds/7.5));}
  else {pack();const u=ease((seconds-7.5)/4.5);pitchImage(u);}
 }
 const ropePose=[
 [[228,58],[222,138],[218,230],[226,385],[202,535],[187,687],[295,687],[314,275],[301,300]],
 [[239,100],[235,183],[210,265],[228,410],[206,545],[187,687],[295,687],[319,336],[310,358]],
 [[269,190],[266,270],[230,340],[253,478],[184,610],[124,676],[289,660],[330,496],[312,553]],
 [[298,245],[291,320],[240,390],[234,507],[178,616],[124,676],[289,660],[328,607],[352,611]]
 ];
 function ropeState(p){const i=Math.min(3,Math.floor(clamp(p)*4)),a=ropePose[i][7];return {x:188+a[0]/543*282,y:445+a[1]/724*282};}
 function tentOnly(){const tent=images.get('baseline-camp-tent.webp');ctx.drawImage(tent,30,473,280,200);}
 function ropeScene(p){
  panorama();tentOnly();shadow(328,707,83,.13);
  const hand=ropeState(p),anchor={x:210,y:486},stake={x:358,y:676},slack=18*(1-ease(p/.78));
  // Draw the line behind the character so it does not appear painted across his clothes.
  ctx.save();ctx.lineCap='round';ctx.strokeStyle='#56482c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.quadraticCurveTo((anchor.x+hand.x)/2,(anchor.y+hand.y)/2+slack,hand.x,hand.y);ctx.stroke();ctx.strokeStyle='#e5ca77';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  const atlas=images.get('baseline-pitch-rope-atlas.webp'), frame=Math.min(3,Math.floor(clamp(p)*4)), sw=atlas.width/4, sh=atlas.height/2;
  ctx.drawImage(atlas,frame*sw,sh,sw,sh,188,445,282,282);
  ctx.save();ctx.strokeStyle='#e5ca77';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hand.x-9,hand.y-3);ctx.lineTo(hand.x,hand.y);ctx.stroke();if(p>.72){ctx.strokeStyle='#676458';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(stake.x,stake.y+12);ctx.lineTo(stake.x-4,stake.y-4);ctx.stroke();ctx.strokeStyle='#e5ca77';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hand.x,hand.y);ctx.lineTo(stake.x,stake.y);ctx.stroke();}ctx.restore();
 }
 function tying(p){const sec=p*9.5;if(sec<3.5)ropeScene(ease(sec/3.5));else sequence('approved-rope-gear-20261118.png',clamp((sec-3.5)/6),3,2);}
 const bedPose=[
 [[246,72],[260,168],[285,249],[342,387],[308,530],[294,679],[432,662],[124,552],[225,581]],
 [[207,166],[231,245],[300,316],[354,399],[318,546],[294,679],[432,662],[71,610],[188,658]],
 [[260,70],[269,168],[293,246],[357,385],[313,533],[294,679],[432,662],[72,267],[267,308]],
 [[202,169],[226,248],[297,319],[353,399],[318,546],[294,679],[432,662],[88,648],[228,674]]
 ];
 function obj(i,x,y,w,h){ctx.drawImage(cell('bedding-layer-atlas.png',i,4,2),x,y,w,h);}
 function bedActor(p){Motion.draw(ctx,'bed-v3',[0,1,2,3].map(i=>cell('bedding-layer-atlas.png',i,4,2)),bedPose,p,205,378,310,400);}
 function beddingScene(p){
  cover('tent-interior-empty.png');const unfold=ease(p/.38),lift=ease((p-.46)/.16),lay=ease((p-.64)/.2);
  shadow(281,774,160,.13);
  // Mat is progressively exposed from head to foot; its roll travels with the unfolding edge.
  const mat={x:77,y:555,w:282,h:310};
  ctx.save();ctx.beginPath();ctx.rect(40,535,355,26+310*unfold);ctx.clip();obj(5,mat.x,mat.y,mat.w,mat.h);ctx.restore();
  if(unfold<1){const rollX=mix(236,115,unfold),rollY=mix(554,758,unfold),shrink=1-ease((unfold-.8)/.2);ctx.save();ctx.globalAlpha=shrink;obj(4,rollX-22,rollY,116,83);ctx.restore();}
  // The rolled bag remains visible while the mat is being unrolled, then moves into the hands.
  if(p<.64){const k=ease((p-.4)/.18);obj(6,mix(24,172,k),mix(707,484,k),102,119);}
  let actorP=p<.38?unfold/3:p<.46?1/3:p<.64?mix(1/3,2/3,lift):mix(2/3,1,lay);
  bedActor(actorP);
  if(p>=.59){const k=ease((p-.59)/.25),bagX=mix(167,92,k),bagY=mix(496,562,k),w=mix(185,262,k),h=mix(190,298,k);
   ctx.save();ctx.globalAlpha=ease((p-.59)/.05);obj(7,bagX,bagY,w,h);ctx.restore();
   // Hands remain in front of the fabric, following the same pose interpolation.
   const q=actorP*3,i=Math.min(2,Math.floor(q)),f=q-i;
   for(const j of [7,8]){const a=bedPose[i][j],b=bedPose[i+1][j],x=205+mix(a[0],b[0],f)/543*310,y=378+mix(a[1],b[1],f)/724*400;ctx.save();ctx.beginPath();ctx.ellipse(x,y,29,17,-.4,0,Math.PI*2);ctx.clip();bedActor(actorP);ctx.restore();}
  }
 }
 function bedding(p){
  const frames=[0,1,2,3,4,5];const i=frames[Math.min(5,Math.floor(clamp(p)*6))];
  const im=images.get('baseline-bedding-consistent.webp'),sw=im.width/3,sh=im.height/2;
  const scale=Math.max(540/sw,960/sh),w=sw*scale,h=sh*scale,x=(540-w)/2,y=(960-h)/2;
  ctx.drawImage(im,(i%3)*sw,Math.floor(i/3)*sh,sw,sh,x,y,w,h);
  // A brief close-up while the mat is being laid, before the sleeping bag.
  if(p>.24&&p<.46){const alpha=Math.min(1,(p-.24)/.03,(.46-p)/.03);ctx.save();ctx.globalAlpha=alpha;cover('baseline-bedding-closeup-v1.webp');ctx.restore();}
 }


 function panel(name,index,cols,rows){
  const im=images.get(name),sw=im.width/cols,sh=im.height/rows;
  // Entry atlas contains an 18px printed gutter; trim that separator only.
  const inset=name.includes('enter-tent-tea')?18:1,iw=sw-2*inset,ih=sh-2*inset,sc=(name==='baseline-fire-scrape-sheet-v1.webp'||name.includes('enter-tent-tea')?Math.max:Math.min)(540/iw,960/ih),w=iw*sc,h=ih*sc;
  ctx.drawImage(im,(index%cols)*sw+inset,Math.floor(index/cols)*sh+inset,iw,ih,(540-w)/2,(960-h)/2,w,h);
 }
 function campfire(t){
  const sec=t*4.8;
  if(sec<2.65){
   const local=sec<1.15?sec:Math.max(0,sec-1.12);
   const frame=Math.min(3,Math.floor(local/.20));
   panel('baseline-fire-scrape-sheet-v1.webp',frame,2,2);
  }else{
   cover('baseline-fire-tending.webp');
   // Subtle moving embers/smoke on the lit pose; no opaque cartoon flame overlay.
   ctx.save();ctx.lineWidth=2;
   for(let i=0;i<5;i++){const u=(clock*.23+i*.2)%1;ctx.globalAlpha=(1-u)*.15;ctx.strokeStyle='#ddd9cc';ctx.beginPath();ctx.moveTo(305+Math.sin(clock+i)*5,795-u*90);ctx.quadraticCurveTo(280+Math.sin(clock*1.2+i)*12,767-u*90,310+Math.sin(clock+i)*10,733-u*90);ctx.stroke();}
   for(let i=0;i<7;i++){const u=(clock*.45+i*.14)%1;ctx.globalAlpha=(1-u)*.65;ctx.fillStyle='#ffc66d';ctx.beginPath();ctx.arc(307+Math.sin(i*4+u*5)*17,821-u*60,1.1,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
 }

 function brewing(p){const seconds=p*(8-5.6/6);if(seconds<2.4){panel('baseline-approved-fire-tea.webp',3,2,2);}else{const step=Math.min(4,Math.floor((seconds-2.4)/(5.6/6)));const frame=step===4?5:step;panel(frame<3?'baseline-enter-tent-tea.webp':'baseline-enter-tent-tea-v2.webp',frame,3,2);}}
 // Full-frame portrait atlas: only trim the 1px panel separator, never crop subjects or blur-fill.
 function portraitPanel(name,index,cols=2,rows=2){
  const im=images.get(name),sw=im.width/cols,sh=im.height/rows;
  const sx=(index%cols)*sw+1,sy=Math.floor(index/cols)*sh+1,iw=sw-2,ih=sh-2;
  const scale=(name==='approved-plating-face-20261118.png'?Math.max:Math.min)(540/iw,960/ih),w=iw*scale,h=ih*scale;
  ctx.fillStyle='#202922';ctx.fillRect(0,0,540,960);
  ctx.drawImage(im,sx,sy,iw,ih,(540-w)/2,(960-h)/2,w,h);
 }
 function dinnerFrame(index){portraitPanel(index===2?'toned-dinner-hands-away-v1.png':'toned-dinner-stone-portrait.png',index);}
 function dinnerShot(i){
  if(i===0)atlasFrame('unified-cooking.png',0,2,2);
  else if(i===1)cover('approved-oil-face-20261118.png');
  else if(i===2)atlasFrame('unified-cooking.png',2,2,2);
  else if(i===3){ctx.save();ctx.filter='brightness(0.88) saturate(0.9) sepia(0.2)';cover('approved-frying-face-20261118.png');ctx.restore();}
  else portraitPanel('approved-plating-face-20261118.png',3);
 }
 function dinner(p){
  const i=p<1.5/12.4?0:p<2.8/12.4?1:p<5.2/12.4?2:p<10/12.4?3:4;
  dinnerShot(i);
 }

 function endingView(p){
  // A 2D pullback anchored on the seated camper: keep the rock and body in frame.
  // This is not a reconstructed 3D drone shot.
  const im=images.get('evening-back-v2.png'),base=Math.max(540/im.width,960/im.height),t=ease(p),zoom=mix(1.65,1,t),w=im.width*base*zoom,h=im.height*base*zoom;
  const y=mix(850-h*.84,(960-h)/2,t);
  ctx.drawImage(im,(540-w)/2,y,w,h);
 }
 function drawCredits(){
  const lines=['主演：不高兴的鲁克','bgm：大自然','导演：pai','剪辑：codex','美术：codex','灵感来源：outdoor boys luke'];
  ctx.save();ctx.font='18px Songti SC, SimSun, serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='rgba(245,238,220,.94)';ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=4;ctx.shadowOffsetY=1;
  const maxWidth=Math.max(...lines.map(line=>ctx.measureText(line).width));const x=(540-maxWidth)/2;
  lines.forEach((line,i)=>ctx.fillText(line,x,275+i*33));ctx.restore();
 }
 function render(){ctx.save();if(['brewing','rest','fireside','pullback','ending'].includes(stage))ctx.filter='saturate(0.8)';ctx.fillStyle='#202922';ctx.fillRect(0,0,540,960);if(stage==='search')search();else if(stage==='arrived'){panorama();shadow(150,673,46,.12);walker(150,675,285,6,1);}else if(stage==='pitching')pitch(progress);else if(stage==='ropeReady')pitch(1);else if(stage==='tying')tying(progress);else if(stage==='bedReady')sequence('approved-rope-gear-20261118.png',1,3,2);else if(stage==='bedding')bedding(progress);else if(stage==='fireReady'||stage==='finished')bedding(1);else if(stage==='lighting')campfire(progress);else if(stage==='teaReady')campfire(1);else if(stage==='brewing')brewing(progress);else if(stage==='rest')cover('baseline-approved-rest.webp');else if(stage==='cooking')dinner(progress);else if(stage==='dinnerReady')portraitPanel('approved-plating-face-20261118.png',3);else if(stage==='eating'){if(progress<2/3)sequence('eating-lift-v1.png',progress*1.5,2,2);else atlasFrame('unified-eating.png',progress<5/6?2:3,2,2);}else if(stage==='fireside')endingView(0);else if(stage==='pullback')endingView(progress);else if(stage==='ending')endingView(1);ctx.restore();if(stage==='ending'&&endingSeconds<4)drawCredits();}


 return {init,start,restore,snapshot,step,pause,get active(){return stage!=='none';},get stage(){return stage;}};
})();
