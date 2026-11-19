'use strict';
// Shared by the complete game and the focused preview, with the same mute switch.
function createCampAudio(button, externalSwitch=false) {
  const tracks={fire:make('campfire-balanced.mp3','fire'),brook:make('river.mp3','brook'),birds:make('birds-balanced.mp3','birds'),sizzle:make('frying.mp3','sizzle')};
  let enabled=true,unlocked=true,blocked=false,stage='none',progress=0,context,master,noiseBuffer,nextWolf=0;
  const wolf=new Audio(assetURL('lone-wolf.mp3'));wolf.volume=.2;wolf.preload='auto';
  const pending=new Set();
  let sparseBirdSince=null;
  function make(file,kind){const a=new Audio(assetURL(file));a.loop=true;a.preload='auto';a.hidden=true;a.dataset.campAudio=kind;document.body.append(a);return a;}
  function sync(){
    const active=enabled&&unlocked&&!document.hidden&&stage!=='none';
    const burning=stage==='lighting'&&progress*4.8>=2.65||['teaReady','brewing','rest','cooking','dinnerReady','eating','fireside','pullback','ending'].includes(stage);
    const peaceful=['rest','fireside','pullback','ending'].includes(stage);
    const afterBedding=['bedding','finished','fireReady','lighting','teaReady','brewing','rest','cooking','dinnerReady','eating','fireside','pullback','ending'].includes(stage);
    const levels=peaceful?{fire:.23,brook:.12,birds:.17,sizzle:0}:burning?{fire:.65,brook:afterBedding?0:.16,birds:.14,sizzle:stage==='cooking'&&progress*12.4>=5.2&&progress*12.4<10?.6:0}:{fire:0,brook:afterBedding?0:.16,birds:afterBedding?.14:.18,sizzle:0};
    // From cooking onward, leave the original bird recording audible about 60%
    // of the time, with short fades; its source and normal playing level stay intact.
    const sparseBird=['cooking','dinnerReady','eating','fireside','pullback','ending'].includes(stage);
    if(sparseBird){
      const now=performance.now()/1000;if(sparseBirdSince===null)sparseBirdSince=now;
      const t=(now-sparseBirdSince)%10, fade=.35;
      const amount=t<6-fade?1:t<6?(6-t)/fade:t<10-fade?0:(t-(10-fade))/fade;
      levels.birds*=Math.max(0,Math.min(1,amount));
    }else sparseBirdSince=null;
    const night=['fireside','pullback','ending'].includes(stage);
    if(!active||!night){wolf.pause();if(!night)nextWolf=0;}else if(!nextWolf){nextWolf=Date.now()+22000;}else if(Date.now()>=nextWolf&&wolf.paused){wolf.currentTime=0;wolf.play().catch(()=>{});nextWolf=Date.now()+55000;}
    for(const [name,a] of Object.entries(tracks)){
      a.volume=active?levels[name]:0;
      if(!a.volume){if(!pending.has(a))a.pause();continue;}
      if(a.paused&&!blocked&&!pending.has(a)){pending.add(a);a.play().then(()=>{if(!enabled||document.hidden||stage==='none'||!a.volume)a.pause();}).catch(e=>{if(e.name==='NotAllowedError')blocked=true;else if(e.name!=='AbortError')console.warn('Camp audio playback:',name,e.name);}).finally(()=>pending.delete(a));}
    }
    if(master)master.gain.value=active?1:0;
  }
  function unlock(){
    unlocked=true;blocked=false;
    // Prime each camp track during a real user gesture: iOS may grant playback
    // permission per media element. Silence and pause until the camp uses it.
    if(stage==='none'&&enabled){
      for(const a of Object.values(tracks)){
        if(pending.has(a)||!a.paused)continue;
        a.volume=0;pending.add(a);
        a.play().then(()=>{if(stage==='none'||!enabled||document.hidden)a.pause();})
          .catch(()=>{}).finally(()=>pending.delete(a));
      }
    }
    const Context=window.AudioContext||window.webkitAudioContext;
    if(Context&&!context){context=new Context();master=context.createGain();master.connect(context.destination);noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);const b=noiseBuffer.getChannelData(0);for(let i=0;i<b.length;i++)b[i]=Math.random()*2-1;}
    if(context&&context.state==='suspended')context.resume().catch(()=>{});
    sync();
  }
  document.addEventListener('pointerdown',unlock,{capture:true});
  document.addEventListener('keydown',unlock,{capture:true});
  if(!externalSwitch)button.addEventListener('click',()=>{setEnabled(!enabled);button.setAttribute('aria-pressed',String(enabled));button.textContent=enabled?'环境音 🔊':'环境音 🔇';});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{for(const a of Object.values(tracks))a.pause();wolf.pause();if(master)master.gain.value=0;});
  function setEnabled(value){enabled=value;sync();}
  function update(s,p=0){stage=s;progress=p;sync();}
  function strike(){
    if(!enabled||!unlocked||document.hidden||!context||context.state!=='running')return;
    // Same brief high-frequency scrape as the former fireRound, not a gunshot.
    const t=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=3300;
    gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(.28,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+.19);
    source.connect(filter).connect(gain).connect(master);source.start(t,0,.2);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    const tone=context.createOscillator(),env=context.createGain();tone.frequency.setValueAtTime(900,t);tone.frequency.exponentialRampToValueAtTime(600,t+.12);env.gain.setValueAtTime(.035,t);env.gain.exponentialRampToValueAtTime(.001,t+.12);tone.connect(env).connect(master);tone.start(t);tone.stop(t+.13);tone.onended=()=>{tone.disconnect();env.disconnect();};
  }
  return {update,setEnabled,strike};
}
