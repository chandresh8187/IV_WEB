import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { createContractorApi, deleteContractorApi, getContractorDirectoryApi, updateContractorApi } from '../../api/contractorApi';
import { createFinancialYearApi, deleteFinancialYearApi, getFinancialYearsApi, setCurrentFinancialYearApi, updateFinancialYearApi } from '../../api/financialYearsApi';
import { createItemApi, deleteItemApi, getItemsApi, updateItemApi } from '../../api/itemsApi';
import { getStoredUser, hasPermission } from '../../utils/permissions';
import './Operations.css';

const configs = {
  items: { title: 'Items', placeholder: 'Item name', get: getItemsApi, create: createItemApi, update: (id, value) => updateItemApi({ id, itemName: value }), remove: deleteItemApi, value: item => item.item_name },
  contractors: { title: 'Contractors', placeholder: 'Contractor name', get: getContractorDirectoryApi, create: createContractorApi, update: (id, value) => updateContractorApi({ id, name: value }), remove: deleteContractorApi, value: item => item.name },
};

function Directory({ type }) {
  const config = configs[type];
  const canManage = type === 'items' || hasPermission(getStoredUser(), 'contractors.manage');
  const [rows, setRows] = useState([]);
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => config.get()
    .then(response => setRows(Array.isArray(response.data) ? response.data : []))
    .catch(requestError => setError(requestError.response?.data?.message || `Could not load ${config.title.toLowerCase()}.`)), [config]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!canManage) return;
    const clean = value.trim().replace(/\s+/g, ' ');
    if (!clean) return setError(`Enter a ${config.placeholder.toLowerCase()}.`);
    setBusy(true);
    setError('');
    try {
      if (editing) await config.update(editing.id, clean);
      else await config.create(clean);
      setEditing(null);
      setValue('');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async item => {
    if (!canManage || !window.confirm(`Delete “${config.value(item)}”?`)) return;
    try {
      await config.remove(item.id);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete.');
    }
  };

  return <>
    {canManage && <div className="ops-card"><h3>{editing ? `Edit ${config.title.slice(0, -1)}` : `Add ${config.title.slice(0, -1)}`}</h3><div className="ops-actions"><input placeholder={config.placeholder} value={value} maxLength="120" onChange={event => setValue(event.target.value)} />{editing && <button className="ops-button secondary" onClick={() => { setEditing(null); setValue(''); }}>Cancel</button>}<button className="ops-button" disabled={busy} onClick={save}>Save</button></div></div>}
    {error && <div className="ops-error" role="alert">{error}</div>}
    <div className="ops-card"><h3>All {config.title.toLowerCase()}</h3>{rows.map(item => <div className="crud-row" key={item.id}><b>{config.value(item)}</b>{canManage && <div className="ops-actions"><button className="ops-button secondary" onClick={() => { setEditing(item); setValue(config.value(item)); }}>Edit</button><button className="ops-button danger" onClick={() => remove(item)}>Delete</button></div>}</div>)}{!rows.length && <div className="ops-empty">No records added.</div>}</div>
  </>;
}

function FinancialYears() {
  const [rows, setRows] = useState([]);
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => getFinancialYearsApi()
    .then(response => setRows(Array.isArray(response.data) ? response.data : []))
    .catch(requestError => setError(requestError.response?.data?.message || 'Could not load financial years.')), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!/^\d{4}-\d{2}$/.test(value)) return setError('Use financial year format YYYY-YY, for example 2026-27.');
    try {
      if (editing) await updateFinancialYearApi({ id: editing.id, financialYear: value });
      else await createFinancialYearApi(value);
      setEditing(null);
      setValue('');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save financial year.');
    }
  };
  const remove = async item => {
    if (!window.confirm(`Delete financial year ${item.financial_year}?`)) return;
    try {
      await deleteFinancialYearApi(item.id);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete financial year.');
    }
  };

  return <>
    <div className="ops-card"><h3>{editing ? 'Edit' : 'Add'} financial year</h3><div className="ops-actions"><input placeholder="2026-27" value={value} onChange={event => setValue(event.target.value)} />{editing && <button className="ops-button secondary" onClick={() => { setEditing(null); setValue(''); }}>Cancel</button>}<button className="ops-button" onClick={save}>Save</button></div></div>
    {error && <div className="ops-error" role="alert">{error}</div>}
    <div className="ops-card"><h3>Financial years</h3>{rows.map(item => <div className="crud-row" key={item.id}><span><b>{item.financial_year}</b>{item.is_current && <small className="ops-success" style={{ marginLeft: 10, padding: 4 }}>Current</small>}</span><div className="ops-actions">{!item.is_current && <button className="ops-button" onClick={async () => { try { await setCurrentFinancialYearApi(item.id); await load(); } catch (requestError) { setError(requestError.response?.data?.message || 'Could not change current year.'); } }}>Make current</button>}<button className="ops-button secondary" onClick={() => { setEditing(item); setValue(item.financial_year); }}>Edit</button><button className="ops-button danger" onClick={() => remove(item)}>Delete</button></div></div>)}</div>
  </>;
}

export default function SettingsScreen({ initialTab = 'items' }) {
  const navigate = useNavigate();
  return <section className="ops-page"><header><h2>{initialTab === 'years' ? 'Financial Years' : initialTab === 'contractors' ? 'Contractors' : 'Items'}</h2><p className="ops-muted">Manage production master records and reporting periods.</p></header><div className="ops-tabs"><button className="ops-tab active" onClick={() => navigate('/settings')}>Back to Settings</button></div>{initialTab === 'years' ? <FinancialYears /> : <Directory type={initialTab} />}</section>;
}
