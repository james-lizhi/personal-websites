// Only a stationary primary click on empty space goes back; gestures retain their own behavior.
export function bindBlankReturn({element,exclude,onReturn,isEnabled=()=>true,signal}){
 let candidate=null;
 function blank(target,x,y){
  if(!(target instanceof Element))return false;
  // Touch targeting can snap a tap in a narrow gutter to a nearby image or button.
  for(let protectedElement=target.closest(exclude);protectedElement;protectedElement=protectedElement.parentElement?.closest(exclude)){
   const bounds=protectedElement.getBoundingClientRect();if(x>=bounds.left&&x<=bounds.right&&y>=bounds.top&&y<=bounds.bottom)return false;
  }return true;
 }
 element.addEventListener('pointerdown',event=>{
  candidate=event.isPrimary&&event.button===0&&isEnabled()&&blank(event.target,event.clientX,event.clientY)?{id:event.pointerId,x:event.clientX,y:event.clientY,scroll:scrollY,ready:false}:null;
 },{capture:true,signal});
 element.addEventListener('pointermove',event=>{if(candidate&&event.pointerId===candidate.id&&Math.hypot(event.clientX-candidate.x,event.clientY-candidate.y)>7)candidate=null},{capture:true,passive:true,signal});
 element.addEventListener('pointerup',event=>{if(!candidate||candidate.id!==event.pointerId)return;candidate.ready=Math.hypot(event.clientX-candidate.x,event.clientY-candidate.y)<=7&&Math.abs(scrollY-candidate.scroll)<3&&blank(event.target,event.clientX,event.clientY)},{capture:true,signal});
 element.addEventListener('pointercancel',()=>{candidate=null},{capture:true,signal});
 element.addEventListener('click',event=>{
  const valid=candidate?.ready&&isEnabled()&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey;candidate=null;
  if(valid){event.preventDefault();event.stopImmediatePropagation();onReturn()}
 },{capture:true,signal});
}
