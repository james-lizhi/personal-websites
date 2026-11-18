import {projects} from './projects.js';
import {readerTemplate} from './reader-template.js';
import {createPageZoom} from './reader-zoom.js';
import {createNextProjectIntent} from './reader-next.js';
import {bindBlankReturn} from './reader-blank.js';

function floatingControls(element,scrollTarget,readScroll,signal){
 let last=readScroll(),direction=0,distance=0;
 function show(){element.classList.remove('is-hidden')}
 function reset(){last=readScroll();direction=0;distance=0;show()}
 scrollTarget.addEventListener('scroll',()=>{
  const position=Math.max(0,readScroll()),delta=position-last;last=position;
  if(position<=0){distance=0;show();return}if(Math.abs(delta)<.5)return;
  const next=Math.sign(delta);distance=next===direction?distance+Math.abs(delta):Math.abs(delta);direction=next;
  if(distance>8){element.classList.toggle('is-hidden',direction>0);distance=0}
 },{passive:true,signal});
 element.addEventListener('focusin',show,{signal});
 window.addEventListener('pointermove',event=>{if(event.pointerType!=='touch'&&event.clientY<86)show()},{passive:true,signal});
 document.addEventListener('keydown',event=>{if(event.key==='Tab')show()},{signal});
 return{reset,hidden:()=>element.classList.contains('is-hidden')};
}

export function createProjectReader({host,index,entry,onProject,onBack,isBusy,reducedMotion}){
 const controller=new AbortController(),{signal}=controller,$=selector=>host.querySelector(selector);host.innerHTML=readerTemplate;
 const project=entry??projects[index],resume=project.id==='resume',previous=resume?null:projects[(index-1+projects.length)%projects.length],next=resume?null:projects[(index+1)%projects.length],zoom=$('#page-zoom'),viewport=$('.zoom-viewport');
 const listen=(element,event,handler,options={})=>element.addEventListener(event,handler,{...options,signal});
 document.title=project.name+' — 李智个人作品集';document.body.dataset.projectId=project.id;$('#project-view').dataset.projectId=project.id;$('#project-title').textContent=project.name;$('#project-title').tabIndex=-1;
 $('#reader-back').href=resume?'./':'./#work/'+encodeURIComponent(project.id);$('#reader-project').textContent=project.name;$('#reader-project').setAttribute('aria-label',project.name+'，回到顶部');
 $('.reader-navigation').hidden=resume;$('#reader-next').hidden=resume;document.body.dataset.readerKind=resume?'resume':'project';
 if(!resume){for(const [id,entry,label] of [['#previous-project',previous,'上一个作品'],['#next-project',next,'下一个作品'],['#next-project-bottom',next,'下一个作品']]){const link=$(id);link.href='./project.html?id='+encodeURIComponent(entry.id);link.setAttribute('aria-label',label+'：'+entry.name);link.title=label+'：'+entry.name}
 $('#next-project-name').textContent=next.name;$('#reader-next').style.setProperty('--next-color',next.color)}
 const controls=floatingControls($('#reader-controls'),window,()=>scrollY,signal),zoomControls=floatingControls($('#zoom-controls'),viewport,()=>viewport.scrollTop,signal);
 const pageZoom=createPageZoom({dialog:zoom,project,onClose:()=>{if(resume){if(!isBusy())onBack(project.id)}else controls.reset()},onShow:()=>zoomControls.reset(),signal});
 let firstImage;
 if(!resume){
  const fragment=document.createDocumentFragment();
  project.pages.forEach((page,i)=>{
   const figure=document.createElement('figure');figure.className='project-page';figure.dataset.sourcePage=page.sourcePage;
   const button=document.createElement('button');button.type='button';button.className='page-open';button.setAttribute('aria-label','放大查看：'+project.name+' — '+page.label);
   const img=document.createElement('img');
   img.alt=project.name+' — '+page.label;img.width=page.width;img.height=page.height;img.loading=i===0?'eager':'lazy';img.decoding='async';
   if(i===0){img.fetchPriority='high';firstImage=img}
   img.src='./assets/'+page.src;
   button.append(img);listen(button,'click',()=>pageZoom.open(page));figure.append(button);fragment.append(figure);
  });
  $('#project-pages').replaceChildren(fragment);
 }
 const header=$('#reader-controls'),measureHeader=()=>document.body.style.setProperty('--reader-top-space',Math.ceil(header.offsetHeight+parseFloat(getComputedStyle(header).top)+28)+'px'),observer=new ResizeObserver(measureHeader);observer.observe(header);measureHeader();
 listen($('#reader-project'),'click',()=>{if(resume)pageZoom.fitView();else{scrollTo({top:0,behavior:reducedMotion?'instant':'smooth'});controls.reset()}});
 const plainClick=event=>event.button===0&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey;
 const links=[['#reader-back',()=>onBack(project.id)]];if(!resume)links.push(['#previous-project',()=>onProject(previous.id)],['#next-project',()=>onProject(next.id)],['#next-project-bottom',()=>onProject(next.id)]);
 for(const [id,action] of links)listen($(id),'click',event=>{if(plainClick(event)){event.preventDefault();if(!isBusy())action()}});
 const nextIntent=resume?null:createNextProjectIntent({element:$('#reader-next'),canNavigate:()=>!zoom.open&&!isBusy(),navigate:()=>onProject(next.id),signal});
 bindBlankReturn({element:host,exclude:'.project-page,button,a,input,select,textarea,dialog',onReturn:()=>onBack(project.id),isEnabled:()=>!isBusy()&&!zoom.open,signal});
 listen(document,'keydown',event=>{
  if(zoom.open||isBusy()||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest('input,textarea,select'))return;
  if(event.key==='Escape'){event.preventDefault();onBack(project.id)}
  if(!resume&&event.key==='ArrowLeft'){event.preventDefault();onProject(previous.id)}
  if(!resume&&event.key==='ArrowRight'){event.preventDefault();onProject(next.id)}
 });
 if(resume){
  const title=$('#reader-project'),download=document.createElement('a');
  title.title='适应窗口';
  download.id='resume-download';download.className='reader-tool reader-pill';
  download.href='./assets/profile/resume.pdf';download.download='李智-个人简历.pdf';
  download.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m-3-3 3 3 3-3M4 14v3h12v-3"/></svg><span>下载简历</span>';
  $('#zoom-identity').append(title,download);
  $('#zoom-close').setAttribute('aria-label','返回个人信息');$('#zoom-close').title='返回个人信息';$('#zoom-close svg path').setAttribute('d','M16 10H4m6-6-6 6 6 6');zoom.setAttribute('aria-label',project.name);
  pageZoom.open(project.pages[0],{directView:true});
  firstImage=$('#zoom-image');
 }
 return{ready:firstImage.decode().catch(()=>{}),focus:()=>$(resume?'#zoom-close':'#project-title').focus({preventScroll:true}),closeZoom:()=>{if(!resume)pageZoom.close({silent:true})},inspect:()=>({id:project.id,resume,controlsHidden:controls.hidden(),zoomControlsHidden:zoomControls.hidden(),zoomOpen:zoom.open,zoom:pageZoom.inspect(),next:nextIntent?.inspect()??null}),destroy(){pageZoom.close({silent:true});controller.abort();observer.disconnect();host.replaceChildren()}};
}
