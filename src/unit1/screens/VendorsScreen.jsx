import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createVendor, getVendors } from '../api/vendorApi';
import { hasAccess } from '../utils/access';
import LoadingIndicator from '../../components/LoadingIndicator';
import WorkflowDialog from '../components/WorkflowDialog';
import './VendorsScreen.css';

const errorText = error => error?.response?.data?.error || error?.message;

export default function VendorsScreen() {
  const user = useSelector(state => state.auth.user);
  const canView = hasAccess(user, 'unit1.coils.view');
  const canAdd = hasAccess(user, 'unit1.coils.create');
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const vendors = useQuery({
    queryKey: ['unit1-vendors'],
    queryFn: getVendors,
    enabled: canView,
    refetchInterval: 30000,
  });
  const save = useMutation({
    mutationFn: createVendor,
    onSuccess: async () => {
      setForm(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['unit1-vendors'] }),
        client.invalidateQueries({ queryKey: ['coils'] }),
      ]);
    },
  });
  if (!canView) return <p role="alert">Coil stock access is required to view vendors.</p>;
  const rows = (vendors.data || []).filter(vendor =>
    `${vendor.name} ${vendor.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <section className="vendors-page">
      <div className="page-heading">
        <h1>Vendors</h1>
        {canAdd && <button className="primary-button" type="button" onClick={() => {
          save.reset();
          setForm({ name: '', code: '' });
        }}><Plus size={17} />Add vendor</button>}
      </div>
      <section className="content-card">
        <div className="vendors-toolbar">
          <label className="form-field">Search vendors<input type="search" placeholder="Vendor name or code" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <button className="outline-button" type="button" aria-label="Refresh vendors" title="Refresh vendors" disabled={vendors.isFetching} onClick={() => vendors.refetch()}><RefreshCw size={18} /></button>
        </div>
        {vendors.isPending && <LoadingIndicator label="Loading vendors…" />}
        {vendors.isError && <p className="notice error" role="alert">{errorText(vendors.error)}</p>}
        {vendors.isSuccess && (rows.length ? (
          <div className="table-scroll vendors-table" role="region" aria-label="Vendors table" tabIndex={0}>
            <table><thead><tr><th scope="col">Vendor name</th><th scope="col">Vendor code</th></tr></thead>
              <tbody>{rows.map(vendor => <tr key={vendor.id}><td>{vendor.name}</td><td>{vendor.code}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="machine-empty">{search ? 'No matching vendors.' : 'No vendors yet. Add a vendor to select it during coil inward.'}</p>)}
      </section>
      {form && <WorkflowDialog title="Add vendor" className="vendor-dialog" busy={save.isPending} onClose={() => setForm(null)}>
        <form onSubmit={event => {
          event.preventDefault();
          save.mutate({ name: form.name.trim(), code: form.code.trim() });
        }}>
          <label className="form-field">Vendor name<input required autoFocus maxLength={150} value={form.name} disabled={save.isPending} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} /></label>
          <label className="form-field">Vendor code<input required maxLength={100} value={form.code} disabled={save.isPending} onChange={event => setForm(value => ({ ...value, code: event.target.value.toUpperCase() }))} /></label>
          {save.isError && <p className="notice error" role="alert">{errorText(save.error)}</p>}
          <footer>
            <button className="outline-button" type="button" disabled={save.isPending} onClick={() => setForm(null)}>Cancel</button>
            <button className="primary-button" type="submit" disabled={save.isPending || !form.name.trim() || !form.code.trim()}>{save.isPending ? 'Saving…' : 'Save vendor'}</button>
          </footer>
        </form>
      </WorkflowDialog>}
    </section>
  );
}
