import { useCallback, useEffect, useState } from 'react';
import './Operations.css';
import './LabourWeightsScreen.css';
import { getLabourWeightsApi, saveLabourWeightApi } from '../../api/labourWeightsApi';
import { getStoredUser, hasPermission } from '../../utils/permissions';

export default function LabourWeightsScreen() {
  const user = getStoredUser();
  const role = String(user?.role || '').toLowerCase();
  const canAdd = hasPermission(user, 'labour_weights.create');
  const canEdit = hasPermission(user, 'labour_weights.edit') && ['supervisor', 'superadmin'].includes(role);
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [ms, setMs] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try { setEntries((await getLabourWeightsApi()).data || []); }
    catch (e) { setError(e?.response?.data?.message || 'Could not load weights.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
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
  return <div className="ops-page">
    <div className="ops-header"><div><h1>Labour MS Weights</h1><p>MS weight and dip quantity used in production.</p></div>
      {canAdd && <button className="ops-button" onClick={() => open(null)}>Add weight</button>}
    </div>
    {error && <p role="alert" className="ops-error">{error}</p>}
    <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>#</th><th>Status</th><th>MS weight (kg/NOS)</th><th>Dip qty (NOS)</th><th>Entered by</th><th>Entered at</th><th>Action</th></tr></thead>
      <tbody>{entries.map((entry, index) => <tr key={entry.id}><td>{index + 1}</td><td>{entry.status}</td><td>{entry.ms_weight}</td><td>{entry.dipping_qty}{Number(entry.consumed_qty) > 0 && <small> ({entry.remaining_qty} remaining)</small>}</td><td>{entry.labour_name}</td><td>{entry.created_at}</td><td>{canEdit && <button className="ops-button secondary" onClick={() => open(entry)}>Edit</button>}</td></tr>)}</tbody></table></div>
    {editing && <div className="labour-modal-overlay"><form className="labour-modal-content" onSubmit={save}>
      <h2>{editing.id ? 'Edit' : 'Add'} weight</h2>
      <label>MS weight per NOS (kg)<input type="number" min="0.001" step="0.001" required value={ms} onChange={event => setMs(event.target.value)} /></label>
      <label>Dip quantity (NOS)<input type="number" min="1" step="1" required value={qty} onChange={event => setQty(event.target.value)} /></label>
      {editing.status === 'used' && <p>This updates the linked production entry and its calculations.</p>}
      <div className="ops-actions"><button type="button" className="ops-button secondary" onClick={() => setEditing(null)}>Cancel</button><button className="ops-button" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
    </form></div>}
  </div>;
}
