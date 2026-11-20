import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import { Box, Plus, Trash2 } from 'lucide-react';
import { buildMaterialSpec, punchLetter, templateViewerForm, VIEWER_PROFILES } from '../data/materialViewerModel';
import { punchFaceOptions } from '../utils/sectionPunchFaces';
import { groupPunchRequirements } from '../utils/punchRequirements';
import { MaterialCanvas } from '../components/MaterialPreview';
import { hasAccess } from '../utils/access';
import './MaterialViewerScreen.css';


function SectionDiagram({spec}) {
  const points=spec.faces.flatMap(face=>[face.start,face.end]);
  const minX=Math.min(...points.map(point=>point[0])),maxX=Math.max(...points.map(point=>point[0]));
  const minY=Math.min(...points.map(point=>point[1])),maxY=Math.max(...points.map(point=>point[1]));
  const padding=Math.max(spec.section[0]*0.15,12);
  const colors={web:'#6d59b5',l_flange:'#4582a9',r_flange:'#4582a9',l_lip:'#3b8b72',r_lip:'#3b8b72'};
  return <svg className="mv-section-diagram" role="img" aria-label={`${spec.profileLabel} cross-section`} viewBox={`${minX-padding} ${-maxY-padding} ${maxX-minX+padding*2} ${maxY-minY+padding*2}`}>
    {spec.faces.map(face=><line key={face.key} x1={face.start[0]} y1={-face.start[1]} x2={face.end[0]} y2={-face.end[1]} stroke={colors[face.key] || '#6d59b5'} strokeWidth={Math.max(spec.thickness,3)} />)}
    {spec.faces.filter(face=>face.bendAfter?.length).map(face=><polyline key={`${face.key}-bend`} points={face.bendAfter.map(point=>`${point[0]},${-point[1]}`).join(' ')} fill="none" stroke="#6d59b5" strokeWidth={Math.max(spec.thickness,3)} />)}
  </svg>;
}

export default function MaterialViewerScreen() {
  const user=useSelector(state=>state.auth.user);
  const { state } = useLocation();
  const navigate = useNavigate();
  const fromDetails = Boolean(state?.returnTo && state?.templateDraft);
  const [form,setForm]=useState(()=>state?.template
    ? templateViewerForm(state.template, groupPunchRequirements(state.template))
    : {profile:'',sectionSize:'',thickness:'',length:'',punches:[]});
  const [initialPreview] = useState(() => {
    if (!fromDetails) return {};
    try {
      return { spec: buildMaterialSpec(form), applied: JSON.stringify(form) };
    } catch (problem) {
      return { error: problem.message };
    }
  });
  const [spec,setSpec]=useState(initialPreview.spec ?? null);
  const [applied,setApplied]=useState(initialPreview.applied ?? null);
  const [error,setError]=useState(initialPreview.error ?? ''),[showDimensions,setShowDimensions]=useState(false),[autoRotate,setAutoRotate]=useState(false);
  const [mobilePanel,setMobilePanel]=useState(initialPreview.spec ? 'preview' : 'form');
  const dirty=JSON.stringify(form)!==applied;
  const profile=VIEWER_PROFILES.find(item=>item.key===form.profile);
  const faceOptions = punchFaceOptions(form.profile);
  function change(key,value) {setForm(current=>({...current,[key]:value}));setError('');}
  function changeProfile(value) {
    setForm(current=>({...current,profile:value,sectionSize:'',punches:current.punches.map(punch=>({...punch,face:value==='w_beam' ? 'w_panel_5' : 'web'}))}));setError('');
  }
  function changePunch(id,key,value) {setForm(current=>({...current,punches:current.punches.map(punch=>punch.id===id ? {...punch,[key]:value} : punch)}));setError('');}
  function preview(event) {
    event.preventDefault();
    try {
      const next = buildMaterialSpec(form);
      setSpec(next);
      setApplied(JSON.stringify(form));
      setError('');
      setMobilePanel('preview');
    } catch (problem) {
      setError(problem.message);
    }
  }
  if (user?.role==='labour' || !hasAccess(user,'unit1.production.view')) return <div className="notice error" role="alert">The material viewer is unavailable for your access permissions.</div>;
  return <section className={`material-viewer-page mv-panel-${mobilePanel}`}>
    {fromDetails && <div className="mv-details-return">
      <button className="outline-button" type="button" onClick={() => navigate(state.returnTo, {
        replace: true,
        state: { templateDraft: state.templateDraft },
      })}>Back to details</button>
    </div>}
    <div className="mv-mobile-tabs" role="group" aria-label="Material viewer panels"><button type="button" aria-pressed={mobilePanel==='preview'} onClick={()=>setMobilePanel('preview')}>3D workspace</button><button type="button" aria-pressed={mobilePanel==='form'} onClick={()=>setMobilePanel('form')}>Material data</button></div>
    <div className="mv-layout">
      <form className="content-card mv-form" onSubmit={preview}>
        <div className="mv-form-heading"><Box size={20} /><div><h2>Material definition</h2><span>All dimensions in millimetres</span></div></div>
        <div className="mv-form-body">
          <label className="form-field"><span>Section profile</span><select required value={form.profile} onChange={event=>changeProfile(event.target.value)}><option value="" disabled>Choose a section profile</option>{VIEWER_PROFILES.map(item=><option value={item.key} key={item.key}>{item.label}</option>)}</select></label>
          <label className="form-field"><span>Section size (mm)</span><input required value={form.sectionSize} onChange={event=>change('sectionSize',event.target.value)} placeholder={profile?.example || ''} /><small>{profile ? `${profile.dimensionLabel || (form.profile==='w_beam' ? 'Finished width × profile depth' : profile.count===3 ? 'Web × flange × lip' : profile.count===2 ? 'Web × flange' : 'Strip width')} · e.g. ${profile.example}. Use x, X, × or * between dimensions; enter thickness separately.` : 'Choose a profile, then enter its section size.'}</small></label>
          <div className="mv-input-pair"><label className="form-field"><span>Thickness (mm)</span><input type="number" required min="0.001" step="0.001" value={form.thickness} onChange={event=>change('thickness',event.target.value)} /></label><label className="form-field"><span>Length (mm)</span><input type="number" required min="0.001" max="50000" step="0.001" value={form.length} onChange={event=>change('length',event.target.value)} /></label></div>
          {form.profile==='w_beam' && <p className="mv-field-help">Schematic W profile: enter your finished width and depth. Panel proportions and bends are illustrative. Hole centres start at end 0; choose a panel to position holes across the beam.</p>}
          {form.profile==='gl_hat_purlin' && <p className="mv-field-help">The return lip bends up toward the crown at the outer edge of each mounting foot.</p>}
          <div className="mv-punch-heading"><h3>Punches & hole positions</h3><span>{form.punches.length} groups</span></div>
          <p className="mv-field-help">Hole centres are measured from the starting end, not between holes. Enter positions separated by commas. Sizes such as 12 × 20 create capsule holes.</p>
          {form.punches.map((punch,index)=><section className="mv-punch-card" key={punch.id} aria-label={`Punch ${(punch.punchName||punchLetter(index))}`}>
            <div className="mv-punch-title"><strong><span>{punch.punchName||punchLetter(index)}</span> Punch {punch.punchName||punchLetter(index)}</strong><button className="icon-button" type="button" aria-label={`Remove punch ${punch.punchName||punchLetter(index)}`} title="Remove punch" onClick={()=>setForm(current=>({...current,punches:current.punches.filter(item=>item.id!==punch.id)}))}><Trash2 size={15} /></button></div>
            <label className="form-field"><span>Punch name</span><select value={punch.punchName||punchLetter(index)} onChange={event=>changePunch(punch.id,'punchName',event.target.value)}>{['A','B','C','D','E'].map(name=><option value={name} key={name}>PUNCH {name}</option>)}</select></label><div className="mv-input-pair"><label className="form-field"><span>Punch size (mm)</span><input required value={punch.size} onChange={event=>changePunch(punch.id,'size',event.target.value)} placeholder="12 or 12x20" /></label><label className="form-field"><span>Face / profile</span><select value={punch.face} onChange={event=>changePunch(punch.id,'face',event.target.value)}>{faceOptions.map(({value, label})=><option value={value} key={value}>{label}</option>)}</select></label></div>
            <label className="form-field"><span>Hole-centre distances from end 0 (mm)</span><textarea required rows={2} value={punch.positions} onChange={event=>changePunch(punch.id,'positions',event.target.value)} placeholder="100, 400, 800 or 100-400-800" /><small>Enter each hole's distance along the beam, not its size. For a 65x20 slot, enter 65x20 in Punch size above. Centre offset 0 centres it across the selected face.</small></label>
            <div className="mv-input-pair"><label className="form-field"><span>Centre offset (mm)</span><input type="number" step="0.001" required value={punch.offset} onChange={event=>changePunch(punch.id,'offset',event.target.value)} /><small>0 = centre of this face</small></label><label className="form-field"><span>Capsule direction</span><select value={punch.axis} onChange={event=>changePunch(punch.id,'axis',event.target.value)}><option value="length">Along length</option><option value="across">Across face</option></select></label></div>
          </section>)}
          {!form.punches.length && <p className="mv-field-help">No punches. The preview will show a solid section.</p>}
          <button className="outline-button mv-add-punch" type="button" disabled={form.punches.length>=5} onClick={()=>setForm(current=>({...current,punches:[...current.punches,{id:`punch-${Date.now()}-${Math.random().toString(36).slice(2)}`,size:'',face:form.profile==='w_beam' ? 'w_panel_5' : 'web',positions:'',offset:'0',axis:'length'}]}))}><Plus size={16} /> Add punch group</button>
          {error && <div className="notice error" role="alert">{error}</div>}
        </div>
        <div className="mv-form-footer"><span>{!spec ? 'Enter material dimensions to begin' : dirty ? 'Changes ready to preview' : 'Preview is up to date'}</span><button className="primary-button" type="submit"><Box size={17} /> {spec ? 'Update 3D preview' : 'Generate 3D preview'}</button></div>
      </form>
      <div className="mv-preview-column">{spec ? <MaterialCanvas spec={spec} showDimensions={showDimensions} autoRotate={autoRotate} onStopRotation={()=>setAutoRotate(false)} onToggleDimensions={()=>setShowDimensions(value=>!value)} onToggleRotation={()=>setAutoRotate(value=>!value)} /> : <section className="mv-viewer mv-empty-workspace" aria-label="Material preview"><Box size={36} /><strong>No material preview yet</strong><p>Enter the material dimensions and generate a 3D preview.</p></section>}
        {spec ? <div className="mv-summary"><SectionDiagram spec={spec} /><div><strong>{spec.section.join(' × ')} mm</strong><span>{spec.length} mm long · {spec.thickness} mm thick · {spec.holes.length} holes</span><small>{spec.profile==='w_beam' ? 'Schematic corrugations; use your drawing for tooling dimensions. Hole centres are measured from end 0.' : 'Square bends · Holes are cut through the sheet thickness. Labels use distance from the starting end.'}</small></div></div> : <div className="mv-summary"><span>Section details will appear after you generate a preview.</span></div>}
      </div>
    </div>
  </section>;
}
