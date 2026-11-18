export function createNextProjectIntent({element,canNavigate,navigate,signal}){
 let progress=0,readyAt=0,lastWheel=0,wheelGesture=false,locked=false,timer=0,touch=null;
 const bottom=()=>document.documentElement.scrollHeight-innerHeight-scrollY<=3;
 function reset(){progress=0;wheelGesture=false;locked=false;element.style.setProperty('--next-progress','0');element.classList.remove('is-pulling','is-complete');clearTimeout(timer)}
 function update(){const ready=bottom();element.classList.toggle('is-ready',ready);if(!ready){readyAt=0;reset()}else if(!readyAt)readyAt=performance.now()}
 function add(distance){
  if(locked||!canNavigate()||!bottom())return;
  progress=Math.min(1,progress+distance/360);element.style.setProperty('--next-progress',String(progress));element.classList.toggle('is-pulling',progress>0);
  clearTimeout(timer);if(progress>=1){locked=true;element.classList.add('is-complete');navigate()}else timer=setTimeout(reset,1800);
 }
 window.addEventListener('scroll',update,{passive:true,signal});window.addEventListener('resize',update,{passive:true,signal});
 window.addEventListener('wheel',event=>{
  if(event.ctrlKey||!canNavigate())return;
  const now=performance.now(),fresh=now-lastWheel>180;lastWheel=now;
  if(event.deltaY<=0){reset();return}if(!bottom())return;
  if(fresh)wheelGesture=now-readyAt>320;
  if(wheelGesture){const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;add(Math.min(100,event.deltaY*unit)*.8)}
 },{passive:true,signal});
 window.addEventListener('touchstart',event=>{if(event.touches.length!==1){touch=null;return}touch={last:event.touches[0].clientY,eligible:bottom()&&canNavigate()&&performance.now()-readyAt>250}},{passive:true,signal});
 window.addEventListener('touchmove',event=>{
  if(!touch||event.touches.length!==1)return;const y=event.touches[0].clientY,delta=touch.last-y;touch.last=y;
  if(!touch.eligible)return;if(delta<0){reset();touch.eligible=false;return}
  if(delta>0){event.preventDefault();add(delta*1.35)}
 },{passive:false,signal});
 window.addEventListener('touchend',()=>{touch=null},{passive:true,signal});
 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||!canNavigate()||!bottom()||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest('a,button,input,textarea,select'))return;
  if(['PageDown','ArrowDown',' '].includes(event.key)){event.preventDefault();add(event.key==='ArrowDown'?42:90)}
 },{signal});
 signal?.addEventListener('abort',()=>clearTimeout(timer),{once:true});
 update();return{inspect:()=>({progress,ready:bottom(),locked}),reset};
}
