import LoadingIndicator from "../../components/LoadingIndicator";
import { hasAccess } from '../utils/access'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useSelector } from 'react-redux'
import { createMaterialGrade, deleteMaterialGrade, listMaterialsGrades, updateMaterialGrade, updateMaterialDensity } from '../api/materialGradesApi'
import PageBack from '../components/PageBack'

export default function MaterialsGradesScreen() {
  const user = useSelector(state => state.auth.user)
  const canManage = hasAccess(user, 'unit1.materials.manage')
  const queryClient = useQueryClient()
  const { data: materials = [], isPending, error, refetch } = useQuery({ queryKey: ['materials-grades'], queryFn: listMaterialsGrades })
  const [materialKey, setMaterialKey] = useState('MS')
  const [grade, setGrade] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [densityInput, setDensityInput] = useState('')
  const material = materials.find(item => item.key === materialKey) || materials[0]
  const save = useMutation({ mutationFn: payload => payload.id ? updateMaterialGrade(payload) : createMaterialGrade(payload), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['materials-grades'] }); setGrade(''); setEditingId(null); setMessage('Grade saved.') } })
  const remove = useMutation({ mutationFn: deleteMaterialGrade, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['materials-grades'] }); setMessage('Grade deleted.') } })
  const saveDensity = useMutation({ mutationFn: ({ key, density }) => updateMaterialDensity(key, density), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['materials-grades'] }); setMessage('Density saved for future production entries.') } })
  const operationError = save.error?.response?.data?.error || save.error?.message || remove.error?.response?.data?.error || remove.error?.message || saveDensity.error?.response?.data?.error || saveDensity.error?.message

  function submit(event) {
    event.preventDefault()
    setMessage('')
    if (!material || !grade.trim()) return
    save.mutate({ ...(editingId ? { id: editingId } : {}), materialType: material.key, grade: grade.trim() })
  }
  function startEdit(item) { setEditingId(item.id); setGrade(item.value); setMessage('') }
  function changeMaterial(key) { setMaterialKey(key); setGrade(''); setDensityInput(''); setEditingId(null); setMessage('') }
  function deleteGrade(item) {
    if (window.confirm(`Delete ${material.key === 'GP' ? `GSM - ${item.value}` : item.value} from ${material.label}?`)) { setMessage(''); remove.mutate(item.id) }
  }

  return <section className="settings-page materials-grades-page">
    <PageBack to="/settings" current="Materials And Grades">Settings</PageBack>
    <div className="settings-heading"><div><span className="eyebrow">SETTINGS</span><h1>Materials And Grades</h1><p>Grades added here appear in the coil inward form.</p></div></div>
    {isPending && <LoadingIndicator label="Loading materials and grades…" />}
    {error && <div className="settings-panel notice error" role="alert">Could not load materials and grades. <button type="button" onClick={() => refetch()}>Retry</button></div>}
    {!isPending && !error && <div className="settings-panel">
      <div className="material-tabs" role="tablist" aria-label="Material types">{materials.map(item => <button key={item.key} type="button" role="tab" aria-selected={material?.key === item.key} className={material?.key === item.key ? 'selected' : ''} onClick={() => changeMaterial(item.key)}>{item.label}</button>)}</div>
      {material && <>
        <div className="grade-section-heading"><div><h2>Sheet density</h2><p>Used to estimate gross coil weight from width × thickness × cut length × pieces. Coating and process scrap can change actual weight.</p></div></div>
        <form className="grade-form" onSubmit={event => { event.preventDefault(); saveDensity.mutate({ key: material.key, density: Number(densityInput || material.densityGcm3) }) }}><label htmlFor="material-density">{material.label} density (g/cm³)</label><div><input id="material-density" type="number" min="6" max="9" step="0.0001" value={densityInput || material.densityGcm3} onChange={event => setDensityInput(event.target.value)} disabled={!canManage || saveDensity.isPending} required />{canManage && <button className="primary-button" type="submit" disabled={saveDensity.isPending}>Save density</button>}</div></form>
        <div className="grade-section-heading"><div><h2>{material.label} {material.mode === 'number' ? 'GSM' : 'grades'}</h2><p>{material.mode === 'number' ? `Coil inward accepts any whole GSM number from ${material.min} to ${material.max}.` : 'Manage grades available for this material.'}</p></div>{material.mode !== 'number' && <span>{material.grades.length} grades</span>}</div>
        {material.mode !== 'number' && canManage && <form className="grade-form" onSubmit={submit}><label htmlFor="grade-value">{editingId ? 'Edit grade' : 'Add grade'}</label><div><input id="grade-value" value={grade} onChange={event => setGrade(event.target.value)} type="text" maxLength={100} required placeholder="Grade name" disabled={save.isPending} /><button className="primary-button" type="submit" disabled={save.isPending}><Plus size={16} /> {editingId ? 'Save changes' : 'Add grade'}</button>{editingId && <button className="outline-button" type="button" onClick={() => { setEditingId(null); setGrade('') }}><X size={16} /> Cancel</button>}</div></form>}
        {material.mode !== 'number' && !canManage && <p className="settings-readonly">You can view these grades. Editing requires the Materials And Grades permission.</p>}
        {operationError && <div className="notice error" role="alert">{operationError}</div>}{message && <div className="notice" role="status">{message}</div>}
        {material.mode !== 'number' && <div className="grade-list">{material.grades.length === 0 ? <p>No grades added yet.</p> : material.grades.map(item => <div className="grade-row" key={item.id}><strong>{item.value}</strong>{canManage && <span><button type="button" aria-label={`Edit ${item.value}`} onClick={() => startEdit(item)} disabled={remove.isPending}><Pencil size={17} /></button><button type="button" aria-label={`Delete ${item.value}`} onClick={() => deleteGrade(item)} disabled={remove.isPending}><Trash2 size={17} /></button></span>}</div>)}</div>}
      </>}
    </div>}
  </section>
}
