import LoadingIndicator from "../../components/LoadingIndicator";
import { formatCoilRate } from '../utils/coilRate'
import { hasAccess } from '../utils/access'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { CircleCheck, CirclePlay, ClipboardList, Factory, List, PackageCheck, Pause, QrCode, Radio, RefreshCw, ScanLine, TriangleAlert, Unlink } from 'lucide-react'
import { addProductionBundle, approveHoleCheck, assignJobCard, changeProductionRun, getAvailableProductionCoils, getJobCards, getLiveProduction, getUsedCoilNumbers, startProductionRun, unassignJobCard, verifyProductionCoil } from '../api/productionApi'
import { getCoil } from '../api/coilApi'
import { JobCardDetails } from './JobCardsScreen'
import { MATERIAL_LABELS } from '../data/materialGrades'
import PageBack from '../components/PageBack'
import { formatDateTime, formatTime } from '../utils/dateTime'

const number = value => Number(value || 0).toLocaleString('en-IN')
const dateTime = formatDateTime

function RunCard({ machine, run, labourOnly, canSupervise, canScanCoil, canRemoveCoil, canBundle, canAssign, canUnassign, canViewCoil, job, onChanged, onInsert, onAssign, onUnassignJob, onOpenMachine, onViewCoil }) {
  const [pieces, setPieces] = useState('')
  const [measurements, setMeasurements] = useState({})
  const [showJob, setShowJob] = useState(false)
  const [showChecks, setShowChecks] = useState(false)
  const [showCheckForm, setShowCheckForm] = useState(false)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const output = useMutation({ mutationFn: addProductionBundle, onSuccess: async () => { setPieces(''); setShowEntryForm(false); await onChanged() } })
  const check = useMutation({ mutationFn: approveHoleCheck, onSuccess: async () => { setShowCheckForm(false); await onChanged() } })
  const status = useMutation({ mutationFn: changeProductionRun, onSuccess: onChanged })
  const error = output.error?.response?.data?.error || check.error?.response?.data?.error || status.error?.response?.data?.error || output.error?.response?.data?.message || check.error?.response?.data?.message || status.error?.response?.data?.message
  const material = run
    ? `${MATERIAL_LABELS[run.materialType] || run.materialType} · ${run.widthMm} × ${run.thicknessMm} mm`
    : job ? `${MATERIAL_LABELS[job.materialType] || job.materialType} · ${job.coilWidthMm} × ${job.coilThicknessMm} mm` : 'No job card assigned'
  const outputText = run ? `${number(run.jobProducedPieces ?? run.producedPieces)} / ${number(run.productionQty)} pcs` : job ? `${number(job.producedPieces)} / ${number(job.productionQty)} pcs` : '—'

  return <article className="live-machine-card">
    <div className="live-machine-top"><div className="settings-card-icon"><Factory size={20} /></div><div><strong>{machine.name}</strong><span>{machine.code}</span></div><span className={`live-state ${run?.status || (machine.isActive ? 'idle' : 'inactive')}`}>{run?.status || (machine.isActive ? 'Idle' : 'Inactive')}</span></div>
    <div className="live-run-details"><div><span>Material</span><strong>{material}</strong></div><div><span>Job output</span><strong>{outputText}</strong></div></div>
    {run && <p className="live-form-hint">Estimated coil remaining: {number(run.theoreticalRemainingKg)} kg</p>}
    <div className="live-status-buttons live-card-views">
      {(run || job) && !labourOnly && <button className="outline-button live-job-card-button" type="button" onClick={() => setShowJob(true)}><ClipboardList size={15} /><span>View assigned job card</span></button>}
      {run && canViewCoil && <button className="outline-button" type="button" onClick={() => onViewCoil(run.coilId)}><QrCode size={15} /> Coil</button>}
      <button className="outline-button" type="button" onClick={() => onOpenMachine(machine)}><List size={15} /> Entries</button>
    </div>
    {run ? <>
      {!labourOnly && run.holeChecks?.length > 0 && <><button className="live-inline-link" type="button" onClick={() => setShowChecks(value => !value)}><CircleCheck size={15} /> {showChecks ? 'Hide' : 'View'} hole checks ({run.holeChecks.length})</button>{showChecks && <div className="live-hole-checks">{run.holeChecks.map((hole, index) => <span key={index}>{hole.profile.replace('_', ' ')}: target {hole.targetMm} mm · measured {hole.measuredMm} mm</span>)}</div>}</>}
      {run.status === 'setup' && canSupervise && <button className="primary-button live-card-primary" type="button" onClick={() => setShowCheckForm(value => !value)}><CircleCheck size={16} /> {showCheckForm ? 'Close first-piece check' : 'Record first-piece check'}</button>}
      {['running', 'paused'].includes(run.status) && canSupervise && <button className="outline-button live-card-primary" type="button" onClick={() => setShowCheckForm(value => !value)}><CircleCheck size={16} /> {showCheckForm ? 'Close hole check' : 'Check hole dimensions'}</button>}
      {run.status === 'setup' && !canSupervise && <p className="live-form-hint">Waiting for supervisor first-piece approval.</p>}
      {showCheckForm && ['setup', 'running', 'paused'].includes(run.status) && <div className="live-run-actions"><form onSubmit={event => { event.preventDefault(); if (window.confirm(run.status === 'setup' ? 'Approve these measured dimensions and release bundle entry?' : 'Save this hole recheck for the next production entries?')) check.mutate({ id: run.id, measurements: (job?.holes || []).map(hole => ({ holeId: hole.id, measuredMm: Number(measurements[hole.id]) })) }) }}><strong>Measured hole positions</strong><div className="job-check-list">{job?.holes?.map(hole => <label key={hole.id}>{hole.punchSize || job.punchSize} · {hole.profile.replace('_', ' ')} · target {hole.targetMm} mm<input type="number" min="0" step="0.01" required value={measurements[hole.id] ?? ''} onChange={event => setMeasurements(previous => ({ ...previous, [hole.id]: event.target.value }))} placeholder="Measured mm" /></label>)}</div><button className="primary-button" type="submit" disabled={check.isPending || !job?.holes?.length}>{run.status === 'setup' ? 'Approve first piece' : 'Save hole check'}</button></form></div>}
      {run.status === 'running' && canBundle && Number(run.jobProducedPieces ?? run.producedPieces) < Number(run.productionQty) && <button className="primary-button live-card-primary" type="button" onClick={() => setShowEntryForm(value => !value)}><PackageCheck size={16} /> {showEntryForm ? 'Close production entry' : 'Record production'}</button>}
      {showEntryForm && run.status === 'running' && <div className="live-run-actions"><form className="live-output-form" onSubmit={event => { event.preventDefault(); output.mutate({ id: run.id, pieces: Number(pieces) }) }}><label>Bundle quantity (pieces)<input type="number" min="1" max="100000" step="1" value={pieces} onChange={event => setPieces(event.target.value)} required /></label><button className="primary-button" type="submit" disabled={output.isPending}>Save entry</button></form></div>}
      {run.status === 'running' && Number(run.jobProducedPieces ?? run.producedPieces) >= Number(run.productionQty) && <p className="live-form-hint">Planned quantity reached.</p>}
      {canRemoveCoil && ['running', 'paused'].includes(run.status) && Number(run.theoreticalRemainingKg) > 0 && <button className="outline-button live-card-primary" type="button" disabled={status.isPending} onClick={() => { if (window.confirm(`Record all produced pieces before returning. Coil #${run.coilNumber} has an estimated ${number(run.theoreticalRemainingKg)} kg remaining. Production history will be saved and the same QR can be reused. Then scan another coil to continue on ${machine.name}. Return this coil?`)) status.mutate({ id: run.id, action: 'return-coil' }) }}><Unlink size={16} /> Return remaining coil</button>}
      <div className="live-status-buttons live-card-controls">
        {run.status === 'setup' && canRemoveCoil && <button className="outline-button" type="button" disabled={status.isPending} onClick={() => { if (window.confirm(`Unassign the setup coil from ${machine.name}?`)) status.mutate({ id: run.id, action: 'remove' }) }}><Unlink size={15} /> Unassign coil</button>}
        {canSupervise && run.status === 'running' && <button className="outline-button" type="button" disabled={status.isPending} onClick={() => status.mutate({ id: run.id, action: 'pause' })}><Pause size={15} /> Pause</button>}
        {canSupervise && run.status === 'paused' && <button className="outline-button" type="button" disabled={status.isPending || !machine.isActive} onClick={() => status.mutate({ id: run.id, action: 'resume' })}><CirclePlay size={15} /> Resume</button>}
        {canSupervise && ['running', 'paused'].includes(run.status) && <button className="outline-button" type="button" disabled={status.isPending} onClick={() => { if (window.confirm(`Complete this coil on ${machine.name}? It will no longer be reusable. To save a partly used coil, choose Return remaining coil instead.`)) status.mutate({ id: run.id, action: 'complete' }) }}><CircleCheck size={15} /> Complete coil</button>}
      </div>
    </> : machine.isActive ? <div className="live-status-buttons live-card-controls">
      {!job && canAssign && <button className="primary-button" type="button" onClick={() => onAssign(machine)}><ClipboardList size={16} /> Assign job card</button>}
      {job && canScanCoil && <button className="primary-button" type="button" onClick={() => onInsert(machine.id, job.id)}><ScanLine size={16} /> Scan and insert coil</button>}
      {job && canUnassign && <button className="outline-button" type="button" onClick={() => onUnassignJob(job)}><Unlink size={15} /> Unassign job card</button>}
    </div> : <p className="live-idle-note">Configure this machine in Settings.</p>}
    {error && <div className="notice error" role="alert">{error}</div>}
    {showJob && job && <JobCardDetails job={job} onClose={() => setShowJob(false)} />}
  </article>
}
export default function LiveProductionScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scannedCoilId = searchParams.get('coilId') || ''
  const scannedCoilNumber = searchParams.get('coilNumber') || '1'
  const user = useSelector(state => state.auth.user)
  const canSupervise = hasAccess(user, 'unit1.production.supervise')
  const canScanCoil = hasAccess(user, 'unit1.production.coil.assign')
  const canRemoveCoil = hasAccess(user, 'unit1.production.coil.remove')
  const canBundle = hasAccess(user, 'unit1.production.bundle')
  const canAssign = hasAccess(user, 'unit1.jobcards.assign')
  const canUnassign = hasAccess(user, 'unit1.jobcards.unassign')
  const canViewCoil = hasAccess(user, 'unit1.coils.view')
  const queryClient = useQueryClient()
  const [assignmentMachine, setAssignmentMachine] = useState(null)
  const [assignmentJobId, setAssignmentJobId] = useState('')
  const [coilDetails, setCoilDetails] = useState(null)
  const [showStart, setShowStart] = useState(Boolean(scannedCoilId))
  const [startForm, setStartForm] = useState({ machineId: '', jobCardId: '', coilId: scannedCoilId, coilNumber: scannedCoilNumber })
  const liveQuery = useQuery({ queryKey: ['production-live'], queryFn: getLiveProduction, refetchInterval: 10000 })
  const jobsQuery = useQuery({ queryKey: ['unit1-job-cards'], queryFn: getJobCards, refetchInterval: 10000 })
  const coilsQuery = useQuery({ queryKey: ['available-production-coils'], queryFn: getAvailableProductionCoils, enabled: showStart, refetchInterval: showStart ? 10000 : false })
  const refresh = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['production-live'] }), queryClient.invalidateQueries({ queryKey: ['production-runs'] }), queryClient.invalidateQueries({ queryKey: ['available-production-coils'] }), queryClient.invalidateQueries({ queryKey: ['production-coil-used'] }), queryClient.invalidateQueries({ queryKey: ['unit1-job-cards'] }), queryClient.invalidateQueries({ queryKey: ['coils'] }), queryClient.invalidateQueries({ queryKey: ['coil'] }), queryClient.invalidateQueries({ queryKey: ['coil-usage'] })]) }
  const start = useMutation({ mutationFn: async input => { await verifyProductionCoil(input); return startProductionRun(input) }, onSuccess: async () => { setShowStart(false); setStartForm({ machineId: '', jobCardId: '', coilId: '', coilNumber: '1' }); await refresh() } })
  const assign = useMutation({ mutationFn: ({ jobCardId, machineId }) => assignJobCard(jobCardId, machineId), onSuccess: async () => { setAssignmentMachine(null); setAssignmentJobId(''); await refresh() }, onError: error => window.alert(error?.response?.data?.error || 'Could not assign job card.') })
  const submitAssignment = () => {
    const job = jobsQuery.data?.find(item => String(item.id) === assignmentJobId)
    if (job?.plannedMachineId && Number(job.plannedMachineId) !== Number(assignmentMachine?.id)) return window.alert(`This job card is planned for ${job.plannedMachineName || `machine #${job.plannedMachineId}`}. Select that machine to assign it.`)
    assign.mutate({ jobCardId: Number(assignmentJobId), machineId: assignmentMachine.id })
  }
  const unassign = useMutation({ mutationFn: unassignJobCard, onSuccess: refresh })
  const viewCoil = async id => { try { setCoilDetails(await getCoil(id)) } catch { window.alert('Could not load coil details.') } }
  const live = liveQuery.data
  const machines = (live?.machines || []).filter(machine => user?.role !== 'labour' || Number(machine.id) === Number(user.assignedMachineId))
  const runs = (live?.runs || []).filter(run => user?.role !== 'labour' || Number(run.machineId) === Number(user.assignedMachineId))
  const availableMachines = machines.filter(machine => machine.isActive && !runs.some(run => run.machineId === machine.id))
  const availableJobs = (jobsQuery.data || []).filter(job => job.status === 'open' && Number(job.producedPieces) < Number(job.productionQty) && availableMachines.some(machine => machine.id === job.machineId) && (!startForm.machineId || String(job.machineId) === startForm.machineId))
  const selectedCoil = coilsQuery.data?.find(coil => String(coil.id) === startForm.coilId)
  const usedNumbersQuery = useQuery({ queryKey: ['production-coil-used', selectedCoil?.id], queryFn: () => getUsedCoilNumbers(selectedCoil.id), enabled: showStart && Boolean(selectedCoil?.id) })
  const selectedNumberUsed = usedNumbersQuery.data?.includes(Number(startForm.coilNumber))

  return <section className="live-production-page">
    <PageBack to="/production" current="Live production">Production</PageBack>
    <div className="page-heading"><div><span className="eyebrow">ROLL FORMING</span><h1>Live production</h1><p>Registered machines, inserted coils, first-piece checks and bundle output.</p>{live?.activeShift && <p className="live-form-hint">Current shift: <strong>{live.activeShift.name === 'day' ? 'Day' : 'Night'}</strong> · ends {formatTime(live.activeShift.endsAt)} IST</p>}</div><div className="live-heading-actions"><button className="outline-button" type="button" onClick={() => { liveQuery.refetch(); jobsQuery.refetch() }} disabled={liveQuery.isFetching}><RefreshCw size={16} /> Refresh</button>{canScanCoil && <button className="primary-button" type="button" onClick={() => setShowStart(previous => !previous)}><CirclePlay size={17} /> {showStart ? 'Close form' : 'Insert coil'}</button>}</div></div>
    {liveQuery.isError && <div className="notice error" role="alert"><TriangleAlert size={18} /> {liveQuery.error?.response?.data?.error || liveQuery.error?.response?.data?.message || 'Unable to load live production.'}</div>}
    {unassign.isError && <div className="notice error" role="alert">{unassign.error?.response?.data?.error || unassign.error?.message}</div>}
    {liveQuery.isPending && <LoadingIndicator label="Loading live production…" />}
    {live && <>
      <div className="live-summary"><div><Radio size={19} /><span>Running machines</span><strong>{runs.filter(run => run.status === 'running').length}</strong></div><div><CircleCheck size={19} /><span>Awaiting check</span><strong>{runs.filter(run => run.status === 'setup').length}</strong></div></div>
      {showStart && canScanCoil && <form className="content-card live-start-form" onSubmit={event => { event.preventDefault(); start.mutate({ jobCardId: Number(startForm.jobCardId), coilId: Number(startForm.coilId), coilNumber: Number(startForm.coilNumber) }) }}><div className="card-heading"><div><span className="eyebrow">SUPERVISOR SETUP</span><h2>Insert scanned coil</h2><p className="live-form-hint">Scan the QR on the physical coil, choose its job card, then record the first-piece check.</p></div></div><div className="live-start-grid"><label>Machine<select required value={startForm.machineId} onChange={event => setStartForm(previous => ({ ...previous, machineId: event.target.value, jobCardId: '' }))}><option value="">Select available machine</option>{availableMachines.map(machine => <option key={machine.id} value={machine.id}>{machine.name} ({machine.code})</option>)}</select></label><label>Job card<select required value={startForm.jobCardId} onChange={event => setStartForm(previous => ({ ...previous, jobCardId: event.target.value }))}><option value="">Select job card</option>{availableJobs.map(job => <option key={job.id} value={job.id}>U1-JC-{job.id} · {job.memberName} · {job.sectionSize} · Planned: {job.plannedMachineName || 'Not specified'}</option>)}</select></label><label>Scanned coil stock<select required value={startForm.coilId} onChange={event => setStartForm(previous => ({ ...previous, coilId: event.target.value, coilNumber: '1' }))}><option value="">Select received coil</option>{coilsQuery.data?.map(coil => <option key={coil.id} value={coil.id}>{coil.invoice || coil.internalId} · {MATERIAL_LABELS[coil.materialType] || coil.materialType || 'Coil'} · {coil.widthMm}×{coil.thicknessMm} mm ({coil.availableQty} available)</option>)}</select></label><label>Physical coil number<input type="number" min="1" max={selectedCoil?.coilQty || undefined} step="1" required value={startForm.coilNumber} onChange={event => setStartForm(previous => ({ ...previous, coilNumber: event.target.value }))} /></label></div>{selectedCoil && <p className="live-form-hint">Already assigned: {usedNumbersQuery.data?.join(', ') || 'none'}. Use the number printed on the coil QR label.</p>}{selectedNumberUsed && <div className="notice error" role="alert">This physical coil number is already assigned.</div>}{coilsQuery.isError && <div className="notice error">Could not load available coils.</div>}{coilsQuery.isSuccess && scannedCoilId && !selectedCoil && <div className="notice error">The scanned coil is no longer available.</div>}{start.isError && <div className="notice error" role="alert">{start.error?.response?.data?.error || start.error?.response?.data?.message || 'Could not insert coil.'}</div>}<div className="live-form-actions"><button className="primary-button" type="submit" disabled={start.isPending || !coilsQuery.isSuccess || selectedNumberUsed}><CirclePlay size={17} /> {start.isPending ? 'Inserting…' : 'Insert coil'}</button><button className="outline-button" type="button" onClick={() => setShowStart(false)}>Cancel</button></div>{!availableJobs.length && <p className="live-form-hint">Create a matching <Link to="/production/job-cards">job card</Link> for an available machine.</p>}</form>}
      <div className="live-section-heading"><div><h2>Machines</h2><p>{machines.length} {machines.length === 1 ? 'machine' : 'machines'} visible. Changes appear across signed-in devices. Last synced {dateTime(live.serverTime)}.</p></div>{hasAccess(user, 'unit1.machines.manage') && <Link className="text-link" to="/settings/machines">Manage machines</Link>}</div>
      {!machines.length && <div className="content-card live-loading">{user?.role === 'labour' ? 'No machine is assigned to you. Ask your production manager to assign one.' : 'No machines have been added in Settings yet.'}</div>}
      <div className="live-machine-grid">{machines.map(machine => { const run = runs.find(item => item.machineId === machine.id); const job = jobsQuery.data?.find(item => item.id === run?.jobCardId) || jobsQuery.data?.find(item => item.machineId === machine.id && item.status === 'open'); return <RunCard key={machine.id} machine={machine} run={run} labourOnly={user?.role === 'labour'} canSupervise={canSupervise} canScanCoil={canScanCoil} canRemoveCoil={canRemoveCoil} canBundle={canBundle} canAssign={canAssign} canUnassign={canUnassign} canViewCoil={canViewCoil} job={job} onChanged={refresh} onAssign={setAssignmentMachine} onUnassignJob={job => { if (window.confirm(`Unassign U1-JC-${job.id} from this machine?`)) unassign.mutate(job.id) }} onOpenMachine={machine => navigate(`/production/live/${machine.id}/entries`)} onViewCoil={viewCoil} onInsert={(machineId, jobCardId) => { setStartForm(previous => ({ ...previous, machineId: String(machineId), jobCardId: String(jobCardId) })); setShowStart(true) }} /> })}</div>
      {assignmentMachine && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAssignmentMachine(null) }}><div className="inward-modal" role="dialog" aria-modal="true" aria-label="Assign job card"><div className="modal-header"><div><span className="eyebrow">MACHINE PLANNING</span><h2>Assign job card · {assignmentMachine.name}</h2></div><button className="icon-button modal-close" onClick={() => setAssignmentMachine(null)} type="button">×</button></div><div className="modal-body"><label className="form-field"><span>Unassigned job card</span><select value={assignmentJobId} onChange={event => setAssignmentJobId(event.target.value)}><option value="">Select job card</option>{jobsQuery.data?.filter(job => job.status === 'open' && !job.machineId).map(job => <option key={job.id} value={job.id}>U1-JC-{job.id} · {job.memberName} · {job.sectionSize} · Planned: {job.plannedMachineName || 'Not specified'}</option>)}</select></label>{assign.isError && <div className="notice error" role="alert">{assign.error?.response?.data?.error || assign.error?.message}</div>}</div><div className="modal-footer"><button className="outline-button" type="button" onClick={() => setAssignmentMachine(null)}>Cancel</button><button className="primary-button" type="button" disabled={!assignmentJobId || assign.isPending} onClick={submitAssignment}>Assign</button></div></div></div>}
      {coilDetails && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setCoilDetails(null) }}><div className="inward-modal" role="dialog" aria-modal="true" aria-label="Coil details"><div className="modal-header"><div><span className="eyebrow">COIL STOCK</span><h2>{coilDetails.internalId}</h2></div><button className="icon-button modal-close" onClick={() => setCoilDetails(null)} type="button">×</button></div><div className="modal-body"><div className="job-detail-grid"><span>Material <strong>{MATERIAL_LABELS[coilDetails.materialType] || coilDetails.materialType}</strong></span><span>Size <strong>{coilDetails.widthMm} × {coilDetails.thicknessMm} mm</strong></span><span>Grade <strong>{coilDetails.grade}</strong></span><span>Invoice <strong>{coilDetails.invoice}</strong></span><span>Rate <strong>{formatCoilRate(coilDetails.ratePerKg)}</strong></span><span>Coil qty <strong>{coilDetails.coilQty}</strong></span><span>Total weight <strong>{coilDetails.totalWeightKg} kg</strong></span></div></div><div className="modal-footer"><button className="outline-button" onClick={() => setCoilDetails(null)} type="button">Close</button></div></div></div>}
    </>}
  </section>
}




