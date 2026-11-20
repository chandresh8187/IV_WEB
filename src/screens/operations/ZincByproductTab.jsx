import { Pencil } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import moment from 'moment';
import { editZincByproductApi, getZincByproductsApi, saveZincByproductApi, downloadZincByproductReportApi } from '../../api/zincStockApi';
import { downloadResponse } from '../../utils/download';
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/dateTime';
import socket from '../../socket/socket';
import './ZincPurchaseScreen.css';
const editRequestId = () => crypto.randomUUID();
const today = () => moment().utcOffset(330).format('YYYY-MM-DD');
const fmt = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const empty = () => ({ transaction_date: today(), ash_weight_kg: '', ash_rate: '', dross_weight_kg: '', dross_rate: '', note: '' });
export default function ZincByproductTab({ stock, canAdd, canReport, onSaved }) {
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ data: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const pending = useRef(null);
  const openEdit = row => { setEditing(row); setForm(Object.fromEntries(Object.keys(empty()).map(key => [key, String(row[key] ?? '')]))); setFormError(''); pending.current = null; setModal(true); };
  const recoveryRate = Number(editing?.zinc_rate_snapshot ?? stock.current_zinc_rate);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    return getZincByproductsApi({ month });
  }, [month]);
  useEffect(() => {
    let active = true;
    const refresh = async () => { setLoading(true); try { const result = await load(); if (active) { setData(result); setError(''); } } catch (failure) { if (active) setError(failure.response?.data?.message || 'Could not load collections.'); } finally { if (active) setLoading(false); } };
    refresh(); socket.on('zinc_byproduct_updated', refresh); socket.on('zinc_stock_updated', refresh);
    return () => { active = false; socket.off('zinc_byproduct_updated', refresh); socket.off('zinc_stock_updated', refresh); };
  }, [load]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = event => { if (event.key === 'Escape' && !busy) setModal(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [modal, busy]);
  const save = async event => {
    event.preventDefault(); setFormError('');
    if (!recoveryRate) return setFormError('Receive zinc with its rate before recording ash and dross.');
    setBusy(true);
    try {
      const body = { ...form, ash_weight_kg: form.ash_weight_kg || 0, ash_rate: form.ash_rate || 0, dross_weight_kg: form.dross_weight_kg || 0, dross_rate: form.dross_rate || 0 };
      let result;
      if (editing) {
        const signature = JSON.stringify(body);
        if (pending.current?.signature !== signature) pending.current = { signature, body: { ...body, edit_version: editing.edit_version, request_id: editRequestId() } };
        result = await editZincByproductApi(editing.id, pending.current.body);
      } else result = await saveZincByproductApi(body);
      setSuccess(result.message); setModal(false);
      const selectedMonth = form.transaction_date.slice(0, 7);
      if (selectedMonth === month) setData(await load()); else setMonth(selectedMonth);
      onSaved();
    } catch (failure) { setFormError(failure.response?.data?.message || 'Could not save collection.'); }
    finally { setBusy(false); }
  };
  const generate = async () => {
    setGenerating(true);
    try { downloadResponse(await downloadZincByproductReportApi({ month }), 'ash-dross-' + month + '.pdf'); }
    catch (failure) { setError(failure.response?.data?.message || 'Could not export PDF.'); }
    finally { setGenerating(false); }
  };
  const rows = (data.data || []).filter(row => [row.transaction_date, formatDisplayDate(row.transaction_date), row.note, row.ash_weight_kg, row.dross_weight_kg, row.recovered_zinc_kg].some(value => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())));
  const round = value => Math.round(value * 100) / 100;
  const ash = round(Number(form.ash_weight_kg || 0) * Number(form.ash_rate || 0));
  const dross = round(Number(form.dross_weight_kg || 0) * Number(form.dross_rate || 0));
  const total = round(ash + dross + round(ash * 0.18) + round(dross * 0.18));
  const recovered = recoveryRate > 0 ? total / recoveryRate : 0;
  return <section className="ops-page zinc-tab-panel">
    <div className="zinc-section-heading"><div><h2>Ash &amp; Dross</h2><p className="ops-muted">Track collections and zinc recovery</p></div>{canAdd && <button className="ops-button" onClick={() => { setEditing(null); pending.current = null; setForm({ ...empty(), transaction_date: month === today().slice(0, 7) ? today() : month + '-01' }); setFormError(''); setModal(true); }}>＋ Add Collection</button>}</div>
    {error && <div className="ops-error" role="alert">{error}</div>}{success && <div className="ops-success" role="status">{success}</div>}
    <div className="zinc-hero"><small>RECOVERED ZINC</small><strong>{fmt(data.summary?.recovered_zinc_kg)} <span>kg</span></strong><div className="zinc-hero-metrics"><div><small>Total ash</small><b>{fmt(data.summary?.ash_weight_kg)} kg</b></div><div><small>Total dross</small><b>{fmt(data.summary?.dross_weight_kg)} kg</b></div><div><small>Value incl. GST</small><b>₹{fmt(data.summary?.total_with_gst)}</b></div></div></div>
    <div className="zinc-filters"><div className="zinc-month-nav"><button className="ops-button secondary" aria-label="Previous month" onClick={() => setMonth(moment(month + '-01').subtract(1, 'month').format('YYYY-MM'))}>‹</button><label className="ops-field"><span>{moment(month, 'YYYY-MM').format('MMMM YYYY')}</span><input aria-label="Collection month" type="month" required value={month} onChange={event => { if (event.target.value) setMonth(event.target.value); }}/></label><button className="ops-button secondary" aria-label="Next month" onClick={() => setMonth(moment(month + '-01').add(1, 'month').format('YYYY-MM'))}>›</button></div><label className="ops-field zinc-search">Search collections<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search date, note or weight"/></label></div>
    <div className="zinc-section-heading"><h3>{rows.length} {rows.length === 1 ? 'entry' : 'entries'}</h3>{canReport && <button className="ops-button secondary" disabled={generating || loading} onClick={generate}>{generating ? 'Generating…' : 'Export PDF'}</button>}</div>
    <div className="zinc-results" aria-busy={loading}>{loading && <div className="zinc-loading-status" role="status">Updating records…</div>}
    {loading && !data.data?.length ? <div className="ops-card ops-empty">Loading collections…</div> : rows.length ? <div className="zinc-record-grid">{rows.map(row => <article key={row.id} className="zinc-record"><div className="zinc-section-heading"><span className="zinc-record-date">{formatDisplayDate(row.transaction_date)}</span>{canAdd && <button className="ops-button secondary zinc-edit-button" aria-label="Edit ash and dross collection" onClick={() => openEdit(row)}><Pencil size={16} aria-hidden="true"/>Edit</button>}</div><div className="zinc-record-amounts"><div><strong>{fmt(row.recovered_zinc_kg)} <span>kg</span></strong><small>Recovered zinc</small></div><div><b>₹{fmt(row.total_with_gst)}</b><small>Value incl. GST</small></div></div><div className="zinc-record-details">{[['Ash', row.ash_weight_kg, row.ash_rate], ['Dross', row.dross_weight_kg, row.dross_rate]].map(([label, weight, rate]) => <div key={label}><small>{label}</small><b>{fmt(weight)} kg</b><small>₹{fmt(rate)} / kg</small></div>)}</div>{row.note && <p>{row.note}</p>}<footer>Zinc rate ₹{fmt(row.zinc_rate_snapshot)} / kg · {row.actor_name || 'User'}<br/>Recorded {formatDisplayDateTime(row.created_at)}</footer></article>)}</div> : <div className="ops-card ops-empty"><h3>{search.trim() ? 'No matching entries' : 'No collections this month'}</h3><p>{search.trim() ? 'Try another date, note or weight.' : 'Add ash, dross or both to record recovery.'}</p></div>}
    </div>
    {modal && createPortal(<div className="zinc-purchase-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setModal(false); }}><section className="zinc-purchase-modal" role="dialog" aria-modal="true" aria-labelledby="collection-title"><div className="zinc-section-heading"><div><h2 id="collection-title">{editing ? 'Edit collection' : 'New collection'}</h2><p className="ops-muted">Add ash, dross or both</p></div><button className="ops-button secondary" aria-label="Close collection form" disabled={busy} onClick={() => setModal(false)}>×</button></div><form onSubmit={save}><label className="ops-field">Collection date<input autoFocus type="date" required max={today()} value={form.transaction_date} onChange={event => setForm({ ...form, transaction_date: event.target.value })}/></label><p className="ops-muted">Recovery is credited to {moment(form.transaction_date).format('MMMM YYYY')}. {editing ? 'Original zinc rate' : 'Current zinc rate'}: ₹{fmt(recoveryRate)} / kg.</p><div className="ops-form">{[['ash_weight_kg', 'Ash weight (kg)', '0.001'], ['ash_rate', 'Ash sell rate / kg', '0.01'], ['dross_weight_kg', 'Dross weight (kg)', '0.001'], ['dross_rate', 'Dross sell rate / kg', '0.01']].map(([key, label, step]) => <label key={key} className="ops-field">{label}<input type="number" min="0" step={step} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })}/></label>)}<label className="ops-field">Note (optional)<textarea maxLength={255} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })}/></label></div><div className="zinc-record-details"><div><small>Total with 18% GST</small><b>₹{fmt(total)}</b></div><div><small>Recovered zinc</small><b>{fmt(recovered)} kg</b></div></div>{formError && <p className="ops-error" role="alert">{formError}</p>}<div className="ops-actions"><button type="button" className="ops-button secondary" disabled={busy} onClick={() => setModal(false)}>Cancel</button><button className="ops-button" disabled={busy}>{busy ? 'Saving…' : 'Save collection'}</button></div></form></section></div>, document.body)}
  </section>;
}
