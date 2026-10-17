import LoadingIndicator from "../../components/LoadingIndicator";
import { hasAccess } from '../utils/access'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { QrCode, TriangleAlert } from 'lucide-react'
import { getScannedCoil } from '../api/coilApi'
import { MATERIAL_LABELS } from '../data/materialGrades'
import PageBack from '../components/PageBack'
import { formatDate } from '../utils/dateTime'

const roleLabels = { superadmin: 'Superadmin', plant_manager: 'Plant manager', admin: 'Admin', supervisor: 'Supervisor', labour: 'Labour' }

function displayValue(field) {
  if (field.value == null || field.value === '') return '—'
  if (field.key === 'materialType') return MATERIAL_LABELS[field.value] || field.value
  if (['totalWeightKg', 'perCoilWeightKg'].includes(field.key)) return `${Number(field.value).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`
  if (field.key === 'receivedAt' || field.key === 'invoiceDate') return formatDate(field.value)
  return String(field.value)
}

export default function CoilScanScreen() {
  const { internalId, coilNumber } = useParams()
  const user = useSelector(state => state.auth.user)
  const canOperate = hasAccess(user, 'unit1.production.coil.assign')
  const scanQuery = useQuery({ queryKey: ['coil-scan', internalId, coilNumber], queryFn: () => getScannedCoil(internalId, coilNumber) })
  const scan = scanQuery.data

  return <section className="coil-scan-page">
    <PageBack to="/" current="Coil scan">Home</PageBack>
    <div className="page-heading"><div><span className="eyebrow">QR SCAN</span><h1>Coil details</h1><p>Details available to your role for this coil.</p></div></div>
    {scanQuery.isPending && <LoadingIndicator label="Loading scanned coil…" />}
    {scanQuery.isError && <div className="notice error" role="alert"><TriangleAlert size={18} /> {scanQuery.error?.response?.data?.error || scanQuery.error?.response?.data?.message || 'Could not open this coil QR code.'}</div>}
    {scan && <div className="content-card scan-card"><div className="scan-summary"><div className="settings-card-icon"><QrCode size={23} /></div><div><span>COIL IDENTITY</span><h2>Coil {scan.coilNumber} of {scan.coilQty}</h2><p>{scan.reference}</p></div><small>{roleLabels[scan.role] || scan.role} view</small></div><div className="scan-fields">{scan.fields.length ? scan.fields.map(field => <div className="scan-field" key={field.key}><span>{field.label}</span><strong>{displayValue(field)}</strong></div>) : <p>No additional fields are enabled for your role.</p>}</div>{canOperate && <Link className="primary-button scan-start-link" to={`/production/live?coilId=${scan.coilId}&coilNumber=${scan.coilNumber}`}>Start production with this coil</Link>}</div>}
  </section>
}
