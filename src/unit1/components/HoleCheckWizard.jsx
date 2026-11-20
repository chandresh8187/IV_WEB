import { punchFaceLabel, sectionDimensionsHint, templateSectionProfile } from '../utils/sectionPunchFaces';
import {punchNameFor} from '../utils/punchNames';
import { useEffect, useRef, useState } from 'react'
import './HoleCheckWizard.css'
import {validatePieceInspection,validateRejectedPieces} from '../utils/pieceInspection'

export default function HoleCheckWizard({ run, job, mutation, onClose }) {
  const dialog = useRef(null)
  const firstPiece=run.status==='setup';
  const measureSection = firstPiece || ["gl_hat_purlin", "w_beam_crash_barrier"].includes(job?.structureType);
  const [step, setStep] = useState(measureSection ? -1 : 0)
  const [measuredCutLengthMm,setMeasuredCutLengthMm]=useState('')
  const [measuredSectionSize,setMeasuredSectionSize]=useState('')
  const [pieceError,setPieceError]=useState('')
  const [readings, setReadings] = useState({})
  const [rejectedPieces,setRejectedPieces]=useState('');
  const [remarks, setRemarks] = useState('')
  const [discard, setDiscard] = useState(false)
  const [requestKey] = useState(() => `hc_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`)
  const holes = job?.holes || [], hole = holes[step], review = step === holes.length
  useEffect(() => { const node = dialog.current; node.showModal(); node.querySelector('input')?.focus(); return () => node.close() }, [])
  const close = () => { if (mutation.isPending) return; if (Object.keys(readings).length || measuredCutLengthMm || measuredSectionSize) setDiscard(true); else onClose() }
  const submit = event => {
    event.preventDefault()
    if(step===-1 || (review && measureSection)) {
      try {validatePieceInspection({measuredCutLengthMm,measuredSectionSize},job?.sectionSize);setPieceError('')}
      catch(problem) {setPieceError(problem.message);return}
    }
    if (!review) { setStep(step + 1); return }
    try {setPieceError('');mutation.mutate({ id: run.id, measurements: holes.map(item => ({ holeId: item.id, measuredMm: Number(readings[item.id]) })), remarks, rejectedPieces: validateRejectedPieces(rejectedPieces), requestKey, ...(measureSection ? validatePieceInspection({measuredCutLengthMm,measuredSectionSize},job?.sectionSize) : {}) })}
    catch(problem){setPieceError(problem.message)}
  }
  return <dialog ref={dialog} className="hole-wizard" aria-labelledby="hole-wizard-title" onCancel={event => { event.preventDefault(); close() }}>
    <form onSubmit={submit}>
      <header><div><span className="eyebrow">QUALITY INSPECTION</span><h2 id="hole-wizard-title">{run.status === 'setup' ? 'First-piece check' : 'Hole dimension check'}</h2><p>{run.machineName} · U1-JC-{run.jobCardId}</p></div><button type="button" className="icon-button modal-close" aria-label="Close inspection" disabled={mutation.isPending} onClick={close}><span aria-hidden="true">×</span></button></header>
      <div className="hole-wizard-body">
        {discard && <div className="notice" role="alert">Discard this unsaved inspection?<div className="live-heading-actions"><button type="button" className="outline-button" onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className="outline-button" onClick={onClose}>Discard</button></div></div>}
        {!firstPiece && !holes.length ? <div className="notice error">Hole definitions are unavailable. Close and refresh the job card.</div> : <>
          <div className="hole-step-label"><strong>{review ? 'Review inspection' : step===-1 ? 'Cut length & section size' : `Hole ${step + 1} of ${holes.length}`}</strong><span>{Math.round((step+(measureSection ? 1 : 0)) / Math.max(1,holes.length+(measureSection ? 1 : 0)) * 100)}% complete</span></div>
          <progress aria-label="Inspection progress" max={Math.max(1,holes.length+(measureSection ? 1 : 0))} value={step+(measureSection ? 1 : 0)} />
          {review ? <>{measureSection && <div className="hole-target-grid"><div><span>CUT LENGTH · TARGET / MEASURED</span><strong>{job?.cutLengthMm} / {measuredCutLengthMm} mm</strong></div><div><span>SECTION SIZE · TARGET / MEASURED</span><strong>{job?.sectionSize} / {measuredSectionSize} mm</strong></div></div>}<div className="hole-review-table"><table><thead><tr><th>Punch</th><th>Profile</th><th>Target mm</th><th>Measured mm</th></tr></thead><tbody>{holes.map(item => <tr key={item.id}><td>{punchNameFor(item,holes,job.punchSize)||'Legacy'} · {item.punchSize || job.punchSize}</td><td>{punchFaceLabel(item.profile, templateSectionProfile(job))}</td><td>{item.targetMm}</td><td>{readings[item.id]}</td></tr>)}</tbody></table></div><label className="hole-field">Rejected pieces (NOS)<input inputMode="numeric" disabled={mutation.isPending} value={rejectedPieces} onChange={event=>setRejectedPieces(event.target.value)} placeholder="New rejected NOS only; 0 if none" /></label><label className="hole-field">Remarks (optional)<textarea maxLength={1000} rows={3} value={remarks} onChange={event => setRemarks(event.target.value)} /></label><p className="hole-help">Verify all readings before saving. No automatic pass/fail tolerance is applied.</p></> : step===-1 ? <>
            <div className="hole-target-grid"><div><span>TARGET CUT LENGTH</span><strong>{job?.cutLengthMm}<small> mm</small></strong></div><div><span>TARGET SECTION SIZE</span><strong>{job?.sectionSize}<small> mm</small></strong></div></div>
            <label className="hole-field">Measured cut length (mm)<input autoFocus required disabled={mutation.isPending} type="number" min="0.01" max="1000000" step="0.01" value={measuredCutLengthMm} onChange={event=>setMeasuredCutLengthMm(event.target.value)} placeholder="Enter actual cut length" /></label>
            <label className="hole-field">Measured section size (mm)<input required disabled={mutation.isPending} value={measuredSectionSize} onChange={event=>setMeasuredSectionSize(event.target.value)} placeholder={sectionDimensionsHint(job, { forInspection: true })} /></label>
            <p className="hole-help">Enter actual measurements in the same dimension order as the job card. Target values are not prefilled.</p>
          </> : hole && <>
            <span className="eyebrow">PUNCH SIZE {punchNameFor(hole,holes,job.punchSize)||'Legacy'}</span><div className="hole-punch-size">{hole.punchSize || job.punchSize}</div>
            <div className="hole-target-grid"><div><span>PUNCH PROFILE</span><strong>{punchFaceLabel(hole.profile, templateSectionProfile(job))}</strong></div><div><span>TARGET POSITION</span><strong>{hole.targetMm}<small> mm</small></strong></div></div>
            <label className="hole-field">Measured position (mm)<input key={hole.id} autoFocus required type="number" min="0" max="1000000" step="0.01" inputMode="decimal" value={readings[hole.id] ?? ''} onChange={event => setReadings(current => ({ ...current, [hole.id]: event.target.value }))} placeholder="Enter actual measurement" /></label>
          </>}
        </>}
        {pieceError && <div className="notice error" role="alert">{pieceError}</div>}
        {mutation.isError && <div className="notice error" role="alert">{mutation.error?.response?.data?.error || mutation.error?.message || 'Could not save inspection.'}</div>}
      </div>
      <footer><button type="button" className="outline-button" disabled={step === (measureSection ? -1 : 0) || mutation.isPending} onClick={() => setStep(step - 1)}>Previous</button><button type="submit" className="primary-button" disabled={(!firstPiece && !holes.length) || mutation.isPending}>{mutation.isPending ? 'Saving…' : review ? 'Save inspection' : 'Next'}</button></footer>
    </form>
  </dialog>
}



