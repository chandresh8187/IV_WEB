import LoadingIndicator from "../../components/LoadingIndicator";
import { KeyRound, RotateCcw, X } from 'lucide-react'
import './PermissionAccessModal.css'

export default function PermissionAccessModal({ user, permissions, draft, setDraft, onClose, onSave, saving, error }) {
  const items = permissions.data?.permissions || []
  const groups = items.reduce((result, item) => {
    (result[item.group] ||= []).push(item)
    return result
  }, {})
  const override = item => Object.prototype.hasOwnProperty.call(draft, item.key) ? draft[item.key] : item.override
  const effective = item => override(item) == null ? item.default_allowed : override(item)

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <div className="inward-modal permission-modal" role="dialog" aria-modal="true" aria-label={`Feature access for ${user.name}`}>
      <div className="modal-header"><div className="permission-modal-title"><KeyRound size={21} /><div><span className="eyebrow">USER ACCESS</span><h2>Feature access</h2><p>{user.name} · {user.role.replaceAll('_', ' ')}</p></div></div><button className="icon-button modal-close" type="button" onClick={onClose} disabled={saving} aria-label="Close access editor"><X size={18} /></button></div>
      <div className="modal-body permission-modal-body">
        <div className="permission-intro"><div><strong>Role defaults + custom access</strong><p>Switches show this user’s effective access. Changes override the role default for this user.</p></div><button className="outline-button" type="button" disabled={!permissions.data || saving} onClick={() => setDraft(Object.fromEntries(items.map(item => [item.key, null])))}><RotateCcw size={15} /> Use role defaults</button></div>
        {permissions.isPending && <LoadingIndicator label="Loading permissions…" />}
        {permissions.isError && <div className="notice error" role="alert">{permissions.error?.response?.data?.error || permissions.error?.message}</div>}
        {Object.entries(groups).map(([group, groupItems]) => <section className="permission-group" key={group}><h3>{group}</h3>{groupItems.map(item => <label className="permission-row" key={item.key}><span className="permission-copy"><strong>{item.label}{override(item) != null && <small>Custom</small>}</strong><em>{item.description}</em></span><input type="checkbox" checked={Boolean(effective(item))} onChange={event => setDraft(current => ({ ...current, [item.key]: event.target.checked }))} /><span className="permission-switch" aria-hidden="true" /></label>)}</section>)}
        {error && <div className="notice error" role="alert">{error}</div>}
      </div>
      <div className="modal-footer"><button className="outline-button" type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="primary-button" type="button" disabled={!permissions.data || saving} onClick={onSave}><KeyRound size={16} /> {saving ? <LoadingIndicator label="Saving…" inline /> : 'Save feature access'}</button></div>
    </div>
  </div>
}
