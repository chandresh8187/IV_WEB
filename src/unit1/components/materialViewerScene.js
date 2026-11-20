import { buildHoleSpacings } from '../data/materialViewerModel.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createMaterialGroup, disposeScene, facePoint, fitOrthographicCamera } from './materialViewerGeometry.js';
import { dimensionOutline, layoutDimensionLabels } from './materialDimensionLayout.js';
import { holeFaceInView, holeDimensionText, holeSpacingText } from './materialHoleDimensions.js';

function addDimensions(spec,box) {
  const group=new THREE.Group();
  const holeDimensions=new THREE.Group(),lengthDimensions=new THREE.Group();
  holeDimensions.name='Hole dimensions';lengthDimensions.name='Length dimension';group.add(holeDimensions,lengthDimensions);
  const material=new THREE.LineBasicMaterial({color:0x7762bd,depthTest:false,transparent:true,opacity:0.8});
  const gap=Math.max(20,spec.section[0]*0.2);
  const line=(points,parent=group)=>{ const object=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material); object.renderOrder=5; parent.add(object); };
  const label=(text,point,kind='',parent=group,detail='')=>{
    const element=document.createElement('div'); element.className='mv-dimension-anchor';
    const badge=document.createElement('div');badge.className=`mv-dimension ${kind}`;badge.textContent=text;element.appendChild(badge);
    if(parent.userData.face)badge.dataset.face=parent.userData.face.key;
    if(detail){const position=document.createElement('span');position.className='mv-hole-position';position.textContent=detail;badge.appendChild(position);}
    const object=new CSS2DObject(element); object.position.copy(point); parent.add(object);
  };
  const dimension=(start,end,offset,text,parent=group,kind='')=>{
    const from=start.clone().add(offset),to=end.clone().add(offset);
    line([start,from,to,end],parent);
    const tangent=offset.clone().normalize().multiplyScalar(Math.min(gap/5,7));
    line([from.clone().sub(tangent),from.clone().add(tangent)],parent);
    line([to.clone().sub(tangent),to.clone().add(tangent)],parent);
    label(text,from.clone().add(to).multiplyScalar(0.5),kind,parent);
  };
  dimension(new THREE.Vector3(box.min.x,box.min.y,-spec.length/2),new THREE.Vector3(box.min.x,box.min.y,spec.length/2),new THREE.Vector3(-gap,-gap/3,0),`${spec.length} mm · length`,lengthDimensions);
  if (spec.profile === 'gl_hat_purlin') {
    const [crown, depth, foot, returnLip] = spec.section;
    const leftEdge = spec.faces[0].start[0];
    const rightEdge = spec.faces.at(-1).end[0];
    const end = (x, y) => new THREE.Vector3(x, y, -spec.length / 2);
    dimension(end(-crown / 2, depth), end(crown / 2, depth), new THREE.Vector3(0, gap, -gap / 3), `${crown} mm · crown width`);
    dimension(end(rightEdge, 0), end(rightEdge, depth), new THREE.Vector3(gap, 0, -gap / 3), `${depth} mm · depth`);
    dimension(end(leftEdge, 0), end(leftEdge + foot, 0), new THREE.Vector3(0, -gap, -gap / 3), `${foot} mm · foot width`);
    if (returnLip) {
      dimension(end(leftEdge, 0), end(leftEdge, returnLip), new THREE.Vector3(-gap, 0, -gap / 3), `${returnLip} mm · return lip`);
    }
  } else {
    dimension(new THREE.Vector3(-spec.section[0]/2,0,-spec.length/2),new THREE.Vector3(spec.section[0]/2,0,-spec.length/2),new THREE.Vector3(0,-gap,-gap/3),`${spec.section[0]} mm · ${spec.profile==='w_beam' ? 'beam width' : 'web'}`);
    if (spec.profile==='w_beam') dimension(new THREE.Vector3(spec.section[0]/2,0,-spec.length/2),new THREE.Vector3(spec.section[0]/2,spec.section[1],-spec.length/2),new THREE.Vector3(gap,0,-gap/3),`${spec.section[1]} mm · profile depth`);
    const flange=spec.faces.find(face=>face.key==='l_flange') || spec.faces.find(face=>face.key==='r_flange');
    if (flange) dimension(facePoint(flange,0,0,spec.length),facePoint(flange,0,flange.width,spec.length),new THREE.Vector3(-gap,0,-gap/3),`${spec.section[1]} mm · flange`);
    if (spec.section[2]) {
      const lip=spec.faces.find(face=>face.key==='l_lip');
      const from=facePoint(lip,0,0,spec.length),to=facePoint(lip,0,lip.width,spec.length);
      from.x-=spec.thickness;
      dimension(from,to,new THREE.Vector3(0,gap,-gap/3),`${spec.section[2]} mm · lip`);
    }
  }
  const web=spec.faces.find(face=>face.key==='web') || spec.faces[0];
  const thicknessAt=facePoint(web,0,web.width/2,spec.length,-spec.thickness/2);
  const thicknessLabel=thicknessAt.clone().add(new THREE.Vector3(gap,gap/2,-gap));
  line([thicknessAt,thicknessLabel]); label(`${spec.thickness} mm · thick`,thicknessLabel);
  const faceGroups=new Map();
  const faceDimensions=face=>{
    if(!faceGroups.has(face.key)){const g=new THREE.Group();g.userData.face=face;holeDimensions.add(g);faceGroups.set(face.key,g);}
    return faceGroups.get(face.key);
  };
  for(const hole of spec.holes){
    const face=spec.faces.find(item=>item.key===hole.face);
    const parent=faceDimensions(face),text=holeDimensionText(face,hole);
    const centre=facePoint(face,hole.position,hole.cross,spec.length,spec.thickness/2);
    const at=facePoint(face,hole.position,hole.cross,spec.length,gap*4+spec.thickness);
    line([centre,at],parent);
    label(text.size,at,'mv-hole-size',parent,text.position);
  }
  for (const {from,to,distance} of buildHoleSpacings(spec)) {
    const face=spec.faces.find(item=>item.key===from.face);
    const start=facePoint(face,from.position,from.cross,spec.length,spec.thickness/2);
    const end=facePoint(face,to.position,to.cross,spec.length,spec.thickness/2);
    const normal=facePoint(face,0,0,spec.length,1).sub(facePoint(face,0,0,spec.length));
    dimension(start,end,normal.multiplyScalar(gap*2+spec.thickness),
      holeSpacingText(face,{from,to,distance}),faceDimensions(face),'mv-hole-spacing');
  }
  return group;
}

export function mountMaterialViewer(host,spec,onError) {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xf2f5fb);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-label','3D material. Choose Rotate or Hand / Pan, drag to move, scroll or pinch to zoom.');
  renderer.domElement.tabIndex=0;
  const labels=new CSS2DRenderer();
  labels.domElement.className='mv-dimension-layer';
  const leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');leaders.classList.add('mv-label-leaders');leaders.setAttribute('aria-hidden','true');
  const leaderPath=document.createElementNS('http://www.w3.org/2000/svg','path');leaders.appendChild(leaderPath);labels.domElement.appendChild(leaders);
  host.append(renderer.domElement,labels.domElement);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,0.001,spec.length*60+5000);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=0.09;
  controls.minZoom=0.01; controls.maxZoom=10000;
  controls.screenSpacePanning=true;
  controls.autoRotateSpeed=1; controls.zoomToCursor=true;
  controls.listenToKeyEvents(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xe3edff,0x7b7d87,2));
  const key=new THREE.DirectionalLight(0xffffff,3.5); key.position.set(1000,1800,1600); scene.add(key);
  const fill=new THREE.DirectionalLight(0xb5cfff,2); fill.position.set(-1200,500,-1000); scene.add(fill);
  let model=createMaterialGroup(spec); scene.add(model);
  const box=new THREE.Box3().setFromObject(model),centre=box.getCenter(new THREE.Vector3());
  let grid=new THREE.GridHelper(spec.length*1.5,20,0xbdc8dc,0xdbe2ef);
  grid.position.set(centre.x,box.min.y-Math.max(12,spec.section[0]*0.1),0);
  grid.material.transparent=true; grid.material.opacity=0.4; scene.add(grid);
  let dimensions=addDimensions(spec,box); dimensions.visible=false; scene.add(dimensions);
  let selectedView='iso';
  const fitBox=box.clone().union(new THREE.Box3().setFromObject(dimensions));
  let disposed=false,frame=null,previous=performance.now();
  function requestRender() { if (!disposed && frame===null) frame=requestAnimationFrame(render); }
  function render(now) {
    frame=null;
    const delta=Math.min((now-previous)/1000,0.05); previous=now;
    const changed=controls.update(delta);
    // Orthographic zoom changes scale while keeping the camera outside the sheet.
    // Allow the orbit target to travel with panning, including far from the model.
    const direction=camera.position.clone().sub(controls.target).normalize();
    const modelSize=box.getSize(new THREE.Vector3()).length();
    const targetOffset=centre.distanceTo(controls.target);
    const distance=Math.max((modelSize+targetOffset)*2,1);
    camera.position.copy(controls.target).addScaledVector(direction,distance);
    camera.far=distance+modelSize+targetOffset;
    camera.updateProjectionMatrix();
    const axial=Math.abs(camera.position.z-controls.target.z)/camera.position.distanceTo(controls.target)>0.96;
    const holeDimensions=dimensions.getObjectByName('Hole dimensions');
    holeDimensions.visible=!axial&&selectedView!=='end';
    for(const faceGroup of holeDimensions.children)faceGroup.visible=holeFaceInView(faceGroup.userData.face,selectedView);
    dimensions.getObjectByName('Length dimension').visible=!axial;
    renderer.render(scene,camera); labels.render(scene,camera);
    arrangeDimensionLabels();
    labels.domElement.dataset.view=selectedView;
    if (controls.autoRotate || changed) requestRender();
  }
  controls.addEventListener('change',requestRender);
  function arrangeDimensionLabels() {
    const width=host.clientWidth,height=host.clientHeight,items=[];
    const points=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const point=new THREE.Vector3(x,y,z).project(camera);
      points.push({x:(point.x+1)*width/2,y:(1-point.y)*height/2});
    }
    const outline=dimensionOutline(points);
    const direction=camera.position.clone().sub(controls.target).normalize();
    const placement=Math.abs(direction.y)>.96?'left-right':Math.abs(direction.x)>.96?'above-below':'any';
    const availableSide=Math.max(Math.min(...outline.map(point=>point.x))-8,width-8-Math.max(...outline.map(point=>point.x)));
    const spacingWidth=placement==='left-right'?Math.max(70,Math.min(180,(availableSide-30)*.55)):260;
    const sizeWidth=placement==='left-right'?Math.max(60,Math.min(160,availableSide-30-spacingWidth)):260;
    dimensions.traverse(object=>{
      if(!object.isCSS2DObject)return;
      const element=object.element,badge=element.firstElementChild;
      badge.style.visibility='hidden';
      if(element.style.display==='none')return;
      const projected=object.getWorldPosition(new THREE.Vector3()).project(camera);
      if(Math.abs(projected.x)>1||Math.abs(projected.y)>1||Math.abs(projected.z)>1)return;
      const sizeLabel=badge.classList.contains('mv-hole-size'),spacingLabel=badge.classList.contains('mv-hole-spacing');
      badge.style.maxWidth=Math.max(1,Math.min(sizeLabel?sizeWidth:spacingLabel?spacingWidth:260,width-16))+'px';
      items.push({badge,x:(projected.x+1)*width/2,y:(1-projected.y)*height/2,width:badge.offsetWidth,height:badge.offsetHeight,
        priority:sizeLabel?2:spacingLabel?1:0});
    });
    const spacingLabels=items.filter(item=>item.badge.classList.contains('mv-hole-spacing'));
    const outerLane=(placement==='left-right'?Math.max(0,...spacingLabels.map(item=>item.width)):Math.max(0,...spacingLabels.map(item=>item.height)))+18;
    for(const item of items)if(item.badge.classList.contains('mv-hole-size'))item.outset=outerLane;
    const paths=[];
    for(const item of layoutDimensionLabels(items,width,Math.max(0,height-36),{outline,placement})) {
      if(!item.visible)continue;
      item.badge.style.visibility='visible';
      const dx=item.left+item.width/2-item.x,dy=item.top+item.height/2-item.y;
      item.badge.style.transform=`translate(${dx}px,${dy}px)`;
      if(Math.abs(dx)>4||Math.abs(dy)>4){
        const x=Math.max(item.left,Math.min(item.x,item.left+item.width));
        const y=Math.max(item.top,Math.min(item.y,item.top+item.height));
        paths.push(`M${item.x},${item.y}L${x},${y}`);
      }
    }
    leaderPath.setAttribute('d',paths.join(' '));
  }
  function resize() {
    const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
    camera.left=-camera.top*width/height;
    camera.right=camera.top*width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height); labels.setSize(width,height); requestRender();
  }
  const observer=new ResizeObserver(resize); observer.observe(host);
  const lost=event=>{event.preventDefault(); if (frame!==null) cancelAnimationFrame(frame); frame=null; onError('The 3D graphics connection was interrupted. Retry the preview.');};
  renderer.domElement.addEventListener('webglcontextlost',lost);
  function setView(view='iso') {
    selectedView=view;
    controls.autoRotate=false;
    const damping=controls.enableDamping;
    controls.enableDamping=false;
    controls.update();
    const target=centre.clone(),direction=new THREE.Vector3(1,0.9,1.25);
    camera.up.set(0,1,0);
    if (view==='top') direction.set(0,1,0.001);
    if (view==='side') direction.set(1,0,0);
    if (view==='end') {
      target.z=-spec.length/2;
      direction.set(0,0,-1);
    }
    controls.target.copy(target);
    fitOrthographicCamera(camera,fitBox,target,direction,Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight));
    controls.update(); controls.enableDamping=damping; controls.saveState(); requestRender();
  }
  resize(); setView();
  return {
    update:nextSpec=>{
      if (nextSpec===spec) return;
      // Replace material content without resetting the camera, pan target or orbit state.
      const nextModel=createMaterialGroup(nextSpec);
      const nextBox=new THREE.Box3().setFromObject(nextModel);
      const nextDimensions=addDimensions(nextSpec,nextBox);
      nextDimensions.visible=dimensions.visible;
      const nextGrid=new THREE.GridHelper(nextSpec.length*1.5,20,0xbdc8dc,0xdbe2ef);
      nextGrid.position.set(nextBox.getCenter(new THREE.Vector3()).x,nextBox.min.y-Math.max(12,nextSpec.section[0]*0.1),0);
      nextGrid.material.transparent=true; nextGrid.material.opacity=0.4;
      for (const object of [model,dimensions,grid]) {scene.remove(object);disposeScene(object);}
      spec=nextSpec;model=nextModel;dimensions=nextDimensions;grid=nextGrid;
      scene.add(model,dimensions,grid);
      box.copy(nextBox);box.getCenter(centre);
      fitBox.copy(box).union(new THREE.Box3().setFromObject(dimensions));
      requestRender();
    },
    setView,
    zoom:factor=>{
      camera.zoom=THREE.MathUtils.clamp(camera.zoom/factor,controls.minZoom,controls.maxZoom);
      camera.updateProjectionMatrix(); controls.update(); requestRender();
    },
    display:({showDimensions,autoRotate,dragMode='rotate'})=>{
      dimensions.visible=showDimensions;
      controls.autoRotate=autoRotate;
      controls.mouseButtons.LEFT=dragMode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;
      controls.touches.ONE=dragMode==='pan'?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;
      controls.cursorStyle=dragMode==='pan'?'grab':'auto';
      requestRender();
    },
    dispose:()=>{
      disposed=true; if (frame!==null) cancelAnimationFrame(frame);
      observer.disconnect(); controls.dispose(); renderer.domElement.removeEventListener('webglcontextlost',lost);
      disposeScene(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); labels.domElement.remove();
    },
  };
}
