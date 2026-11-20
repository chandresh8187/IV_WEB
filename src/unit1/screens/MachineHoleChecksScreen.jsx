import HoleInspectionCards from '../components/HoleInspectionCards'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { FileText } from 'lucide-react'
import LoadingIndicator from '../../components/LoadingIndicator'
import { getMachineHoleChecks, getMachineHoleChecksPdf } from '../api/productionApi'
import { todayIso } from '../utils/dateTime'
import './MachineHoleChecksScreen.css'

export default function MachineHoleChecksScreen() {
  const { machineId } = useParams()
  const navigate = useNavigate()
  const user = useSelector(state => state.auth.user)
  const [date, setDate] = useState(todayIso), [page, setPage] = useState(1)
  const [generating, setGenerating] = useState(false), [message, setMessage] = useState('')
  const allowed = user?.role !== 'labour'
  const report = useQuery({ queryKey: ['unit1-hole-reports', machineId, date, page], queryFn: () => getMachineHoleChecks(machineId, date, page), enabled: allowed && Boolean(date), refetchInterval: 10000 })
  const generate = async () => {
    setGenerating(true); setMessage('')
    try {
      const blob = await getMachineHoleChecksPdf(machineId, date)
      navigate(`/production/live/${machineId}/hole-checks/preview`, { state: { blob, filename: `unit1-hole-checks-${machineId}-${date}.pdf` } })
    } catch (error) {
      let detail = error.message
      if (error.response?.data instanceof Blob) { try { detail = JSON.parse(await error.response.data.text()).error || detail } catch { /* Use transport error. */ } }
      setMessage(detail || 'Could not generate PDF.')
    } finally { setGenerating(false) }
  }
  if (!allowed) return <div className="notice error">Hole inspection reports are unavailable for your role.</div>
  return <section className="hole-report-page">

    <div className="page-heading"><div><strong className="page-context">{report.data?.machine.name || 'Machine'} · Hole checks</strong></div><div className="live-heading-actions"><button type="button" className="primary-button" disabled={generating || !report.data?.total || report.isFetching} onClick={generate}><FileText size={16} />{generating ? 'Creating…' : 'Generate PDF'}</button></div></div>
    <div className="hole-report-toolbar"><label>Inspection date<input type="date" required value={date} onChange={event => { setDate(event.target.value); setPage(1) }} /></label><span>{report.data?.total ?? 0} inspections</span></div>
    {message && <div className="notice" role="status">{message}</div>}
    {report.isPending && date && <LoadingIndicator label="Loading inspections…" />}
    {report.isError && <div className="notice error" role="alert">{report.error?.response?.data?.error || report.error?.message}<button className="text-link" onClick={() => report.refetch()} type="button">Retry</button></div>}
    {!date && <p>Select an inspection date.</p>}
    <HoleInspectionCards checks={report.data?.checks} />
    {report.data?.total === 0 && <div className="content-card live-loading">No inspections recorded on this date.</div>}
    {report.data && report.data.total > report.data.pageSize && <nav className="hole-report-pagination" aria-label="Inspection pages"><button type="button" className="outline-button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(report.data.total / report.data.pageSize)}</span><button type="button" className="outline-button" disabled={page * report.data.pageSize >= report.data.total} onClick={() => setPage(page + 1)}>Next</button></nav>}
    <p className="hole-report-note">Deviation = measured − target. No pass/fail tolerance has been configured.</p>
  </section>
}
