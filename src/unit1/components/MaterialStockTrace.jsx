import {useQuery} from '@tanstack/react-query';
import {getMaterialTrace} from '../api/materialRegisterApi';
import WorkflowDialog from './WorkflowDialog';
import {formatDate,formatDateTime} from '../utils/dateTime';
import './MaterialStockTrace.css';
const kg=v=>v==null?'Not recorded':Number(v).toFixed(3)+' kg';
const fieldValue=f=>f.value==null?'—':f.key==='invoiceDate'?formatDate(f.value):f.key==='receivedAt'?formatDateTime(f.value):String(f.value);
export default function MaterialStockTrace({stockKey,onClose}){
 const trace=useQuery({queryKey:['unit1-material-trace',stockKey],queryFn:()=>getMaterialTrace(stockKey),refetchInterval:10000}),data=trace.data;
 return <WorkflowDialog title="Material details" className="material-trace-dialog" onClose={onClose}><div className="material-trace-content">{trace.isPending&&<p>Loading material…</p>}{trace.isError&&<p role="alert" className="notice error">{trace.error?.response?.data?.error||trace.error?.message}</p>}{data&&<><h3>{data.stock.customerName||'Party not recorded'}</h3><p>{data.stock.memberName} · {data.stock.sectionSize} · {data.stock.lengthMm} mm</p><p>Produced: {data.stock.producedNos} · Dispatched: {data.stock.dispatchedNos} · Available: {data.stock.availableNos} nos</p><p>Transfer in: {data.stock.transferredInNos||0} · Transfer out: {data.stock.transferredOutNos||0} nos</p>{data.originalParties?.length>0&&<p>Original production parties: {data.originalParties.join(', ')}</p>}<h3>Source coils ({data.sourceCoils.length})</h3><p>This shared QR shows all sources for this material. It does not identify the contents of an individual physical bundle.</p>{data.sourceCoils.map((s,i)=><article key={s.key}><h3>Source {i+1} · {s.reference||'QR not recorded'}</h3><dl>{[['Allocated quantity',s.producedNos+' nos'],['Coil used',kg(s.usedKg)],['Hole scrap',kg(s.holeScrapKg)],['Cut blade scrap',kg(s.cutBladeScrapKg)],...s.fields.map(f=>[f.label,fieldValue(f)]),['First production',formatDateTime(s.firstProducedAt)],['Last production',formatDateTime(s.lastProducedAt)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>)}</>}</div></WorkflowDialog>;
}
