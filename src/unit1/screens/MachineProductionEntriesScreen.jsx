import LoadingIndicator from "../../components/LoadingIndicator";
import { formatCoilRate } from '../utils/coilRate'
import ProductionCoilLink from '../components/ProductionCoilLink'
import { hasAccess } from '../utils/access'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { RefreshCw, Plus } from 'lucide-react'
import PageBack from '../components/PageBack'
import { JobCardDetails } from './JobCardsScreen'
import { getCoil } from '../api/coilApi'
import { addProductionBundle, getHoleCheck, getJobCard, getLiveProduction, getMachineEntries } from '../api/productionApi'
import { MATERIAL_LABELS } from '../data/materialGrades'
import { formatDate, formatTime, formatDateTime } from '../utils/dateTime'

const number = value => Number(value || 0).toLocaleString('en-IN')
const date = formatDate
const time = formatTime
const errorText = error => error?.response?.data?.error || error?.response?.data?.message || error?.message

export default function MachineProductionEntriesScreen() {
  const { machineId } = useParams()
  const id = Number(machineId)
  const user = useSelector(state => state.auth.user)
  const canBundle = hasAccess(user, 'unit1.production.bundle')
  const canViewCoil = hasAccess(user, 'unit1.coils.view')
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const displayedShift = useRef(undefined)
  const [adding, setAdding] = useState(false)
  const [pieces, setPieces] = useState('')
  const [job, setJob] = useState(null)
  const [coil, setCoil] = useState(null)
  const [holeCheck, setHoleCheck] = useState(null)
  const live = useQuery({ queryKey: ['production-live'], queryFn: getLiveProduction, refetchInterval: 10000 })
  const entries = useQuery({ queryKey: ['unit1-machine-entries', id, page], queryFn: () => getMachineEntries(id, page), enabled: Number.isSafeInteger(id) && id > 0, refetchInterval: 10000 })
  useEffect(() => {
    if (!entries.data) return
    const shiftKey = `${entries.data.activeShift?.shiftDate || ''}:${entries.data.activeShift?.name || ''}`
    if (displayedShift.current !== undefined && displayedShift.current !== shiftKey) setPage(1)
    displayedShift.current = shiftKey
  }, [entries.data])
  useEffect(() => {
    const endsAt = entries.data?.activeShift?.endsAt
    if (!endsAt) return
    const delay = Math.max(0, new Date(endsAt).getTime() - Date.now() + 1000)
    const timer = window.setTimeout(() => { setPage(1); entries.refetch(); live.refetch() }, delay)
    return () => window.clearTimeout(timer)
  }, [entries.data?.activeShift?.endsAt, entries.refetch, live.refetch])
  const machine = live.data?.machines?.find(item => item.id === id)
  const run = live.data?.runs?.find(item => item.machineId === id)
  const bundleEstimateKg = Number(pieces || 0) * Number(run?.widthMm || 0) * Number(run?.thicknessMm || 0) * Number(run?.cutLengthMm || 0) * Number(run?.densityGcm3 || 7.85) / 1000000
  const record = useMutation({ mutationFn: quantity => addProductionBundle({ id: run.id, pieces: quantity }), onSuccess: async () => { setAdding(false); setPieces(''); setPage(1); await Promise.all([client.invalidateQueries({ queryKey: ['unit1-machine-entries', id] }), client.invalidateQueries({ queryKey: ['production-live'] }), client.invalidateQueries({ queryKey: ['coils'] })]) } })
  const viewJob = async jobId => { try { setJob(await getJobCard(jobId)) } catch (error) { window.alert(errorText(error)) } }
  const viewCoil = async coilId => { if (!canViewCoil) return; try { setCoil(await getCoil(coilId)) } catch (error) { window.alert(errorText(error)) } }
  const viewHoleCheck = async checkId => { try { setHoleCheck(await getHoleCheck(checkId)) } catch (error) { window.alert(errorText(error)) } }
  const totalPages = Math.max(1, Math.ceil(Number(entries.data?.total || 0) / Number(entries.data?.pageSize || 50)))

  return <section className="machine-entries-page">
    <PageBack to="/production/live" current="Production entries">Live production</PageBack>
    <div className="page-heading"><div><span className="eyebrow">MACHINE PRODUCTION</span><h1>{machine?.name || 'Production entries'}</h1><p>{machine?.code || ''} · Date, time, party, material and bundle output.</p></div><div className="live-heading-actions"><button className="outline-button" type="button" onClick={() => { entries.refetch(); live.refetch() }}><RefreshCw size={16} /> Refresh table</button>{run?.status === 'running' && canBundle && Number(run.jobProducedPieces ?? run.producedPieces) < Number(run.productionQty) && <button className="primary-button" type="button" onClick={() => setAdding(true)}><Plus size={16} /> Add production</button>}</div></div>
    {live.isError && <div className="notice error" role="alert">{errorText(live.error)}</div>}
    {entries.isError && <div className="notice error" role="alert">{errorText(entries.error)}</div>}
    {!live.isPending && !machine && <div className="notice error" role="alert">This machine is not registered.</div>}
    {machine && <div className="live-status-buttons"><span className="status-pill">{run?.status || 'Idle'}</span>{run && <span>Estimated coil used {Number(run.theoreticalUsedKg || 0).toFixed(2)} kg · remaining {Number(run.theoreticalRemainingKg || 0).toFixed(2)} kg</span>}{run && user?.role !== 'labour' && <button className="outline-button" type="button" onClick={() => viewJob(run.jobCardId)}>View job card</button>}{run && canViewCoil && <button className="outline-button" type="button" onClick={() => viewCoil(run.coilId)}>View coil</button>}</div>}
    <section className="content-card table-card"><div className="table-toolbar"><strong>{entries.data?.activeShift?.name === 'night' ? 'Night' : 'Day'} shift · {date(entries.data?.activeShift?.shiftDate)} · {number(entries.data?.total)} entries</strong></div><div className="table-scroll"><table><thead><tr><th>Date</th><th>Time</th><th>Party</th><th>Project</th><th>Material Description</th><th>Shift</th><th>Job card</th><th>Coil</th><th>Bundle</th><th>Pieces</th><th>Est. used kg</th><th>Hole check</th><th>Entered by</th></tr></thead><tbody>{entries.data?.entries?.map(entry => <tr key={entry.id}><td>{date(entry.createdAt)}</td><td>{time(entry.createdAt)}</td><td>{entry.customerName || '—'}</td><td>{entry.projectName || '—'}</td><td className="material-description"><strong>{MATERIAL_LABELS[entry.materialType] || entry.materialType || '—'} · {entry.memberName || '—'}</strong><span className="section-size">{entry.sectionSize || '—'}</span></td><td>{entry.shift || '—'}</td><td>{user?.role === 'labour' ? `U1-JC-${entry.jobCardId}` : <button className="job-link-button" type="button" onClick={() => viewJob(entry.jobCardId)}>U1-JC-{entry.jobCardId}</button>}</td><td><ProductionCoilLink entry={entry} canView={canViewCoil} onView={viewCoil} /></td><td>#{entry.bundleNo}</td><td><strong>{number(entry.pieces)}</strong></td><td>{Number(entry.theoreticalUsedKg || 0).toFixed(2)}</td><td>{entry.holeCheckId ? (user?.role === 'labour' ? '—' : <button className="job-link-button" type="button" onClick={() => viewHoleCheck(entry.holeCheckId)}>View check</button>) : '—'}</td><td>{entry.enteredByName || `User #${entry.enteredBy}`}</td></tr>)}</tbody></table></div>{entries.data?.entries?.length === 0 && <p className="machine-empty">No production entries for this shift.</p>}{totalPages > 1 && <div className="modal-footer"><button className="outline-button" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button className="outline-button" type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button></div>}</section>
    {adding && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAdding(false) }}><div className="inward-modal" role="dialog" aria-modal="true" aria-label="Add production"><div className="modal-header"><div><span className="eyebrow">BUNDLE ENTRY</span><h2>Add production · {machine?.name}</h2></div><button className="icon-button modal-close" type="button" onClick={() => setAdding(false)}>×</button></div><form onSubmit={event => { event.preventDefault(); record.mutate(Number(pieces)) }}><div className="modal-body"><label className="form-field"><span>Pieces in bundle</span><input type="number" min="1" max="100000" step="1" required value={pieces} onChange={event => setPieces(event.target.value)} /></label><p>Estimated gross coil use: <strong>{bundleEstimateKg.toFixed(2)} kg</strong></p>{record.isError && <div className="notice error" role="alert">{errorText(record.error)}</div>}</div><div className="modal-footer"><button className="outline-button" type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary-button" type="submit" disabled={record.isPending}>{record.isPending ? <LoadingIndicator label="Saving…" inline /> : 'Save production'}</button></div></form></div></div>}
    <JobCardDetails job={job} onClose={() => setJob(null)} />
    {coil && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setCoil(null) }}><div className="inward-modal" role="dialog" aria-modal="true" aria-label="Coil details"><div className="modal-header"><div><span className="eyebrow">COIL STOCK</span><h2>{coil.internalId}</h2></div><button className="icon-button modal-close" type="button" onClick={() => setCoil(null)}>×</button></div><div className="modal-body"><div className="job-detail-grid"><span>Material <strong>{MATERIAL_LABELS[coil.materialType] || coil.materialType}</strong></span><span>Size <strong>{coil.widthMm} × {coil.thicknessMm} mm</strong></span><span>Grade <strong>{coil.grade}</strong></span><span>Invoice <strong>{coil.invoice}</strong></span><span>Rate <strong>{formatCoilRate(coil.ratePerKg)}</strong></span><span>Coil qty <strong>{coil.coilQty}</strong></span><span>Total weight <strong>{coil.totalWeightKg} kg</strong></span></div></div><div className="modal-footer"><button className="outline-button" type="button" onClick={() => setCoil(null)}>Close</button></div></div></div>}
    {holeCheck && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setHoleCheck(null) }}><div className="inward-modal" role="dialog" aria-modal="true" aria-label="Supervisor hole check"><div className="modal-header"><div><span className="eyebrow">QUALITY CHECK</span><h2>{holeCheck.checkType === 'first_piece' ? 'First-piece hole check' : 'Production hole recheck'}</h2><p>{holeCheck.checkedByName || 'Supervisor'} · {formatDateTime(holeCheck.checkedAt)}</p></div><button className="icon-button modal-close" type="button" onClick={() => setHoleCheck(null)}>×</button></div><div className="modal-body"><div className="job-hole-list">{holeCheck.measurements.map((item, index) => <span key={index}><strong>{item.punchSize || 'Punch'} · {item.profile.replace('_', ' ')}</strong> · target {item.targetMm} mm · measured {item.measuredMm} mm</span>)}</div></div><div className="modal-footer"><button className="outline-button" type="button" onClick={() => setHoleCheck(null)}>Close</button></div></div></div>}
  </section>
}
