import Lenis from './vendor/lenis.mjs';
import {createAtmosphere} from './atmosphere.js';
import {projects} from './projects.js';
import {createProjectTheme} from './project-theme.js';
import {createAbout} from './about.js';
import {createPortfolioMenu} from './portfolio-menu.js';
import {createProjectReader} from './project-reader.js';
import {ABOUT_ANCHOR,galleryEnd,projectCenter,sceneToPhysical,physicalToScene,scrollMilestones} from './timeline.js';
const $=s=>document.querySelector(s),clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),preference=matchMedia('(prefers-reduced-motion: reduce)'),reducedMotion=preference.matches;
const home=$('#portfolio'),readerHost=$('#reader-surface'),qa=new URLSearchParams(location.search).has('qa');
let paused=reducedMotion,visible=!document.hidden,staticMode=false,view='home',busy=false,reader=null,homeScroll=0,homeScene=0,queued=null;
let gallery,galleryReady,lenis=null,total=1,viewportHeight=innerHeight,viewportWidth=innerWidth,frameScrollY=null,frameScene=0;
const atmosphere=createAtmosphere($('#atmosphere')),pointer={x:.5,y:.55,active:0},pointerNow={x:.5,y:.55,rawX:.5,rawY:.55,active:0},cursorPoint={x:-200,y:-200},cursorNow={x:-200,y:-200};let backgroundHover=0;
const cursor=$('#cursor'),projectTheme=createProjectTheme({projects,reducedMotion}),aboutScene=createAbout({reducedMotion,onResume:openResume});
const resumeDocument={id:'resume',name:'个人简历',pages:[{src:'profile/resume.jpg',width:2480,height:3508,label:'李智个人简历',sourcePage:1}]};
function makeLenis(){return preference.matches||staticMode?null:new Lenis({duration:1.18,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),smoothWheel:true,wheelMultiplier:.8})}
function unlockScene(){if(view!=='home'||busy)return;lenis?.start();document.body.style.overflow='';gallery?.setDialog?.(false);aboutScene.setModal(false)}
function openResume(){if(!busy)navigate({kind:'resume',id:'resume'})}
const lastScene=galleryEnd(projects.length);
function updateHeight(){const height=1+sceneToPhysical(lastScene,innerWidth);document.documentElement.style.setProperty('--gallery-height',height*100+'svh');total=Math.max(1,height*innerHeight-innerHeight);frameScrollY=null}
updateHeight();$('#work-total').textContent=String(projects.length).padStart(2,'0');
const preloadCache=new Set();function preloadProject(index){if(index<0||preloadCache.has(index))return;preloadCache.add(index);const img=new Image();img.src='./assets/'+projects[index].pages[0].src}
function showProject(index){if(!busy)navigate({kind:'project',id:projects[(index+projects.length)%projects.length].id})}
const brandButton=$('#brand');
const workCaption=$('.work-caption');
const sceneCanvas=$('#scene'),introCaption=$('.intro-caption'),lycheeShadow=$('.lychee-shadow'),scrollCue=$('.scroll-cue'),scrollCopy=$('#scroll-copy'),scrollProgress=$('.scroll-progress'),workNumber=$('#work-number'),workName=$('#work-name');
const portfolioMenu=createPortfolioMenu({
 trigger:brandButton,
 panel:$('#portfolio-menu'),
 projects,
 canOpen:()=>view==='home'&&!busy,
 onSelect(destination){
  if(destination==='about')return navigate({kind:'home',section:'about'});
  if(destination==='work')return navigate({kind:'home',id:projects[0].id});
  if(destination==='resume')return openResume();
  const index=projects.findIndex(project=>project.id===destination);
  if(index>=0)showProject(index);
 },
});
projects.forEach((p,i)=>{const b=document.createElement('button');b.textContent='查看作品 '+p.name;b.addEventListener('click',()=>showProject(i));$('#project-list').append(b);const c=document.createElement('button'),img=document.createElement('img');img.src='./assets/'+p.image;img.alt=p.name;img.loading='lazy';c.append(img);c.addEventListener('click',()=>showProject(i));$('.fallback-grid').append(c)});
function fallback(){staticMode=true;document.body.classList.add('static-mode','scene-ready');$('.fallback-gallery').hidden=false;sceneCanvas.style.display='none';lenis?.destroy();lenis=null;aboutScene.setStatic()}
function prepareGallery(){
 return galleryReady??=(async()=>{
  try{
   for(const image of home.querySelectorAll('.about-portrait img[loading="lazy"]'))image.loading='eager';
   const [{createGallery}]=await Promise.all([
    import('./gallery.js'),
    document.fonts.load('900 100px HarmonyOS'),
    document.fonts.load('500 20px HarmonyOS'),
    document.fonts.load('300 20px HarmonyOS'),
    document.fonts.load('400 16px HarmonyOS'),
    document.fonts.load('400 96px JamesSignature','James')
   ]);
   gallery=createGallery(sceneCanvas,{
    reducedMotion,onProject:showProject,
    onHover:i=>{
     preloadProject(i);projectTheme.setProject(view==='home'&&!busy?i:-1);
     cursor.classList.toggle('active',i>=0&&view==='home'&&!busy);sceneCanvas.style.cursor=i>=0?'pointer':'default';
    },
    onFallback:fallback,isAboutTarget:(x,y)=>aboutScene.contains(x,y),isNavigationTarget:portfolioMenu.hasPointer
   });
   if(gallery.available){gallery.setDialog(busy);document.body.classList.add('scene-ready')}
  }catch(error){console.error(error);fallback()}
 })();
}
if(readRoute().kind==='home')await prepareGallery();
function resize(){
 const scene=view==='home'&&!home.hidden?physicalToScene(scrollY/viewportHeight,viewportWidth):homeScene;
 viewportHeight=innerHeight;viewportWidth=innerWidth;updateHeight();atmosphere.resize();
 if(!home.hidden){gallery?.resize();aboutScene.resize();lenis?.resize();const target=sceneToPhysical(scene,innerWidth)*innerHeight;if(lenis)lenis.scrollTo(target,{immediate:true});else scrollTo({top:target,behavior:'instant'})}else homeScroll=sceneToPhysical(homeScene,innerWidth)*innerHeight;
}
window.addEventListener('resize',resize);resize();
window.addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth;pointer.y=e.clientY/innerHeight;pointer.active=e.pointerType==='touch'?0:1;cursorPoint.x=e.clientX;cursorPoint.y=e.clientY},{passive:true});document.documentElement.addEventListener('pointerleave',()=>{pointer.active=0;cursor.classList.remove('active')});document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=0});preference.addEventListener('change',event=>{paused=event.matches});
$('.skip-link').addEventListener('click',e=>{if(view!=='home')return;e.preventDefault();$('#project-list button').focus({preventScroll:true})});
const homeURL=(id,section)=>'./'+(qa?'?qa=1':'')+(id?'#work/'+encodeURIComponent(id):section?'#'+section:''),projectURL=id=>'./project.html?id='+encodeURIComponent(id)+(qa?'&qa=1':'');
function readRoute(){
 const id=new URLSearchParams(location.search).get('id');
 if(location.pathname.endsWith('/project.html')){
  if(id==='resume')return{kind:'resume',id};
  if(projects.some(project=>project.id===id))return{kind:'project',id};
 }
 const hash=location.hash;
 return{kind:'home',id:hash.startsWith('#work/')?hash.slice(6):null,section:hash==='#about'||hash==='#work'?hash.slice(1):null};
}
function homeAnchorPosition(route){
 if(route.section==='about'&&staticMode)return $('#about').getBoundingClientRect().top+scrollY;
 const index=projects.findIndex(project=>project.id===route.id);
 const scene=index>=0?projectCenter(index):route.section==='about'?ABOUT_ANCHOR:route.section==='work'?4.3:null;
 return scene===null?null:sceneToPhysical(scene,innerWidth)*innerHeight;
}
function remember(){if(busy)return;const state={...(history.state??{}),kind:view,scroll:scrollY};if(view!=='home')state.id=reader?.inspect().id;history.replaceState(state,'')}
let scrollRecord=0;window.addEventListener('scroll',()=>{clearTimeout(scrollRecord);scrollRecord=setTimeout(remember,80)},{passive:true});history.scrollRestoration='manual';
async function fade(element,from,to,duration){if(preference.matches){element.style.opacity=String(to);return}const animation=element.animate([{opacity:from},{opacity:to}],{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});await animation.finished.catch(()=>{});element.style.opacity=String(to);animation.cancel()}
async function navigate(route,{pop=false,initial=false,restoreScroll}={}){
 if(busy){if(pop)queued={route,options:{pop,restoreScroll}};return}busy=true;portfolioMenu.close();clearTimeout(scrollRecord);document.body.classList.add('view-transitioning');
 const homeReady=route.kind==='home'&&!gallery?prepareGallery():null;
 if(!initial){const state={kind:view,scroll:scrollY};if(view!=='home')state.id=reader?.inspect().id;if(!pop)history.replaceState({...history.state,...state},'')}
 if(!pop&&!initial)history.pushState({kind:route.kind,id:route.id,scroll:0},'',route.kind!=='home'?projectURL(route.id):homeURL(route.id,route.section));
 gallery?.setDialog?.(true);aboutScene.setModal(true);projectTheme.setProject(-1);cursor.classList.remove('active');reader?.closeZoom();
 if(view==='home'){homeScroll=scrollY;homeScene=physicalToScene(homeScroll/innerHeight,innerWidth);lenis?.stop()}
 const old=view==='home'?home:readerHost;if(!initial)await fade(old,1,0,300);
 lenis?.destroy();lenis=null;reader?.destroy();reader=null;document.body.style.overflow='';document.documentElement.style.overflow='';home.hidden=true;readerHost.hidden=true;
 view=route.kind;document.body.dataset.view=view;delete document.documentElement.dataset.initialView;
 document.body.classList.toggle('project-document',view!=='home');document.documentElement.classList.toggle('project-document-root',view!=='home');
 if(view!=='home'){
  readerHost.hidden=false;readerHost.style.opacity='0';scrollTo({top:0,behavior:'instant'});
  const index=projects.findIndex(project=>project.id===route.id);reader=createProjectReader({host:readerHost,index,entry:view==='resume'?resumeDocument:undefined,onProject:id=>navigate({kind:'project',id}),onBack:id=>route.kind==='resume'?navigate({kind:'home'},{restoreScroll:homeScroll||sceneToPhysical(ABOUT_ANCHOR,innerWidth)*innerHeight}):navigate({kind:'home',id}),isBusy:()=>busy,reducedMotion:preference.matches});
  await reader.ready;scrollTo({top:restoreScroll??0,behavior:'instant'});await fade(readerHost,0,1,380);reader.focus();
 }else{
  if(homeReady)await homeReady;
  document.title='李智个人作品集 — 一颗荔枝的灵感宇宙';delete document.body.dataset.projectId;delete document.body.dataset.readerKind;home.hidden=false;home.style.opacity=initial?'1':'0';updateHeight();gallery?.resize();aboutScene.resize();lenis=makeLenis();
  const target=restoreScroll??homeAnchorPosition(route)??homeScroll;
  if(lenis)lenis.scrollTo(target,{immediate:true});else scrollTo({top:target,behavior:'instant'});gallery?.snapToScroll?.(physicalToScene(target/innerHeight,innerWidth));
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(!initial)await fade(home,0,1,380);
  const focusTarget=route.section==='about'?$('#about-name'):sceneCanvas;
  focusTarget.tabIndex=-1;focusTarget.focus({preventScroll:true});
 }
 if(!queued)history.replaceState({kind:view,id:route.id,scroll:scrollY},'');busy=false;document.body.classList.remove('view-transitioning');unlockScene();
 if(queued){const pending=queued;queued=null;navigate(pending.route,pending.options)}
}
window.addEventListener('popstate',event=>navigate(readRoute(),{pop:true,restoreScroll:event.state?.scroll}));
window.addEventListener('hashchange',()=>{
 if(view!=='home'||busy)return;
 const target=homeAnchorPosition(readRoute());
 if(target===null)return;
 if(lenis)lenis.scrollTo(target,{immediate:true});
 else scrollTo({top:target,behavior:'instant'});
});
let last=0,time=0,age=0,lastIndex=-1,lastIntro=-1,brandOpacity=0,brandShown=false,headerShown=false;
function backgroundInspect(){return{time,pointer:{...pointerNow},canvas:$('#atmosphere').id}}
if(qa){window.__readerQA=()=>({...reader?.inspect(),background:backgroundInspect(),navigating:busy,view});window.__portfolioQA=()=>({...gallery?.inspect?.(),backgroundHover,paused,theme:projectTheme.inspect(),about:aboutScene.inspect(),view,busy,background:backgroundInspect(),milestones:scrollMilestones(innerWidth),scene:physicalToScene(scrollY/innerHeight,innerWidth),totalDistance:sceneToPhysical(galleryEnd(projects.length),innerWidth)})}
if(qa)window.__portfolioQA.seek=scene=>{const target=sceneToPhysical(scene,innerWidth)*innerHeight;if(lenis)lenis.scrollTo(target,{immediate:true});else scrollTo({top:target,behavior:'instant'});gallery?.snapToScroll?.(scene)};
function frame(ms){requestAnimationFrame(frame);if(!visible)return;const dt=last?Math.min((ms-last)/1000,.05):1/60;last=ms;lenis?.raf(ms);age+=dt;if(!paused)time+=dt;const smooth=1-Math.exp(-10*dt);pointerNow.x+=(pointer.x-pointerNow.x)*smooth;pointerNow.y+=(pointer.y-pointerNow.y)*smooth;pointerNow.active+=(pointer.active-pointerNow.active)*smooth;pointerNow.rawX=pointer.x;pointerNow.rawY=pointer.y;
 const cx=clamp(cursorPoint.x+20,8,viewportWidth-142),cy=clamp(cursorPoint.y+20,8,viewportHeight-59),cursorEase=1-Math.exp(-17*dt);
 const nextX=cursorNow.x+(cx-cursorNow.x)*cursorEase,nextY=cursorNow.y+(cy-cursorNow.y)*cursorEase;
 if(nextX!==cursorNow.x||nextY!==cursorNow.y){
  cursorNow.x=nextX;cursorNow.y=nextY;cursor.style.transform=`translate(${nextX}px,${nextY}px)`;
 }
 let route='background',aboutAlpha=0;
 if(view==='home'&&!home.hidden){
  route=staticMode?'background':'none';
  aboutAlpha=staticMode?1:0;
  if(!staticMode){
   const currentY=scrollY;
   if(currentY!==frameScrollY){
    frameScrollY=currentY;frameScene=physicalToScene(currentY/viewportHeight,viewportWidth);
    scrollCue.style.opacity=frameScene>lastScene-.5?clamp((lastScene-frameScene)*2):1;
    const cue=frameScene>1.2?'继续滚动 探索作品':'向下滚动 了解我';
    if(scrollCopy.textContent!==cue)scrollCopy.textContent=cue;
    scrollProgress.style.setProperty('--progress',clamp(currentY/total));
   }
   const scroll=frameScene;
   const reveal=reducedMotion?1:clamp((age-.08)/1.4);
   const state=gallery?.render(time,dt,scroll,pointerNow,reveal,aboutScene.getLayout(),!paused);
   if(state){
    const {intro,about,brand,header,index,hoverTarget}=state;
    aboutAlpha=about;
    route=hoverTarget;
    if(brand!==brandOpacity){
     brandOpacity=brand;
     brandButton.style.opacity=String(brand);
    }
    const showBrand=brand>.08;
    if(showBrand!==brandShown){
     brandShown=showBrand;
     portfolioMenu.setAvailable(showBrand);
    }
    const showCaption=header>.8;
    if(showCaption!==headerShown){
     headerShown=showCaption;
     workCaption.classList.toggle('visible',showCaption);
    }
    if(intro!==lastIntro){
     lastIntro=intro;introCaption.style.opacity=1-clamp(intro*2);lycheeShadow.style.opacity=(1-intro)*.65;
    }
    if(lastIndex!==index){
     lastIndex=index;
     workNumber.textContent=String(index+1).padStart(2,'0');
     workName.textContent=projects[index].name;workName.title=projects[index].name;
    }
    const phase=about>.08?'about':showCaption?'gallery':scroll<.8?'intro':'transition';
    if(document.body.dataset.phase!==phase)document.body.dataset.phase=phase;
   }
  }
 }
 aboutScene.update({visibility:aboutAlpha,dt,pointer:pointerNow,paused:paused||view!=='home'});if(view!=='home'||busy)route='background';backgroundHover+=(Number(route==='background')-backgroundHover)*(1-Math.exp(-16*dt));atmosphere.render(time,{x:pointerNow.x,y:pointerNow.y,active:pointerNow.active*backgroundHover},projectTheme.update(dt));if(document.body.dataset.hoverTarget!==route)document.body.dataset.hoverTarget=route;
}requestAnimationFrame(frame);
const initialRoute=readRoute();
if(initialRoute.kind!=='home')await navigate(initialRoute,{initial:true});else{delete document.documentElement.dataset.initialView;document.documentElement.classList.remove('project-document-root');lenis=makeLenis();const target=homeAnchorPosition(initialRoute);if(target!==null){if(lenis)lenis.scrollTo(target,{immediate:true});else scrollTo({top:target,behavior:'instant'});gallery?.snapToScroll?.(physicalToScene(target/innerHeight,innerWidth))}history.replaceState({kind:'home',scroll:scrollY},'',location.pathname.endsWith('/project.html')?homeURL():location.href);document.body.dataset.view='home'}
