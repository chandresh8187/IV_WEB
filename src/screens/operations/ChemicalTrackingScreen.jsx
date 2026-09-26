import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadChemicalChecksReportApi, getChemicalChecksApi, saveChemicalCheckApi } from '../../api/chemicalChecksApi';
import { downloadResponse } from '../../utils/download';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import './Operations.css';
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/dateTime';

const pad = value => String(value).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const currentMonth = () => today().slice(0, 7);
const monthLabel = value => new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const reading = value => value == null || value === '' ? '—' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 4 });
const emptyForm = () => ({ inspection_date: today(), flux_ph: '', flux_density: '', flux_temperature_c: '', acid_ph: '', acid_density: '', note: '' });

export default function ChemicalTrackingScreen() {
  const user = getStoredUser();
  const canManage = hasPermission(user, 'chemical_checks.manage');
  const canReport = hasPermission(user, 'chemical_checks.report');
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fields = useMemo(() => [
    { key: 'acid_ph', label: 'Acid pH', required: '-1.0 to -1.5 pH' },
    { key: 'acid_density', label: 'Acid density', required: '1.83–1.84 g/cm³' },
    { key: 'flux_ph', label: 'Flux pH', required: '4–5 pH' },
    { key: 'flux_density', label: 'Flux density', required: '1.2–1.5 g/cm³' },
    { key: 'flux_temperature_c', label: 'Flux temperature', required: '65–71 °C' },
  ], []);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await getChemicalChecksApi({ month })).data || []); }
    catch (failure) { setError(failure.response?.data?.message || 'Could not load chemical checks.'); }
    finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);
  const save = async event => {
    event.preventDefault(); setError(''); setSuccess('');
    if (fields.some(({ key }) => form[key] === '' || !Number.isFinite(Number(form[key])))) return setError('Enter all pH, density, and flux temperature readings.');
    setSaving(true);
    try {
      const response = await saveChemicalCheckApi({ ...form, ...Object.fromEntries(fields.map(({ key }) => [key, Number(form[key])])) });
      setSuccess(response.message || 'Chemical check saved.'); setForm(emptyForm());
      if (form.inspection_date.slice(0, 7) !== month) setMonth(form.inspection_date.slice(0, 7)); else await load();
    } catch (failure) { setError(failure.response?.data?.message || 'Could not save chemical check.'); }
    finally { setSaving(false); }
  };
  const pdf = async () => {
    setGenerating(true); setError('');
    try { downloadResponse(await downloadChemicalChecksReportApi({ month }), `chemical-checks-${month}.pdf`); }
    catch (failure) { setError(failure.response?.data?.message || 'Could not generate PDF.'); }
    finally { setGenerating(false); }
  };
  return <section className="ops-page">
    <header className="ops-header"><div><h2>Chemical Tracking</h2><p className="ops-muted">Daily flux temperature and flux and acid pH and density checks</p></div><div className="ops-actions"><label className="ops-field">Report month<input type="month" max={currentMonth()} value={month} onChange={event => setMonth(event.target.value)} /></label>{canReport && <button className="ops-button" disabled={generating} onClick={pdf}>{generating ? 'Generating…' : 'Generate PDF'}</button>}</div></header>
    {error && <div className="ops-error">{error}</div>}{success && <div className="ops-success">{success}</div>}
    {canManage && <form className="ops-card" onSubmit={save}><h3>Add daily check</h3><div className="ops-info" role="note"><strong>Required operating parameters</strong><span>These ranges are guidance; record the actual measured values.</span></div><div className="ops-form"><label className="ops-field">Inspection date<input type="date" max={today()} required value={form.inspection_date} onChange={event => setForm({ ...form, inspection_date: event.target.value })} /></label><label className="ops-field">Note<textarea maxLength="255" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></label></div><div className="chemical-parameter-grid">{fields.map(({ key, label, required }) => { const temperature = key === 'flux_temperature_c'; const ph = key.endsWith('_ph'); return <label className="chemical-parameter" key={key}><span>{label}</span><small>Required: {required}</small><input type="number" min={temperature ? '-50' : key === 'acid_ph' ? '-14' : ph ? '0' : '0.0001'} max={temperature ? '200' : ph ? '14' : '10'} step="0.001" required value={form[key]} placeholder={`Enter ${label.toLowerCase()}`} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>; })}</div><button className="ops-button" disabled={saving}>{saving ? 'Saving…' : 'Save chemical check'}</button></form>}
    <div className="ops-card"><div className="ops-header"><div><h3>Daily entries</h3><p className="ops-muted">{monthLabel(month)} · {rows.length} check{rows.length === 1 ? '' : 's'}</p></div><button className="ops-button secondary" onClick={load}>Refresh</button></div>{loading ? <div className="ops-empty">Loading…</div> : rows.length ? <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Date</th><th>Flux pH</th><th>Flux density</th><th>Flux temperature</th><th>Acid pH</th><th>Acid density</th><th>Checked by</th><th>Checked at</th><th>Note</th></tr></thead><tbody>{rows.map(item => <tr key={item.id}><td>{formatDisplayDate(item.inspection_date)}</td><td>{reading(item.flux_ph)}</td><td>{reading(item.flux_density)} g/cm³</td><td>{item.flux_temperature_c == null ? '—' : `${reading(item.flux_temperature_c)} °C`}</td><td>{reading(item.acid_ph)}</td><td>{reading(item.acid_density)} g/cm³</td><td>{item.checked_by_name}</td><td>{formatDisplayDateTime(item.created_at)}</td><td>{item.note || '—'}</td></tr>)}</tbody></table></div> : <div className="ops-empty">No chemical checks recorded for this month.</div>}</div>
  </section>;
}
