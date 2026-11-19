'use strict';
// Staged loading for the isolated preview. Original image bytes and canvas pipeline are unchanged.
const StagedAssets=(()=>{
 const inline={
  'approved-frying-baseline-style.png':'./late/frying.js',
  'approved-oil-baseline-style.png':'./late/oil.js',
  'toned-dinner-stone-portrait.png':'./late/stone.js'
 };
 const groups={
  intro:['baseline-aerial-clean.webp','walking-sheet.webp'],
  close:['baseline-intro-closeup-v1.webp'],
  ground:['walk-ground.webp','distant-shrub.webp','ptarmigan.webp','blueberry-bush.webp','picking-sheet.webp','walking-sheet.webp'],
  berry:['blueberry-closeup-reference.png','berry-picking-closeup-v1.png'],
  wolf:['ridge.webp','wolf.webp','hunter-aim.webp','wolf-warning.webp'],
  hunt:['aim-kneel-closeup-v1.png','bird-flight.webp','bird-processing-closeup-v1.png','bird-processing-first-closed.png','bird-processing-second-approved.png'],
  shoreWalk:['shore-approach-approved-20261118.png','walking-sheet.webp','river-reference-v3.webp','wading-neutral-sheet.webp'],
  river:['river-reference-v3.webp','wading-neutral-sheet.webp','fishing-action-sheet.png','fish-unhook-sheet.webp','grayling.webp','bottle-action-sheet.webp'],
  search:['baseline-shore-camp-panorama.webp','baseline-unpack-atlas.webp','walking-sheet.webp'],
  pitch:['baseline-shore-camp-panorama.webp','baseline-unpack-atlas.webp','baseline-pitch-rope-atlas.webp'],
  rope:['baseline-shore-camp-panorama.webp','baseline-camp-tent.webp','baseline-pitch-rope-atlas.webp','unified-rope.png','approved-rope-gear-20261118.png'],
  bed:['baseline-bedding-consistent.webp','baseline-bedding-closeup-v1.webp'],
  fire:['baseline-fire-scrape-sheet-v1.webp','baseline-fire-tending.webp'],
  tea:['baseline-approved-fire-tea.webp','baseline-enter-tent-tea.webp','baseline-enter-tent-tea-v2.webp'],
  rest:['baseline-approved-rest.webp'],
  dinner:['dinner-plating-draft.png','unified-cooking.png','face-cooking-reference.png','approved-oil-face-20261118.png','approved-frying-face-20261118.png','approved-plating-face-20261118.png'],
  eating:['eating-lift-v1.png','face-eating-lift-reference.png','unified-eating.png','face-eating-reference.png'],
  ending:['evening-back-v2.png']
 };
 const order=Object.keys(groups), records=new Map();let active=0, serial=0;
 const box=document.createElement('div');box.style.cssText='position:absolute;inset:0;z-index:100;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.28);';
 const status=document.createElement('button');status.type='button';status.style.cssText='font:16px sans-serif;color:white;background:#303b30;border:1px solid #c4d2bc;border-radius:8px;padding:12px 18px;';box.append(status);
 document.querySelector('.viewport').append(box);
 let retry=null;status.addEventListener('click',()=>{if(retry){const fn=retry;retry=null;fn();}});
 function note(mode){box.style.display=mode?'flex':'none';status.textContent=mode==='error'?'加载失败，请重试':'正在加载…';status.disabled=mode!=='error';status.style.cursor=mode==='error'?'pointer':'default';}
 function single(name){return new Promise((resolve,reject)=>{
  let el,timer,finished=false;
  const done=(err)=>{if(finished)return;finished=true;clearTimeout(timer);if(err){if(el){el.onload=el.onerror=null;if(el.tagName==='SCRIPT')el.remove();else el.src='';}reject(err);}else resolve(el);};
  const image=()=>{el=new Image();el.onload=()=>done();el.onerror=()=>done(new Error('image '+name));el.src=assetURL(name);};
  timer=setTimeout(()=>done(new Error('timeout '+name)),20000);
  if(inline[name]&&!(window.campInlineAssets||{})[name]){el=document.createElement('script');el.onload=image;el.onerror=()=>done(new Error('script '+name));el.src=inline[name];document.head.appendChild(el);}else image();
 });}
 async function attempt(name){let error;for(let i=0;i<2;i++){try{return await single(name);}catch(e){error=e;}}throw error;}
 function pump(){while(active<3){let q=[...records.values()].filter(x=>x.state==='queued').sort((a,b)=>a.priority-b.priority||a.seq-b.seq)[0];if(!q)return;q.state='loading';active++;attempt(q.name).then(im=>{q.state='ready';q.im=im;q.resolve(im);},e=>{q.state='failed';q.reject(e);}).finally(()=>{active--;pump();});}}
 function request(name,priority=20,again=false){let r=records.get(name);if(r&&r.state==='ready')return Promise.resolve(r.im);if(r&&r.state==='failed'&&again){records.delete(name);r=null;}if(r){if(r.state==='queued')r.priority=Math.min(r.priority,priority);return r.promise;}
  r={name,priority,state:'queued',seq:serial++};r.promise=new Promise((resolve,reject)=>{r.resolve=resolve;r.reject=reject;});records.set(name,r);pump();return r.promise;
 }
 function need(names,images,priority=0,again=false){return Promise.all([...new Set(names)].map(n=>request(n,priority,again).then(im=>{images.set(n,im);return im;})));}
 function namesFor(keys){return [...new Set(keys.flatMap(k=>groups[k]||[]))];}
 function ready(keys,images){return namesFor(keys).every(n=>images.has(n));}
 let waiting=false;
 function requireGroups(keys,images,onReady){if(ready(keys,images))return true;if(waiting)return false;waiting=true;note('wait');
  const go=(again)=>need(namesFor(keys),images,0,again).then(()=>{waiting=false;note(null);onReady();},()=>{note('error');retry=()=>{note('wait');go(true);};});go(false);return false;
 }
 function background(images,start){let i=Math.max(0,order.indexOf(start));for(let j=i;j<order.length;j++)need(groups[order[j]],images,10+j).catch(()=>{});}
 return {groups,requireGroups,background};
})();
