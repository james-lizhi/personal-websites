const DEFAULT_ACCENT='#E63946';
export const rgbFromHex=hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255);

// Preserve the hue with very low chroma and a near-white lightness.
function palePaper(rgb){
 const high=Math.max(...rgb),low=Math.min(...rgb),range=high-low;
 if(range<.0001)return [.975,.975,.975];
 return rgb.map(channel=>.975+((channel-low)/range-.5)*.04);
}

export function createProjectTheme({projects,reducedMotion=false}){
 const palettes=projects.map(project=>({color:rgbFromHex(project.color),paper:palePaper(rgbFromHex(project.color))}));
 const color=rgbFromHex(DEFAULT_ACCENT),paper=[1,1,.992];
 let active=-1,strength=0,targetColor=color.slice(),targetPaper=paper.slice();
 function setProject(index){
  const next=Number.isInteger(index)&&index>=0&&index<projects.length?index:-1;
  if(next===active)return;
  active=next;
  document.documentElement.style.setProperty('--hover-accent',active>=0?projects[active].color:DEFAULT_ACCENT);
  if(active>=0){targetColor=palettes[active].color;targetPaper=palettes[active].paper;document.body.dataset.hoverProject=projects[active].id}
  else delete document.body.dataset.hoverProject;
 }
 function update(dt){
  const blend=reducedMotion?1:1-Math.exp(-5*dt);
  strength+=((active>=0?1:0)-strength)*blend;
  for(let i=0;i<3;i++){color[i]+=(targetColor[i]-color[i])*blend;paper[i]+=(targetPaper[i]-paper[i])*blend}
  return{color,paper,strength};
 }
 return{setProject,update,inspect:()=>({index:active,color:color.slice(),paper:paper.slice(),strength})};
}
