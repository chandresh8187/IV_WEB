import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './RejectedPiecesForm.css';
import { rejectedCoilKg } from '../utils/rejectedCoilKg';

export default function RejectedPiecesForm({ run, job, mutation }) {
  const [length, setLength] = useState(''), [pieces, setPieces] = useState('');
  const [lines, setLines] = useState([]), [remarks, setRemarks] = useState(''), [error, setError] = useState('');
  const [requestKey] = useState(() => crypto.randomUUID());
  const total = lines.reduce((sum, line) => sum + line.pieces, 0);
  const coilKg = rejectedCoilKg(run, job, lines);
  const pendingDraft = Boolean(length || pieces);
  const add = () => {
    if (!/^\d+(?:\.\d{1,3})?$/.test(length) || Number(length) <= 0 || Number(length) > 1000000) return setError('Enter actual cut length above 0 and at most 1000000 mm, with up to three decimals.');
    if (!/^\d+$/.test(pieces) || Number(pieces) < 1 || total + Number(pieces) > 100000) return setError('Enter whole NOS; total rejected pieces must not exceed 100000.');
    if (lines.length >= 200) return setError('A maximum of 200 lines can be saved together.');
    setLines(current => [...current, { cutLengthMm: Number(length), pieces: Number(pieces) }]);
    setLength(''); setPieces(''); setError('');
  };
  const save = e => {
    e.preventDefault();
    if (!lines.length || pendingDraft || mutation.isPending) return;
    mutation.mutate({ id: run.id, measurements: [], entryKind: 'rejection', rejectedPieces: total, rejectedLines: lines, remarks, requestKey });
  };
  return <form className="u1-rejected-form" onSubmit={save}>
    <p className="u1-form-description">Add the actual cut length and NOS for each group of rejected pieces.</p>
    <div className="u1-rejected-inputs">
      <label>Rejected cut length (mm)<input inputMode="decimal" value={length} onChange={e => setLength(e.target.value)} disabled={mutation.isPending} placeholder="Actual length" /></label>
      <label>Total NOS<input inputMode="numeric" value={pieces} onChange={e => setPieces(e.target.value)} disabled={mutation.isPending} placeholder="Rejected quantity" /></label>
      <button type="button" className="outline-button" aria-label="Add rejected line" title="Add to list" onClick={add} disabled={mutation.isPending}><Plus size={20} /></button>
    </div>
    {lines.length > 0 && <div className="u1-rejected-list"><table><thead><tr><th>Cut length (mm)</th><th>NOS</th><th>Action</th></tr></thead><tbody>{lines.map((line, i) => <tr key={i}><td>{line.cutLengthMm}</td><td>{line.pieces}</td><td><button type="button" className="outline-button" aria-label={`Remove rejected line ${i + 1}`} onClick={() => setLines(current => current.filter((_, index) => index !== i))} disabled={mutation.isPending}><Trash2 size={18} /></button></td></tr>)}</tbody></table></div>}
    <strong>Total rejected: {total} NOS · Total rejected coil: {coilKg == null ? 'Unavailable' : `${coilKg.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`}</strong>
    {pendingDraft && <p className="u1-form-description">Click + to add the entered length and NOS before saving.</p>}
    <label>Remarks (optional)<textarea maxLength={1000} value={remarks} onChange={e => setRemarks(e.target.value)} disabled={mutation.isPending} /></label>
    <p className="u1-form-description">Coil usage uses these lengths, quantities and the assigned coil dimensions. Cut blade scrap is included. Hole scrap remains estimated from the job card.</p>
    {(error || mutation.error) && <p role="alert" className="notice error">{error || mutation.error?.response?.data?.error || mutation.error?.message}</p>}
    <button type="submit" className="primary-button" disabled={!lines.length || pendingDraft || mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save rejected pieces'}</button>
  </form>;
}
