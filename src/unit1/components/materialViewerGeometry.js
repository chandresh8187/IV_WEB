import * as THREE from 'three';
import { capsulePoints } from '../data/materialViewerModel.js';

export function facePoint(face,position,cross,length,normalOffset=0) {
  const direction=new THREE.Vector3(face.end[0]-face.start[0],face.end[1]-face.start[1],0).normalize();
  return new THREE.Vector3(face.start[0]+direction.x*cross-direction.y*normalOffset,face.start[1]+direction.y*cross+direction.x*normalOffset,position-length/2);
}
export function createMaterialGroup(spec) {
  const group=new THREE.Group();
  group.name='Material';
  const formed = spec.profile === 'w_beam' || spec.profile === 'gl_hat_purlin';
  const material=new THREE.MeshStandardMaterial({color:formed ? 0xbfc5cc : 0x93a9c7,metalness:formed ? 0.65 : 0.38,roughness:spec.profile === 'gl_hat_purlin' ? 0.43 : 0.32,side:THREE.DoubleSide});
  const edgeMaterial=new THREE.LineBasicMaterial({color:0x344862,transparent:true,opacity:0.72});
  for (const face of spec.faces) {
    const shape=new THREE.Shape();
    shape.moveTo(0,0); shape.lineTo(spec.length,0); shape.lineTo(spec.length,face.width); shape.lineTo(0,face.width); shape.closePath();
    for (const hole of spec.holes.filter(item=>item.face===face.key)) {
      const path=new THREE.Path();
      const points=capsulePoints(hole);
      path.moveTo(...points[0]);
      for (const point of points.slice(1)) path.lineTo(...point);
      path.closePath(); shape.holes.push(path);
    }
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:spec.thickness,bevelEnabled:false,steps:1,curveSegments:24});
    const along=new THREE.Vector3(0,0,1),across=new THREE.Vector3(face.end[0]-face.start[0],face.end[1]-face.start[1],0).normalize();
    const normal=new THREE.Vector3().crossVectors(along,across);
    const matrix=new THREE.Matrix4().makeBasis(along,across,normal);
    matrix.setPosition(facePoint(face,0,0,spec.length,-spec.thickness/2));
    geometry.applyMatrix4(matrix);
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=face.label;
    const edges=new THREE.EdgesGeometry(geometry,25);
    if(formed) {
      // Tangent joins are part of one formed sheet, not separate panel seams.
      const source=edges.attributes.position.array,visible=[];
      for(let index=0;index<source.length;index+=6)if(Math.abs(source[index+5]-source[index+2])<spec.length*.9)visible.push(...source.slice(index,index+6));
      edges.setAttribute('position',new THREE.Float32BufferAttribute(visible,3));
    }
    group.add(mesh,new THREE.LineSegments(edges,edgeMaterial));
    if(face.bendAfter?.length) {
      const curve=face.bendAfter,positions=[],indices=[];
      const outer=[],inner=[];
      for(let i=0;i<curve.length;i++) {
        const before=curve[Math.max(0,i-1)],after=curve[Math.min(curve.length-1,i+1)];
        const distance=Math.hypot(after[0]-before[0],after[1]-before[1]);
        const normal=[-(after[1]-before[1])/distance,(after[0]-before[0])/distance];
        outer.push([curve[i][0]+normal[0]*spec.thickness/2,curve[i][1]+normal[1]*spec.thickness/2]);
        inner.push([curve[i][0]-normal[0]*spec.thickness/2,curve[i][1]-normal[1]*spec.thickness/2]);
      }
      const strip=(first,second)=>{
        const base=positions.length/3;
        for(let i=0;i<first.length;i++)positions.push(...first[i],...second[i]);
        for(let i=0;i<first.length-1;i++){const a=base+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      };
      for(const surface of [outer,inner])strip(surface.map(p=>[...p,-spec.length/2]),surface.map(p=>[...p,spec.length/2]));
      for(const z of [-spec.length/2,spec.length/2])strip(outer.map(p=>[...p,z]),inner.map(p=>[...p,z]));
      const rounded=new THREE.BufferGeometry();rounded.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));rounded.setIndex(indices);rounded.computeVertexNormals();
      const bend=new THREE.Mesh(rounded,material);bend.name='Rounded sheet bend';group.add(bend);
    }
  }
  return group;
}

export function disposeScene(root) {
  const geometries=new Set(),materials=new Set();
  root.traverse(object=>{ if (object.geometry) geometries.add(object.geometry); if (object.material) for (const material of [].concat(object.material)) materials.add(material); if (object.isCSS2DObject) object.element.remove(); });
  geometries.forEach(geometry=>geometry.dispose());
  materials.forEach(material=>material.dispose());
}

export function fitCameraDistance(box,target,direction,up,fov,aspect) {
  const forward=direction.clone().normalize();
  const right=new THREE.Vector3().crossVectors(up,forward).normalize();
  const vertical=new THREE.Vector3().crossVectors(forward,right).normalize();
  const tangent=Math.tan(THREE.MathUtils.degToRad(fov/2));
  let distance=1;
  for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
    const point=new THREE.Vector3(x,y,z).sub(target);
    distance=Math.max(distance,point.dot(forward)+Math.abs(point.dot(right))/(tangent*aspect)*1.3,point.dot(forward)+Math.abs(point.dot(vertical))/tangent*1.3);
  }
  return distance;
}

export function fitOrthographicCamera(camera, box, target, direction, aspect) {
  const distance = Math.max(box.getSize(new THREE.Vector3()).length() * 2, 1);
  camera.position.copy(target).addScaledVector(direction.clone().normalize(), distance);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  let halfWidth = 0;
  let halfHeight = 0;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        halfWidth = Math.max(halfWidth, Math.abs(point.x));
        halfHeight = Math.max(halfHeight, Math.abs(point.y));
      }
    }
  }
  halfHeight = Math.max(halfHeight, halfWidth / aspect, 0.001) * 1.3;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.near = 0.001;
  camera.far = distance * 3;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
}
