import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import TemplatePreview,{MaterialCanvas} from '../../src/unit1/components/MaterialPreview';
import {buildMaterialSpec,DEFAULT_VIEWER_FORM} from '../../src/unit1/data/materialViewerModel';
import '../../src/index.css';
const spec=buildMaterialSpec({...DEFAULT_VIEWER_FORM,punches:[
 {face:'web',size:'12x20',positions:'100,500,900',offset:'0',axis:'length'},
 {face:'l_flange',size:'12',positions:'300,700,1100',offset:'0',axis:'length'},
 {face:'r_flange',size:'14',positions:'500,900,1300',offset:'0',axis:'length'},
 {face:'l_lip',size:'8',positions:'200,1000',offset:'0',axis:'length'},
]});
const changedSpec={...spec,holes:spec.holes.map(hole=>({...hole,position:hole.position+10}))};
function Fixture(){
 const [preview,setPreview]=useState(false),[dimensions,setDimensions]=useState(false),[edited,setEdited]=useState(false);
 return <><button id="switch" onClick={()=>setPreview(v=>!v)}>Switch viewer / job-card preview</button><button id="edit" onClick={()=>setEdited(v=>!v)}>Update material</button>{preview?<TemplatePreview spec={edited?changedSpec:spec}/>:<MaterialCanvas spec={edited?changedSpec:spec} showDimensions={dimensions} autoRotate={false} onStopRotation={()=>{}} onToggleDimensions={()=>setDimensions(v=>!v)} onToggleRotation={()=>{}}/>}</>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=(value,message)=>{if(!value)throw Error(message);};
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await wait(50);}throw Error('Timed out: '+fn);}
const visible=selector=>[...document.querySelectorAll(selector)].filter(el=>getComputedStyle(el).visibility!=='hidden'&&el.getClientRects().length);
const selectView=async text=>{
 [...document.querySelectorAll('.mv-views button')].find(button=>button.textContent===text).click();
 const view={Top:'top',Side:'side',Isometric:'iso'}[text];
 await until(()=>document.querySelector('.mv-dimension-layer')?.dataset.view===view);
 await wait(100);
};
try{
 for(const mode of ['standalone','job-card preview']){
  await until(()=>document.querySelector('canvas')&&!document.querySelector('[aria-busy="true"]'));
  const toggle=[...document.querySelectorAll('.mv-views button')].find(button=>button.textContent.includes('Show dimensions'));toggle.click();
  await selectView('Top');
  let sizes=visible('.mv-hole-size'),spacings=visible('.mv-hole-spacing');
  check(sizes.length===3,`${mode}: Top did not show all three WEB hole badges (${sizes.length})`);
  check([...sizes,...spacings].every(el=>el.dataset.face==='web'),`${mode}: Top shows side dimensions`);
  check(sizes.every(el=>el.querySelector('.mv-hole-position')?.textContent.includes('mm from end 0')),`${mode}: Missing absolute hole positions`);
  check(spacings.some(el=>el.textContent.includes('400 mm C/C')),`${mode}: Lost hole-to-hole distance`);
  await selectView('Side');sizes=visible('.mv-hole-size');spacings=visible('.mv-hole-spacing');
  check(sizes.length===8,`${mode}: Side did not show all side holes (${sizes.length})`);
  check([...sizes,...spacings].every(el=>el.dataset.face!=='web'),`${mode}: Side shows WEB dimensions`);
  for(const face of ['l_flange','r_flange','l_lip'])check(sizes.some(el=>el.dataset.face===face),`${mode}: Missing ${face}`);
  await selectView('Isometric');sizes=visible('.mv-hole-size');
  check(sizes.length===11,`${mode}: Isometric did not show every hole (${sizes.length})`);
  for(const face of ['web','l_flange','r_flange','l_lip'])check(sizes.some(el=>el.dataset.face===face),`${mode}: Isometric missing ${face}`);
  await selectView('Top');check(visible('.mv-hole-size').length===3,`${mode}: Isometric labels remained after returning to Top`);
  const previous=visible('.mv-hole-position').map(el=>el.textContent).join('|');document.querySelector('#edit').click();
  await until(()=>visible('.mv-hole-size').length===3&&visible('.mv-hole-position').map(el=>el.textContent).join('|')!==previous);
  check(visible('.mv-hole-size').every(el=>el.dataset.face==='web'),`${mode}: Updating material reset the selected face filter`);
  toggle.click();await wait(100);check(visible('.mv-hole-size').length===0,`${mode}: Dimensions toggle did not hide all hole labels`);
  if(mode==='standalone'){document.querySelector('#switch').click();await wait(200);}
 }
 document.querySelector('#result').textContent='PASS: standalone viewer and job-card preview filter Top/Side/Isometric labels and retain exact end-zero positions and C/C distances';
}catch(error){document.querySelector('#result').textContent='FAIL: '+error.stack;}
