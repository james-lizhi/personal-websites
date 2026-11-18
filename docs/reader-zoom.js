import {bindBlankReturn} from './reader-blank.js';
export function createPageZoom({dialog,project,onClose,onShow,signal}){
 const viewport=dialog.querySelector('.zoom-viewport'),image=dialog.querySelector('#zoom-image'),range=dialog.querySelector('#zoom-range'),naturalButton=dialog.querySelector('#zoom-scale');
 let page=null,scale=100,fitMode=true,gesture=null,direct=false,silentClose=false,drawnWidth=0,drawnHeight=0;const pan={x:0,y:0},pointers=new Map();
 const listen=(element,event,handler,options={})=>element.addEventListener(event,handler,{...options,signal});
 function measureViewport(){
  const css=getComputedStyle(viewport),width=viewport.clientWidth,height=viewport.clientHeight;
  const top=parseFloat(css.paddingTop),bottom=parseFloat(css.paddingBottom);
  return{x:width/2,y:(height+top-bottom)/2,width,height,
   fitWidth:width-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),fitHeight:height-top-bottom};
 }
 function render(view=measureViewport()){
  const width=page.width*scale/100,height=page.height*scale/100;
  const limitX=(width+view.width)/2-40,limitY=(height+view.height)/2-40;
  pan.x=Math.max(-limitX,Math.min(limitX,pan.x));pan.y=Math.max(-limitY,Math.min(limitY,pan.y));
  if(width!==drawnWidth){image.style.width=width+'px';drawnWidth=width}
  if(height!==drawnHeight){image.style.height=height+'px';drawnHeight=height}
  image.style.transform=`translate3d(${view.x-width/2+pan.x}px,${view.y-height/2+pan.y}px,0)`;
 }
 function setScale(value,{point,fitted=false}={},view=measureViewport()){
  if(!page)return;value=Math.min(200,Math.max(5,value));const ratio=value/scale;
  point??=view;
  pan.x+=(point.x-view.x-pan.x)*(1-ratio);pan.y+=(point.y-view.y-pan.y)*(1-ratio);scale=value;fitMode=fitted;render(view);
  range.value=String(scale);range.setAttribute('aria-valuetext',Math.round(scale)+'%');range.style.setProperty('--zoom-fill',(scale-5)/195*100+'%');
  const natural=Math.abs(scale-100)<.01;dialog.classList.toggle('zoom-natural',natural);naturalButton.setAttribute('aria-pressed',String(natural));naturalButton.setAttribute('aria-label',natural?'适应窗口':'原尺寸');naturalButton.title=natural?'适应窗口':'原尺寸';
 }
 function resetGesture(){pointers.clear();gesture=null;viewport.classList.remove('is-dragging')}
 function fit(){
  const view=measureViewport(),value=Math.max(5,Math.min(100,view.fitWidth/page.width*100,view.fitHeight/page.height*100));
  pan.x=pan.y=0;setScale(value,{fitted:true},view);
 }
 function fitView(){fit();onShow()}
 function requestClose(){if(direct)onClose();else dialog.close()}
 function open(entry,{directView=false}={}){
  direct=directView;
  page=entry;image.src='./assets/'+page.src;image.alt=project.name+' — '+page.label;image.width=page.width;image.height=page.height;image.draggable=false;
  document.documentElement.style.overflow='hidden';document.body.classList.add('zoom-open');if(direct)dialog.show();else dialog.showModal();resetGesture();fitView();
 }
 function local(event){const bounds=viewport.getBoundingClientRect();return{x:event.clientX-bounds.left,y:event.clientY-bounds.top}}
 function readGesture(){const values=[...pointers.values()];if(values.length>=2){const [a,b]=values;return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)}}return values[0]?{...values[0],distance:0}:null}
 listen(viewport,'pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();pointers.set(event.pointerId,local(event));viewport.setPointerCapture(event.pointerId);gesture=readGesture();viewport.classList.add('is-dragging')});
 listen(viewport,'pointermove',event=>{
  if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,local(event));const next=readGesture();
  if(gesture&&next){pan.x+=next.x-gesture.x;pan.y+=next.y-gesture.y;if(gesture.distance>0&&next.distance>0)setScale(scale*next.distance/gesture.distance,{point:next});else{fitMode=false;render()}}gesture=next;
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(viewport,name,event=>{pointers.delete(event.pointerId);gesture=readGesture();if(!pointers.size)viewport.classList.remove('is-dragging')});
 listen(viewport,'wheel',event=>{if(!dialog.open)return;event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;setScale(scale*Math.exp(-event.deltaY*unit*.0015),{point:local(event)});onShow()},{passive:false});
 listen(viewport,'dragstart',event=>event.preventDefault());
 bindBlankReturn({element:viewport,exclude:'img,button,a,input,.zoom-adjustments',onReturn:requestClose,isEnabled:()=>dialog.open,signal});
 listen(range,'input',()=>setScale(Number(range.value)));
 listen(naturalButton,'click',()=>{if(Math.abs(scale-100)<.01)fit();else{pan.x=pan.y=0;setScale(100)}onShow()});
 listen(dialog.querySelector('#zoom-close'),'click',requestClose);
 listen(document,'keydown',event=>{if(direct&&dialog.open&&event.key==='Escape'){event.preventDefault();requestClose()}});
 listen(dialog,'close',()=>{resetGesture();document.documentElement.style.overflow='';document.body.classList.remove('zoom-open');if(!silentClose)onClose();silentClose=false});
 listen(window,'resize',()=>{if(dialog.open){if(fitMode)fit();else render()}},{passive:true});
 return{open,fitView,close({silent=false}={}){silentClose=silent;if(dialog.open)dialog.close();resetGesture();document.documentElement.style.overflow='';document.body.classList.remove('zoom-open')},inspect:()=>({scale,fitMode,direct,page:page?.sourcePage,pan:{...pan},touches:pointers.size})};
}
