import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildHoleSpacings, buildMaterialSpec, capsulePoints, DEFAULT_VIEWER_FORM, parsePunchSize, VIEWER_PROFILES } from '../src/unit1/data/materialViewerModel.js';
import { createMaterialGroup, disposeScene, facePoint, fitCameraDistance, fitOrthographicCamera } from '../src/unit1/components/materialViewerGeometry.js';
import { groupPunchRequirements, parsePunchRequirements } from '../src/unit1/utils/punchRequirements.js';
import { templateViewerForm } from '../src/unit1/data/materialViewerModel.js';
import { punchFaceOptions, sectionDimensionsHint, selectTemplateSection } from '../src/unit1/utils/sectionPunchFaces.js';

test('job-card previews use appended section thickness instead of the coil thickness for every profile', () => {
  for (const profile of VIEWER_PROFILES) {
    const template = {
      sectionProfile: profile.key,
      sectionSize: `${profile.example} X 3MM`,
      cutLengthMm: 2300, coilThicknessMm: 1,
      allowedCoilSizes: [{ widthMm: 298, thicknessMm: 2 }],
    };
    const original = JSON.stringify(template);
    const form = templateViewerForm(template, []);
    const spec = buildMaterialSpec(form);
    assert.equal(form.thickness, '3');
    assert.equal(spec.thickness, 3);
    assert.equal(spec.section.length, profile.count);
    assert.deepEqual(spec.section, profile.example.split(' × ').map(Number));
    assert.equal(JSON.stringify(template), original);
  }
});

test('existing C-lip job cards with trailing thickness generate the requested section geometry', () => {
  const template = {sectionSize:'150X50X15X3MM',coilThicknessMm:2,cutLengthMm:2300};
  const spec = buildMaterialSpec(templateViewerForm(template, []));
  assert.deepEqual(spec.section, [150,50,15]);
  assert.equal(spec.thickness,3);
  const material = createMaterialGroup(spec);
  try {
    for (const mesh of material.children.filter(child => child.geometry?.type === 'ExtrudeGeometry')) {
      assert.equal(mesh.geometry.parameters.options.depth,3);
    }
  } finally { disposeScene(material); }
  for(const thickness of ['0','bad','101']) {
    assert.throws(()=>buildMaterialSpec(templateViewerForm({...template,sectionSize:`150X50X15X${thickness}MM`},[])),/Thickness/);
  }
  const legacy = buildMaterialSpec(templateViewerForm({...template,sectionSize:'150X50X15'}, []));
  assert.equal(legacy.thickness,2);
});

test('Job Card punch options describe exactly the faces in the matching 3D section', () => {
  for (const profile of VIEWER_PROFILES) {
    const section = buildMaterialSpec({
      profile: profile.key, sectionSize: profile.example, thickness: '2', length: '800', punches: [],
    });
    assert.deepEqual(
      punchFaceOptions(profile.key).map(option => option.value).sort(),
      section.faces.filter(face => face.punchable !== false).map(face => face.key).sort(),
    );
  }
  const changed = selectTemplateSection({
    structureType: 'solar_mounting_structure', punchRows: [{ profile: 'r_lip', punchSize: '12', dimensions: '100' }],
  }, 'flat');
  assert.deepEqual(changed.punchRows, [{ profile: '', punchSize: '12', dimensions: '100' }]);
});

test('Hat Purlin has two upward return lips and retains the slots on its mounting feet', () => {
  const form = {
    profile: 'gl_hat_purlin', sectionSize: '100x40x20x6', thickness: '2', length: '800',
    punches: ['l_lip', 'r_lip'].map(face => ({ face, size: '9x20', positions: '150,650', offset: '0', axis: 'length' })),
  };
  const spec = buildMaterialSpec(form);
  const legacySpec = buildMaterialSpec({ ...form, fromTemplate: true, sectionSize: '100x40x20' });
  const [leftReturn, leftFoot, leftSide, crown, rightSide, rightFoot, rightReturn] = spec.faces;
  assert.equal(leftFoot.start[1], rightFoot.end[1]);
  assert.deepEqual(leftReturn.start, [-80, 6]);
  assert.deepEqual(rightReturn.end, [80, 6]);
  assert.deepEqual([leftReturn.end[0], rightReturn.start[0]], [-80, 80]);
  assert.equal(crown.start[1], 40);
  assert.ok(leftSide.start[0] < leftSide.end[0]);
  assert.ok(rightSide.start[0] < rightSide.end[0]);
  assert.equal(spec.faces.filter(face => face.bendAfter.length).length, 6);
  assert.deepEqual(spec.holes.map(hole => [hole.face, hole.position]), [
    ['l_lip', 150], ['l_lip', 650], ['r_lip', 150], ['r_lip', 650],
  ]);
  for (const [index, hole] of spec.holes.entries()) {
    const position = (model, reading) => facePoint(model.faces.find(face => face.key === reading.face), reading.position, reading.cross, model.length);
    assert.ok(position(spec, hole).distanceTo(position(legacySpec, legacySpec.holes[index])) < 1e-6);
  }
  const material = createMaterialGroup(spec);
  try {
    assert.equal(material.children.filter(child => child.name === 'Rounded sheet bend').length, 6);
    assert.ok(material.getObjectByName('Left return lip')?.isMesh);
    assert.ok(material.getObjectByName('Right return lip')?.isMesh);
  } finally {
    disposeScene(material);
  }
  assert.throws(() => buildMaterialSpec({ ...form, sectionSize: '100x40x20' }), /Enter 4 section dimensions/);
  assert.throws(() => buildMaterialSpec({ ...form, sectionSize: '100x40x20x2' }), /return lip must be longer/);
  assert.equal(buildMaterialSpec({ ...form, sectionSize: '100x40x20x3' }).section[3], 3);
});

test('Saved Hat Purlin templates keep their recorded section dimensions', () => {
  const job = { structureType: 'gl_hat_purlin', coilThicknessMm: 2, cutLengthMm: 800 };
  for (const [sectionSize, faceCount] of [['100x40x20', 5], ['100x40x20x6', 7]]) {
    const template = { ...job, sectionSize };
    assert.equal(buildMaterialSpec(templateViewerForm(template, [])).faces.length, faceCount);
    assert.equal(sectionDimensionsHint(template, { forInspection: true }).includes('return lip'), faceCount === 7);
  }
});

test('saved WEB punch rows at the same length load into 3D with separate offsets', () => {
  const holes = parsePunchRequirements(['-20', '+20'].map(centerOffsetMm => ({
    punchName: null, punchSize: '65x20', profile: 'web', dimensions: '500', centerOffsetMm,
  })), 2500);
  const template = { sectionSize: '150x65x20', cutLengthMm: 2500, coilThicknessMm: 3, holes };
  const spec = buildMaterialSpec(templateViewerForm(template, groupPunchRequirements(template)));
  assert.deepEqual(spec.holes.map(hole => [hole.position, hole.offset]), [[500, -20], [500, 20]]);
});

test('W-beam has rounded raised ribs, recessed centre channel and longitudinal hole positions from end zero',()=>{
 const spec=buildMaterialSpec({profile:'w_beam',sectionSize:'312x83',thickness:'3',length:'4320',punches:[{face:'w_panel_5',size:'12x20',positions:'100,4220',offset:'0',axis:'length'}]});
 assert.equal(spec.faces.length,9);assert.ok(spec.faces.every(face=>face.key.startsWith('w_panel_')));
 assert.deepEqual(spec.holes.map(h=>h.position),[100,4220]);
 const points=spec.faces.flatMap(face=>[face.start,face.end]);
 assert.equal(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),312);
 assert.equal(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])),83);
 const group=createMaterialGroup(spec);assert.equal(group.children.filter(child=>child.isMesh).length,17);disposeScene(group);
 assert.equal(spec.faces[4].label,'Centre channel');
 assert.ok(spec.faces[4].start[1]>spec.faces[2].start[1],'Upside-down W-beam has its centre channel above the two ribs');
 for(const [index,face] of spec.faces.entries())if(face.bendAfter.length){
   assert.deepEqual(face.bendAfter[0],face.end);
   assert.deepEqual(face.bendAfter.at(-1),spec.faces[index+1].start);
   assert.ok(face.bendAfter.every(point=>point.every(Number.isFinite)));
 }
 assert.throws(()=>buildMaterialSpec({profile:'w_beam',sectionSize:'312x83',thickness:'3',length:'4320',punches:[{face:'web',size:'12',positions:'100',offset:'0',axis:'length'}]}),/selected face/);
});

test('65x20 slots on W-beam centre channel accept template-style positions and explain zero or size entered as position',()=>{
 const form={profile:'w_beam',sectionSize:'312X83',thickness:'3',length:'4320',punches:[{face:'w_panel_5',size:'65x20',positions:'100-400-800',offset:'0',axis:'length'}]};
 const spec=buildMaterialSpec(form);assert.deepEqual(spec.holes.map(h=>h.position),[100,400,800]);assert.ok(spec.holes.every(h=>h.length===65&&h.diameter===20&&h.offset===0));
 const group=createMaterialGroup(spec);group.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,100,100-spec.length/2),new THREE.Vector3(0,-1,0));
 assert.equal(ray.intersectObject(group,true).filter(hit=>hit.object.isMesh).length,0);
 ray.set(new THREE.Vector3(0,100,200-spec.length/2),new THREE.Vector3(0,-1,0));
 assert.ok(ray.intersectObject(group,true).some(hit=>hit.object.isMesh));disposeScene(group);
 const withPositions=positions=>({...form,punches:[{...form.punches[0],positions}]});
 assert.deepEqual(buildMaterialSpec(withPositions('100 mm, 400 mm')).holes.map(h=>h.position),[100,400]);
 assert.throws(()=>buildMaterialSpec(withPositions('65x20')),/Put the slot size/);
 assert.throws(()=>buildMaterialSpec(withPositions('0')),/greater than 32.5 mm/);
 assert.throws(()=>buildMaterialSpec(withPositions('-100')),/hole-centre distances/);
 assert.throws(()=>buildMaterialSpec(withPositions('100--400')),/hole-centre distances/);
});

test('section geometry retains exact millimetre sizes, real thickness and all punch positions',()=>{
  const spec=buildMaterialSpec(DEFAULT_VIEWER_FORM);
  assert.equal(spec.faces.length,5); assert.equal(spec.holes.length,6);
  const group=createMaterialGroup(spec);
  const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x-150)<0.0001); assert.ok(Math.abs(size.y-65)<0.0001); assert.ok(Math.abs(size.z-2300)<0.0001);
  assert.deepEqual(spec.holes.map(hole=>hole.position),[100,500,900,1300,1700,2100]);
  disposeScene(group);
});
test('each supported profile creates finite valid solid geometry',()=>{
  for (const profile of VIEWER_PROFILES) {
    const spec=buildMaterialSpec({...DEFAULT_VIEWER_FORM,profile:profile.key,sectionSize:profile.example,punches:[]});
    const group=createMaterialGroup(spec);
    const meshes=group.children.filter(child=>child.isMesh);
    assert.equal(meshes.length,spec.faces.length+spec.faces.filter(face=>face.bendAfter?.length).length);
    for (const mesh of meshes) assert.ok(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite));
    disposeScene(group);
  }
});

test('all section profiles accept typed uppercase separators and copied millimetre units',()=>{
  for (const profile of VIEWER_PROFILES) {
    const expected=profile.example.split(' × ').map(Number);
    for (const separator of ['x','X',' × ',' * ']) {
      for (const size of [expected.join(separator),expected.join(separator)+' mm',expected.map(value=>value+' mm').join(separator)]) {
        const spec=buildMaterialSpec({...DEFAULT_VIEWER_FORM,profile:profile.key,sectionSize:size,punches:[]});
        assert.deepEqual(spec.section,expected,`${profile.key}: ${size}`);
      }
    }
  }
  assert.equal(parsePunchSize('18X30').length,30);
  assert.throws(()=>buildMaterialSpec({...DEFAULT_VIEWER_FORM,sectionSize:'150X65X'}),/for example/);
  assert.throws(()=>buildMaterialSpec({...DEFAULT_VIEWER_FORM,sectionSize:'-150X65X20'}),/Section dimension 1/);
  assert.throws(()=>buildMaterialSpec({...DEFAULT_VIEWER_FORM,sectionSize:'5001X65X20'}),/Section dimension 1/);
});
test('round and capsule punches are actual through-holes rather than surface markings',()=>{
  for (const size of ['Ø12','12x20']) {
    const spec=buildMaterialSpec({...DEFAULT_VIEWER_FORM,profile:'flat',sectionSize:'100',length:'500',thickness:'2',punches:[{id:'a',face:'web',size,positions:'200',offset:'0',axis:'length'}]});
    const group=createMaterialGroup(spec),mesh=group.children.find(child=>child.isMesh);
    const ray=new THREE.Raycaster(new THREE.Vector3(0,10,-50),new THREE.Vector3(0,-1,0));
    mesh.updateMatrixWorld(true);
    assert.equal(ray.intersectObject(mesh).length,0,`${size} hole centre must be empty through the thickness`);
    ray.set(new THREE.Vector3(30,10,-50),new THREE.Vector3(0,-1,0));
    assert.ok(ray.intersectObject(mesh).length>0,'Unpunched sheet remains solid');
    disposeScene(group);
  }
});
test('capsule direction changes across-face span while retaining its centre',()=>{
  const hole={...parsePunchSize('12x20'),position:100,cross:50,axis:'across'};
  const points=capsulePoints(hole);
  assert.equal(Math.round(Math.max(...points.map(point=>point[0]))-Math.min(...points.map(point=>point[0]))),12);
  assert.equal(Math.round(Math.max(...points.map(point=>point[1]))-Math.min(...points.map(point=>point[1]))),20);
  assert.equal(parsePunchSize('20x12').diameter,12);
  assert.equal(parsePunchSize('20x20').label,'Ø20');
});
test('invalid sections, edge crossings and overlapping holes cannot generate a misleading preview',()=>{
  const punch=DEFAULT_VIEWER_FORM.punches[0];
  for (const change of [{thickness:'0'},{sectionSize:'150x65'},{sectionSize:'150x65x80'},{length:'50001'}]) assert.throws(()=>buildMaterialSpec({...DEFAULT_VIEWER_FORM,...change}));
  for (const changes of [{positions:'2'},{positions:'2300'},{positions:'100, 100'},{positions:'100, 110'},{offset:'100'},{face:'unknown'},{size:'bad'},{positions:'100, no'}]) assert.throws(()=>buildMaterialSpec({...DEFAULT_VIEWER_FORM,punches:[{...punch,...changes}]}));
  const separated=[{...punch,positions:'100',offset:'-30'},{...punch,id:'b',positions:'100',offset:'30'}];
  assert.equal(buildMaterialSpec({...DEFAULT_VIEWER_FORM,punches:separated}).holes.length,2);
});

test('fit and preset views keep every model corner visible on narrow and wide screens',()=>{
  const box=new THREE.Box3(new THREE.Vector3(-75,0,-1150),new THREE.Vector3(75,65,1150));
  for (const aspect of [0.7,1,2]) for (const direction of [new THREE.Vector3(1,0.9,1.25),new THREE.Vector3(0,1,0.001),new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1)]) {
    const target=box.getCenter(new THREE.Vector3());
    if (direction.z===-1) target.z=-1150;
    const camera=new THREE.PerspectiveCamera(38,aspect,0.05,100000);
    const distance=fitCameraDistance(box,target,direction,camera.up,camera.fov,aspect);
    camera.position.copy(target).add(direction.clone().normalize().multiplyScalar(distance));
    camera.lookAt(target);camera.updateMatrixWorld(true);
    for (const x of [-75,75]) for (const y of [0,65]) for (const z of [-1150,1150]) {
      const projected=new THREE.Vector3(x,y,z).project(camera);
      assert.ok(Math.abs(projected.x)<=0.8 && Math.abs(projected.y)<=0.8);
    }
  }
});

test('hole spacing uses adjacent centres sorted along each row, including different punch sizes',()=>{
  const spec=buildMaterialSpec({...DEFAULT_VIEWER_FORM,profile:'flat',sectionSize:'150',length:'1000',punches:[
    {id:'a',face:'web',size:'12x20',positions:'400,100',offset:'0',axis:'length'},
    {id:'b',face:'web',size:'14',positions:'250',offset:'0',axis:'length'},
    {id:'c',face:'web',size:'12',positions:'100,400',offset:'30',axis:'length'},
  ]});
  const original=spec.holes.map(hole=>hole.position);
  const gaps=buildHoleSpacings(spec);
  assert.deepEqual(gaps.map(gap=>gap.distance),[150,150,300]);
  assert.deepEqual(gaps.map(({from,to})=>[from.letter+from.index,to.letter+to.index]),[['A2','B1'],['B1','A1'],['C1','C2']]);
  assert.deepEqual(spec.holes.map(hole=>hole.position),original);
  assert.equal(buildHoleSpacings({holes:[spec.holes[0]]}).length,0);
  assert.equal(buildHoleSpacings({holes:[]}).length,0);
  assert.equal(buildHoleSpacings({holes:[spec.holes[0],{...spec.holes[1],face:'r_flange'}]}).length,0);
  assert.equal(buildHoleSpacings({holes:[{...spec.holes[0],position:100.001},{...spec.holes[1],position:250.123} ]})[0].distance,150.122);
});

test('orthographic fit frames long materials in every view and deep zoom preserves depth visibility', () => {
  const box = new THREE.Box3(new THREE.Vector3(-75, 0, -1150), new THREE.Vector3(75, 65, 1150));
  for (const aspect of [0.6, 1, 2]) {
    for (const direction of [new THREE.Vector3(1, .9, 1.25), new THREE.Vector3(0, 1, .001), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1)]) {
      const target = box.getCenter(new THREE.Vector3());
      if (direction.z === -1) target.z = box.min.z;
      const camera = new THREE.OrthographicCamera();
      fitOrthographicCamera(camera, box, target, direction, aspect);
      const position = camera.position.clone();
      const corners = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z);
        corners.push(point);
        const projected = point.clone().project(camera);
        assert.ok(Math.abs(projected.x) <= .8 && Math.abs(projected.y) <= .8);
        assert.ok(projected.z > -1 && projected.z < 1);
      }
      camera.zoom = 10000;
      camera.updateProjectionMatrix();
      assert.ok(camera.position.equals(position));
      assert.ok(corners.every(point => Math.abs(point.clone().project(camera).z) < 1));
    }
  }
});


