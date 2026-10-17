import LoadingIndicator from "../../components/LoadingIndicator";
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { ChevronDown, ChevronRight, Pencil, QrCode, RefreshCw, Trash2 } from 'lucide-react'
import { deleteCoil, generateCoilQr, getCoilUsage, listCoils } from '../api/coilApi'
import { groupCoilInvoices } from '../data/coilInvoiceGroups'
import { MATERIAL_LABELS } from '../data/materialGrades'
import { hasAccess } from '../utils/access'
import { formatDate } from '../utils/dateTime'
import { formatCoilRate } from '../utils/coilRate'
import CoilInwardScreen from './CoilInwardScreen'
import PageBack from '../components/PageBack'
import './CoilUsageScreen.css'

const kg = value => `${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg`
const status = coil => coil.runStatus === 'returned' ? 'Returned to stock' : coil.runStatus ? coil.runStatus.replaceAll('_', ' ') : 'Available'

function WeightSummary({ value, compact = false }) {
  return <dl className={`cu-weights${compact ? ' cu-weights-compact' : ''}`}>
    <div><dt>Total weight</dt><dd>{kg(value.totalWeightKg)}</dd></div>
    <div><dt>Est. used</dt><dd>{kg(value.theoreticalUsedKg)}</dd></div>
    <div><dt>Hole scrap</dt><dd>{value.holeScrapKg == null ? 'Unavailable' : kg(value.holeScrapKg)}</dd></div>
    <div className="cu-balance"><dt>Est. remaining</dt><dd>{kg(value.theoreticalRemainingKg)}</dd></div>
  </dl>
}

function NumberedCoil({ coil }) {
  const [expanded, setExpanded] = useState(false)
  return <div className="cu-coil">
    <button type="button" className="cu-coil-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      <span className="cu-coil-name">#{coil.coilNumber}<small>{status(coil)}</small></span>
      <span className="cu-coil-weight"><small>Est. used</small>{kg(coil.theoreticalUsedKg)}</span>
      <span className="cu-coil-weight"><small>Est. remaining</small>{kg(coil.theoreticalRemainingKg)}</span>
      <ChevronDown size={17} className={expanded ? 'cu-chevron-open' : ''} />
    </button>
    {expanded && <dl className="cu-coil-extra">
      <div><dt>Initial weight</dt><dd>{kg(coil.startingWeightKg)}</dd></div>
      <div><dt>Hole scrap</dt><dd>{coil.holeScrapKg == null ? 'Unavailable' : kg(coil.holeScrapKg)}</dd></div>
      <div><dt>Produced pieces</dt><dd>{Number(coil.producedPieces || 0).toLocaleString('en-IN')}</dd></div>
      <div><dt>Machine</dt><dd>{coil.machineName || coil.machineCode || 'Not assigned'}</dd></div>
      <div><dt>Job card</dt><dd>{coil.jobCardId ? `U1-JC-${coil.jobCardId}${coil.memberName ? ` · ${coil.memberName}` : ''}` : 'Not assigned'}</dd></div>
    </dl>}
  </div>
}

function BatchSection({ batch, canEdit, canDelete, onEdit, onDelete, deleting }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const client = useQueryClient()
  const usage = useQuery({ queryKey: ['coil-usage', batch.id, page], queryFn: () => getCoilUsage(batch.id, page), enabled: open })
  const generate = useMutation({ mutationFn: () => generateCoilQr(batch.id), onSuccess: () => client.invalidateQueries({ queryKey: ['coils'] }) })
  return <section className="cu-batch">
    <button type="button" className="cu-batch-toggle" aria-expanded={open} aria-controls={`cu-batch-${batch.id}`} onClick={() => setOpen(!open)}>
      <span className="cu-batch-icon"><ChevronRight size={19} className={open ? 'cu-chevron-open' : ''} /></span>
      <span className="cu-batch-title"><strong>{MATERIAL_LABELS[batch.materialType] || batch.materialType} · {batch.widthMm} × {batch.thicknessMm} mm</strong><small>{batch.grade || 'Grade not recorded'} · {batch.coilQty} coils</small></span>
      <span className="cu-batch-rate"><small>Rate</small><strong>{formatCoilRate(batch.ratePerKg)}</strong></span>
      <span className="cu-batch-hint">{open ? 'Hide coils' : 'Show coils'}</span>
    </button>
    {open && <div id={`cu-batch-${batch.id}`} className="cu-batch-body">
      <WeightSummary value={batch} compact />
      <div className="cu-batch-tools"><span>TC {batch.tcNumber || 'not recorded'}</span><div>
        {batch.qrGeneratedAt ? <Link className="cu-action" to={`/coils/${batch.id}/qr`}><QrCode size={16} /> View QR</Link> : <button className="cu-action" type="button" disabled={generate.isPending} onClick={() => generate.mutate()}><QrCode size={16} />{generate.isPending ? <LoadingIndicator label="Generating…" inline /> : 'Generate QR'}</button>}
        {canEdit && <button className="cu-action" type="button" onClick={() => onEdit(batch)}><Pencil size={15} /> Edit</button>}
        {canDelete && <button className="cu-action cu-delete" type="button" disabled={deleting || Number(batch.usedQty) > 0} title={Number(batch.usedQty) > 0 ? 'Coils with production history cannot be deleted' : 'Delete coil type'} onClick={() => onDelete(batch)}><Trash2 size={15} /> Delete</button>}
      </div></div>
      {generate.isError && <p className="cu-error" role="alert">{generate.error?.response?.data?.error || 'Could not generate QR.'}</p>}
      <div className="cu-numbered-heading"><h3>Numbered coils</h3><span>Select a coil for more details</span></div>
      {usage.isPending && <LoadingIndicator label="Loading coils…" />}
      {usage.isError && <p className="cu-error" role="alert">{usage.error?.response?.data?.error || 'Could not load coils.'} <button type="button" className="cu-action" onClick={() => usage.refetch()}>Retry</button></p>}
      {usage.data?.coils.map(coil => <NumberedCoil key={coil.coilNumber} coil={coil} />)}
      {usage.data?.totalPages > 1 && <div className="cu-pager"><button className="outline-button" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {usage.data.totalPages}</span><button className="outline-button" type="button" disabled={page >= usage.data.totalPages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </div>}
  </section>
}

export default function CoilUsageScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const user = useSelector(state => state.auth.user)
  const [editing, setEditing] = useState(null)
  const coils = useQuery({ queryKey: ['coils'], queryFn: listCoils })
  const group = groupCoilInvoices(coils.data || []).find(item => item.batches.some(batch => String(batch.id) === String(id)))
  const removal = useMutation({ mutationFn: deleteCoil, onSuccess: async (_, removedId) => {
    await client.invalidateQueries({ queryKey: ['coils'] })
    const next = group?.batches.find(batch => String(batch.id) !== String(removedId))
    if (String(removedId) === String(id)) navigate(next ? `/coils/${next.id}/usage` : '/coils', { replace: true })
  } })
  const refresh = () => { coils.refetch(); client.invalidateQueries({ queryKey: ['coil-usage'] }) }
  const onDelete = batch => { if (window.confirm(`Delete ${batch.materialType} ${batch.widthMm} × ${batch.thicknessMm} mm from invoice ${batch.invoice}? This cannot be undone.`)) removal.mutate(batch.id) }
  return <div className="cu-page">
    <PageBack to="/coils" current="Invoice details">Coil stock</PageBack>
    <header className="cu-heading"><div><span className="eyebrow">COIL STOCK</span><h1>Invoice {group?.invoice || (group ? group.batches[0].internalId : 'details')}</h1><p>{group ? `${group.batches.length} coil types · ${group.coilQty} physical coils` : 'Receipt and coil usage'}</p></div><button className="outline-button" type="button" onClick={refresh} disabled={coils.isFetching}><RefreshCw size={16} /> Refresh</button></header>
    {coils.isError && <p className="cu-error" role="alert">{coils.error?.response?.data?.error || 'Could not load invoice.'}</p>}
    {removal.isError && <p className="cu-error" role="alert">{removal.error?.response?.data?.error || 'Could not delete coil.'}</p>}
    {coils.isPending && <LoadingIndicator label="Loading invoice…" />}
    {!coils.isPending && !coils.isError && !group && <p className="cu-message">Invoice not found.</p>}
    {group && <><section className="cu-summary" aria-label="Invoice summary">
      <dl className="cu-documents"><div><dt>Invoice date</dt><dd>{formatDate(group.invoiceDate)}</dd></div><div><dt>Vendor code</dt><dd>{group.vendorCode || '—'}</dd></div><div><dt>TC number</dt><dd>{[...new Set(group.batches.map(batch => batch.tcNumber).filter(Boolean))].join(', ') || '—'}</dd></div></dl>
      <WeightSummary value={group} />
    </section>
      <div className="cu-section-heading"><h2>Coil types</h2><span>Expand a type to view its coils and actions</span></div>
      <div className="cu-batches">{group.batches.map(batch => <BatchSection key={batch.id} batch={batch} canEdit={hasAccess(user, 'unit1.coils.edit')} canDelete={hasAccess(user, 'unit1.coils.delete')} onEdit={setEditing} onDelete={onDelete} deleting={removal.isPending} />)}</div>
      <p className="cu-footnote">Hole scrap is included in estimated used weight. Weigh the coil to confirm its actual balance.</p>
    </>}
    {editing && <CoilInwardScreen key={editing.id} coil={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); client.invalidateQueries({ queryKey: ['coils'] }); client.invalidateQueries({ queryKey: ['coil-usage'] }) }} />}
  </div>
}
