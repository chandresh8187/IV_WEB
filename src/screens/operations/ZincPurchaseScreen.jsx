import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, useSearchParams } from 'react-router';
import moment from 'moment';
import { getZincPurchasesApi, getZincStockApi, saveZincPurchaseApi, editZincPurchaseApi, downloadZincPurchaseReportApi } from '../../api/zincStockApi';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/dateTime';
import { downloadResponse } from '../../utils/download';
import socket from '../../socket/socket';
import './Operations.css';
import './ZincPurchaseScreen.css';

const today = () => moment().utcOffset(330).format('YYYY-MM-DD');
const fmt = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const empty = () => ({ transaction_date: today(), transaction_time: '', amount_kg: '', zinc_rate_per_kg: '', batch_number: '', invoice_number: '', note: '' });

export default function ZincPurchaseScreen({ embedded = false }) {
  const [params] = useSearchParams();
  if (!embedded) {
    const next = new URLSearchParams(params); next.set('tab', 'purchases');
    return <Navigate to={`/production/zinc-stock?${next}`} replace />;
  }
  return <ZincPurchaseContent />;
}

function ZincPurchaseContent() {
  const [params, setParams] = useSearchParams();
  const month = params.get('month') || '';
  const filterMonth = value => {
    const next = new URLSearchParams(params);
    next.set('tab', 'purchases');
    if (value) next.set('month', value); else next.delete('month');
    next.delete('add');
    setParams(next, { replace: true });
  };
  const canEdit = hasPermission(getStoredUser(), 'zinc_stock.receive');
  const canPdf = hasPermission(getStoredUser(), 'zinc_stock.report');
  const [purchases, setPurchases] = useState({ data: [], summary: {} });
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const pending = useRef(null);
  const openedAdd = useRef(false);
  const loadVersion = useRef(0);
  const invalidateLoads = useCallback(() => { loadVersion.current += 1; }, []);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const [list, balances] = await Promise.all([getZincPurchasesApi(month ? { month } : {}), getZincStockApi()]);
      if (version !== loadVersion.current) return;
      setPurchases(list); setStock(balances.data); setError('');
    } catch (failure) { if (version === loadVersion.current) setError(failure.response?.data?.message || 'Could not load zinc purchases.'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [month]);
  useEffect(() => { load(); socket.on('zinc_stock_updated', load); return () => { invalidateLoads(); socket.off('zinc_stock_updated', load); }; }, [load, invalidateLoads]);
  const open = useCallback(row => {
    setModal({ id: row?.id || null, purchase_revision: row?.revision || 0, expected_revision: stock?.revision });
    setForm(row ? Object.fromEntries(Object.keys(empty()).map(key => [key, String(row[key] ?? '')])) : empty());
    setFormError(''); pending.current = null;
  }, [stock]);
  useEffect(() => {
    if (params.get('add') === '1' && stock && canEdit && !openedAdd.current) {
      openedAdd.current = true; open(null);
      const next = new URLSearchParams(params); next.delete('add'); setParams(next, { replace: true });
    }
  }, [params, stock, canEdit, open, setParams]);
  useEffect(() => {
    if (!modal) return;
    const close = event => { if (event.key === 'Escape' && !busy) setModal(null); };
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [modal, busy]);
  const save = async event => {
    event.preventDefault(); setFormError(''); setBusy(true);
    const body = { ...form, transaction_time: form.transaction_time || undefined, expected_revision: modal.expected_revision, ...(modal.id ? { purchase_revision: modal.purchase_revision } : {}) };
    const signature = JSON.stringify({ id: modal.id, body });
    if (pending.current?.signature !== signature) pending.current = { signature, body: { ...body, request_id: `zinc_purchase_${Date.now()}_${Math.random().toString(36).slice(2)}` } };
    try {
      const result = modal.id ? await editZincPurchaseApi(modal.id, pending.current.body) : await saveZincPurchaseApi(pending.current.body);
      setModal(null); setSuccess(result.message); pending.current = null; await load();
    } catch (failure) {
      setFormError(failure.response?.data?.message || 'Could not save the purchase.');
      if (failure.response?.status === 409) await load();
    } finally { setBusy(false); }
  };
  const generate = async () => {
    setGenerating(true);
    try { downloadResponse(await downloadZincPurchaseReportApi(month ? { month } : {}), `zinc-purchase-${month || 'all'}.pdf`); }
    catch (failure) { setError(failure.response?.data?.message || 'Could not generate purchase PDF.'); }
    finally { setGenerating(false); }
  };
  const searchText = search.trim().toLowerCase();
  const filteredPurchases = (purchases.data || []).filter(row => !searchText ||
    [row.batch_number, row.invoice_number, row.note, row.actor_name, row.transaction_date,
      formatDisplayDate(row.transaction_date), row.amount_kg, row.zinc_rate_per_kg]
      .some(value => String(value ?? '').toLowerCase().includes(searchText)));
  return <section className="ops-page zinc-tab-panel">

    <div className="zinc-section-heading"><div><h2>Purchases</h2><p className="ops-muted">Zinc received into plant stock</p></div>{canEdit && <button className="ops-button" disabled={!stock?.initialized} onClick={() => open(null)}>＋ Add Purchase</button>}</div>
    {error && <div role="alert" className="ops-error">{error}</div>}{success && <div role="status" className="ops-success">{success}</div>}
    {stock && !stock.initialized && <div className="ops-error">Set opening zinc stock in Settings before adding a purchase.</div>}
    <div className="zinc-hero"><small>TOTAL ZINC PURCHASED</small><strong>{fmt(purchases.summary?.amount_kg)} <span>kg</span></strong><div className="zinc-hero-metrics"><div><small>Purchase value</small><b>₹{fmt(purchases.summary?.purchase_value)}</b></div><div><small>Plant stock</small><b>{fmt(stock?.plant_kg)} kg</b></div></div></div>
    <div className="zinc-filters"><div className="zinc-month-nav"><button className="ops-button secondary" aria-label="Previous month" onClick={() => filterMonth(moment(month ? month + '-01' : today()).subtract(1, 'month').format('YYYY-MM'))}>‹</button><label className="ops-field"><span>{month ? moment(month, 'YYYY-MM').format('MMMM YYYY') : 'All months'}</span><input aria-label="Purchase month" type="month" value={month} onChange={event => filterMonth(event.target.value)}/></label><button className="ops-button secondary" aria-label="Next month" onClick={() => filterMonth(moment(month ? month + '-01' : today()).add(1, 'month').format('YYYY-MM'))}>›</button><button className="zinc-text-button" style={{ visibility: month ? 'visible' : 'hidden' }} disabled={!month} onClick={() => filterMonth('')}>Show all months</button></div><label className="ops-field zinc-search">Search purchases<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search batch, invoice, date or quantity"/></label></div>
    <div className="zinc-section-heading"><h3>{filteredPurchases.length} {filteredPurchases.length === 1 ? 'purchase' : 'purchases'}</h3>{canPdf && <button className="ops-button secondary" disabled={loading || generating} onClick={generate}>{generating ? 'Generating…' : 'Export PDF'}</button>}</div>
    <div className="zinc-results" aria-busy={loading}>{loading && <div className="zinc-loading-status" role="status">Updating records…</div>}
    {loading && !purchases.data?.length ? <div className="ops-card ops-empty">Loading purchases…</div> : filteredPurchases.length ? <div className="zinc-record-grid">{filteredPurchases.map(row => <article className="zinc-record" key={row.id}><div className="zinc-section-heading"><span className="zinc-record-date">{formatDisplayDate(row.transaction_date)}</span>{canEdit && <button className="ops-button secondary" onClick={() => open(row)}>Edit</button>}</div><div className="zinc-record-amounts"><div><strong>{fmt(row.amount_kg)} <span>kg</span></strong><small>₹{fmt(row.zinc_rate_per_kg)} per kg</small></div><div><small>Purchase value</small><b>₹{fmt(Number(row.amount_kg) * Number(row.zinc_rate_per_kg))}</b></div></div><div className="zinc-record-details"><div><small>BATCH NUMBER</small><b>{row.batch_number || '—'}</b></div><div><small>INVOICE NUMBER</small><b>{row.invoice_number || '—'}</b></div></div>{row.note && <p>{row.note}</p>}<footer>Recorded {formatDisplayDateTime(row.created_at)}{Number(row.revision) > 0 ? ' · Edited ' + row.revision + ' time(s)' : ''}</footer></article>)}</div> : <div className="ops-card ops-empty"><h3>{searchText ? 'No matching purchases' : 'No purchases yet'}</h3><p>{searchText ? 'Try another batch, invoice or quantity.' : 'Purchases received in this period will appear here.'}</p></div>}
    </div>
    {modal && createPortal(<div className="zinc-purchase-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setModal(null); }}><section className="zinc-purchase-modal" role="dialog" aria-modal="true" aria-labelledby="zinc-purchase-title"><div className="zinc-section-heading"><h2 id="zinc-purchase-title">{modal.id ? 'Edit purchase' : 'New purchase'}</h2><button type="button" className="ops-button secondary" aria-label="Close purchase form" disabled={busy} onClick={() => setModal(null)}>×</button></div><form onSubmit={save}>
      <p className="ops-muted">Plant stock: {fmt(stock?.plant_kg)} kg. The purchase is included in its selected month.{modal.id ? ' Correcting quantity updates stock by the difference.' : ''}</p>
      <div className="ops-form"><label className="ops-field">Purchase date<input autoFocus type="date" required max={today()} value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} /></label>{[['amount_kg', 'Zinc quantity (kg)', '0.001'], ['zinc_rate_per_kg', 'Zinc rate per kg (₹)', '0.01']].map(([key, label, step]) => <label className="ops-field" key={key}>{label}<input type="number" required min={step} step={step} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}{[['batch_number', 'Batch number'], ['invoice_number', 'Invoice number']].map(([key, label]) => <label className="ops-field" key={key}>{label}<input value={form[key]} maxLength={100} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<label className="ops-field">Note<input value={form.note} maxLength={255} onChange={e => setForm({ ...form, note: e.target.value })} /></label></div>
      {formError && <p className="ops-error" role="alert">{formError}</p>}<div className="ops-actions"><button type="button" className="ops-button secondary" disabled={busy} onClick={() => setModal(null)}>Cancel</button><button type="submit" className="ops-button" disabled={busy}>{busy ? 'Saving…' : 'Save Purchase'}</button></div>
    </form></section></div>, document.body)}
  </section>;
}
