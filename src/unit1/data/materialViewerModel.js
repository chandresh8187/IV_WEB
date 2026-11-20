import { beamProfileOptions } from '../utils/beamPunchProfiles.js';
import { FACE_LABELS, HAT_FACE_LABELS, templateSectionProfile } from '../utils/sectionPunchFaces.js';

export const VIEWER_PROFILES = [
  {key:'w_beam',label:'W-beam crash barrier · schematic',example:'312 × 83',count:2},
  {key:'c_lip',label:'C section · with lips',example:'150 × 65 × 20',count:3},
  {key:'z_lip',label:'Z section · with lips',example:'150 × 65 × 20',count:3},
  {key:'gl_hat_purlin',label:'GL Hat Purlin · schematic',example:'100 × 40 × 20 × 6',count:4,dimensionLabel:'Crown width × depth × foot width × return lip'},
  {key:'channel',label:'U / C channel · no lips',example:'150 × 65',count:2},
  {key:'angle',label:'L angle',example:'100 × 65',count:2},
  {key:'flat',label:'Flat strip',example:'150',count:1},
];
export { FACE_LABELS, HAT_FACE_LABELS };
export const W_BEAM_FACES = beamProfileOptions.map(({value, label}) => ({ key: value, label }));
export const DEFAULT_VIEWER_FORM = {
  profile:'c_lip',sectionSize:'150x65x20',thickness:'3',length:'2300',
  punches:[{id:'punch-a',size:'12x20',face:'web',positions:'100, 500, 900, 1300, 1700, 2100',offset:'0',axis:'length'}],
};
export function punchLetter(index) {
  let result='';
  for (let value=index+1;value>0;value=Math.floor((value-1)/26)) result=String.fromCharCode(65+(value-1)%26)+result;
  return result;
}
export function templateViewerForm(template, groups) {
  const isBeam = template.structureType === 'w_beam_crash_barrier';
  const profile = templateSectionProfile(template);
  const definition = VIEWER_PROFILES.find(item => item.key === profile);
  const parts = String(template.sectionSize ?? '').trim().split(/\s*[x×*]\s*/i)
    .map(part => part.trim().replace(/\s*mm\s*$/i, '').trim());
  // An extra dimension is sheet thickness. Hat's fourth dimension remains its return lip.
  const hasSectionThickness = definition && parts.length === definition.count + 1;
  return {
    profile,
    sectionSize: hasSectionThickness ? parts.slice(0, -1).join(' X ') : template.sectionSize ?? '',
    thickness: hasSectionThickness ? parts.at(-1) : String(template.coilThicknessMm ?? template.allowedCoilSizes?.[0]?.thicknessMm ?? ''),
    length: String(template.cutLengthMm ?? ''),
    fromTemplate: true,
    punches: groups.map((group, index) => ({
      id: `template-punch-${index}`,
      punchName: group.punchName || punchLetter(index % 5),
      size: group.punchSize,
      face: isBeam ? (W_BEAM_FACES.some(face => face.key === group.profile) ? group.profile : 'w_panel_5') : group.profile === 'lip' ? 'l_lip' : group.profile,
      positions: group.positions.join(', '),
      offset: String(group.centerOffsetMm ?? 0),
      axis: 'length',
    })),
  };
}
const fail = message => { throw new Error(message); };
function positive(raw,label,max) {
  const text=String(raw ?? '').trim();
  const value=Number(text);
  if (!/^\d+(?:\.\d{1,3})?$/.test(text) || !Number.isFinite(value) || value<=0 || value>max) fail(`${label} must be above 0 and at most ${max.toLocaleString('en-IN')} mm, with up to three decimals.`);
  return value;
}
export function parsePunchSize(raw) {
  const text=String(raw ?? '').trim().replace(/\s*mm\s*$/i,'').replace(/^[Ø⌀]\s*/,'');
  const parts=text.split(/\s*[x×*]\s*/i);
  if (parts.length<1 || parts.length>2) fail('Use a round diameter such as 12, or a capsule size such as 12x20.');
  const values=parts.map(part=>positive(part,'Punch size',2000));
  const diameter=Math.min(...values),length=Math.max(...values);
  return {diameter,length,label:diameter===length ? `Ø${diameter}` : `${diameter} × ${length}`};
}
export function sectionFaces(profile,section,thickness) {
  const [web,flange,lip]=section;
  const left=-web/2,right=web/2;
  const face=(key,start,end,margin=0)=>({key,label:FACE_LABELS[key],start,end,width:Math.hypot(end[0]-start[0],end[1]-start[1]),margin});
  if (profile === 'gl_hat_purlin') {
    const returnLip = section[3];
    const spread = flange * 0.25;
    const leftEdge = left - spread - lip;
    const rightEdge = right + spread + lip;
    const points = [[leftEdge,0],[left-spread,0],[left,flange],
      [right,flange],[right+spread,0],[rightEdge,0]];
    const keys = ['l_lip','l_flange','web','r_flange','r_lip'];
    if (returnLip) {
      points.unshift([leftEdge, returnLip]);
      points.push([rightEdge, returnLip]);
      keys.unshift('l_return');
      keys.push('r_return');
    }
    return roundedSection(points, keys, thickness, thickness * 1.5, face, Boolean(returnLip))
      .map(panel => {
        if (panel.key === 'l_return' || panel.key === 'r_return') {
          return { ...panel, label: panel.key === 'l_return' ? 'Left return lip' : 'Right return lip', punchable: false };
        }
        // The return bend trims the foot face. Keep the prior mounting-hole centre.
        const trimmed = panel.key === 'l_lip' ? leftEdge - panel.start[0]
          : panel.key === 'r_lip' ? rightEdge - panel.end[0] : 0;
        return { ...panel, label: HAT_FACE_LABELS[panel.key], punchCenter: (panel.width + trimmed) / 2 };
      });
  }
  if (profile==='w_beam') {
    // A symmetric schematic, not a tooling drawing: width and depth are user inputs.
    const xs=[0,.05,.19,.29,.41,.59,.71,.81,.95,1];
    const ys=[.12,.12,1,1,0,0,1,1,.12,.12];
    // Display the formed beam upside down; face IDs and end-zero positions stay fixed.
    const points=xs.map((x,index)=>[left+x*web,(1-ys[index])*flange]);
    const starts=points.slice(0,-1).map(point=>[...point]),ends=points.slice(1).map(point=>[...point]);
    const bends=[];
    for(let index=1;index<points.length-1;index++) {
      const previous=points[index-1],at=points[index],next=points[index+1];
      const before=Math.hypot(at[0]-previous[0],at[1]-previous[1]),after=Math.hypot(next[0]-at[0],next[1]-at[1]);
      const incoming=[(at[0]-previous[0])/before,(at[1]-previous[1])/before],outgoing=[(next[0]-at[0])/after,(next[1]-at[1])/after];
      const turn=Math.atan2(incoming[0]*outgoing[1]-incoming[1]*outgoing[0],incoming[0]*outgoing[0]+incoming[1]*outgoing[1]);
      const tangent=Math.min(web*.045*Math.tan(Math.abs(turn)/2),before*.28,after*.28);
      const radius=tangent/Math.tan(Math.abs(turn)/2),sign=Math.sign(turn);
      const start=[at[0]-incoming[0]*tangent,at[1]-incoming[1]*tangent],end=[at[0]+outgoing[0]*tangent,at[1]+outgoing[1]*tangent];
      const centre=[start[0]-incoming[1]*radius*sign,start[1]+incoming[0]*radius*sign];
      const angle=Math.atan2(start[1]-centre[1],start[0]-centre[0]);
      const curve=Array.from({length:25},(_,step)=>[centre[0]+radius*Math.cos(angle+turn*step/24),centre[1]+radius*Math.sin(angle+turn*step/24)]);
      curve[0]=start;curve[curve.length-1]=end;
      ends[index-1]=start;starts[index]=end;bends[index-1]=curve;
    }
    return W_BEAM_FACES.map((panel,index)=>({...face(panel.key,starts[index],ends[index],thickness),bendAfter:bends[index] || []}));
  }
  if (profile==='flat') return [face('web',[left,thickness/2],[right,thickness/2])];
  if (profile==='angle') return [face('web',[left,thickness/2],[right-thickness,thickness/2]),face('r_flange',[right-thickness/2,0],[right-thickness/2,flange],thickness)];
  if (profile==='z_lip') return [
    face('web',[left+thickness,0],[right-thickness,0]),
    face('l_flange',[left+thickness/2,-thickness/2],[left+thickness/2,flange-thickness/2],thickness),
    face('r_flange',[right-thickness/2,thickness/2],[right-thickness/2,-flange+thickness/2],thickness),
    face('l_lip',[left+thickness,flange-thickness],[left+lip,flange-thickness]),
    face('r_lip',[right-thickness,-flange+thickness],[right-lip,-flange+thickness]),
  ];
  const faces=[face('web',[left+thickness,thickness/2],[right-thickness,thickness/2]),face('l_flange',[left+thickness/2,0],[left+thickness/2,flange],thickness),face('r_flange',[right-thickness/2,0],[right-thickness/2,flange],thickness)];
  if (profile==='c_lip') faces.push(face('l_lip',[left+thickness,flange-thickness/2],[left+lip,flange-thickness/2]),face('r_lip',[right-thickness,flange-thickness/2],[right-lip,flange-thickness/2]));
  return faces;
}
function roundedSection(points, keys, thickness, radius, face, hasReturns) {
  const starts = points.slice(0,-1);
  const ends = points.slice(1);
  const bends = [];
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i-1], corner = points[i], next = points[i+1];
    const before = Math.hypot(corner[0]-previous[0],corner[1]-previous[1]);
    const after = Math.hypot(next[0]-corner[0],next[1]-corner[1]);
    const incoming = [(corner[0]-previous[0])/before,(corner[1]-previous[1])/before];
    const outgoing = [(next[0]-corner[0])/after,(next[1]-corner[1])/after];
    const turn = Math.atan2(incoming[0]*outgoing[1]-incoming[1]*outgoing[0],incoming[0]*outgoing[0]+incoming[1]*outgoing[1]);
    const leftReturnBend = hasReturns && i === 1;
    const rightReturnBend = hasReturns && i === points.length - 2;
    const cornerRadius = leftReturnBend || rightReturnBend ? thickness : radius;
    const beforeLimit = leftReturnBend ? .8 : rightReturnBend ? .4 : .2;
    const afterLimit = leftReturnBend ? .4 : rightReturnBend ? .8 : .2;
    const tangent = Math.min(cornerRadius * Math.tan(Math.abs(turn)/2), before * beforeLimit, after * afterLimit);
    const actualRadius = tangent / Math.tan(Math.abs(turn)/2);
    const sign = Math.sign(turn);
    const start = [corner[0]-incoming[0]*tangent,corner[1]-incoming[1]*tangent];
    const end = [corner[0]+outgoing[0]*tangent,corner[1]+outgoing[1]*tangent];
    const centre = [start[0]-incoming[1]*actualRadius*sign,start[1]+incoming[0]*actualRadius*sign];
    const angle = Math.atan2(start[1]-centre[1],start[0]-centre[0]);
    const curve = Array.from({ length: 17 }, (_, step) => {
      const a = angle + turn * step / 16;
      return [centre[0]+actualRadius*Math.cos(a),centre[1]+actualRadius*Math.sin(a)];
    });
    curve[0] = start;
    curve[16] = end;
    ends[i-1] = start;
    starts[i] = end;
    bends[i-1] = curve;
  }
  return keys.map((key, i) => ({ ...face(key,starts[i],ends[i],thickness), bendAfter: bends[i] || [] }));
}
function pointSegmentDistance(point,start,end) {
  const delta=[end[0]-start[0],end[1]-start[1]];
  const squared=delta[0]**2+delta[1]**2;
  const ratio=squared ? Math.max(0,Math.min(1,((point[0]-start[0])*delta[0]+(point[1]-start[1])*delta[1])/squared)) : 0;
  return Math.hypot(point[0]-start[0]-ratio*delta[0],point[1]-start[1]-ratio*delta[1]);
}
function capsuleSegment(hole) {
  const half=(hole.length-hole.diameter)/2;
  return hole.axis==='length' ? [[hole.position-half,hole.cross],[hole.position+half,hole.cross]] : [[hole.position,hole.cross-half],[hole.position,hole.cross+half]];
}
function capsulesOverlap(first,second) {
  const [start,end]=capsuleSegment(first),[otherStart,otherEnd]=capsuleSegment(second);
  const cross=(point,from,to)=>(point[0]-from[0])*(to[1]-from[1])-(point[1]-from[1])*(to[0]-from[0]);
  const intersects=cross(otherStart,start,end)*cross(otherEnd,start,end)<0 && cross(start,otherStart,otherEnd)*cross(end,otherStart,otherEnd)<0;
  const distance=intersects ? 0 : Math.min(pointSegmentDistance(start,otherStart,otherEnd),pointSegmentDistance(end,otherStart,otherEnd),pointSegmentDistance(otherStart,start,end),pointSegmentDistance(otherEnd,start,end));
  return distance<=(first.diameter+second.diameter)/2+1e-6;
}
export function buildMaterialSpec(form) {
  const definition=VIEWER_PROFILES.find(profile=>profile.key===form.profile);
  if (!definition) fail('Choose a section profile.');
  const sectionParts=String(form.sectionSize || '').trim().split(/\s*[x×*]\s*/i).map(part=>part.trim().replace(/\s*mm\s*$/i,'').trim());
  const legacyHat = form.fromTemplate && form.profile === 'gl_hat_purlin' && sectionParts.length === 3;
  if ((!legacyHat && sectionParts.length!==definition.count) || sectionParts.some(part=>!part)) fail(`Enter ${definition.count} section dimension${definition.count>1 ? 's' : ''}, for example ${definition.example} mm. Separate dimensions with x, X, × or *; enter thickness separately.`);
  const section=sectionParts.map((part,index)=>positive(part,`Section dimension ${index+1} (${part})`,5000));
  const thickness=positive(form.thickness,'Thickness',100),length=positive(form.length,'Length',50000);
  if (section.slice(0, 3).some(value=>value<=thickness*2)) fail('Each section dimension must be greater than twice the thickness.');
  if (section[3] != null && section[3] <= thickness) fail('The return lip must be longer than the material thickness.');
  if (form.profile==='c_lip' && section[2]*2>=section[0]) fail('The two lips must leave an opening: lip size must be less than half the web.');
  if (form.profile==='z_lip' && section[2]>=section[0]) fail('Lip size must be less than the web size.');
  const faces=sectionFaces(form.profile,section,thickness);
  const holes=[];
  const maxGroups = form.fromTemplate ? 100 : 5;
  if (!Array.isArray(form.punches) || form.punches.length > maxGroups) fail(`Use up to ${maxGroups} punch groups.`);
  for (const [index,punch] of form.punches.entries()) {
    const letter=punch.punchName||punchLetter(index);
    if(!['A','B','C','D','E'].includes(letter))fail('Choose PUNCH A to PUNCH E.');
    const face=faces.find(item=>item.key===punch.face && item.punchable !== false);
    if (!face) fail(`Punch ${letter}: this section does not have the selected face.`);
    let size;
    try { size=parsePunchSize(punch.size); } catch (error) { fail(`Punch ${letter}: ${error.message}`); }
    const offsetText=String(punch.offset ?? '0').trim();
    if (!/^-?\d+(?:\.\d{1,3})?$/.test(offsetText)) fail(`Punch ${letter}: enter a valid offset from the face centre.`);
    if (!['length','across'].includes(punch.axis)) fail(`Punch ${letter}: choose the slot direction.`);
    const cross=(face.punchCenter ?? face.width/2)+Number(offsetText);
    const across=(punch.axis==='across' ? size.length : size.diameter)/2;
    if (cross-across<=face.margin || cross+across>=face.width-face.margin) fail(`Punch ${letter}: the hole crosses a face edge or bend. Reduce its size or offset.`);
    const positionText=String(punch.positions || '').trim().replace(/\s*mm\b/gi,'');
    if (!/^\d+(?:\.\d{1,3})?(?:\s*(?:[-,;]|\s)\s*\d+(?:\.\d{1,3})?)*$/.test(positionText)) fail(`Punch ${letter}: enter hole-centre distances from end 0, such as 100, 400 or 100-400. Put the slot size (for example 65x20) in Punch size, and use Centre offset 0 to centre it on the selected face.`);
    const positions=positionText.split(/[\s,;-]+/).filter(Boolean);
    for (const [positionIndex,raw] of positions.entries()) {
      const position=Number(raw);
      const along=(punch.axis==='length' ? size.length : size.diameter)/2;
      if (!Number.isFinite(position) || position-along<=0 || position+along>=length) fail(`Punch ${letter}: hole-centre distance must be greater than ${along} mm and less than ${Number((length-along).toFixed(3))} mm from end 0 for this slot. Centre offset 0 means centred across the selected face; a hole at distance 0 would cross the beam end.`);
      const hole={...size,face:face.key,position,cross,offset:Number(offsetText),axis:punch.axis,letter,index:positionIndex+1};
      if (holes.some(other=>other.face===hole.face && capsulesOverlap(hole,other))) fail(`Punch ${letter}: the hole at ${position} mm overlaps or touches another hole.`);
      holes.push(hole);
      if (holes.length>300) fail('Use at most 300 holes in one 3D preview.');
    }
  }
  return {profile:form.profile,profileLabel:definition.label,section,thickness,length,faces,holes,punchCount:form.punches.length};
}

export function capsulePoints(hole,segments=24) {
  const radius=hole.diameter/2,straight=(hole.length-hole.diameter)/2;
  const points=[];
  for (let side=0;side<2;side++) for (let index=0;index<=segments;index++) {
    const angle=-Math.PI/2+side*Math.PI+index*Math.PI/segments;
    const along=(side ? -straight : straight)+radius*Math.cos(angle),across=radius*Math.sin(angle);
    points.push(hole.axis==='across' ? [hole.position-across,hole.cross+along] : [hole.position+along,hole.cross+across]);
  }
  return points.reverse();
}

// Consecutive centres along the same face and transverse row, across punch groups.
export function buildHoleSpacings(spec) {
  const rows=new Map();
  for (const hole of spec.holes) {
    const key=hole.face+':'+hole.cross.toFixed(6);
    if (!rows.has(key)) rows.set(key,[]);
    rows.get(key).push(hole);
  }
  const spacings=[];
  for (const holes of rows.values()) {
    holes.sort((a,b)=>a.position-b.position);
    for (let i=1;i<holes.length;i++) {
      const from=holes[i-1],to=holes[i];
      spacings.push({from,to,distance:Number((to.position-from.position).toFixed(3))});
    }
  }
  return spacings;
}

