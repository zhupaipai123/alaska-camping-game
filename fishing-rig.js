'use strict';
// Continuous shoulder rotation, flexible rod and a line sharing the same computed tip.
const FishingRig=(()=>{
 let body,arm;const pivot={x:258,y:273},scale=350/724;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function prepare(images){if(body)return;const original=document.createElement('canvas');original.width=original.height=724;original.getContext('2d').drawImage(images.get('fishing-action-sheet.png'),1448,0,724,724,0,0,724,724);
  const path=g=>{g.beginPath();g.moveTo(247,251);g.lineTo(276,250);g.lineTo(297,313);g.lineTo(343,312);g.lineTo(395,301);g.lineTo(724,207);g.lineTo(724,385);g.lineTo(282,385);g.lineTo(281,360);g.lineTo(258,348);g.lineTo(238,292);g.closePath();};
  body=document.createElement('canvas');body.width=body.height=724;const b=body.getContext('2d');b.drawImage(original,0,0);b.save();b.beginPath();b.rect(287,0,437,724);b.clip();b.globalCompositeOperation='destination-out';path(b);b.fill();b.restore();
  b.save();b.globalCompositeOperation='destination-out';b.fillRect(330,0,394,301);b.restore();
  b.save();b.beginPath();b.moveTo(245,345);b.lineTo(287,345);b.lineTo(296,395);b.lineTo(290,420);b.lineTo(245,420);b.closePath();b.clip();b.drawImage(images.get('fishing-action-sheet.png'),0,0,724,724,0,0,724,724);b.restore();
  arm=document.createElement('canvas');arm.width=arm.height=724;const a=arm.getContext('2d');path(a);a.clip();a.beginPath();a.rect(0,0,396,724);a.clip();a.drawImage(original,0,0);
 }
 function motion(stage,t){let angle=-.12,bend=0;if(stage==='casting'){
  if(t<.65)angle=-.12-1.22*smooth(t/.65);
  else if(t<.9)angle=-1.34;
  else if(t<1.55){const u=smooth((t-.9)/.65);angle=-1.34+1.4*u;bend=Math.sin(u*Math.PI)*36;}
  else angle=.06*(1-smooth((t-1.55)/.7));
 }else if(stage==='bite')angle=.008*Math.sin(t*2);else if(stage==='reeling'){angle=-1.12*smooth(t/3.6)+.018*Math.sin(t*12);bend=-24*Math.sin(Math.PI*Math.min(1,t/4));}
 return {angle,bend};}
 function transform(x,y,angle){const dx=x-pivot.x,dy=y-pivot.y;return {x:-100+(pivot.x+dx*Math.cos(angle)-dy*Math.sin(angle))*scale,y:-350+(pivot.y+dx*Math.sin(angle)+dy*Math.cos(angle))*scale};}
 function draw(ctx,images,stage,t){prepare(images);const {angle,bend}=motion(stage,t);ctx.drawImage(body,-100,-350,350,350);ctx.save();ctx.translate(-100+pivot.x*scale,-350+pivot.y*scale);ctx.rotate(angle);ctx.scale(scale,scale);ctx.drawImage(arm,-pivot.x,-pivot.y);ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(386-pivot.x,323-pivot.y);ctx.quadraticCurveTo(542-pivot.x,267-pivot.y+bend,680-pivot.x,252-pivot.y+bend*.2);ctx.strokeStyle='#302d24';ctx.lineWidth=3.2;ctx.stroke();ctx.strokeStyle='#9a8766';ctx.lineWidth=.85;ctx.stroke();ctx.restore();
  // Fixed shoulder cap covers the anatomical joint, never a second arm.
  ctx.save();ctx.beginPath();ctx.ellipse(-100+258*scale,-350+270*scale,12,13,0,0,Math.PI*2);ctx.clip();ctx.drawImage(images.get('fishing-action-sheet.png'),1448,0,724,724,-100,-350,350,350);ctx.restore();
  return {tip:transform(680,252+bend*.2,angle),hand:transform(365,332,angle)};
 }
 return {draw,motion};
})();
