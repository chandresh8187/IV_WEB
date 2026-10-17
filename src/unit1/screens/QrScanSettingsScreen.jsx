import LoadingIndicator from "../../components/LoadingIndicator";
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, TriangleAlert } from 'lucide-react'
import { getQrSettings, saveQrSettings } from '../api/qrSettingsApi'
import PageBack from '../components/PageBack'

const roleLabels = { superadmin: 'Superadmin', plant_manager: 'Plant manager', admin: 'Admin', supervisor: 'Supervisor', labour: 'Labour' }

export default function QrScanSettingsScreen() {
  const queryClient = useQueryClient()
  const [role, setRole] = useState('superadmin')
  const [draft, setDraft] = useState(null)
  const [message, setMessage] = useState('')
  const settingsQuery = useQuery({ queryKey: ['qr-scan-settings'], queryFn: getQrSettings })
  const settings = settingsQuery.data
  const selected = draft?.role === role ? draft.fields : settings?.selections?.[role] || []
  const save = useMutation({
    mutationFn: saveQrSettings,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['qr-scan-settings'] }); setDraft(null); setMessage(`${roleLabels[role]} scan display saved.`) },
  })

  function toggle(field) {
    const next = selected.includes(field) ? selected.filter(item => item !== field) : [...selected, field]
    setDraft({ role, fields: next })
    setMessage('')
  }

  return <section className="settings-page qr-settings-page">
    <PageBack to="/settings" current="QR Scan Display">Settings</PageBack>
    <div className="settings-heading"><div><span className="eyebrow">SETTINGS</span><h1>QR Scan Display</h1><p>Choose which coil details each role sees after scanning a generated QR code.</p></div></div>
    {settingsQuery.isPending && <LoadingIndicator label="Loading QR display settings…" />}
    {settingsQuery.isError && <div className="settings-panel notice error" role="alert"><TriangleAlert size={18} /> Could not load QR settings. <button type="button" onClick={() => settingsQuery.refetch()}>Retry</button></div>}
    {settings && <div className="settings-panel">
      <div className="material-tabs" role="tablist" aria-label="User roles">{settings.roles.map(item => <button key={item} type="button" role="tab" aria-selected={role === item} className={role === item ? 'selected' : ''} onClick={() => { setRole(item); setDraft(null); setMessage('') }}>{roleLabels[item] || item}</button>)}</div>
      <div className="grade-section-heading"><div><h2>{roleLabels[role]} scan fields</h2><p>Coil identity and number are always shown. Select any additional details.</p></div></div>
      <div className="qr-field-grid">{settings.fields.map(field => <label className="qr-field-option" key={field.key}><input type="checkbox" checked={selected.includes(field.key)} onChange={() => toggle(field.key)} /><span>{field.label}</span></label>)}</div>
      {save.isError && <div className="notice error" role="alert">{save.error?.response?.data?.error || save.error?.response?.data?.message || 'Could not save QR display settings.'}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      <button className="primary-button qr-settings-save" type="button" onClick={() => save.mutate({ role, fields: selected })} disabled={!draft || save.isPending}><Save size={16} /> {save.isPending ? <LoadingIndicator label="Saving…" inline /> : 'Save for this role'}</button>
    </div>}
  </section>
}
