export const ABOUT_SCROLL_SPAN=2.2;
export const SCROLL_DISTANCE_SCALE=.72;
export const ABOUT_ANCHOR=1.7;
const DESKTOP_ABOUT_EXIT=2.65;
const DESKTOP_ABOUT_SCROLL_CUT=.11;
export const smoothstep=(value,start,end)=>{const t=Math.max(0,Math.min(1,(value-start)/(end-start)));return t*t*(3-2*t)};
export const brandVisibility=(scroll,width=globalThis.innerWidth??1440)=>width<=760
 ?smoothstep(scroll,1.24,1.62)
 :smoothstep(scroll,.78,1.16);
export const aboutVisibility=(scroll,width=globalThis.innerWidth??1440)=>
 brandVisibility(scroll,width)*(1-smoothstep(scroll,width<=760?2.08:DESKTOP_ABOUT_EXIT,3.12));
export const galleryScroll=scroll=>Math.max(0,scroll-ABOUT_SCROLL_SPAN);
export const desktopFruitPose=(width,height)=>({x:width/2,y:height*.545,diameter:Math.min(335,height*.39,width*.24)});
export function mobileFruitPose(scroll,width,height,target,drift=0){
 const mix=(a,b,t)=>a+(b-a)*t,enter=smoothstep(scroll,0,1.62),exit=smoothstep(scroll,2.08,3.12);
 return{x:mix(mix(width/2,target.x,enter),width/2,exit),y:mix(mix(height*.605,target.y,enter),height*.545+drift,exit),diameter:mix(mix(104,target.diameter,enter),Math.min(220,width*.56),exit)};
}
export const projectCenter=index=>ABOUT_SCROLL_SPAN+1.18+(2.7+index)*.52;
export const galleryEnd=count=>(326+count*52+ABOUT_SCROLL_SPAN*100)/100-1;

// Each device has its own scroll pacing. Monotone Hermite curves keep the speed continuous.
function curve(points,mobile){
 const d=points.slice(1).map((p,i)=>(p[1]-points[i][1])/(p[0]-points[i][0]));
 const slopes=points.map((_,i)=>i===0?d[0]:i===points.length-1?.72:Math.min(3*Math.min(d[i-1],d[i]),2/(1/d[i-1]+1/d[i])));
 slopes[1]=.72;
 return{points,slopes};
}
const desktop=curve([[0,0],[1.16,.8352],[2.3,1.40],[3.4,1.82],[4.784,2.40]],false);
const mobile=curve([[0,0],[1.02,.7344],[1.24,1.02],[1.62,1.29],[2.08,1.55],[3.4,2.70],[4.784,3.32]],true);
export function sceneToPhysical(value,width=globalThis.innerWidth??1440){
 const small=width<=760,{points,slopes}=small?mobile:desktop,last=points.at(-1);
 if(value<=0)return value*.72;
 // Compress the desktop hold before fading; later transitions keep their spacing.
 const cut=small?0:DESKTOP_ABOUT_SCROLL_CUT*smoothstep(value,ABOUT_ANCHOR,DESKTOP_ABOUT_EXIT);
 if(value>=last[0])return last[1]-cut+(value-last[0])*.72;
 const i=points.findIndex((point,index)=>index<points.length-1&&value<points[index+1][0]),a=points[i],b=points[i+1],span=b[0]-a[0],t=(value-a[0])/span;
 return(2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*span*slopes[i]+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*span*slopes[i+1]-cut;
}
export function physicalToScene(value,width=globalThis.innerWidth??1440){
 const small=width<=760,last=(small?mobile:desktop).points.at(-1),lastPhysical=last[1]-(small?0:DESKTOP_ABOUT_SCROLL_CUT);
 if(value<=0)return value/.72;
 if(value>=lastPhysical)return last[0]+(value-lastPhysical)/.72;
 let low=0,high=last[0];for(let i=0;i<27;i++){const mid=(low+high)/2;if(sceneToPhysical(mid,width)<value)low=mid;else high=mid}return(low+high)/2;
}
export function scrollMilestones(width){const small=width<=760;return Object.fromEntries(Object.entries({fruitArrival:small?1.62:1.02,aboutEnter:small?1.24:.78,aboutFull:small?1.62:1.16,fruitLeave:small?2.08:DESKTOP_ABOUT_EXIT,gallery:3.4,firstCover:projectCenter(0)}).map(([key,value])=>[key,sceneToPhysical(value,width)]))}
