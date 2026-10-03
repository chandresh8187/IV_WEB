import { useCallback, useEffect, useState } from 'react';
import { Activity, History, PlayCircle, Square } from 'lucide-react';
import { getPlantStatusApi, getPlantStatusHistoryApi, updatePlantStatusApi } from '../../api/plantControlApi';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import { formatDisplayDateTime, nowLocalDateTimeInput } from '../../utils/dateTime';
import socket from '../../socket/socket';
import './PlantControlScreen.css';

const duration = minutes => {
  const total = Math.max(0, Number(minutes) || 0);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  return [days && `${days}d`, hours && `${hours}h`, `${mins}m`].filter(Boolean).join(' ');
};

export default function PlantControlScreen() {
  const user = getStoredUser();
  const canControl = hasPermission(user, 'production.status');
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [reason, setReason] = useState('');
  const [eventTime, setEventTime] = useState(nowLocalDateTimeInput);
  const [timeEdited, setTimeEdited] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [current, records] = await Promise.all([getPlantStatusApi(), getPlantStatusHistoryApi()]);
      setStatus(current.data);
      setHistory(records.data || []);
      setError('');
    } catch (err) { setError(err?.response?.data?.message || 'Could not load production status.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); socket.on('plant_status_updated', load); return () => socket.off('plant_status_updated', load); }, [load]);
  const stopped = status?.status !== 'running';
  const changeStatus = async () => {
    if (!stopped && !reason.trim()) { setError('Enter a reason for stopping production.'); return; }
    setSaving(true); setError('');
    try {
      await updatePlantStatusApi({ status: stopped ? 'running' : 'stopped', message: stopped ? null : reason.trim(), occurred_at: timeEdited ? eventTime : nowLocalDateTimeInput() });
      setReason(''); setEventTime(nowLocalDateTimeInput()); setTimeEdited(false);
      await load();
    } catch (err) { setError(err?.response?.data?.message || 'Could not change production status.'); }
    finally { setSaving(false); }
  };
  const filtered = history.filter(record => `${record.title || ''} ${record.message || ''} ${record.started_by_name || ''} ${record.ended_by_name || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="plant-control-screen">
    <header className="plant-control-toolbar"><div><span className="plant-control-overline">PLANT CONTROL</span><h2>Production status</h2><p>Production continues across shifts until a stop is recorded.</p></div><button className="plant-control-refresh" onClick={load}>Refresh</button></header>
    {error && <p className="plant-control-message error" role="alert">{error}</p>}
    {loading ? <p>Loading production status…</p> : <>
      <section className={`plant-control-current ${stopped ? 'stopped' : 'running'}`}><div className="plant-control-current-icon">{stopped ? <Square /> : <PlayCircle />}</div><div className="plant-control-current-copy"><span>CURRENT PRODUCTION STATUS</span><h3>{stopped ? 'Stopped' : 'Running'}</h3><p>{stopped ? status?.message || 'Production is paused.' : 'Production is running across shift changes.'}</p></div><div className="plant-control-current-details"><div><span>Status since</span><strong>{formatDisplayDateTime(status?.started_at || status?.updated_at)}</strong></div><div><span>Updated by</span><strong>{status?.updated_by?.name || 'System'}</strong></div></div></section>
      {canControl && <section className="plant-control-card plant-control-change-card"><header><div><span className="plant-control-card-icon"><Activity size={18}/></span><div><h3>{stopped ? 'Resume production' : 'Stop production'}</h3><p>Uses the current time unless you choose an earlier actual time.</p></div></div></header><div className="plant-control-form-fields">{!stopped && <label><span>Reason for stop *</span><textarea rows={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} placeholder="For example: holiday, power failure, maintenance"/></label>}<label><span>{stopped ? 'Resume' : 'Stop'} date and time</span><input type="datetime-local" value={timeEdited ? eventTime : nowLocalDateTimeInput()} max={nowLocalDateTimeInput()} onChange={event => { setEventTime(event.target.value); setTimeEdited(true); }}/></label></div><button className={`plant-control-submit ${stopped ? 'running' : 'stopped'}`} disabled={saving} onClick={changeStatus}>{saving ? 'Saving…' : stopped ? 'Resume production' : 'Stop production'}</button></section>}
      <section className="plant-control-card plant-control-history-card"><header className="plant-control-history-header"><div><span className="plant-control-card-icon"><History size={18}/></span><div><h3>Production stop records</h3><p>Use these intervals to review downtime, holidays and gas-bottle active time.</p></div></div><label className="plant-control-history-tools"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reason or person"/></label></header>{filtered.length ? <div className="plant-control-table-scroll"><table><thead><tr><th>Reason</th><th>Stopped at</th><th>Resumed at</th><th>Duration</th><th>Recorded at</th><th>Stopped by</th><th>Resumed by</th></tr></thead><tbody>{filtered.map(record => <tr key={record.id}><td className="plant-control-reason"><strong>{record.message || record.title || '—'}</strong>{record.status === 'maintenance' && <span>Earlier maintenance record</span>}</td><td>{formatDisplayDateTime(record.started_at)}</td><td>{record.ended_at ? formatDisplayDateTime(record.ended_at) : 'Still stopped'}</td><td>{duration(record.duration_minutes)}</td><td>{formatDisplayDateTime(record.created_at)}</td><td>{record.started_by_name || 'System'}</td><td>{record.ended_by_name || '—'}</td></tr>)}</tbody></table></div> : <p className="plant-control-empty">No stop records found.</p>}</section>
    </>}
  </div>;
}
