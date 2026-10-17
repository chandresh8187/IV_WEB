import LoadingIndicator from "../../components/LoadingIndicator";
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Plus, Save, Trash2, TriangleAlert, X } from 'lucide-react'
import { createCoils, updateCoil } from '../api/coilApi'
import { listMaterialsGrades } from '../api/materialGradesApi'

const emptyForm = {
  invoice: '', invoiceDate: '', tcNumber: '', vendorCode: '',
  materialType: '', grade: '', widthMm: '', thicknessMm: '',
  coilQty: '', totalWeightKg: '', ratePerKg: '',
}
const emptyLine = () => ({ materialType: '', grade: '', widthMm: '', thicknessMm: '', coilQty: '', totalWeightKg: '', ratePerKg: '' })

function Field({ label, name, value, onChange, type = 'text', optional = false, ...inputProps }) {
  return <label className="form-field"><span>{label} {!optional && <i>*</i>}</span><input name={name} type={type} value={value} onChange={onChange} required={!optional} {...inputProps} /></label>
}

export default function CoilInwardScreen({ onClose, onSaved, coil }) {
  const [form, setForm] = useState(() => coil ? {
    invoice: coil.invoice || '', invoiceDate: String(coil.invoiceDate || '').slice(0, 10),
    tcNumber: coil.tcNumber || '', vendorCode: coil.vendorCode || '',
    materialType: coil.materialType || '', grade: coil.materialType === 'GP' ? String(coil.grade || '').replace(/^GSM - /, '') : coil.grade || '',
    widthMm: String(coil.widthMm ?? ''), thicknessMm: String(coil.thicknessMm ?? ''),
    coilQty: String(coil.coilQty ?? ''), totalWeightKg: String(coil.totalWeightKg ?? ''), ratePerKg: String(coil.ratePerKg ?? ''),
  } : emptyForm)
  const [extraLines, setExtraLines] = useState([])
  const [validationError, setValidationError] = useState('')
  const firstInput = useRef(null)
  const dialog = useRef(null)
  const queryClient = useQueryClient()
  const materialsQuery = useQuery({ queryKey: ['materials-grades'], queryFn: listMaterialsGrades })
  const materials = materialsQuery.data || []
  const selectedMaterial = materials.find(material => material.key === form.materialType)
  const gradeOptions = selectedMaterial?.grades || []
  const mutation = useMutation({
    mutationFn: input => coil ? updateCoil(coil.id, input) : createCoils(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coils'] })
      onSaved()
    },
  })
  const error = validationError || mutation.error?.response?.data?.error || mutation.error?.message

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstInput.current?.focus()
    function keyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const controls = Array.from(dialog.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])') || [])
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keyDown)
    return () => {
      document.removeEventListener('keydown', keyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [onClose])

  function update(event) {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value, ...(name === 'materialType' ? { grade: '' } : {}) }))
    setValidationError('')
  }

  function updateExtra(index, field, value) {
    setExtraLines(previous => previous.map((line, i) => i === index ? { ...line, [field]: value, ...(field === 'materialType' ? { grade: '' } : {}) } : line))
    setValidationError('')
  }

  function validateLine(line, index) {
    const material = materials.find(item => item.key === line.materialType)
    if (!material) return `Line ${index}: Select a material type.`
    if (line.materialType === 'GP') {
      if (!/^\d+$/.test(line.grade) || Number(line.grade) < material.min || Number(line.grade) > material.max) return `Line ${index}: Enter a GP GSM number from 80 to 140.`
    } else if (!material.grades.some(grade => grade.value === line.grade)) return `Line ${index}: Select a grade.`
    if (!/^\d+$/.test(String(line.coilQty)) || Number(line.coilQty) < 1) return `Line ${index}: Coil Qty must be a whole number above zero.`
    for (const name of ['widthMm', 'thicknessMm', 'totalWeightKg']) {
      if (!/^\d+(?:\.\d{1,3})?$/.test(String(line[name])) || Number(line[name]) <= 0) return `Line ${index}: Size, thickness and weight must be positive numbers with up to three decimals.`
    }
    if ((!coil || String(line.ratePerKg ?? '').trim()) && (!/^\d+(?:\.\d{1,2})?$/.test(String(line.ratePerKg)) || Number(line.ratePerKg) <= 0 || Number(line.ratePerKg) > 99999999.99)) return `Line ${index}: Enter a positive rate per kg with up to two decimals.`
    return null
  }

  function submit(event) {
    event.preventDefault()
    const lines = [form, ...extraLines]
    for (const [index, line] of lines.entries()) {
      const error = validateLine(line, index + 1)
      if (error) return setValidationError(error)
    }
    const documents = { invoice: form.invoice.trim(), invoiceDate: form.invoiceDate, tcNumber: form.tcNumber.trim(), vendorCode: form.vendorCode.trim() }
    const normalized = lines.map(line => ({ materialType: line.materialType, grade: line.materialType === 'GP' ? `GSM - ${line.grade}` : line.grade, widthMm: line.widthMm, thicknessMm: line.thicknessMm, coilQty: line.coilQty, totalWeightKg: line.totalWeightKg, ratePerKg: String(line.ratePerKg ?? '').trim() || null }))
    mutation.mutate(coil ? { ...documents, ...normalized[0] } : { ...documents, lines: normalized })
  }

  return (
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !mutation.isPending) onClose() }}>
      <div className="inward-modal" role="dialog" aria-modal="true" aria-labelledby="inward-title" ref={dialog}>
        <div className="modal-header">
          <div><span className="eyebrow">COIL STOCK / {coil ? 'EDIT ENTRY' : 'NEW ENTRY'}</span><h2 id="inward-title">{coil ? 'Edit coil inward' : 'Add coil inward'}</h2><p>Record the received material and invoice details.</p></div>
          <button className="icon-button modal-close" type="button" aria-label="Close form" onClick={onClose} disabled={mutation.isPending}><X size={21} /></button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div className="modal-body">
            <div className="form-section-heading"><span>01</span><strong>Documents</strong></div>
            <div className="form-grid">
              <Field label="Invoice number" name="invoice" value={form.invoice} onChange={update} ref={firstInput} />
              <label className="form-field"><span>Invoice date <i>*</i></span><div className="date-field"><input name="invoiceDate" type="date" value={form.invoiceDate} onChange={update} required /><CalendarDays size={17} /></div></label>
              <Field label="TC number (optional)" name="tcNumber" value={form.tcNumber} onChange={update} optional />
              <Field label="Vendor code" name="vendorCode" value={form.vendorCode} onChange={update} />
            </div>
            <div className="form-section-heading second"><span>02</span><strong>{coil ? 'Material & quantity' : 'Coil line 1 · material & quantity'}</strong></div>
            <div className="form-grid">
              <label className="form-field"><span>Material type <i>*</i></span><select name="materialType" value={form.materialType} onChange={update} disabled={materialsQuery.isPending || materialsQuery.isError} required><option value="">Select material type</option>{materials.map(material => <option key={material.key} value={material.key}>{material.label}</option>)}</select></label>
              {form.materialType === 'GP' ?
                <Field label="GSM (80–140)" name="grade" value={form.grade} onChange={update} type="number" min={selectedMaterial?.min || 80} max={selectedMaterial?.max || 140} step="1" /> :
                <label className="form-field"><span>Grade <i>*</i></span><select name="grade" value={form.grade} onChange={update} disabled={!form.materialType} required><option value="">{form.materialType ? 'Select grade' : 'Select material type first'}</option>{gradeOptions.map(grade => <option key={grade.id} value={grade.value}>{grade.value}</option>)}</select></label>}
              <Field label="Coil size / width (mm)" name="widthMm" value={form.widthMm} onChange={update} type="number" step="0.001" min="0.001" />
              <Field label="Coil thickness (mm)" name="thicknessMm" value={form.thicknessMm} onChange={update} type="number" step="0.001" min="0.001" />
              <Field label="Coil Qty" name="coilQty" value={form.coilQty} onChange={update} type="number" step="1" min="1" />
              <Field label="Rate (₹ / kg)" name="ratePerKg" value={form.ratePerKg} onChange={update} type="number" step="0.01" min="0.01" max="99999999.99" optional={Boolean(coil)} disabled={Number(coil?.usedQty) > 0} />
              <Field label="Total weight (kg)" name="totalWeightKg" value={form.totalWeightKg} onChange={update} type="number" step="0.001" min="0.001" />
            </div>
            {!coil && <>
              {extraLines.map((line, index) => {
                const material = materials.find(item => item.key === line.materialType)
                return <section className="inward-line" key={index} aria-label={`Coil line ${index + 2}`}><div className="inward-line-heading"><strong>Coil line {index + 2}</strong><button className="outline-button" type="button" onClick={() => setExtraLines(previous => previous.filter((_, i) => i !== index))} disabled={mutation.isPending}><Trash2 size={15} /> Remove</button></div><div className="form-grid">
                  <label className="form-field"><span>Material type <i>*</i></span><select value={line.materialType} onChange={event => updateExtra(index, 'materialType', event.target.value)} required><option value="">Select material type</option>{materials.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                  {line.materialType === 'GP' ? <Field label="GSM (80–140)" value={line.grade} onChange={event => updateExtra(index, 'grade', event.target.value)} type="number" min={material?.min || 80} max={material?.max || 140} step="1" /> : <label className="form-field"><span>Grade <i>*</i></span><select value={line.grade} onChange={event => updateExtra(index, 'grade', event.target.value)} disabled={!line.materialType} required><option value="">Select grade</option>{(material?.grades || []).map(grade => <option key={grade.id} value={grade.value}>{grade.value}</option>)}</select></label>}
                  <Field label="Coil size / width (mm)" value={line.widthMm} onChange={event => updateExtra(index, 'widthMm', event.target.value)} type="number" step="0.001" min="0.001" />
                  <Field label="Coil thickness (mm)" value={line.thicknessMm} onChange={event => updateExtra(index, 'thicknessMm', event.target.value)} type="number" step="0.001" min="0.001" />
                  <Field label="Coil Qty" value={line.coilQty} onChange={event => updateExtra(index, 'coilQty', event.target.value)} type="number" step="1" min="1" />
                  <Field label="Rate (₹ / kg)" value={line.ratePerKg} onChange={event => updateExtra(index, 'ratePerKg', event.target.value)} type="number" step="0.01" min="0.01" max="99999999.99" />
                  <Field label="Total weight (kg)" value={line.totalWeightKg} onChange={event => updateExtra(index, 'totalWeightKg', event.target.value)} type="number" step="0.001" min="0.001" />
                </div></section>
              })}
              <button className="outline-button inward-add-line" type="button" onClick={() => setExtraLines(previous => [...previous, emptyLine()])} disabled={mutation.isPending || extraLines.length >= 49}><Plus size={16} /> Add another coil size</button>
              <div className="net-preview"><div><span>Invoice total across {extraLines.length + 1} coil {extraLines.length ? 'lines' : 'line'}</span><strong>{[form, ...extraLines].reduce((sum, line) => sum + (Number(line.coilQty) || 0), 0).toLocaleString('en-IN')} coils · {[form, ...extraLines].reduce((sum, line) => sum + (Number(line.totalWeightKg) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg</strong></div></div>
            </>}
            {materialsQuery.isPending && <LoadingIndicator label="Loading materials and grades…" />}
            {materialsQuery.isError && <div className="notice error" role="alert"><TriangleAlert size={18} /> Could not load materials and grades. <button type="button" onClick={() => materialsQuery.refetch()}>Retry</button></div>}
            {error && <div className="notice error" role="alert"><TriangleAlert size={18} /> {error}</div>}
          </div>
          <div className="modal-footer"><button className="outline-button" type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</button><button className="primary-button" type="submit" disabled={mutation.isPending || !materialsQuery.isSuccess}><Save size={17} /> {mutation.isPending ? <LoadingIndicator label="Saving…" inline /> : coil ? 'Save changes' : 'Save coil inward'}</button></div>
        </form>
      </div>
    </div>
  )
}

