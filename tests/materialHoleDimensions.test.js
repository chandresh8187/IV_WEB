import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMaterialSpec,buildHoleSpacings,DEFAULT_VIEWER_FORM,VIEWER_PROFILES,templateViewerForm} from '../src/unit1/data/materialViewerModel.js';
import {holeFaceInView,holeDimensionText,holeSpacingText} from '../src/unit1/components/materialHoleDimensions.js';

test('Top only shows WEB holes; Side shows the side profiles; Isometric includes every face',()=>{
 for(const definition of VIEWER_PROFILES.filter(p=>p.key!=='w_beam')){
  const spec=buildMaterialSpec({...DEFAULT_VIEWER_FORM,profile:definition.key,sectionSize:definition.example,punches:[]});
  for(const face of spec.faces){
   assert.equal(holeFaceInView(face,'top'),face.key==='web',`${definition.key}: ${face.key}`);
   assert.equal(holeFaceInView(face,'side'),face.key!=='web');
   assert.equal(holeFaceInView(face,'iso'),true);
   assert.equal(holeFaceInView(face,'end'),false);
  }
 }
});

test('W-beam top and side labels follow the orientation of each formed panel',()=>{
 const spec=buildMaterialSpec({...DEFAULT_VIEWER_FORM,profile:'w_beam',sectionSize:'312X83',punches:[]});
 assert.deepEqual(spec.faces.filter(f=>holeFaceInView(f,'top')).map(f=>f.key),[1,3,5,7,9].map(i=>'w_panel_'+i));
 assert.deepEqual(spec.faces.filter(f=>holeFaceInView(f,'side')).map(f=>f.key),[2,4,6,8].map(i=>'w_panel_'+i));
 assert.equal(spec.faces.filter(f=>holeFaceInView(f,'iso')).length,9);
});

test('hole positions remain exact distances from end zero alongside hole size and C/C spacing',()=>{
 const form={...DEFAULT_VIEWER_FORM,punches:[
  {face:'web',size:'12x20',positions:'100.001,500.123',offset:'-20',axis:'length'},
  {face:'web',size:'14',positions:'100.001,500.123',offset:'20',axis:'length'},
  {face:'l_flange',size:'12',positions:'200,600',offset:'0',axis:'length'},
  {face:'r_flange',size:'12',positions:'200,600',offset:'0',axis:'length'},
 ]};
 const spec=buildMaterialSpec(form),original=JSON.stringify(spec),face=spec.faces.find(f=>f.key==='web');
 const text=holeDimensionText(face,spec.holes[0]);
 assert.equal(text.size,'WEB · A1 · 12 × 20 mm');assert.equal(text.position,'100.001 mm from end 0');
 const spacings=buildHoleSpacings(spec);
 assert.equal(spacings[0].distance,400.122);
 assert.match(holeSpacingText(face,spacings[0]),/400\.122 mm C\/C$/);
 for(const [view,count] of [['top',4],['side',4],['iso',8],['end',0]]){
  const visible=spec.holes.filter(h=>holeFaceInView(spec.faces.find(f=>f.key===h.face),view));
  assert.equal(visible.length,count);
  for(const hole of visible)assert.equal(holeDimensionText(spec.faces.find(f=>f.key===hole.face),hole).position,`${hole.position} mm from end 0`);
 }
 assert.equal(JSON.stringify(spec),original);
 // Saved job-card previews use the same model and label rules as the standalone viewer.
 const preview=buildMaterialSpec(templateViewerForm({sectionProfile:'c_lip',sectionSize:'150X65X20X3MM',cutLengthMm:2300,coilThicknessMm:2},[{profile:'web',punchSize:'12x20',positions:[100.001,500.123],centerOffsetMm:-20}]));
 assert.equal(preview.thickness,3);assert.equal(holeDimensionText(preview.faces[0],preview.holes[0]).position,text.position);
});
