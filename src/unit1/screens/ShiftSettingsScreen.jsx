import LoadingIndicator from "../../components/LoadingIndicator";
import { hasAccess } from '../utils/access'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Clock3, Save, TriangleAlert } from 'lucide-react'
import PageBack from '../components/PageBack'
import { formatClock, formatDate, formatTime } from '../utils/dateTime'
import { getShiftSettings, saveShiftSettings } from '../api/shiftApi'

const errorText = error => error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Could not save shift times.'

export default function ShiftSettingsScreen() {
  const client = useQueryClient()
  const user = useSelector(state => state.auth.user)
  const canManage = hasAccess(user, 'unit1.shifts.manage')
  const query = useQuery({ queryKey: ['unit1-shifts'], queryFn: getShiftSettings, refetchInterval: 30000 })
  const [draft, setDraft] = useState(null)
  const schedule = draft || query.data?.schedule
  const save = useMutation({ mutationFn: saveShiftSettings, onSuccess: async data => { setDraft(data.schedule); await client.invalidateQueries({ queryKey: ['unit1-shifts'] }); await client.invalidateQueries({ queryKey: ['production-live'] }) } })
  const change = (key, value) => setDraft(current => ({ ...(current || query.data?.schedule), [key]: value, ...(key === 'dayStart' ? { nightEnd: value } : key === 'nightEnd' ? { dayStart: value } : key === 'dayEnd' ? { nightStart: value } : key === 'nightStart' ? { dayEnd: value } : {}) }))
  const shift = query.data?.current
  return <section className="shift-settings-page"><PageBack to="/settings" current="Shift times">Settings</PageBack><div className="page-heading"><div><span className="eyebrow">SETTINGS</span><h1>Shift times</h1><p>Day and Night switch automatically at the configured times. All times use Asia/Kolkata.</p></div></div>
    {query.isError && <div className="notice error" role="alert"><TriangleAlert size={18} /> {errorText(query.error)}</div>}
    {shift && <div className="content-card shift-current"><Clock3 size={22} /><div><span>Current shift</span><strong>{shift.name === 'day' ? 'Day' : 'Night'} · {formatTime(shift.startsAt)}–{formatTime(shift.endsAt)}</strong><small>Operational date {formatDate(shift.shiftDate)}</small></div></div>}
    {schedule && <form className="content-card shift-form" onSubmit={event => { event.preventDefault(); save.mutate(schedule) }}><h2>Automatic schedule</h2><p>Changing a shift boundary updates the matching start or end of the other shift.</p><div className="form-grid">{[['dayStart', 'Day start'], ['dayEnd', 'Day end'], ['nightStart', 'Night start'], ['nightEnd', 'Night end']].map(([key, label]) => <label className="form-field" key={key}><span>{label}</span><input type="time" required step="60" value={schedule[key]} onChange={event => change(key, event.target.value)} disabled={!canManage} /><small>{formatClock(schedule[key])} IST</small></label>)}</div>{save.isError && <div className="notice error" role="alert">{errorText(save.error)}</div>}{save.isSuccess && <div className="notice">Shift times saved.</div>}{canManage && <button className="primary-button" type="submit" disabled={save.isPending}><Save size={17} /> {save.isPending ? <LoadingIndicator label="Saving…" inline /> : 'Save shift times'}</button>}</form>}
  </section>
}
