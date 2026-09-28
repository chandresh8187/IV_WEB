import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fillGasPositionApi, getGasDashboardApi, receiveGasBottlesApi, startGasBottleApi, updateGasPositionWeightApi } from '../../api/gasManagementApi';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import socket from '../../socket/socket';
import './Operations.css';
import './GasManagementScreen.css';

const nowSql = () => {
  const d = new Date(); const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function GasManagementScreen() {
  const navigate = useNavigate(); const user = getStoredUser();
  const canManage = hasPermission(user, 'gas.manage');
  const [data, setData] = useState({ summary: {}, positions: [] });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ bottle_count: '', rate_per_kg: '' });
  const [filledWeight, setFilledWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try { setData((await getGasDashboardApi()).data); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Could not load gas stock.'); }
  }, []);
  useEffect(() => { load(); socket.on('gas_management_updated', load); return () => socket.off('gas_management_updated', load); }, [load]);
  const receive = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await receiveGasBottlesApi({ bottle_count: Number(form.bottle_count), rate_per_kg: Number(form.rate_per_kg) });
      setNotice(result.message); setForm({ bottle_count: '', rate_per_kg: '' }); setDialog(null); await load();
    } catch (e) { setError(e.response?.data?.message || 'Could not save bottle stock.'); }
    finally { setBusy(false); }
  };
  const fill = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await fillGasPositionApi(dialog.position, Number(filledWeight)); setNotice(result.message); setDialog(null); setFilledWeight(''); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Could not place the bottle.'); }
    finally { setBusy(false); }
  };
  const correctWeight = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await updateGasPositionWeightApi(dialog.position, Number(filledWeight)); setNotice(result.message); setDialog(null); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Could not save filled weight.'); }
    finally { setBusy(false); }
  };
  const start = async position => {
    setBusy(true); setError('');
    try { const result = await startGasBottleApi({ position_no: position, started_at: nowSql() }); setNotice(result.message); setDialog(null); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Could not start gas supply.'); }
    finally { setBusy(false); }
  };
  const summary = data.summary || {}; const positions = data.positions || [];
  return <section className="ops-page"><header className="ops-header"><div><h2>Gas Stock</h2><p className="ops-muted">Receive filled bottles, prepare GAS-1 to GAS-4, and start the gas supply.</p></div><div className="ops-actions">{canManage && <button className="ops-button" onClick={() => { setError(''); setDialog({ type: 'receive' }); }}>Add new bottle stock</button>}<button className="ops-button secondary" onClick={() => navigate('/production/gas/movements')}>Gas change movements</button></div></header>
    {error && <div className="ops-error" role="alert">{error}</div>}{notice && <div className="ops-success">{notice}</div>}
    <div className="ops-grid"><div className="ops-metric"><small>Filled bottles in plant</small><strong>{summary.filled_bottles || 0}</strong></div><div className="ops-metric"><small>Unassigned filled bottles</small><strong>{summary.stored_filled_bottles || 0}</strong></div><div className="ops-metric"><small>Current gas rate per kg</small><strong>₹{Number(summary.current_gas_rate || 0).toFixed(2)}</strong></div></div>
    <div className="gas-position-grid">{[1, 2, 3, 4].map(number => {
      const bottle = positions.find(item => Number(item.position_no) === number);
      return <button type="button" key={number} disabled={!canManage} className={`gas-position-card ${bottle?.status === 'running' ? 'running' : ''}`} onClick={() => { setError(''); setFilledWeight(bottle?.filled_weight_kg == null ? '' : String(bottle.filled_weight_kg)); setDialog({ type: 'position', position: number, bottle }); }}>
        <span>GAS-{number}</span><strong>{bottle?.status === 'running' ? 'Running' : bottle?.status === 'ready' ? 'Ready to start' : 'Empty slot'}</strong>
        <small>{bottle ? `${bottle.bottle_code} · Filled weight: ${bottle.filled_weight_kg ?? 'Not set'} kg` : canManage ? 'Click to place a filled bottle' : 'Waiting for filled bottle'}</small>
      </button>;
    })}</div>
    {dialog && <div className="gas-modal-overlay" role="presentation" onMouseDown={() => !busy && setDialog(null)}><div className="gas-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
      {dialog.type === 'receive' ? <form onSubmit={receive}><h3>Add new bottle stock</h3><label>Number of bottles received<input type="number" min="1" max="200" step="1" required value={form.bottle_count} onChange={e => setForm({ ...form, bottle_count: e.target.value })} /></label><label>Rate per kg ₹<input type="number" min="0.01" step="0.01" required value={form.rate_per_kg} onChange={e => setForm({ ...form, rate_per_kg: e.target.value })} /></label><p>Nominal bottle capacity: 425 kg. Price per bottle: ₹{(425 * Number(form.rate_per_kg || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}.</p><div className="ops-actions"><button type="button" className="ops-button secondary" onClick={() => setDialog(null)}>Cancel</button><button className="ops-button" disabled={busy}>{busy ? 'Saving…' : 'Add new bottle stock'}</button></div></form>
      : <div><h3>GAS-{dialog.position}</h3>{dialog.bottle ? <><p>{dialog.bottle.bottle_code} · Status: {dialog.bottle.status}</p><form onSubmit={correctWeight}><label>Filled bottle weight (kg)<input type="number" min="0.001" step="0.001" required value={filledWeight} onChange={e => setFilledWeight(e.target.value)} /></label><button className="ops-button secondary" disabled={busy}>{busy ? 'Saving…' : 'Save filled weight'}</button></form>{dialog.bottle.status === 'ready' && !summary.running_bottle_number && <button className="ops-button" disabled={busy} onClick={() => start(dialog.position)}>{busy ? 'Starting…' : 'Start gas supply'}</button>}</> : <form onSubmit={fill}><p>Place the next unassigned filled bottle in this slot.</p><label>Filled bottle weight (kg)<input type="number" min="0.001" step="0.001" required value={filledWeight} onChange={e => setFilledWeight(e.target.value)} /></label><button className="ops-button" disabled={busy}>{busy ? 'Saving…' : 'Save filled weight'}</button></form>}<div className="ops-actions"><button className="ops-button secondary" onClick={() => setDialog(null)}>Close</button></div></div>}
      {error && <div className="ops-error" role="alert">{error}</div>}
    </div></div>}
  </section>;
}
