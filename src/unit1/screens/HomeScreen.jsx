import LoadingIndicator from "../../components/LoadingIndicator";
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { ArrowRight, Boxes, CirclePlus, ClipboardCheck, Layers3, Radio, RefreshCw, TriangleAlert } from 'lucide-react'
import { listCoils } from '../api/coilApi'
import { MATERIAL_LABELS } from '../data/materialGrades'
import { formatDate } from '../utils/dateTime'

const number = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const date = formatDate
const quantity = coil => Number(coil.coilQty || 1)

export default function HomeScreen() {
  const user = useSelector(state => state.auth.user)
  const { data: coils = [], isPending, isError, error, refetch, isFetching } = useQuery({ queryKey: ['coils'], queryFn: listCoils })
  const stock = coils.filter(coil => ['in_stock', 'allocated'].includes(coil.status))
  const totalCoils = coils.reduce((sum, coil) => sum + quantity(coil), 0)
  const availableCoils = stock.reduce((sum, coil) => sum + Number(coil.availableQty ?? quantity(coil)), 0)
  const totalKg = stock.reduce((sum, coil) => sum + Number(coil.theoreticalRemainingKg ?? coil.totalWeightKg ?? 0), 0)
  const producedKg = coils.reduce((sum, coil) => sum + Number(coil.theoreticalUsedKg || 0), 0)
  const recent = coils.slice(0, 5)

  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">PRODUCTION OVERVIEW</span><h1>Good to see you, {user?.name?.split(' ')[0] || 'there'}.</h1><p>Here is what is happening across your coil inventory.</p></div><button className="outline-button" type="button" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={16} className={isFetching ? 'spin' : ''} /> Refresh</button></div>
      <section className="welcome-banner"><div><span className="welcome-tag">UNIT 1 · LIVE WORKSPACE</span><h2>Keep production moving.</h2><p>Record incoming coils and keep stock information ready for the next step.</p><Link className="banner-link" to="/coils/inward">New coil inward <ArrowRight size={17} /></Link></div><div className="banner-graphic" aria-hidden="true"><div className="ring ring-one" /><div className="ring ring-two" /><Layers3 size={86} strokeWidth={1.1} /></div></section>
      {isError && <div className="notice error" role="alert"><TriangleAlert size={18} /><span>Could not load Unit 1 coil data: {error?.response?.data?.error || error?.message}</span><button type="button" onClick={() => refetch()}>Retry</button></div>}
      <section className="metric-grid" aria-label="Coil stock summary">
        <div className="metric-card"><div className="metric-icon violet"><Boxes size={23} /></div><span>Total coils received</span><strong>{isPending ? '—' : number(totalCoils)}</strong><small>Across all inward records</small></div>
        <div className="metric-card"><div className="metric-icon teal"><Layers3 size={23} /></div><span>Available stock</span><strong>{isPending ? '—' : number(availableCoils)}</strong><small>Coils currently in stock</small></div>
        <div className="metric-card"><div className="metric-icon orange"><ClipboardCheck size={23} /></div><span>Estimated coil remaining</span><strong>{isPending ? '—' : number(totalKg)} <i>kg</i></strong><small>All unconsumed stock, including assigned coils</small></div>
        <div className="metric-card"><div className="metric-icon red"><Layers3 size={23} /></div><span>Estimated material used</span><strong>{isPending ? '—' : number(producedKg)} <i>kg</i></strong><small>Gross blank weight entered in production</small></div>
      </section>
      <div className="home-grid">
        <section className="content-card recent-card">
          <div className="card-heading"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Recent inward records</h2></div><Link className="text-link" to="/coils">View all <ArrowRight size={16} /></Link></div>
          {recent.length ? <div className="recent-list">{recent.map(coil => <div className="recent-row" key={coil.id}><div className="row-icon"><Boxes size={19} /></div><div className="recent-name"><strong>{coil.invoice || coil.internalId}</strong><span>{MATERIAL_LABELS[coil.materialType] || coil.materialType || 'Coil'} · {coil.grade}</span></div><span className="recent-date">{date(coil.receivedAt)}</span><span className="status-pill">{quantity(coil)} coils</span></div>)}</div> : <div className="empty-state">{isPending ? <LoadingIndicator label="Loading coils…" inline /> : 'No coil records yet. Add the first inward entry to get started.'}</div>}
        </section>
        <section className="content-card quick-card">
          <div className="card-heading"><div><span className="eyebrow">QUICK ACTIONS</span><h2>Pick up where you left off</h2></div></div>
          <Link className="quick-action" to="/production/live"><div className="quick-icon"><Radio size={21} /></div><div><strong>View live production</strong><span>See running machines and produced pieces</span></div><ArrowRight size={17} /></Link>
          <Link className="quick-action" to="/coils/inward"><div className="quick-icon"><CirclePlus size={21} /></div><div><strong>Record coil inward</strong><span>Add received coils to inventory</span></div><ArrowRight size={17} /></Link>
          <Link className="quick-action" to="/coils"><div className="quick-icon"><Boxes size={21} /></div><div><strong>View coil stock</strong><span>Search and review all records</span></div><ArrowRight size={17} /></Link>
        </section>
      </div>
    </>
  )
}

