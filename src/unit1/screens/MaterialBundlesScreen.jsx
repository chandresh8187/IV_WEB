import {useState} from 'react';
import {useSearchParams,Link} from 'react-router';
import {useQuery} from '@tanstack/react-query';
import {useSelector} from 'react-redux';
import {QrCode} from 'lucide-react';
import {getMaterialBundles} from '../api/materialRegisterApi';
import {hasAccess} from '../utils/access';
import {formatDateTime} from '../utils/dateTime';
import MaterialStockQr from '../components/MaterialStockQr';
import MaterialStockTrace from '../components/MaterialStockTrace';
import './CoilStockScreen.css';
const kg=v=>v==null?'Not recorded':Number(v).toFixed(3);
export default function MaterialBundlesScreen(){
 const [params]=useSearchParams(),key=params.get('stock');
 const allowed=useSelector(s=>hasAccess(s.auth.user,'unit1.material-stock.view'));
 const [bundleId,setBundleId]=useState(null),[traceOpen,setTraceOpen]=useState(false);
 const query=useQuery({queryKey:['unit1-material-bundles',key],queryFn:()=>getMaterialBundles(key),enabled:allowed&&!!key,refetchInterval:10000});
 const selected=query.data?.bundles.find(bundle=>bundle.id===bundleId);
 if(!allowed)return <p>Material stock access is required.</p>;
 return <section className="coil-register">
  <header className="coil-register-heading"><h1>Material bundles</h1><Link className="outline-button" to="/production/material-stock">Back to stock</Link></header>
  {query.isPending&&<p>Loading bundles…</p>}
  {query.isError&&<p role="alert" className="notice error">{query.error?.response?.data?.error||query.error?.message}</p>}
  {query.data&&<>
   <p>{query.data.stock.customerName} · {query.data.stock.memberName} · {query.data.stock.sectionSize} · {query.data.stock.lengthMm} mm</p>
   <div className="coil-register-panel"><div className="coil-register-table"><table><thead><tr>{['Bundle reference','Produced at','Coil QR','Produced (nos)','Dispatched (nos)','Available (nos)','Coil used (kg)','Hole scrap (kg)','Cut blade scrap (kg)','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead>
    <tbody>{query.data.bundles.map(r=><tr key={r.id}>
     <td>#{r.bundleNo} · Run {r.runId}</td><td>{formatDateTime(r.createdAt)}</td><td>{r.coilReference}</td><td>{r.quantity}</td><td>{r.dispatchedNos}</td><td>{r.availableNos}</td><td>{kg(r.usedKg)}</td><td>{kg(r.holeScrapKg)}</td><td>{kg(r.cutBladeScrapKg)}</td>
     <td><button type="button" className="outline-button stock-icon-button" title="Print bundle QR" aria-label="Print bundle QR" onClick={()=>setBundleId(r.id)}><QrCode size={17}/></button></td>
    </tr>)}</tbody></table></div><footer>{query.data.bundles.length} recorded production bundles</footer></div>
  </>}
  {selected&&<MaterialStockQr key={key+':'+selected.id} stock={query.data.stock} bundle={selected} onClose={()=>setBundleId(null)} onView={()=>{setBundleId(null);setTraceOpen(true);}}/>}
  {traceOpen&&<MaterialStockTrace stockKey={key} onClose={()=>setTraceOpen(false)}/>}
 </section>;
}
