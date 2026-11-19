'use strict';
const Motion=(()=>{
const cache=new Map(),work=document.createElement('canvas');work.width=543;work.height=724;const g=work.getContext('2d');
const fixed=[[0,0],[543,0],[543,724],[0,724],[0,360],[543,360],[270,0],[270,724]];
  function triangulate(points){
    const p=[...points,[-5000,-5000],[5000,-5000],[0,5000]],n=points.length;let triangles=[[n,n+1,n+2]];
    function inside(t,q){
      const [a,b,c]=t.map(i=>p[i]),d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));
      if(Math.abs(d)<.001)return false;
      const aa=a[0]*a[0]+a[1]*a[1],bb=b[0]*b[0]+b[1]*b[1],cc=c[0]*c[0]+c[1]*c[1];
      const x=(aa*(b[1]-c[1])+bb*(c[1]-a[1])+cc*(a[1]-b[1]))/d,y=(aa*(c[0]-b[0])+bb*(a[0]-c[0])+cc*(b[0]-a[0]))/d;
      return (q[0]-x)**2+(q[1]-y)**2<=(a[0]-x)**2+(a[1]-y)**2+.01;
    }
    for(let i=0;i<n;i++){
      const bad=triangles.filter(t=>inside(t,p[i])),edges=new Map();
      for(const t of bad)for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=[a,b].sort((u,v)=>u-v).join(',');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
      triangles=triangles.filter(t=>!bad.includes(t));for(const [a,b] of edges.values())triangles.push([a,b,i]);
    }
    return triangles.filter(t=>t.every(i=>i<n));
  }
  function triangle(im,s,d){
    const [p0,p1,p2]=s,[q0,q1,q2]=d;
    const sx1=p1[0]-p0[0],sy1=p1[1]-p0[1],sx2=p2[0]-p0[0],sy2=p2[1]-p0[1];
    const det=sx1*sy2-sx2*sy1;if(Math.abs(det)<.01)return;
    const dx1=q1[0]-q0[0],dy1=q1[1]-q0[1],dx2=q2[0]-q0[0],dy2=q2[1]-q0[1];
    const a=(dx1*sy2-dx2*sy1)/det,c=(dx2*sx1-dx1*sx2)/det,b=(dy1*sy2-dy2*sy1)/det,e=(dy2*sx1-dy1*sx2)/det;
    g.save();g.beginPath();g.moveTo(...q0);g.lineTo(...q1);g.lineTo(...q2);g.closePath();g.clip();
    g.transform(a,b,c,e,q0[0]-a*p0[0]-c*p0[1],q0[1]-b*p0[0]-e*p0[1]);g.drawImage(im,0,0,543,724);g.restore();
  }

 function draw(ctx,key,frames,poses,progress,x,y,w,h){
  const q=Math.max(0,Math.min(1,progress))*(frames.length-1),i=Math.min(frames.length-2,Math.floor(q)),t=q-i;
  const a=[...fixed,...poses[i]],b=[...fixed,...poses[i+1]],d=a.map((p,k)=>[p[0]+(b[k][0]-p[0])*t,p[1]+(b[k][1]-p[1])*t]);
  const k=key+i;let tris=cache.get(k);if(!tris){tris=triangulate(a.map((p,j)=>[(p[0]+b[j][0])/2,(p[1]+b[j][1])/2]));cache.set(k,tris);}
  g.clearRect(0,0,543,724);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  const src=t<.5?a:b,im=t<.5?frames[i]:frames[i+1];
  for(const tri of tris)triangle(im,tri.map(j=>src[j]),tri.map(j=>d[j]));
  ctx.drawImage(work,x,y,w,h);
 }
 return {draw};
})();
