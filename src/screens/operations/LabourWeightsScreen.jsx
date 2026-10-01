import { useCallback, useEffect, useState } from 'react';
import './Operations.css';
import './LabourWeightsScreen.css';
import { getLabourWeightsApi, getLabourWeightModeApi, setLabourWeightModeApi, saveLabourWeightApi, toggleLabourTimerApi } from '../../api/labourWeightsApi';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import socket from '../../socket/socket';

const TIMERS = [['pickling', 'Pickling'], ['flux', 'Flux'], ['hot_drier', 'Hot drier'], ['zinc_kettle', 'Zinc kettle']];
const MODES = [['manual', 'Manual weight'], ['auto', 'Auto weight'], ['selection', 'Selection weight']];
const formatDuration = value => {
  if (value == null) return '—';
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours && `${hours}h`, minutes && `${minutes}m`, `${seconds % 60}s`].filter(Boolean).join(' ');
};

export default function LabourWeightsScreen() {
  const user = getStoredUser();
  const role = String(user?.role || '').toLowerCase();
  const canAdd = hasPermission(user, 'labour_weights.create');
  const canEdit = hasPermission(user, 'labour_weights.edit') && ['supervisor', 'superadmin'].includes(role);
  const [entries, setEntries] = useState([]);
  const [mode, setMode] = useState('manual');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [ms, setMs] = useState('');
  const [qty, setQty] = useState('');
  const [timerBusy, setTimerBusy] = useState('');
  const [now, setNow] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try { setEntries((await getLabourWeightsApi()).data || []); }
    catch (e) { setError(e?.response?.data?.message || 'Could not load weights.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (role !== 'labour') getLabourWeightModeApi().then(result => setMode(result?.data?.mode || 'manual')).catch(() => {}); }, [role]);
  useEffect(() => { const refreshMode = event => setMode(event?.mode || 'manual'); socket.on('labour_weight_mode_changed', refreshMode); return () => socket.off('labour_weight_mode_changed', refreshMode); }, []);
  const changeMode = async value => {
    try { await setLabourWeightModeApi(value); setMode(value); setSettingsOpen(false); }
    catch (e) { setError(e?.response?.data?.message || 'Could not update weight mode.'); }
  };
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    let date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dateInterval = setInterval(() => {
      const current = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      if (current !== date) { date = current; load(); }
    }, 30000);
    socket.on('labour_weights_updated', load);
    return () => { clearInterval(interval); clearInterval(dateInterval); socket.off('labour_weights_updated', load); };
  }, [load]);
  const open = entry => {
    setEditing(entry || {});
    setMs(entry ? String(entry.ms_weight) : '');
    setQty(entry ? String(entry.dipping_qty) : '');
    setError('');
  };
  const save = async event => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await saveLabourWeightApi({ id: editing.id, ms_weight: Number(ms), dipping_qty: Number(qty) });
      setEditing(null);
      await load();
    } catch (e) { setError(e?.response?.data?.message || 'Could not save weight.'); }
    finally { setSaving(false); }
  };
  const toggleTimer = async (entry, process, action, tappedAtMs) => {
    setTimerBusy(`${entry.id}:${process}`); setError('');
    try {
      const result = await toggleLabourTimerApi(entry.id, process, action, tappedAtMs);
      await load();
      if (action === 'stop' && result?.data?.duration_source === 'server') setError('Device clock differed from the plant timer; the server elapsed time was saved.');
    }
    catch (e) { setError(e?.response?.data?.message || 'Could not update the timer.'); }
    finally { setTimerBusy(''); }
  };
  const timerCell = (entry, process, label) => {
    const duration = entry[`${process}_duration_seconds`];
    if (duration != null) return <span className="labour-timer-done">{formatDuration(duration)}</span>;
    const started = entry[`${process}_started_at`];
    const startMs = Number(entry[`${process}_client_started_at_ms`]) || Date.parse(started);
    const seconds = started ? Math.min(Number(entry[`${process}_limit_seconds`]) || Infinity, Math.max(0, Math.floor((now - startMs) / 1000))) : 0;
    const allowed = entry.can_run_timer;
    if (!allowed) return started ? `Running · ${formatDuration(seconds)}` : '—';
    return <button type="button" className={`labour-timer-button ${started ? 'running' : ''}`} disabled={!!timerBusy} onClick={() => toggleTimer(entry, process, started ? 'stop' : 'start', Date.now())}>{started ? `Stop ${label} · ${formatDuration(seconds)}` : `Start ${label}`}</button>;
  };
  return <div className="ops-page">
    <div className="ops-header"><div><h1>Labour MS Weights</h1><p>MS weight and dip quantity used in production.</p></div>
      <div className="ops-actions">{role !== 'labour' && <button className="ops-button secondary" onClick={() => setSettingsOpen(true)}>Weight settings</button>}{canAdd && <button className="ops-button" onClick={() => open(null)}>Add weight</button>}</div>
    </div>
    {error && <p role="alert" className="ops-error">{error}</p>}
    <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Dip / weight</th><th>Status</th><th>MS weight (kg/NOS)</th><th>Dip qty (NOS)</th><th>Pickling</th><th>Flux</th><th>Hot drier</th><th>Zinc kettle</th><th>Entered by</th><th>Entered at</th><th>Action</th></tr></thead>
      <tbody>{entries.map(entry => <tr key={entry.id}><td>Dip #{entry.dip_number} · Weight #{entry.id}</td><td>{entry.status}</td><td>{entry.ms_weight}</td><td>{entry.dipping_qty}{Number(entry.consumed_qty) > 0 && <small> ({entry.remaining_qty} remaining)</small>}</td>{TIMERS.map(([process, label]) => <td key={process}>{timerCell(entry, process, label)}</td>)}<td>{entry.labour_name}</td><td>{entry.created_at}</td><td>{canEdit && <button className="ops-button secondary" onClick={() => open(entry)}>Edit</button>}</td></tr>)}</tbody></table></div>
    {editing && <div className="labour-modal-overlay"><form className="labour-modal-content" onSubmit={save}>
      <h2>{editing.id ? 'Edit' : 'Add'} weight</h2>
      <label>MS weight per NOS (kg)<input type="number" min="0.001" step="0.001" required value={ms} onChange={event => setMs(event.target.value)} /></label>
      <label>Dip quantity (NOS)<input type="number" min="1" step="1" required value={qty} onChange={event => setQty(event.target.value)} /></label>
      {editing.status === 'used' && <p>This updates the linked production entry and its calculations.</p>}
      <div className="ops-actions"><button type="button" className="ops-button secondary" onClick={() => setEditing(null)}>Cancel</button><button className="ops-button" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
    </form></div>}
    {settingsOpen && <div className="labour-modal-overlay"><div className="labour-modal-content"><h2>Production weight mode</h2><p>Manual lets the supervisor enter weights. Auto uses the first pending labour weight. Selection lets the supervisor choose the current dip.</p>{MODES.map(([value, label]) => <button key={value} type="button" className={`ops-button ${mode === value ? '' : 'secondary'}`} onClick={() => changeMode(value)}>{label}{mode === value ? ' ✓' : ''}</button>)}<button className="ops-button secondary" onClick={() => setSettingsOpen(false)}>Close</button></div></div>}
  </div>;
}
