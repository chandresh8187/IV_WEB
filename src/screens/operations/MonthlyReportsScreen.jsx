import { useEffect, useMemo, useState } from 'react';
import { getFinancialYearsApi } from '../../api/financialYearsApi';
import { downloadDailyProductionReportApi, downloadMonthlyReportApi, getMonthlyReportApi } from '../../api/monthlyReportApi';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import { downloadResponse } from '../../utils/download';
import { currentPlantMonthNumber, formatDisplayDate } from '../../utils/dateTime';
import './Operations.css';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentIndiaMonth = currentPlantMonthNumber();
const num = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const money = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const title = value => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function Grid({ items }) {
  return <div className="ops-grid">{items.map(([label, value]) => <div className="ops-metric" key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>;
}

function List({ heading, rows = [], name }) {
  return <div className="ops-card"><h3>{heading}</h3>{rows.length ? rows.map((row, index) => <div className="ops-list-row" key={`${row[name]}:${index}`}><b>{row[name] || 'Unspecified'}</b><span>{num(row.ms_kg)} kg MS</span></div>) : <span className="ops-muted">No records this month.</span>}</div>;
}

export default function MonthlyReportsScreen() {
  const canPdf = hasPermission(getStoredUser(), 'monthly_reports.report');
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState('');
  const [month, setMonth] = useState(currentIndiaMonth);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getFinancialYearsApi().then(response => {
      const list = response.data || [];
      setYears(list);
      setYearId(String(list.find(year => year.is_current)?.id || list[0]?.id || ''));
    }).catch(requestError => setError(requestError.response?.data?.message || 'Could not load financial years.'))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => years.find(year => String(year.id) === String(yearId)), [years, yearId]);
  const monthOptions = useMemo(() => {
    const startYear = Number(String(selected?.start_date || selected?.financial_year || '').slice(0, 4));
    if (!Number.isInteger(startYear) || startYear < 2000) return [];
    return Array.from({ length: 12 }, (_, index) => {
      const value = ((index + 3) % 12) + 1;
      return { value, label: `${months[value - 1]} ${startYear + (value < 4 ? 1 : 0)}` };
    });
  }, [selected]);

  const fetchReport = async () => {
    if (!yearId) return;
    setLoading(true);
    setError('');
    try {
      setReport((await getMonthlyReportApi({ month, financial_year_id: yearId })).data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load monthly report.');
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async daily => {
    setGenerating(true);
    setError('');
    try {
      const response = daily
        ? await downloadDailyProductionReportApi({ month, financial_year_id: yearId })
        : await downloadMonthlyReportApi({ month, financial_year_id: yearId });
      downloadResponse(response, `${daily ? 'daily-production' : 'monthly-report'}-${yearId}-${month}.pdf`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not generate PDF.');
    } finally {
      setGenerating(false);
    }
  };

  return <section className="ops-page">
    <header className="ops-header"><div><h2>Monthly Reports</h2><p className="ops-muted">Production, zinc, ash and dross, planning, contractor and expense history.</p></div>
      <div className="ops-actions">
        <select aria-label="Financial year" value={yearId} onChange={event => { setYearId(event.target.value); setReport(null); }}>{years.map(year => <option key={year.id} value={year.id}>{year.financial_year}</option>)}</select>
        <select aria-label="Report month" value={month} onChange={event => { setMonth(Number(event.target.value)); setReport(null); }}>{monthOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <button className="ops-button" onClick={fetchReport}>View report</button>
        {report && canPdf && <><button className="ops-button secondary" disabled={generating} onClick={() => generatePdf(true)}>Daily Production PDF</button><button className="ops-button secondary" disabled={generating} onClick={() => generatePdf(false)}>Complete Monthly PDF</button></>}
      </div>
    </header>
    {error && <div className="ops-error" role="alert">{error}</div>}
    {loading && <div className="ops-card">Loading…</div>}
    {report && <>
      <div className="ops-hero"><small>{report.period.label.toUpperCase()}</small><strong>{num(report.production.total_ms_kg / 1000)} ton</strong><span>MS production · {num(report.production.zinc_consumption_percent)}% zinc consumption after recovery</span></div>
      <div className="ops-card"><h3>Production</h3><Grid items={[["MS production", `${num(report.production.total_ms_kg)} kg`], ["GI production", `${num(report.production.total_gi_kg)} kg`], ["Zinc used", `${num(report.production.net_zinc_kg)} kg`], ["Production days", num(report.production.production_days)], ["Entries", num(report.production.entry_count)], ["Quantity", `${num(report.production.quantity)} NOS`]]} /></div>
      <div className="ops-card"><h3>Zinc Stock</h3><Grid items={[["Opening plant", `${num(report.zinc.opening_plant_kg)} kg`], ["Opening kettle", `${num(report.zinc.opening_kettle_kg)} kg`], ["Purchased zinc", `${num(report.zinc.received_kg)} kg`], ["Added to kettle", `${num(report.zinc.transferred_to_kettle_kg)} kg`], ["Production use", `${num(report.zinc.production_used_kg)} kg`], ["Closing plant", `${num(report.zinc.closing_plant_kg)} kg`], ["Closing kettle", `${num(report.zinc.closing_kettle_kg)} kg`], ["Stock corrections", num(report.zinc.corrections)]]} /></div>
      <div className="ops-card"><h3>Ash &amp; Dross</h3><Grid items={[["Ash collected", `${num(report.byproducts.ash_weight_kg)} kg`], ["Dross collected", `${num(report.byproducts.dross_weight_kg)} kg`], ["Recovered zinc", `${num(report.byproducts.recovered_zinc_kg)} kg`], ["Value with GST", `₹${money(report.byproducts.total_with_gst)}`]]} /></div>
      <div className="ops-card"><h3>Expense &amp; Plant Cost</h3><Grid items={[["Total expense", `₹${money(report.expenses.totals.total_expense)}`], ["Running plant cost", `₹${money(report.expenses.totals.running_plant_cost)}/kg`], ["Average production/day", `${num(report.expenses.totals.average_ms_production_per_day_kg / 1000)} ton`]]} /></div>
      <div className="ops-card"><h3>Expense Breakdown</h3>{Object.entries(report.expenses.expenses || {}).map(([key, value]) => <div className="ops-list-row" key={key}><span>{title(key)}</span><strong>₹{money(value)}</strong></div>)}</div>
      <List heading="Shift Production" rows={report.shifts} name="shift_name" />
      <List heading="Material Production" rows={report.materials} name="material" />
      <List heading="Contractor Production" rows={report.contractors} name="contractor_name" />
      <div className="ops-card"><h3>Date-wise production</h3>{report.daily_production?.length ? report.daily_production.map(day => <div className="ops-list-row" key={day.production_date}><span><strong>{formatDisplayDate(day.production_date)}</strong><br /><small>Day {num(day.day_ms_kg)} kg · Night {num(day.night_ms_kg)} kg</small></span><strong>{num(day.total_ms_kg)} kg</strong></div>) : <span className="ops-muted">No production recorded this month.</span>}</div>
      <div className="ops-card"><h3>Planning ({report.planning?.length || 0})</h3>{report.planning?.length ? report.planning.map(item => <div className="ops-list-row" key={item.id}><span><strong>{item.challan_no || 'Challan'} · {item.party_name}</strong><br /><small>{item.material_description}</small></span><strong>{num(item.produced_qty)} / {num(item.planned_qty)} NOS</strong></div>) : <span className="ops-muted">No planning activity for this month.</span>}</div>
    </>}
  </section>;
}
