export function createAtmosphere(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)return {resize(){},render(){}};
 const vert=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
 const frag=`precision highp float;uniform vec2 resolution;uniform vec2 viewport;uniform vec3 pointer;uniform float time;uniform vec3 themeColor;uniform vec3 themePaper;uniform float themeMix;
 float hash(vec2 p){vec3 v=fract(vec3(p.xyx)*.1031);v+=dot(v,v.yzx+33.33);return fract((v.x+v.y)*v.z);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
 float fourthPower(float x){float squared=x*x;return squared*squared;}
 void main(){vec2 uv=gl_FragCoord.xy/resolution;vec2 px=uv*viewport;vec2 p=(px-.5*viewport)/viewport.y;float t=time*.17;
 float n=noise(p*2.+vec2(t,-t*.65));float flow=noise(p*2.6+vec2(n*2.8,t*.85));float folds=.5+.5*sin(p.x*4.8+p.y*2.5+n*6.+t*1.8);
 float light=fourthPower(.5+.5*sin(p.x*2.8-p.y*1.7-time*.24));float shade=(smoothstep(.25,.82,flow)*.085+fourthPower(folds)*.052)*(1.-light*.25);
 vec3 paper=mix(vec3(1.,1.,.992),themePaper,themeMix)-shade*(vec3(1.)-themeColor*.18*themeMix);
 float space=7.;vec2 travel=vec2(time*1.15,sin(time*.28)*4.);vec2 grid=(px-travel)/space;vec2 cell=floor(grid);vec2 drift=vec2(sin(cell.y*.10-time*.68)+cos(cell.x*.04+time*.43),cos(cell.x*.085+time*.56)+sin(cell.y*.035-time*.37))*.065;vec2 local=fract(grid)-.5-drift;vec2 center=(cell+.5+drift)*space+travel;
 float hover=0.;
 if(pointer.z>0.){
  vec2 delta=(center-vec2(pointer.x,1.-pointer.y)*viewport)/105.;
  hover=exp(-dot(delta,delta))*pointer.z;
 }
 float pulse=.5+.5*sin(cell.x*.13+cell.y*.09-time*1.25);float wave=.5+.5*sin(length(p-vec2(-.2,.1))*9.-time*.85);
 float radius=.046+.045*pulse+.025*wave+hover*.22;
 float circle=1.-smoothstep(radius-.025,radius+.025,length(local));
 vec3 dotColor=mix(vec3(.63,.66,.64),vec3(.902,.224,.275),hover*.36);
 vec3 color=mix(paper,dotColor,circle*(.34+shade*3.+hover*.27));
 color+=(hash(gl_FragCoord.xy)-.5)*.008;gl_FragColor=vec4(color,1.);}`;
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vert));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(p);gl.useProgram(p);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);const u={};for(const k of ['resolution','viewport','pointer','time','themeColor','themePaper','themeMix'])u[k]=gl.getUniformLocation(p,k);
 let lost=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.style.opacity=0});
 function resize(){
  const d=Math.min(devicePixelRatio,1.5),width=Math.round(innerWidth*d),height=Math.round(innerHeight*d);
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
  gl.viewport(0,0,width,height);gl.uniform2f(u.resolution,width,height);gl.uniform2f(u.viewport,innerWidth,innerHeight);
 }resize();
 return{resize,render(time,pointer,theme){if(lost)return;gl.uniform1f(u.time,time);gl.uniform3f(u.pointer,pointer.x,pointer.y,pointer.active);gl.uniform3fv(u.themeColor,theme?.color??[.902,.224,.275]);gl.uniform3fv(u.themePaper,theme?.paper??[1,1,.992]);gl.uniform1f(u.themeMix,theme?.strength??0);gl.drawArrays(gl.TRIANGLES,0,6)}};
}
