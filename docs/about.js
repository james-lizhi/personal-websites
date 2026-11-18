import {desktopFruitPose} from './timeline.js';
const LABELS=['AI硬件','低空文旅','疗愈经济','AIGC工作流','Python','Vibe Coding','数据爬取','主题建模','设计伦理','用户体验设计'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(x,a,b)=>{const v=clamp((x-a)/(b-a),0,1);return v*v*(3-2*v)};

export function createAbout({reducedMotion=false,onResume}){
 const section=document.querySelector('#about'),field=document.querySelector('#about-tags');
 const portrait=document.querySelector('.about-portrait'),info=document.querySelector('.about-info');
 let layout=null,fieldWidth=0,fieldHeight=0,active=false,staticMode=false,modal=false;
 let viewportWidth=innerWidth,viewportHeight=innerHeight;
 let lastSpawn=-Infinity,labelIndex=0,nextId=0,parallaxX=0,parallaxY=0,motionTime=0,lastOpacity=-1,anchors=[];
 const infoShift={x:0,y:0},tagShift={x:0,y:0};
 const tags=[],history=[];
 document.querySelector('#open-resume').addEventListener('click',onResume);
 function rect(element){const r=element.getBoundingClientRect();return{x:r.left,y:r.top,width:r.width,height:r.height}}
 function applyRegionMotion(){
  const desktop=viewportWidth>760;
  infoShift.x=desktop?parallaxX*1.1:0;infoShift.y=desktop?parallaxY*1.1:0;
  tagShift.x=desktop?parallaxX*1.5:0;tagShift.y=desktop?parallaxY*1.5:0;
  if(desktop){
   info.style.setProperty('--info-x',infoShift.x+'px');info.style.setProperty('--info-y',infoShift.y+'px');
   field.style.setProperty('--tags-x',tagShift.x+'px');field.style.setProperty('--tags-y',tagShift.y+'px');
  }
 }
 function liveRegion(index){const base=layout.regions[index],shift=index===1?infoShift:index===2?tagShift:{x:0,y:0};return{...base,x:base.x+shift.x,y:base.y+shift.y}}
 function anchor(slot){
  if(fieldWidth>fieldHeight*1.3){const points=[[.25,.16],[.75,.16],[.5,.5],[.25,.84],[.75,.84]];return{x:points[slot][0]*fieldWidth,y:points[slot][1]*fieldHeight}}
  return{x:fieldWidth*(slot%2?.61:.41),y:fieldHeight*(.105+slot*.193)};
 }
 function constrain(tag){tag.x=clamp(tag.x,tag.w/2+5,Math.max(tag.w/2+5,fieldWidth-tag.w/2-5));tag.y=clamp(tag.y,tag.h/2+5,Math.max(tag.h/2+5,fieldHeight-tag.h/2-5))}
 function overlaps(a,b,gap=9){return Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.y-b.y)<(a.h+b.h)/2+gap}
 function settle(){
  for(let step=0;step<18;step++){
   let collision=false;
   for(let i=0;i<tags.length;i++)for(let j=i+1;j<tags.length;j++){
    const a=tags[i],b=tags[j],dx=b.x-a.x,dy=b.y-a.y,ox=(a.w+b.w)/2+9-Math.abs(dx),oy=(a.h+b.h)/2+9-Math.abs(dy);
    if(ox<=0||oy<=0)continue;
    collision=true;
    if(ox<oy){const push=(ox+.02)*.5*(dx>=0?1:-1);a.x-=push;b.x+=push;a.vx*=.7;b.vx*=.7}
    else{const push=(oy+.02)*.5*(dy>=0?1:-1);a.y-=push;b.y+=push;a.vy*=.7;b.vy*=.7}
   }
   if(!collision)return;
   tags.forEach(constrain);
  }
  // A safe layout is used only if a boundary traps several capsules together.
  if(tags.some((a,i)=>tags.slice(i+1).some(b=>overlaps(a,b,7)))){
   for(const tag of tags){const p=anchors[tag.slot];tag.x=p.x;tag.y=p.y;tag.vx*=.2;tag.vy*=.2;constrain(tag)}
  }
 }
 function clear(){for(const tag of tags)tag.element.remove();tags.length=0;lastSpawn=-Infinity}
 function resize(width=viewportWidth,height=viewportHeight){
  viewportWidth=width;viewportHeight=height;
  info.style.removeProperty('--info-x');info.style.removeProperty('--info-y');
  field.style.removeProperty('--tags-x');field.style.removeProperty('--tags-y');
  const fruitSlot=document.querySelector('.about-fruit-space');
  fruitSlot.style.removeProperty('translate');
  let slot=rect(fruitSlot);
  if(width>760){fruitSlot.style.translate=`${width/2-slot.x-slot.width/2}px 0`;slot=rect(fruitSlot)}
  const photo=rect(portrait);photo.x-=photo.width*.14;photo.width*=1.28;
  const regions=[photo,rect(info),rect(field)];
  fieldWidth=regions[2].width;fieldHeight=regions[2].height;
  anchors=Array.from({length:5},(_,slot)=>anchor(slot));
  const diameter=Math.min(slot.width*.88,slot.height/1.5,width<=760?166:285);
  layout={fruit:width>760?desktopFruitPose(width,height):{x:slot.x+slot.width/2,y:slot.y+slot.height/2+diameter*.18,diameter},regions};
  applyRegionMotion();
  tags.forEach(tag=>{const p=anchors[tag.slot];tag.x=p.x;tag.y=p.y;constrain(tag)});
 }
 function spawn(now){
  if(tags.length>=5||fieldWidth<100||fieldHeight<100)return;
  const used=new Set(tags.map(t=>t.slot));const slot=[0,1,2,3,4].find(n=>!used.has(n));
  let text=LABELS[labelIndex++%LABELS.length];while(tags.some(t=>t.text===text))text=LABELS[labelIndex++%LABELS.length];
  const element=document.createElement('span');element.className='about-tag';element.setAttribute('role','listitem');element.textContent=text;field.append(element);
  const r=element.getBoundingClientRect(),p=anchors[slot],id=nextId++;
  const tag={id,slot,text,element,w:r.width,h:r.height,x:p.x,y:p.y,vx:0,vy:0,born:now,life:4.45,seed:id*1.713};
  constrain(tag);tags.push(tag);history.push({id,text,born:now,life:tag.life});if(history.length>50)history.shift();lastSpawn=now;
 }
 function contains(x,y){
  if(!active||!layout)return false;
  if([liveRegion(0),liveRegion(1)].some(r=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height))return true;
  const r=liveRegion(2),px=x-r.x,py=y-r.y;
  return tags.some(t=>Number(t.element.style.opacity)>.08&&Math.abs(px-t.x)<=t.w/2+6&&Math.abs(py-t.y)<=t.h/2+6);
 }
 function update({visibility,dt,pointer,paused=false}){
  const opacity=staticMode?1:visibility;
  if(opacity!==lastOpacity){section.style.opacity=String(opacity);lastOpacity=opacity}
  const show=opacity>.08;if(show!==active){active=show;section.inert=!show;section.setAttribute('aria-hidden',String(!show));section.classList.toggle('is-active',show);if(!show)clear()}
  if(!show||modal)return;
  const now=performance.now()/1000;
  for(let i=tags.length-1;i>=0;i--)if(now-tags[i].born>=tags[i].life){tags[i].element.remove();tags.splice(i,1)}
  if(now-lastSpawn>=.68)spawn(now);
  if(!paused&&!reducedMotion)motionTime+=dt;
  const blend=1-Math.exp(-7*dt),targetX=reducedMotion||paused?0:((pointer.rawX??pointer.x)-.5)*14,targetY=reducedMotion||paused?0:((pointer.rawY??pointer.y)-.5)*12;
  const nextX=parallaxX+(targetX-parallaxX)*blend,nextY=parallaxY+(targetY-parallaxY)*blend;
  if(nextX!==parallaxX||nextY!==parallaxY){
   parallaxX=nextX;parallaxY=nextY;applyRegionMotion();
   portrait.style.setProperty('--portrait-x',parallaxX+'px');portrait.style.setProperty('--portrait-y',parallaxY+'px');
  }
  const fr=liveRegion(2),mx=(pointer.rawX??pointer.x)*viewportWidth-fr.x,my=(pointer.rawY??pointer.y)*viewportHeight-fr.y;
  const damping=Math.exp(-4.5*dt);
  for(const tag of tags){
   const home=anchors[tag.slot];let ax=(home.x-tag.x)*.65,ay=(home.y-tag.y)*.65;
   if(!paused&&!reducedMotion){ax+=Math.sin(motionTime*.8+tag.seed)*7;ay+=Math.cos(motionTime*.65+tag.seed)*6}
   if(pointer.active>.05&&!reducedMotion){let dx=tag.x-mx,dy=tag.y-my,d=Math.hypot(dx,dy);if(d<145){if(d<1){dx=Math.sin(tag.seed+.5);dy=Math.cos(tag.seed+.5);d=1}const force=760*Math.pow(1-d/145,2);ax+=dx/d*force;ay+=dy/d*force}}
   tag.vx=(tag.vx+ax*dt)*damping;tag.vy=(tag.vy+ay*dt)*damping;
   tag.x+=clamp(tag.vx,-85,85)*dt;tag.y+=clamp(tag.vy,-85,85)*dt;constrain(tag);
  }
  settle();
  for(const tag of tags){const age=now-tag.born;tag.element.style.opacity=String(smooth(age,0,.36)*(1-smooth(age,tag.life-.6,tag.life)));tag.element.style.transform=`translate3d(${tag.x-tag.w/2}px,${tag.y-tag.h/2}px,0)`}
 }
 resize();
 return{resize,update,contains,getLayout:()=>layout,setModal(value){modal=value;if(value)clear()},setStatic(){staticMode=true;resize()},inspect(){const now=performance.now()/1000;return{active,layout:layout?{...layout,regions:layout.regions.map((_,i)=>liveRegion(i))}:null,field:{width:fieldWidth,height:fieldHeight},parallax:{x:parallaxX,y:parallaxY},tags:tags.map(({id,text,x,y,w,h,born,life})=>({id,text,x,y,w,h,age:now-born,life})),history}}};
}
