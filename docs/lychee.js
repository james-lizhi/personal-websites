import * as THREE from './vendor/three.module.js';
// A sculpted lychee skin, stem and two lanceolate leaves, made entirely of points.
export function createLychee(){
 const positions=[],normals=[],seeds=[],kinds=[],textures=[],peelBlends=[];const golden=Math.PI*(3-Math.sqrt(5));
 const cells=Array.from({length:330},(_,i)=>{const y=1-2*(i+.5)/330,r=Math.sqrt(1-y*y),a=i*golden;return[Math.cos(a)*r,y,Math.sin(a)*r]});
 const rand=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n)};
 function point(x,y,z,nx,ny,nz,kind,texture,seed,peelBlend=0){
  positions.push(x,y,z);normals.push(nx,ny,nz);seeds.push(seed);kinds.push(kind);
  textures.push(texture);peelBlends.push(peelBlend);
 }
 function peelTexture(x,y,z){
  let nearest=-1;
  for(const cell of cells)nearest=Math.max(nearest,x*cell[0]+y*cell[1]+z*cell[2]);
  const distance=Math.sqrt(Math.max(0,2*(1-nearest)));
  return Math.pow(Math.max(0,1-distance/.139),1.4);
 }
 const peelSide=(y,angle,r)=>.985+.024*y+.014*Math.sin(angle*3)*r;
 const peelIndent=r=>.12*Math.exp(-r*r/.055);
 const count=11200;
 for(let i=0;i<count;i++){
  const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*golden,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const pebble=peelTexture(x,y,z);
  const grain=(rand(i+8)-.5)*.008;const radius=1+.078*pebble+grain;
  const side=peelSide(y,a,r),indent=y>0?peelIndent(r):0;
  point(x*radius*side,y*radius-indent,z*radius*.96,x,y,z,0,pebble,rand(i),1);
 }
 // Match the flared root to the same dimple and bumps as the upper peel.
 function samplePeelTop(worldX,worldZ){
  let x=worldX/1.009,z=worldZ/.96;
  for(let i=0;i<2;i++){
   const r=Math.hypot(x,z),y=Math.sqrt(1-r*r);
   const radius=1+.078*peelTexture(x,y,z);
   x=worldX/(radius*peelSide(y,Math.atan2(z,x),r));
   z=worldZ/(radius*.96);
  }
  const r=Math.hypot(x,z),y=Math.sqrt(1-r*r),texture=peelTexture(x,y,z);
  return{height:y*(1+.078*texture)-peelIndent(r),texture};
 }
 const stemX=t=>.01+.16*t+.035*Math.sin(t*3);
 const stemY=t=>1+.49*t;
 const stemRadius=t=>.026*(1-t*.5);
 const stemZ=-.03,neckT=.11,neckY=stemY(neckT),neckRadius=stemRadius(neckT);
 const rootX=stemX(-.14),rootRadius=.12,rootSamples=156,flareCurve=2.3;
 for(let i=0;i<rootSamples;i++){
  const t=(i+.5)/rootSamples,a=i*golden,cos=Math.cos(a),sin=Math.sin(a);
  const skin=samplePeelTop(rootX+cos*rootRadius,stemZ+sin*rootRadius);
  const height=THREE.MathUtils.lerp(skin.height,neckY,t*t*(2-t));
  const radius=neckRadius+(rootRadius-neckRadius)*Math.pow(1-t,flareCurve);
  const curveT=(height-1)/.49;
  const center=stemX(curveT)+(rootX-stemX((skin.height-1)/.49))*(1-THREE.MathUtils.smoothstep(t,0,1));
  const rise=(neckY-skin.height)*t*(4-3*t);
  const taper=flareCurve*(rootRadius-neckRadius)*Math.pow(1-t,flareCurve-1);
  const normalY=taper+rise*.3,normalLength=Math.hypot(rise,normalY);
  const peelBlend=1-THREE.MathUtils.smoothstep(t,.14,.88);
  const texture=THREE.MathUtils.lerp(.5,skin.texture,peelBlend);
  point(center+cos*radius,height,stemZ+sin*radius,cos*rise/normalLength,normalY/normalLength,
   sin*rise/normalLength,1,texture,rand(i+31000),peelBlend);
 }
 const stemN=320;
 for(let i=Math.ceil(stemN*neckT);i<stemN;i++){
  const t=i/stemN,a=i*golden,radius=stemRadius(t);
  point(stemX(t)+Math.cos(a)*radius,stemY(t),stemZ+Math.sin(a)*radius,
   Math.cos(a),.3,Math.sin(a),1,.5,rand(i+30000));
 }
 function leaf(side,length,startY,startX,depth,seed){const n=1500;for(let i=0;i<n;i++){const t=(i+.5)/n;const across=rand(i+seed)*2-1;const span=Math.pow(Math.sin(Math.PI*t),.8)*.20;const x=startX+side*length*t;const y=startY+length*(.65*t-.12*t*t);const z=depth+Math.sin(t*Math.PI)*.16;
   const midrib=Math.exp(-across*across*55);point(x+across*span*.22,y-across*span*.62,z+across*span+Math.abs(across)*.065*Math.sin(t*Math.PI),-.15,.65,.85,2,midrib,rand(i+seed+10));}}
 leaf(1,1.04,1.29,.13,-.02,42000);leaf(-1,.62,1.23,.12,-.13,49000);
 // A light halo of detached pixels makes the surface feel alive without obscuring its silhouette.
 const dustN=230;for(let i=0;i<dustN;i++){const y=1-2*rand(i+60000),r=Math.sqrt(1-y*y),a=i*golden,extend=1.08+rand(i+70000)*.15;point(Math.cos(a)*r*extend,y*extend,Math.sin(a)*r*extend,Math.cos(a)*r,y,Math.sin(a)*r,3,.3,rand(i+80000))}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aNormal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));geometry.setAttribute('aKind',new THREE.Float32BufferAttribute(kinds,1));geometry.setAttribute('aTexture',new THREE.Float32BufferAttribute(textures,1));
 geometry.setAttribute('aPeelBlend',new THREE.Float32BufferAttribute(peelBlends,1));
 const uniforms={uTime:{value:0},uOpacity:{value:1},uPointScale:{value:1.5},uDpr:{value:1},uEnergy:{value:0},uReveal:{value:1},uPointer:{value:new THREE.Vector2(-1000,-1000)},uViewport:{value:new THREE.Vector2(innerWidth,innerHeight)},uHover:{value:0},uHoverRadius:{value:75}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:true,uniforms,
 vertexShader:`attribute vec3 aNormal;attribute float aSeed;attribute float aKind;attribute float aTexture;attribute float aPeelBlend;uniform float uTime;uniform float uPointScale;uniform float uDpr;uniform float uEnergy;uniform float uReveal;uniform vec2 uPointer;uniform vec2 uViewport;uniform float uHover;uniform float uHoverRadius;varying float vLight;varying float vSeed;varying float vKind;varying float vAlpha;varying float vTexture;varying float vWave;varying float vPeelBlend;
 void main(){vec3 p=position;float wave=sin(p.y*7.5+p.x*2.5+uTime*.85);float fine=sin(aSeed*80.+uTime*1.2);float band=pow(.5+.5*wave,7.);float swell=.014*wave+.004*fine+band*.024+uEnergy*.012;
 if(aKind<2.5){
  vec3 skinMotion=aNormal*(swell+(1.-uReveal)*(.2+aSeed*.55));
  float stemSway=sin(uTime*.7+p.x*2.)*.025*max(0.,p.y-1.);
  p+=mix(vec3(0.,0.,stemSway),skinMotion,aPeelBlend);
 }else{p+=aNormal*(.025*sin(uTime+aSeed*10.));}
 vec4 mv=modelViewMatrix*vec4(p,1.);vec3 norm=normalize(normalMatrix*aNormal);float front=smoothstep(-.12,.35,norm.z);vLight=max(0.,dot(norm,normalize(vec3(-.7+sin(uTime*.25)*.12,.75,.7))));vSeed=aSeed;vKind=aKind;vTexture=aTexture;vWave=.5+.5*wave;vPeelBlend=aPeelBlend;
 vAlpha=front*(.93+.07*sin(aSeed*28.+uTime*.8));if(aKind>.5&&aKind<2.5)vAlpha=mix(.92,vAlpha,aPeelBlend);if(aKind>2.5)vAlpha*=.3;
 gl_Position=projectionMatrix*mv;vec2 screen=(gl_Position.xy/gl_Position.w*.5+.5)*uViewport;float proximity=exp(-pow(distance(screen,uPointer)/uHoverRadius,2.))*uHover;
 gl_PointSize=uDpr*uPointScale*(.88+.24*vLight+.34*band+.22*aTexture)*(8.1/max(1.,-mv.z))*(1.+proximity*.85);if(aKind>2.5)gl_PointSize*=.65;
 }`,
 fragmentShader:`precision highp float;uniform float uOpacity;uniform float uReveal;varying float vLight;varying float vSeed;varying float vKind;varying float vAlpha;varying float vTexture;varying float vWave;varying float vPeelBlend;
 void main(){float d=length(gl_PointCoord-.5);if(d>.5||vAlpha<.04)discard;float mask=1.-smoothstep(.35,.5,d);float l=clamp(vLight*.85+vTexture*.14+vWave*.06,0.,1.);
 vec3 shade=vec3(.55,.18,.24),red=vec3(.96,.35,.40),lit=vec3(1.,.65,.67);vec3 color=mix(shade,red,smoothstep(.04,.75,l));color=mix(color,lit,pow(l,7.)*.8);color=mix(color,vec3(.82,.85,.82),smoothstep(.97,1.,vSeed)*.35);
 if(vKind>.5&&vKind<2.5){
  vec3 stemColor=mix(vec3(.48,.55,.50),vec3(.81,.86,.79),vLight*.5+vTexture*.25);
  color=mix(stemColor,color,vPeelBlend);
 }
 if(vKind>2.5)color=mix(red,vec3(.76),vSeed*.5);
 gl_FragColor=vec4(color,mask*vAlpha*uOpacity*uReveal);}`});
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;const group=new THREE.Group();group.add(points);
 return {group,update(time,diameter,dpr,opacity=1,energy=0,reveal=1,interaction=null){uniforms.uTime.value=time;uniforms.uPointScale.value=Math.max(.72,diameter/142);uniforms.uDpr.value=dpr;uniforms.uOpacity.value=opacity;uniforms.uEnergy.value=energy;uniforms.uReveal.value=reveal;uniforms.uHover.value=interaction?.strength??0;if(interaction){uniforms.uPointer.value.set(interaction.x,interaction.height-interaction.y);uniforms.uViewport.value.set(interaction.width,interaction.height);uniforms.uHoverRadius.value=Math.max(38,diameter*.24)}}};
}
