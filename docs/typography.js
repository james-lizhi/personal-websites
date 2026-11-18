import * as THREE from './vendor/three.module.js';
export function createTypography(){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,1,1,0,-10,10);let main,size,bounds=null,layoutProgress=-1;
 function createMask(lines,fontSize){const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=lines.length>1?1300:2500;c.height=lines.length>1?650:430;ctx.fillStyle='white';ctx.font=`900 ${fontSize}px HarmonyOS, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';let left=c.width,right=0,bottom=0,top=c.height;lines.forEach((line,i)=>{const y=c.height/2+(i-(lines.length-1)/2)*fontSize*1.3;ctx.fillText(line,c.width/2,y);const m=ctx.measureText(line);left=Math.min(left,c.width/2-m.actualBoundingBoxLeft);right=Math.max(right,c.width/2+m.actualBoundingBoxRight);top=Math.min(top,y-m.actualBoundingBoxAscent);bottom=Math.max(bottom,y+m.actualBoundingBoxDescent)});const texture=new THREE.CanvasTexture(c);texture.minFilter=THREE.LinearFilter;return{texture,width:c.width,height:c.height,bounds:{left:left/c.width,right:right/c.width,top:top/c.height,bottom:bottom/c.height}}}
 function build(){if(main){scene.remove(main.mesh);main.mesh.geometry.dispose();main.mesh.material.dispose();main.mask.texture.dispose()}const mask=createMask(size.mobile?['你好，','我是李智']:['你好，我是李智'],size.mobile?230:310);const uniforms={uMap:{value:mask.texture},uPixels:{value:new THREE.Vector2(1000,172)},uCell:{value:size.mobile?2.65:3.8},uTime:{value:0},uOpacity:{value:1},uDissolve:{value:0},uReveal:{value:1},uPointer:{value:new THREE.Vector2(-1000,-1000)},uHover:{value:0}};
 const material=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`precision highp float;uniform sampler2D uMap;uniform vec2 uPixels;uniform float uCell;uniform float uTime;uniform float uOpacity;uniform float uDissolve;uniform float uReveal;uniform vec2 uPointer;uniform float uHover;varying vec2 vUv;
 float hash(vec2 p){vec3 v=fract(vec3(p.xyx)*.1031);v+=dot(v,v.yzx+33.33);return fract((v.x+v.y)*v.z);}
 // One Gaussian field drives size and color, with no hard edge around the cursor.
 float pointerFalloff(vec2 point){return uHover>0.?exp(-pow(distance(point,uPointer)/90.,2.))*uHover:0.;}
 float breathing(vec2 uv){return .5+.5*sin(uTime*1.45-uv.x*1.8+uv.y*.8);}
 float flowWave(vec2 uv){return .5+.5*sin(uv.x*10.-uv.y*3.5-uTime*1.35+.35*sin(uv.y*6.+uTime*.45));}
 void main(){vec2 pixel=vUv*uPixels;vec2 grid=pixel/uCell;vec2 base=floor(grid);vec2 local=fract(grid)-.5;float alpha=0.;
 // A dot reaches at most .54 for radius, .015 for its soft edge, and .13 for drift.
 for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){
  vec2 offset=vec2(float(x),float(y));
  if(any(greaterThan(abs(local-offset),vec2(.686))))continue;
  vec2 id=base+offset;vec2 anchor=(id+.5)*uCell;vec2 uv=anchor/uPixels;
  float glyph=texture2D(uMap,uv).a;
  if(glyph<.01)continue;
  vec2 drift=vec2(sin(uv.y*7.+uv.x*4.-uTime*1.1),cos(uv.x*8.-uv.y*3.-uTime*.85))*uCell*.13;
  vec2 center=anchor+drift;float seed=hash(id);float reveal=smoothstep(uv.x-.16,uv.x+.22,uReveal*1.35);float dissolve=smoothstep(uDissolve-.1,uDissolve+.12,seed);float scan=flowWave(uv);float micro=.5+.5*sin(seed*12.+uTime*.9);float hover=pointerFalloff(center);float baseRadius=.285+.135*scan+.025*micro;float radius=min(.54,baseRadius*(1.+hover*(.50+.05*breathing(uv))));float circle=1.-smoothstep(radius-.065,radius+.015,length((pixel-center)/uCell));alpha=max(alpha,glyph*circle*reveal*dissolve);
 }}
 if(alpha<.01)discard;float wave=flowWave(vUv);vec3 ink=mix(vec3(.902,.224,.275),vec3(.71,.19,.25),wave*.5);ink=mix(ink,vec3(1.,.64,.66),pow(wave,5.)*.78);float hover=pointerFalloff((base+.5)*uCell);vec3 hoverInk=max(ink,vec3(1.,.46,.52));ink=mix(ink,hoverInk,hover*(.94+.06*breathing(vUv)));gl_FragColor=vec4(ink,alpha*uOpacity);}`});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);scene.add(mesh);main={mesh,uniforms,mask,ratio:mask.height/mask.width};}
 function resize(w,h){
  const mobile=w<760;
  if(size?.w===w&&size.h===h)return;
  const newMask=mobile!==size?.mobile;
  size={w,h,mobile};camera.right=w;camera.top=h;camera.updateProjectionMatrix();
  layoutProgress=-1;
  if(newMask)build();
 }
 function update(time,progress,reveal){
  const visible=progress<.84;
  main.mesh.visible=visible;
  if(progress!==layoutProgress){
   layoutProgress=progress;
   const {w,h,mobile}=size,width=(mobile?Math.min(w*.86,420):Math.min(w*.84,1270))*(1-.68*progress),height=width*main.ratio;
   const x=w/2,y=h*(mobile?.69:.67)+progress*h*.1;
   main.mesh.scale.set(width,height,1);main.mesh.position.set(x,y,0);
   main.uniforms.uPixels.value.set(width,height);
   main.uniforms.uOpacity.value=1-THREE.MathUtils.smoothstep(progress,.32,.84);
   main.uniforms.uDissolve.value=THREE.MathUtils.smoothstep(progress,.35,.94)*.88;
   const b=main.mask.bounds;
   bounds={left:x-width/2+width*b.left,right:x-width/2+width*b.right,top:h-y-height/2+height*b.top,bottom:h-y-height/2+height*b.bottom,originX:x-width/2,originY:y-height/2,opacity:main.uniforms.uOpacity.value};
  }
  if(visible){main.uniforms.uTime.value=time;main.uniforms.uReveal.value=reveal}
  return visible;
 }
 function contains(x,y){return bounds&&bounds.opacity>.12&&x>=bounds.left-8&&x<=bounds.right+8&&y>=bounds.top-8&&y<=bounds.bottom+8}
 function setPointer(x,y,strength){if(!main.mesh.visible||!bounds)return;main.uniforms.uPointer.value.set(x-bounds.originX,size.h-y-bounds.originY);main.uniforms.uHover.value=strength}
 return{scene,camera,resize,update,contains,setPointer,getBounds:()=>bounds};
}
