import LoadingIndicator from "../../components/LoadingIndicator";
import { formatCoilRate } from '../utils/coilRate'
import { useQuery } from '@tanstack/react-query'
import { getCoil } from '../api/coilApi'

export default function ProductionCoilLink({ entry, canView, onView }) {
  const coil = useQuery({ queryKey: ['coil', entry.coilId], queryFn: () => getCoil(entry.coilId), enabled: Boolean(canView && entry.coilId), staleTime: 60000 })
  const width = entry.widthMm ?? entry.coilWidthMm ?? coil.data?.widthMm
  const thickness = entry.thicknessMm ?? entry.coilThicknessMm ?? coil.data?.thicknessMm
  const size = width && thickness ? `${width} × ${thickness} mm` : coil.isLoading ? <LoadingIndicator label="Loading size…" inline /> : 'Size unavailable'
  return <span>{canView ? <button className="job-link-button" type="button" onClick={() => onView(entry.coilId)}>{size}</button> : <span>{size}</span>}<small style={{ display: 'block', marginTop: 4 }}>{formatCoilRate(entry.coilRatePerKg ?? coil.data?.ratePerKg)}</small></span>
}
