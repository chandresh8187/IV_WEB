import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import LoadingIndicator from '../../components/LoadingIndicator';
import ZincTransactionTable from '../../components/ZincTransactionTable';
import { getMonthlyReportApi, downloadMonthlyDetailReportApi } from '../../api/monthlyReportApi';
import { downloadResponse } from '../../utils/download';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import socket from '../../socket/socket';
import './Operations.css';

const titles = { purchases: 'Zinc Purchase', zinc: 'Zinc Transactions', planning: 'Plannings', materials: 'Material Productions' };
const num = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export default function MonthlyReportDetailScreen() {
  const { type } = useParams();
  const [params] = useSearchParams();
  const month = Number(params.get('month'));
  const yearId = params.get('financial_year_id');
  const valid = Object.hasOwn(titles, type) && Number.isInteger(month) && month >= 1 && month <= 12 && Number(yearId) > 0;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const canPdf = hasPermission(getStoredUser(), 'monthly_reports.report');
  const query = new URLSearchParams({ month: String(month), financial_year_id: yearId || '' }).toString();
  useEffect(() => {
    if (!valid) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setReport(null);
      setError('');
      try {
        const result = await getMonthlyReportApi({ month, financial_year_id: yearId });
        if (active) setReport(result.data);
      } catch (failure) {
        if (active) setError(failure.response?.data?.message || 'Could not load the monthly list.');
      } finally { if (active) setLoading(false); }
    };
    load();
    const events = ['zinc_byproduct_updated', 'zinc_stock_updated', 'production_updated', 'production_planning_updated'];
    events.forEach(event => socket.on(event, load));
    return () => { active = false; events.forEach(event => socket.off(event, load)); };
  }, [valid, month, yearId]);
  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      downloadResponse(await downloadMonthlyDetailReportApi(type, { month, financial_year_id: yearId }), `monthly-${type}-${yearId}-${month}.pdf`);
    } catch (failure) { setError(failure.response?.data?.message || 'Could not generate this PDF.'); }
    finally { setGenerating(false); }
  };
  if (!valid) return <section className="ops-page"><Link to="/production/monthly-reports">Back to Monthly Reports</Link><div className="ops-error">Select a list from Monthly Reports.</div></section>;
  return <section className="ops-page">
    <header className="ops-header"><div><Link to={`/production/monthly-reports?${query}`}>Back to Monthly Reports</Link><h2>{titles[type]}</h2><p className="ops-muted">{report ? `${report.period.label} · Financial year ${report.financial_year.name}` : 'Monthly report'}</p></div>
      {canPdf && <button className="ops-button" disabled={!report || loading || generating} onClick={generate}>{generating ? 'Generating…' : `Generate ${titles[type]} PDF`}</button>}
    </header>
    {error && <div className="ops-error" role="alert">{error}</div>}
    {loading ? <LoadingIndicator label="Loading report…" /> : report && <div className="ops-card">
      {type === 'zinc' && <><Link className="ops-button secondary" to={`/production/monthly-reports/purchases?${query}`}>Zinc Purchase</Link><ZincTransactionTable rows={report.zinc_movements || []} /></>}
      {type === 'purchases' && <>{hasPermission(getStoredUser(), 'zinc_stock.view') && <Link className="ops-button secondary" to={`/production/zinc-stock?tab=purchases&month=${report.period.from.slice(0,7)}`}>Manage Zinc Purchases</Link>}<ZincTransactionTable rows={report.zinc_purchases || []} /></>}
      {type === 'planning' && <><h3>Plannings ({report.planning?.length || 0})</h3>{report.planning?.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Challan</th><th>Party</th><th>Material</th><th>Planned (NOS)</th><th>Produced (NOS)</th><th>Status</th></tr></thead><tbody>{report.planning.map(row => <tr key={row.id}><td>{row.challan_no || '—'}</td><td>{row.party_name || '—'}</td><td>{row.material_description || '—'}</td><td>{num(row.planned_qty)}</td><td>{num(row.produced_qty)}</td><td>{row.status || '—'}</td></tr>)}</tbody></table></div> : <p className="ops-empty">No planning activity for this month.</p>}</>}
      {type === 'materials' && <><h3>Material Productions ({report.materials?.length || 0})</h3>{report.materials?.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Material</th><th>Entries</th><th>Quantity (NOS)</th><th>MS (kg)</th><th>GI (kg)</th></tr></thead><tbody>{report.materials.map((row, index) => <tr key={`${row.material}-${index}`}><td>{row.material || 'Unspecified'}</td><td>{num(row.entry_count)}</td><td>{num(row.quantity)}</td><td>{num(row.ms_kg)}</td><td>{num(row.gi_kg)}</td></tr>)}</tbody></table></div> : <p className="ops-empty">No material production for this month.</p>}</>}
    </div>}
  </section>;
}
