import { FileText } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHistoryHoleChecks } from '../api/productionApi';
import LoadingIndicator from '../../components/LoadingIndicator';
import HoleInspectionCards from './HoleInspectionCards';
import { formatDate, formatDateTime } from '../utils/dateTime';

const headings = [
  'Details', 'Machine', 'Inspection time', 'Type', 'Job card / member', 'Coil ID',
  'Cut length (mm)', 'Section (mm)', 'Checked by', 'Rejected pieces', 'Remarks',
];

export default function HistoryHoleChecks({ date, shift = 'all', machineId = '', onGenerate, generating }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const report = useQuery({
    queryKey: ['unit1-hole-reports', 'history', date, shift, machineId, page],
    queryFn: () => getHistoryHoleChecks(date, page, { shift, machineId }),
    refetchInterval: 10000,
  });
  const data = report.data;
  return (
    <div className="u1-history-results">
      <div className="table-toolbar">
        <div>
          <strong>Inspections</strong>
          <p className="u1-history-caption">{formatDate(date)} · {shift === 'all' ? 'All shifts' : shift === 'day' ? 'Day shift' : 'Night shift'}{data ? ' · ' + data.total + ' inspections' : ''}</p>
        </div>
        <div className="u1-history-actions">
          <button className="primary-button" type="button" onClick={onGenerate} disabled={generating || !data?.total || report.isFetching}>
            <FileText size={16} />{generating ? 'Creating…' : 'Generate PDF'}
          </button>
        </div>
      </div>
      {report.isPending && <LoadingIndicator label="Loading inspections…" />}
      {report.isError && (
        <div className="notice error" role="alert">
          {report.error?.response?.data?.error || report.error?.message}
          <button className="text-link" type="button" onClick={() => report.refetch()}>Retry</button>
        </div>
      )}
      {data?.checks.length > 0 && (
        <div className="table-scroll u1-history-table" tabIndex={0} role="region" aria-label="Inspection records table">
          <table>
            <thead>
              <tr>{headings.map(heading => <th scope="col" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {data.checks.map(check => (
                <tr key={check.id}>
                  <td><button type="button" className="job-link-button" onClick={() => setSelected(check)}>View inspection</button></td>
                  <td>{check.machineName || '—'}</td>
                  <td>{formatDateTime(check.checkedAt)}</td>
                  <td>{check.entryKind === 'rejection' ? 'Rejection' : check.checkType === 'first_piece' ? 'First piece' : 'Recheck'}</td>
                  <td>U1-JC-{check.jobCardId}{check.memberName && <small>{check.memberName}</small>}</td>
                  <td>{check.coilInternalId || '—'}</td>
                  <td>{check.measuredCutLengthMm ?? 'Not recorded'}<small>Target {check.cutLengthMm ?? '—'}</small></td>
                  <td>{check.measuredSectionSize || 'Not recorded'}<small>Target {check.sectionSize || '—'}</small></td>
                  <td>{check.checkedByName || '—'}</td>
                  <td>{check.rejectedPieces ?? 'Not recorded'}</td>
                  <td>{check.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.checks.length === 0 && <p className="u1-history-empty">No inspections match these filters.</p>}
      {data && data.total > data.pageSize && (
        <nav className="u1-history-pagination" aria-label="History inspection pages">
          <button className="outline-button" type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(data.total / data.pageSize)}</span>
          <button className="outline-button" type="button" disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Next</button>
        </nav>
      )}
      {selected && (
        <div className="modal-backdrop u1-production-backdrop">
          <div className="inward-modal u1-production-dialog" role="dialog" aria-modal="true" aria-label="Inspection details">
            <div className="modal-header">
              <h2>Inspection #{selected.id}</h2>
              <button type="button" className="modal-close" aria-label="Close inspection" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body"><HoleInspectionCards checks={[selected]} showMachine /></div>
          </div>
        </div>
      )}
    </div>
  );
}
