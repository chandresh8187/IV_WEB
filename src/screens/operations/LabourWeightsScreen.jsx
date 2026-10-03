import { useCallback, useEffect, useState } from 'react';
import './Operations.css';
import './LabourWeightsScreen.css';
import { getLabourWeightsApi, getArchivedLabourWeightsApi, deleteLabourWeightApi, getLabourWeightModeApi, setLabourWeightModeApi, saveLabourWeightApi, toggleLabourTimerApi } from '../../api/labourWeightsApi';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import socket from '../../socket/socket';
import { formatDisplayDate, formatDisplayDateTime, todayInputDate } from '../../utils/dateTime';

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
  const canDelete = hasPermission(user, 'labour_weights.delete');
  const canViewPast = ['superadmin', 'plant_manager'].includes(role);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveDate, setArchiveDate] = useState(todayInputDate);
  const [archiveShift, setArchiveShift] = useState('day');
  const [archive, setArchive] = useState(null);
  const [entries, setEntries] = useState([]);
  const [shift, setShift] = useState(null);
  const [mode, setMode] = useState('manual');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [ms, setMs] = useState('');
  const [qty, setQty] = useState('');
  const [weightStatus, setWeightStatus] = useState('pending');
  const [timerBusy, setTimerBusy] = useState('');
  const [now, setNow] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try { const response = archive ? await getArchivedLabourWeightsApi(archive.date, archive.shift) : await getLabourWeightsApi(); setEntries(response.data || []); setShift(response.shift || null); setError(''); }
    catch (e) { setError(e?.response?.data?.message || 'Could not load weights.'); }
  }, [archive]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (role !== 'labour') getLabourWeightModeApi().then(result => setMode(result?.data?.mode || 'manual')).catch(() => {}); }, [role]);
  useEffect(() => { const refreshMode = event => setMode(event?.mode || 'manual'); socket.on('labour_weight_mode_changed', refreshMode); return () => socket.off('labour_weight_mode_changed', refreshMode); }, []);
  const changeMode = async value => {
    try { await setLabourWeightModeApi(value); setMode(value); setSettingsOpen(false); }
    catch (e) { setError(e?.response?.data?.message || 'Could not update weight mode.'); }
  };
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    const refreshInterval = setInterval(load, 30000);
    socket.on('labour_weights_updated', load);
    return () => { clearInterval(interval); clearInterval(refreshInterval); socket.off('labour_weights_updated', load); };
  }, [load]);
  const open = entry => {
    setEditing(entry || {});
    setMs(entry ? String(entry.ms_weight) : '');
    setQty(entry ? String(entry.dipping_qty) : '');
    setWeightStatus(entry?.status || 'pending');
    setError('');
  };
  const save = async event => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await saveLabourWeightApi({ id: editing.id, ms_weight: Number(ms), dipping_qty: Number(qty), ...(editing.id && role === 'superadmin' ? { status: weightStatus } : {}) });
      setEditing(null);
      await load();
    } catch (e) { setError(e?.response?.data?.message || 'Could not save weight.'); }
    finally { setSaving(false); }
  };
  const deleteWeight = async entry => {
    if (!window.confirm(`Delete unused Dip #${entry.dip_number} · Weight #${entry.id}?`)) return;
    try { await deleteLabourWeightApi(entry.id); await load(); }
    catch (e) { setError(e?.response?.data?.message || 'Could not delete weight.'); }
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
    const allowed = !archive && entry.can_run_timer;
    if (!allowed) return started ? `Running · ${formatDuration(seconds)}` : '—';
    return <button type="button" className={`labour-timer-button ${started ? 'running' : ''}`} disabled={!!timerBusy} onClick={() => toggleTimer(entry, process, started ? 'stop' : 'start', Date.now())}>{started ? `Stop ${label} · ${formatDuration(seconds)}` : `Start ${label}`}</button>;
  };
  return <div className="ops-page">
    <div className="ops-header"><div><h1>Labour MS Weights</h1><p>{shift ? `${shift.name === 'night' ? 'Night' : 'Day'} shift · ${formatDisplayDate(shift.date)} · ` : ''}{archive ? role === 'superadmin' ? 'Past shift weights.' : 'Past shift weights (read-only).' : 'Current shift weights only.'}</p></div>
      <div className="ops-actions">{canViewPast && <button className="ops-button secondary" onClick={() => setArchiveOpen(true)}>View past shift</button>}{archive && <button className="ops-button secondary" onClick={() => setArchive(null)}>Current shift</button>}{role !== 'labour' && <button className="ops-button secondary" onClick={() => setSettingsOpen(true)}>Weight settings</button>}{canAdd && !archive && <button className="ops-button" onClick={() => open(null)}>Add weight</button>}</div>
    </div>
    {error && <p role="alert" className="ops-error">{error}</p>}
    <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Dip / weight</th><th>Status</th><th>MS weight (kg/NOS)</th><th>Dip qty (NOS)</th><th>Pickling</th><th>Flux</th><th>Hot drier</th><th>Zinc kettle</th><th>Entered by</th><th>Entered at</th><th>Action</th></tr></thead>
      <tbody>{entries.map(entry => <tr key={entry.id}><td>Dip #{entry.dip_number} · Weight #{entry.id}</td><td>{entry.status}</td><td>{entry.ms_weight}</td><td>{entry.dipping_qty}{Number(entry.consumed_qty) > 0 && <small> ({entry.remaining_qty} remaining)</small>}</td>{TIMERS.map(([process, label]) => <td key={process}>{timerCell(entry, process, label)}</td>)}<td>{entry.labour_name}</td><td>{formatDisplayDateTime(entry.created_at)}</td><td>{(!archive || role === 'superadmin') && <div className="ops-actions">{canEdit && <button className="ops-button secondary" onClick={() => open(entry)}>Edit</button>}{!archive && canDelete && entry.status === 'pending' && Number(entry.consumed_qty) === 0 && !entry.production_entry_id && <button className="ops-button secondary" onClick={() => deleteWeight(entry)}>Delete</button>}</div>}</td></tr>)}</tbody></table>{!entries.length && <p className="ops-empty">No labour weights found for this shift.</p>}</div>
    {archiveOpen && <div className="labour-modal-overlay"><form className="labour-modal-content" onSubmit={event => { event.preventDefault(); setArchive({ date: archiveDate, shift: archiveShift }); setArchiveOpen(false); }}><h2>View past shift weights</h2><label>Production date<input type="date" required max={todayInputDate()} value={archiveDate} onChange={event => setArchiveDate(event.target.value)} /></label><label>Shift<select value={archiveShift} onChange={event => setArchiveShift(event.target.value)}><option value="day">Day shift</option><option value="night">Night shift</option></select></label><div className="ops-actions"><button type="button" className="ops-button secondary" onClick={() => setArchiveOpen(false)}>Cancel</button><button className="ops-button" type="submit">View weights</button></div></form></div>}
    {editing && <div className="labour-modal-overlay"><form className="labour-modal-content" onSubmit={save}>
      <h2>{editing.id ? 'Edit' : 'Add'} weight</h2>
      <label>MS weight per NOS (kg)<input type="number" min="0.001" step="0.001" required value={ms} onChange={event => setMs(event.target.value)} /></label>
      <label>Dip quantity (NOS)<input type="number" min="1" step="1" required value={qty} onChange={event => setQty(event.target.value)} /></label>
      {editing.status === 'used' && role === 'superadmin' && <label>Status<select value={weightStatus} onChange={event => setWeightStatus(event.target.value)}><option value="used">Used</option><option value="pending">Pending</option></select></label>}
      {editing.status === 'used' && <p>{weightStatus === 'pending' && role === 'superadmin' ? 'Recorded production stays linked. If this weight was used in production, increase dip quantity above the used quantity to leave a pending balance.' : 'This updates the linked production entry and its calculations.'}</p>}
      <div className="ops-actions"><button type="button" className="ops-button secondary" onClick={() => setEditing(null)}>Cancel</button><button className="ops-button" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
    </form></div>}
    {settingsOpen && <div className="labour-modal-overlay"><div className="labour-modal-content"><h2>Production weight mode</h2><p>Manual lets the supervisor enter weights. Auto uses the first pending labour weight. Selection lets the supervisor choose the current dip.</p>{MODES.map(([value, label]) => <button key={value} type="button" className={`ops-button ${mode === value ? '' : 'secondary'}`} onClick={() => changeMode(value)}>{label}{mode === value ? ' ✓' : ''}</button>)}<button className="ops-button secondary" onClick={() => setSettingsOpen(false)}>Close</button></div></div>}
  </div>;
}
