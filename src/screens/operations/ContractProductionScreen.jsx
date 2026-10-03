import { useEffect, useMemo, useState } from 'react';
import { getContractProductionApi } from '../../api/contractorApi';
import { getCurrentFinancialYearApi } from '../../api/financialYearsApi';
import { currentPlantMonthNumber } from '../../utils/dateTime';
import './Operations.css';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const plantMonth = currentPlantMonthNumber;
const fmt = (value, digits = 2) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: digits });

export default function ContractProductionScreen() {
  const [year, setYear] = useState(null);
  const [month, setMonth] = useState(plantMonth);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState('kg');

  const options = useMemo(() => {
    if (!year?.start_date) return [];
    const start = Number(String(year.start_date).slice(0, 4));
    return Array.from({ length: 12 }, (_, index) => {
      const value = ((index + 3) % 12) + 1;
      return { value, label: `${months[value - 1]} ${start + (value < 4 ? 1 : 0)}` };
    });
  }, [year]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const currentYear = (await getCurrentFinancialYearApi()).data;
        const result = (await getContractProductionApi({ month: plantMonth(), financial_year_id: currentYear.id })).data;
        if (active) { setYear(currentYear); setData(result); }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Could not load contract production.');
      } finally {
        if (active) setLoading(false);
      }
    };
    initialize();
    return () => { active = false; };
  }, []);

  const fetchProduction = async selected => {
    if (!year) return;
    setLoading(true);
    setError('');
    try {
      setData((await getContractProductionApi({ month: selected, financial_year_id: year.id })).data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load contract production.');
    } finally {
      setLoading(false);
    }
  };

  const weight = value => unit === 't' ? `${fmt(Number(value) / 1000, 3)} t` : `${fmt(value, 3)} kg`;
  const metrics = value => <div className="ops-grid">
    <div className="ops-metric"><small>MS production</small><strong>{weight(value?.ms_kg)}</strong></div>
    <div className="ops-metric"><small>GI production</small><strong>{weight(value?.gi_kg)}</strong></div>
    <div className="ops-metric"><small>Quantity</small><strong>{fmt(value?.qty, 0)} NOS</strong></div>
  </div>;

  return <section className="ops-page">
    <header className="ops-header">
      <div><h2>Contract Production</h2><p className="ops-muted">Financial year {year?.financial_year || '—'}</p></div>
      <div className="ops-actions">
        <select aria-label="Production month" value={month} onChange={event => setMonth(Number(event.target.value))}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <button className="ops-button" disabled={!year || loading} onClick={() => fetchProduction(month)}>Fetch production</button>
        <button className="ops-button secondary" onClick={() => setUnit(unit === 'kg' ? 't' : 'kg')}>Show {unit === 'kg' ? 'tonnes' : 'kg'}</button>
      </div>
    </header>
    {error && <div className="ops-error" role="alert">{error}</div>}
    {loading ? <div className="ops-card">Loading production…</div> : data && <>
      <div className="ops-card"><h3>All contractors · Monthly total</h3>{metrics(data.totals)}</div>
      {data.summaries?.map(row => <div className="ops-card" key={row.contractor_id}><h3>{row.contractor_name}</h3>{metrics(row)}</div>)}
      {!data.summaries?.length && <div className="ops-card ops-empty">No contractors added yet. Add contractors in Settings.</div>}
      {data.summaries?.length > 0 && Number(data.totals?.entry_count) === 0 && <div className="ops-card ops-empty">No contractor production recorded for this month.</div>}
    </>}
  </section>;
}
