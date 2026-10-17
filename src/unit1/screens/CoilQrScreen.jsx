import LoadingIndicator from "../../components/LoadingIndicator";
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Printer, TriangleAlert } from 'lucide-react'
import { getCoil } from '../api/coilApi'
import { MATERIAL_LABELS } from '../data/materialGrades'
import { coilQrPayload } from '../data/coilQr'
import { allocatedCoilWeightKg } from '../data/coilWeight'
import PageBack from '../components/PageBack'

export default function CoilQrScreen() {
  const { id } = useParams()
  const [coilNumber, setCoilNumber] = useState(1)
  const coilQuery = useQuery({ queryKey: ['coil', id], queryFn: () => getCoil(id) })
  const coil = coilQuery.data
  const count = Math.max(1, Number(coil?.coilQty) || 1)
  const selectedNumber = Math.min(coilNumber, count)
  const appUrl = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim()
    || `${window.location.origin}/unit1`
  const payload = coil?.qrGeneratedAt && coil.internalId ? coilQrPayload(coil.internalId, selectedNumber, appUrl) : ''
  const coilWeight = coil ? allocatedCoilWeightKg(coil.totalWeightKg ?? coil.actualNetKg, count, selectedNumber) : null
  const qrQuery = useQuery({
    queryKey: ['coil-qr', payload],
    queryFn: () => QRCode.toDataURL(payload, { width: 480, margin: 2, errorCorrectionLevel: 'M' }),
    enabled: Boolean(payload),
  })

  return <section className="coil-qr-page">
    <PageBack to={`/coils/${id}/usage`} current="QR labels">Invoice details</PageBack>
    <div className="page-heading"><div><span className="eyebrow">COIL STOCK</span><h1>QR labels</h1><p>Each physical coil has its own stable QR identity.</p></div></div>
    {coilQuery.isPending && <LoadingIndicator label="Loading coil…" />}
    {coilQuery.isError && <div className="notice error" role="alert"><TriangleAlert size={18} /> {coilQuery.error?.response?.data?.error || 'Could not load this coil.'}</div>}
    {coil && !coil.qrGeneratedAt && <div className="content-card qr-page-card">QR labels have not been generated for this stock entry. <Link to={`/coils/${id}/usage`}>Return to invoice details</Link> to generate them.</div>}
    {coil?.qrGeneratedAt && <div className="content-card qr-page-card">
      <div className="qr-controls"><div><strong>{coil.invoice || coil.internalId}</strong><span>{MATERIAL_LABELS[coil.materialType] || coil.materialType || 'Coil'} · {coil.grade} · {count.toLocaleString('en-IN')} {count === 1 ? 'coil' : 'coils'}</span></div><label>Coil number <input type="number" min="1" max={count} step="1" value={selectedNumber} onChange={event => setCoilNumber(Math.min(count, Math.max(1, Number(event.target.value) || 1)))} /></label><button className="primary-button" type="button" onClick={() => window.print()} disabled={!qrQuery.data}><Printer size={17} /> Print QR</button></div>
      <div className="qr-preview"><div className="qr-print-label"><div className="qr-label-brand">IVS1 PRODUCTION · COIL STOCK</div><div className="qr-label-title">Coil {selectedNumber} of {count}</div>{qrQuery.data ? <img src={qrQuery.data} alt={`QR code for coil ${selectedNumber} of ${count}`} /> : <div className="qr-loading">Generating QR code…</div>}<div className="qr-label-details"><strong>{MATERIAL_LABELS[coil.materialType] || coil.materialType || 'Coil'} · {coil.grade}</strong><span>Calculated weight: {coilWeight?.toFixed(3) ?? '—'} kg</span><span>Invoice: {coil.invoice || '—'}</span><span>ID: {coil.internalId}</span></div></div></div>
      {qrQuery.isError && <div className="notice error" role="alert">Could not generate the QR code.</div>}
      <p className="qr-help">Choose a coil number, then print its QR code. Only the QR image is printed. Scanning opens the role-based coil view.</p>
    </div>}
  </section>
}
