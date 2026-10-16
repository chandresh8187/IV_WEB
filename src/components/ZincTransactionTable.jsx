import { formatDisplayDate, formatDisplayDateTime } from '../utils/dateTime';
const fmt = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const shiftLabel = value => value === 'day' ? 'Day' : value === 'night' ? 'Night' : value === 'unavailable' ? 'Unavailable' : '—';
const movementLabel = row => row.movement_type === 'production_summary' ? (Number(row.amount_kg) < 0 ? 'Production return (net)' : 'Production usage') : ({ receive: 'Zinc received in plant', transfer: 'Plant to kettle transfer', initialize: 'Opening balances', adjust: 'Stock correction' }[row.movement_type] || 'Stock movement');
export default function ZincTransactionTable({ rows = [] }) {
  return <><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Date</th><th>Shift</th><th>Transaction</th><th>Quantity</th><th>Rate / kg</th><th>Plant balance</th><th>Kettle balance</th><th>Batch / invoice allocation</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
    <td>{row.movement_type === 'production_summary' ? formatDisplayDate(row.transaction_date) : formatDisplayDateTime(row.created_at)}</td><td>{shiftLabel(row.shift_name)}</td><td>{movementLabel(row)}</td>
    <td>{['initialize', 'adjust'].includes(row.movement_type) ? 'Balances set' : `${fmt(Math.abs(Number(row.amount_kg)))} kg`}</td>
    <td>{row.zinc_rate_per_kg == null ? '—' : `₹${Number(row.zinc_rate_per_kg).toFixed(2)}`}</td>
    <td>{row.plant_after_kg == null ? '—' : `${fmt(row.plant_after_kg)} kg`}</td><td>{row.kettle_after_kg == null ? '—' : `${fmt(row.kettle_after_kg)} kg`}</td>
    <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', minWidth: 260 }}>
      {row.batch_number && <div>Batch: {row.batch_number}</div>}{row.invoice_number && <div>Invoice: {row.invoice_number}</div>}
      {row.movement_type !== 'receive' && (row.batch_allocations || []).map((batch, index) => <div key={batch.lot_key || index} style={{ padding: '6px 0' }}>
        <strong>{Number(batch.amount_kg) < 0 ? 'Returned' : row.movement_type === 'production_summary' ? 'Used' : 'Transferred'} {fmt(Math.abs(Number(batch.amount_kg)))} kg</strong>
        {batch.receipt_id != null ? <><div>Batch: {batch.batch_number || 'Not recorded'}</div><div>Invoice: {batch.invoice_number || 'Not recorded'}</div></> : <div>{batch.source_label || 'Unreferenced stock'}</div>}
      </div>)}
      {row.note && <div>{row.note}</div>}
      {row.shift_name === 'unavailable' && <small>Legacy record: shift unavailable; recorded date shown.</small>}
    </td>
  </tr>)}</tbody></table></div>{!rows.length && <div className="ops-empty">No zinc transactions recorded.</div>}</>;
}
