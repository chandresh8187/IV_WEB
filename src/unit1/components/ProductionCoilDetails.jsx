import {useEffect,useRef} from 'react';
import {useQuery} from '@tanstack/react-query';
import {X} from 'lucide-react';
import {getCoil,getPhysicalCoil} from '../api/coilApi';
import {formatCoilRate} from '../utils/coilRate';
import {formatDate} from '../utils/dateTime';
import LoadingIndicator from '../../components/LoadingIndicator';
export default function ProductionCoilDetails({selection,onClose}){
 const ref=useRef(null);
 const coil=useQuery({queryKey:['coil',selection.id,selection.number],queryFn:()=>selection.number?getPhysicalCoil(selection.id,selection.number):getCoil(selection.id)});
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
 const data=coil.data;
 const fields=data?[['Coil number',data.internalId],['Inward reference',data.inwardReference],['Material',data.materialType],['Size',data.widthMm+' × '+data.thicknessMm+' mm'],['Grade',data.grade],['Invoice',data.invoice],['Invoice date',formatDate(data.invoiceDate)],['Vendor',data.vendorCode],['TC number',data.tcNumber],['Rate',formatCoilRate(data.ratePerKg)],['Inward total weight',data.totalWeightKg==null?'Not recorded':data.totalWeightKg+' kg']]:[];
 return <dialog ref={ref} className="inward-modal u1-coil-details-dialog" aria-labelledby="live-coil-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><div className="modal-header"><h2 id="live-coil-title">Coil details{data?.internalId?' · '+data.internalId:''}</h2><button type="button" className="modal-close" aria-label="Close coil details" onClick={onClose}><X size={18}/></button></div><div className="modal-body">{coil.isPending&&<LoadingIndicator label="Loading coil details…"/>}{coil.isError&&<div role="alert" className="notice error"><p>{coil.error?.response?.data?.error||coil.error?.message}</p><button type="button" className="outline-button" onClick={()=>coil.refetch()}>Retry</button></div>}{data&&<div className="job-detail-grid">{fields.map(([label,value])=><span key={label}>{label}<strong>{value??'—'}</strong></span>)}</div>}</div></dialog>;
}
