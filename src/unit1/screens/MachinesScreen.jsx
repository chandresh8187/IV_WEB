import LoadingIndicator from "../../components/LoadingIndicator";
import { hasAccess } from '../utils/access'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Factory, Pencil, Plus, Power, Save, TriangleAlert, X } from 'lucide-react'
import { useSelector } from 'react-redux'
import { createMachine, listMachines, updateMachine } from '../api/machinesApi'
import PageBack from '../components/PageBack'

const blank = { code: '', name: '', description: '', isActive: true }

export default function MachinesScreen() {
  const user = useSelector(state => state.auth.user)
  const canManage = hasAccess(user, 'unit1.machines.manage')
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)
  const [message, setMessage] = useState('')
  const machinesQuery = useQuery({ queryKey: ['machines'], queryFn: listMachines })
  const save = useMutation({
    mutationFn: machine => machine.id ? updateMachine(machine) : createMachine(machine),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['machines'] }); setForm(null); setMessage('Machine saved.') },
  })
  const changeStatus = useMutation({
    mutationFn: machine => updateMachine({ id: machine.id, name: machine.name, description: machine.description || '', isActive: !machine.isActive }),
    onSuccess: async updated => { await queryClient.invalidateQueries({ queryKey: ['machines'] }); setMessage(`${updated.name} ${updated.isActive ? 'activated' : 'deactivated'}.`) },
  })
  const error = save.error?.response?.data?.error || save.error?.response?.data?.message || changeStatus.error?.response?.data?.error || changeStatus.error?.response?.data?.message

  function submit(event) {
    event.preventDefault()
    if (!form) return
    setMessage('')
    save.mutate({ ...form, code: form.code.trim().toUpperCase(), name: form.name.trim(), description: form.description.trim() })
  }

  return <section className="settings-page machines-page">
    <PageBack to="/settings" current="Machines">Settings</PageBack>
    <div className="settings-heading"><div><span className="eyebrow">SETTINGS</span><h1>Machines</h1><p>Manage machines available for future live production entries.</p></div></div>
    <div className="settings-panel">
      <div className="machines-toolbar"><div><h2>Machine list</h2><p>Machine codes remain fixed so production records can reference them later.</p></div>{canManage && !form && <button className="primary-button" type="button" onClick={() => { setForm(blank); setMessage('') }}><Plus size={16} /> Add machine</button>}</div>
      {form && <form className="machine-form" onSubmit={submit}><div className="machine-form-heading"><strong>{form.id ? 'Edit machine' : 'New machine'}</strong><button className="icon-button" type="button" aria-label="Close machine form" onClick={() => setForm(null)}><X size={18} /></button></div><div className="machine-form-grid"><label>Machine code <input value={form.code} onChange={event => setForm(previous => ({ ...previous, code: event.target.value.toUpperCase() }))} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9-]{1,29}" title="2–30 letters, numbers, or hyphens" required disabled={Boolean(form.id) || save.isPending} placeholder="MACHINE-01" /></label><label>Machine name <input value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} maxLength={100} required disabled={save.isPending} placeholder="Machine name" /></label><label className="machine-description">Description <input value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} maxLength={255} disabled={save.isPending} placeholder="Optional details" /></label></div><div className="machine-form-actions"><button className="primary-button" type="submit" disabled={save.isPending}><Save size={16} /> {save.isPending ? <LoadingIndicator label="Saving…" inline /> : 'Save machine'}</button><button className="outline-button" type="button" onClick={() => setForm(null)}>Cancel</button></div></form>}
      {error && <div className="notice error" role="alert"><TriangleAlert size={18} /> {error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      {machinesQuery.isPending && <LoadingIndicator label="Loading machines…" />}
      {machinesQuery.isError && <div className="notice error" role="alert">Could not load machines. <button type="button" onClick={() => machinesQuery.refetch()}>Retry</button></div>}
      {machinesQuery.data?.length === 0 && <p className="machine-empty">No machines added yet.</p>}
      <div className="machine-list">{machinesQuery.data?.map(machine => <div className="machine-row" key={machine.id}><div className="settings-card-icon"><Factory size={19} /></div><div className="machine-info"><strong>{machine.name}</strong><span>{machine.code}{machine.description ? ` · ${machine.description}` : ''}</span></div><span className={`machine-status ${machine.isActive ? 'active' : ''}`}>{machine.isActive ? 'Active' : 'Inactive'}</span>{canManage && <div className="machine-actions"><button type="button" aria-label={`Edit ${machine.name}`} title="Edit machine" onClick={() => { setForm({ id: machine.id, code: machine.code, name: machine.name, description: machine.description || '', isActive: machine.isActive }); setMessage('') }}><Pencil size={17} /></button><button type="button" aria-label={`${machine.isActive ? 'Deactivate' : 'Activate'} ${machine.name}`} title={machine.isActive ? 'Deactivate' : 'Activate'} disabled={changeStatus.isPending} onClick={() => { setMessage(''); changeStatus.mutate(machine) }}><Power size={17} /></button></div>}</div>)}</div>
      {!canManage && <p className="settings-readonly">You can view machines. Adding and editing requires the Machines permission.</p>}
    </div>
  </section>
}
