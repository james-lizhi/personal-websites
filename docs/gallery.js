import * as THREE from './vendor/three.module.js';
import {createLychee} from './lychee.js';
import {createTypography} from './typography.js';
import {projects} from './projects.js';
import {rgbFromHex} from './project-theme.js';
import {aboutVisibility,brandVisibility,galleryScroll,desktopFruitPose,mobileFruitPose} from './timeline.js';
export {projects};
export function createGallery(canvas,{onProject,onHover,onFallback,reducedMotion,isAboutTarget=()=>false,isNavigationTarget=()=>false}){
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}catch{onFallback();return{resize(){},render(){},available:false}}
 renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.autoClear=false;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,50);camera.position.z=8.1;
 // Hit tests and rendering use the same world matrices, updated once before both.
 scene.matrixWorldAutoUpdate=false;
 const lychee=createLychee();scene.add(lychee.group);lychee.group.children[0].renderOrder=10;
 const type=createTypography(),loader=new THREE.TextureLoader(),cards=[],shadows=[];const width=2.42,height=width/projects[0].aspect;
 function curvedGeometry(w,h){const geometry=new THREE.PlaneGeometry(w,h,52,12),a=geometry.attributes.position;for(let j=0;j<a.count;j++){const x=a.getX(j);a.setX(j,Math.sin(x/3.7)*3.7);a.setZ(j,(Math.cos(x/3.7)-1)*3.7)}geometry.computeVertexNormals();return geometry}
 const cardGeometry=curvedGeometry(width,height),shadowGeometry=curvedGeometry(width+.48,height+.48);
 const vertex=`uniform float uTime;uniform float uVelocity;uniform float uPhase;varying vec2 vUv;varying float vBend;
 void main(){vUv=uv;vec3 p=position;float edge=pow(abs(uv.x-.5)*2.,2.);p.z+=sin(uv.x*3.14159+uPhase)*uVelocity*.085+sin(uTime*1.5+uv.x*2.8+uPhase)*.013*edge;p.y+=sin(uv.x*3.14159)*uVelocity*.028;vBend=edge;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
 const fragment=`precision highp float;uniform sampler2D uMap;uniform float uOpacity;uniform float uWash;uniform float uPhase;uniform float uHover;uniform vec3 uAccent;varying vec2 vUv;varying float vBend;
 void main(){vec2 p=abs(vUv-.5)-vec2(.479,.468);float corner=length(max(p,0.))-.021;float mask=1.-smoothstep(-.003,.002,corner);vec3 color=mix(texture2D(uMap,vUv).rgb,vec3(.997),uWash);float sheen=pow(max(0.,1.-abs(vUv.x-(.18+sin(uPhase*.6)*.2))*.8),18.)*.025;color+=sheen+vBend*.008;float edge=1.-smoothstep(.005,.009,-corner);color=mix(color,uAccent,edge*uHover);gl_FragColor=vec4(color,mask*uOpacity);}`;
 projects.forEach((p,i)=>{const texture=loader.load('./assets/'+p.image);texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uMap:{value:texture},uOpacity:{value:0},uWash:{value:0},uTime:{value:0},uVelocity:{value:0},uPhase:{value:i},uHover:{value:0},uAccent:{value:new THREE.Vector3(...rgbFromHex(p.color))}},transparent:true,depthWrite:false,side:THREE.FrontSide});const mesh=new THREE.Mesh(cardGeometry,material);mesh.userData.index=i;mesh.visible=false;scene.add(mesh);cards.push(mesh);
  const shadowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,uniforms:{uOpacity:{value:0},uSize:{value:new THREE.Vector2(width,height)}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision highp float;varying vec2 vUv;uniform float uOpacity;uniform vec2 uSize;void main(){vec2 p=(vUv-.5)*(uSize+.48);vec2 q=abs(p)-(uSize*.5-.055);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.055;float blur=exp(-pow(max(d,0.)/.105,2.));float fade=1.-smoothstep(.18,.24,max(d,0.));gl_FragColor=vec4(.29,.28,.29,blur*fade*.17*uOpacity);}`});const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.visible=false;scene.add(shadow);shadows.push(shadow);
 });
 // Invisible hit volumes cover the complete fruit rather than flickering between individual dots.
 const proxyMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});const proxies=[];
 function proxy(geometry,x,y,z,rz=0){const mesh=new THREE.Mesh(geometry,proxyMaterial);mesh.position.set(x,y,z);mesh.rotation.z=rz;mesh.visible=false;lychee.group.add(mesh);proxies.push(mesh);return mesh}
 proxy(new THREE.SphereGeometry(1.075,24,16),0,0,0).scale.set(.99,1,.96);
 proxy(new THREE.PlaneGeometry(1.15,.4),.67,1.57,.08,.48);
 proxy(new THREE.PlaneGeometry(.75,.3),-.22,1.40,-.08,-.52);
 proxy(new THREE.CylinderGeometry(.06,.06,.55,8),.105,1.25,0,-.23);
 const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),offset=new THREE.Vector3();
 const interactiveCards=[],cardHits=[],fruitHits=[];
 let hovered=-1,pointerDown={x:0,y:0},dragging=false,dialogOpen=false;
 let w=0,h=0,mobile=false,progress=-2.7,oldProgress=-2.7,velocity=0,fruitProgress=0,fruitEnergy=0,worldPerPixel=1,brandOpacity=0,titleHover=0,fruitHover=0,hoverTarget='background',aboutOpacity=0,lastDiameter=155,brandRect=null;
 function setHovered(index){if(index!==hovered){hovered=index;onHover(index)}}
 function resolveTarget(x,y,active=true){
  if(!active||dialogOpen)return{target:'none',index:-1};
  if(isNavigationTarget()||(brandOpacity>.08&&brandRect&&x>=brandRect.left&&x<=brandRect.right&&y>=brandRect.top&&y<=brandRect.bottom))return{target:'brand',index:-1};
  if(type.contains(x,y))return{target:'title',index:-1};
  if(aboutOpacity>.08&&isAboutTarget(x,y))return{target:'about',index:-1};
  mouse.set(x/w*2-1,1-y/h*2);raycaster.setFromCamera(mouse,camera);
  cardHits.length=0;fruitHits.length=0;
  if(interactiveCards.length)raycaster.intersectObjects(interactiveCards,false,cardHits);
  raycaster.intersectObjects(proxies,false,fruitHits);
  const cardHit=cardHits[0],fruitHit=fruitHits[0];
  if(fruitHit&&(!cardHit||fruitHit.distance<cardHit.distance))return{target:'lychee',index:-1};
  if(cardHit)return{target:'card',index:cardHit.object.userData.index};
  return{target:'background',index:-1};
 }
 canvas.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};dragging=false});canvas.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-pointerDown.x)+Math.abs(e.clientY-pointerDown.y)>9)dragging=true});canvas.addEventListener('click',e=>{if(dragging)return;const hit=resolveTarget(e.clientX,e.clientY);if(hit.target==='card')onProject(hit.index)});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onFallback()});
 function resize(width=canvas.clientWidth,height=canvas.clientHeight){
  if(!width||!height)return;
  const ratio=Math.min(devicePixelRatio,1.75);
  if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
  if(w!==width||h!==height){
   w=width;h=height;mobile=w<=760;renderer.setSize(w,h,false);
   camera.aspect=w/h;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad((mobile?35.5:65.7)/2))/(w/h)));
   camera.updateProjectionMatrix();camera.updateMatrixWorld(true);worldPerPixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*8.1/h;type.resize(w,h);
  }
  brandRect=document.querySelector('#brand').getBoundingClientRect();
 }resize();
 function cardFrame(index){
  const mesh=cards[index];if(!mesh?.visible)return null;
  const a=mesh.geometry.attributes.position,u=mesh.material.uniforms,indices=[0,52,a.count-1,a.count-53],points=[];
  for(const i of indices){const point=new THREE.Vector3().fromBufferAttribute(a,i),x=i%53/52;point.z+=Math.sin(x*Math.PI+u.uPhase.value)*u.uVelocity.value*.085+Math.sin(u.uTime.value*1.5+x*2.8+u.uPhase.value)*.013;point.applyMatrix4(mesh.matrixWorld).project(camera);points.push({x:(point.x*.5+.5)*w,y:(.5-point.y*.5)*h})}
  return{points};
 }
 function snapToScroll(scroll){progress=-2.7+Math.max(0,galleryScroll(scroll)-1.18)/.52;oldProgress=progress;velocity=0;fruitProgress=scroll}
 return {available:true,resize,cardFrame,snapToScroll,setDialog(open){dialogOpen=open;if(open)setHovered(-1)},inspect(){const center=lychee.group.getWorldPosition(new THREE.Vector3()).project(camera);const cardBounds=cards.filter(m=>m.visible&&m.material.uniforms.uOpacity.value>.08).map(m=>{const a=m.geometry.attributes.position,p=new THREE.Vector3();let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld).project(camera);const x=(p.x*.5+.5)*w,y=(.5-p.y*.5)*h;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}return{index:m.userData.index,left,right,top,bottom,opacity:m.material.uniforms.uOpacity.value}});return{cardBounds,target:hoverTarget,hoveredProject:hovered,cardAccents:cards.map(m=>m.material.uniforms.uAccent.value.toArray()),titleHover,fruitHover,titleBounds:type.getBounds(),fruitCenter:{x:(center.x*.5+.5)*w,y:(.5-center.y*.5)*h},diameter:lastDiameter,visibleShadows:shadows.filter(s=>s.visible).length}},render(time,dt,scroll,pointer,reveal,aboutLayout,motionEnabled=true){
 if(!w||!h)return null;
 const galleryPosition=galleryScroll(scroll);
 const about=aboutVisibility(scroll,w),brand=brandVisibility(scroll,w);
 aboutOpacity=about;
 brandOpacity=brand;
 const intro=THREE.MathUtils.smoothstep(scroll,0,1.02);
 const header=THREE.MathUtils.smoothstep(galleryPosition,.94,1.2);
 const entry=THREE.MathUtils.smoothstep(galleryPosition,1.13,1.52);
 const target=-2.7+Math.max(0,galleryPosition-1.18)/.52;
 const rate=reducedMotion?1:1-Math.exp(-9*dt);progress+=(target-progress)*rate;const raw=(progress-oldProgress)/Math.max(.001,dt);velocity+=(THREE.MathUtils.clamp(raw,-5,5)-velocity)*(1-Math.exp(-5*dt));oldProgress=progress;fruitProgress+=(scroll-fruitProgress)*(1-Math.exp(-3.2*dt));fruitEnergy+=(Math.min(1,Math.abs(velocity)*.12)-fruitEnergy)*(1-Math.exp(-6*dt));
 const desktopPose=desktopFruitPose(w,h),startD=mobile?104:Math.min(155,w*.11),endD=mobile?Math.min(220,w*.56):desktopPose.diameter;
 const normalDiameter=THREE.MathUtils.lerp(startD,endD,intro),mobilePose=mobile?mobileFruitPose(scroll,w,h,aboutLayout?.fruit??{x:w/2,y:h*.4,diameter:144},Math.sin(fruitProgress*.6)*h*.009):null,diameter=mobile?mobilePose.diameter:normalDiameter;lastDiameter=diameter;lychee.group.scale.setScalar(diameter*.5*worldPerPixel);
 const centerY=mobile?mobilePose.y:THREE.MathUtils.lerp(h*.605,desktopPose.y,intro),centerX=mobile?mobilePose.x:desktopPose.x;
 const followPointer=!reducedMotion&&motionEnabled&&!dialogOpen;
 const horizontalSway=mobile?Math.sin(fruitProgress*.65)*9+(pointer.x-.5)*7:followPointer?(pointer.x-.5)*18*pointer.active:0;
 const verticalSway=!mobile&&followPointer?(pointer.y-.5)*12*pointer.active:0;
 lychee.group.position.set((centerX-w/2+horizontalSway)*worldPerPixel,(h/2-centerY-verticalSway)*worldPerPixel,0);lychee.group.rotation.set(.09+Math.sin(time*.22)*.045,-.32+time*.12+fruitProgress*.085,-.12+Math.sin(time*.23)*.035+fruitEnergy*.012);
 const scale=mobile?.99:.96,radius=mobile?1.1:4.05,depth=mobile?2.8:3.1,pitch=mobile?2.45:.55;
 interactiveCards.length=0;
 for(let i=0;i<cards.length;i++){const m=cards[i],shadow=shadows[i],rel=progress-i,theta=rel*.73,cosine=Math.cos(theta);m.visible=Math.abs(rel)<(mobile?1.7:2.36)&&entry>.001;shadow.visible=m.visible;if(!m.visible)continue;const cardZ=cosine*depth-.28,vertical=rel*pitch*(mobile?(camera.position.z-cardZ)/(camera.position.z-(depth-.28)):1);m.position.set(Math.sin(theta)*radius*(1+Math.min(.06,Math.abs(velocity)*.012)),vertical+Math.sin(time*.65+i*1.37)*.025,cardZ);m.rotation.set(-rel*.01+velocity*.025,theta-velocity*.035,Math.sin(rel*.68)*.042+velocity*.018);m.scale.setScalar(scale);const distance=Math.max(0,(1-cosine-.12)/.88),wash=Math.min(.96,Math.pow(distance,1.15)*.92);const u=m.material.uniforms;u.uOpacity.value=THREE.MathUtils.smoothstep(cosine,0,.13)*entry*(mobile?1-THREE.MathUtils.smoothstep(Math.abs(rel),1.3,1.7):1);if(u.uOpacity.value>.5)interactiveCards.push(m);u.uWash.value=wash;u.uTime.value=time;u.uVelocity.value=velocity;u.uPhase.value=i+theta;u.uHover.value+=(Number(i===hovered)-u.uHover.value)*rate;m.renderOrder=100+Math.round((m.position.z+10)*1000);shadow.quaternion.copy(m.quaternion);shadow.scale.copy(m.scale);offset.set(.035,-.055,-.075).applyQuaternion(m.quaternion);shadow.position.copy(m.position).add(offset);shadow.renderOrder=m.renderOrder-1;shadow.material.uniforms.uOpacity.value=u.uOpacity.value*(1-wash);}
 const showType=type.update(time,intro,reveal);scene.updateMatrixWorld(true);const hit=resolveTarget((pointer.rawX??pointer.x)*w,(pointer.rawY??pointer.y)*h,pointer.active>.02);hoverTarget=hit.target;setHovered(hit.index);const hoverRate=1-Math.exp(-12*dt);titleHover+=((hoverTarget==='title'?pointer.active:0)-titleHover)*hoverRate;fruitHover+=((hoverTarget==='lychee'?pointer.active:0)-fruitHover)*hoverRate;type.setPointer(pointer.x*w,pointer.y*h,titleHover);lychee.update(time,diameter,renderer.getPixelRatio(),1,fruitEnergy,reveal,{x:pointer.x*w,y:pointer.y*h,width:w,height:h,strength:fruitHover});
 renderer.clear();renderer.render(scene,camera);if(showType)renderer.render(type.scene,type.camera);
 return{intro,about,brand,header,entry,progress,index:THREE.MathUtils.clamp(Math.round(progress),0,projects.length-1),diameter,hoverTarget,backgroundHover:hoverTarget==='background'?1:0};
 }};
}
