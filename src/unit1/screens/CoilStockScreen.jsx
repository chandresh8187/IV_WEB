import LoadingIndicator from "../../components/LoadingIndicator";
import { useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowRight, Boxes, CirclePlus, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import { listCoils } from '../api/coilApi'
import { setSearch } from '../store/coilUiSlice'
import CoilInwardScreen from './CoilInwardScreen'
import PageBack from '../components/PageBack'
import { groupCoilInvoices } from '../data/coilInvoiceGroups'
import { hasAccess } from '../utils/access'
import { formatDate } from '../utils/dateTime'

const date = formatDate

export default function CoilStockScreen() {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const closeModal = useCallback(() => navigate('/coils', { replace: true }), [navigate])
  const modalOpen = location.pathname.endsWith('/inward')
  const user = useSelector(state => state.auth.user)
  const canCreate = hasAccess(user, 'unit1.coils.create')
  const { search } = useSelector(state => state.coilUi)
  const { data: coils = [], isPending, isError, error, refetch, isFetching } = useQuery({ queryKey: ['coils'], queryFn: listCoils })
  const invoices = groupCoilInvoices(coils)
  const term = search.trim().toLowerCase()
  const filtered = invoices.filter(group => !term || group.batches.some(coil =>
    [coil.vendorCode, coil.invoice, coil.tcNumber, coil.materialType, coil.grade, coil.internalId, coil.widthMm, coil.thicknessMm]
      .some(value => String(value || '').toLowerCase().includes(term))))
  const totalCoils = coils.reduce((sum, coil) => sum + Number(coil.coilQty || 1), 0)

  return (
    <>
      <PageBack to="/production" current="Coil stock">Production</PageBack>
      <div className="page-heading">
        <div><span className="eyebrow">INVENTORY</span><h1>Coil stock</h1><p>One row per invoice. Open details to see every coil size and numbered coil.</p></div>
        {canCreate && <Link className="primary-button heading-action" to="/coils/inward"><CirclePlus size={18} /> Add inward</Link>}
      </div>
      <section className="content-card table-card">
        <div className="table-toolbar">
          <div className="search-field"><Search size={18} /><input aria-label="Search coils" placeholder="Search invoice, TC, vendor, grade or ID" value={search} onChange={event => dispatch(setSearch(event.target.value))} /></div>
          <div className="toolbar-actions">
            <button className="outline-button" type="button" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={16} className={isFetching ? 'spin' : ''} /> Refresh</button>
          </div>
        </div>
        {isError && <div className="notice error" role="alert"><TriangleAlert size={18} /> {error?.response?.data?.error || error?.message || 'Unable to load coils.'}</div>}
        {isPending ? <LoadingIndicator label="Loading coil stock…" /> : filtered.length ? (
          <div className="table-scroll"><table className="coil-table">
            <thead><tr><th>Invoice</th><th>TC number</th><th>Vendor code</th><th>Coil types</th><th>Coil Qty</th><th>Available</th><th>Total weight</th><th className="coil-actions-column">Actions</th></tr></thead>
            <tbody>{filtered.map(group => <tr key={group.key}>
              <td><strong>{group.invoice || '—'}</strong><small>{group.invoiceDate ? date(group.invoiceDate) : '—'}</small></td>
              <td>{[...new Set(group.batches.map(coil => coil.tcNumber).filter(Boolean))].join(', ') || '—'}</td>
              <td>{group.vendorCode || '—'}</td>
              <td>{group.batches.map(coil => `${coil.materialType} ${coil.widthMm}×${coil.thicknessMm} mm`).join(', ')}</td>
              <td>{group.coilQty.toLocaleString('en-IN')}</td>
              <td>{group.availableQty.toLocaleString('en-IN')}</td>
              <td>{group.totalWeightKg.toLocaleString('en-IN')} kg</td>
              <td className="coil-actions-column"><Link className="coil-qr-link" to={`/coils/${group.id}/usage`}>View details</Link></td>
            </tr>)}</tbody>
          </table></div>
        ) : <div className="empty-state"><Boxes size={32} /><strong>No matching coils</strong><span>Adjust the filters or record a new inward coil.</span>{canCreate && <Link className="text-link" to="/coils/inward">Add coil <ArrowRight size={16} /></Link>}</div>}
        {!isPending && <div className="table-footer">Showing {filtered.length} of {invoices.length} invoices · {totalCoils.toLocaleString('en-IN')} coils received</div>}
      </section>
      {modalOpen && canCreate && <CoilInwardScreen onClose={closeModal} onSaved={closeModal} />}
    </>
  )
}

