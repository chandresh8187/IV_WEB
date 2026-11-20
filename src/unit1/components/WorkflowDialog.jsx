import './WorkflowDialog.css';
import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
export default function WorkflowDialog({ title, onClose, busy, children, className = '' }) {
  const ref = useRef(null), id = useId()
  useEffect(() => { ref.current.showModal() }, [])
  return <dialog ref={ref} className={`workflow-dialog ${className}`} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header><h2 id={id}>{title}</h2><button type="button" className="icon-button modal-close" disabled={busy} aria-label="Close" onClick={onClose}><X size={24}/></button></header>{children}
  </dialog>
}
