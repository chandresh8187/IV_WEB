import InvoiceQrPrint from './InvoiceQrPrint';
import {Printer} from 'lucide-react';
import {useState} from 'react';
import {useSearchParams,Link} from 'react-router';
import {useSelector} from 'react-redux';
import {hasAccess} from '../utils/access';
import {useQuery} from '@tanstack/react-query';
import {getStockInvoices} from '../api/coilApi';
import '../screens/CoilStockScreen.css';
import {formatDateTime} from '../utils/dateTime';
const fmt=v=>v==null?'Pending':Number(v).toLocaleString('en-IN',{maximumFractionDigits:3});
export default function CoilStockInvoices(){
 const [params]=useSearchParams(),[search,setSearch]=useState(''),[printInward,setPrintInward]=useState(null),user=useSelector(s=>s.auth.user),allowed=hasAccess(user,'unit1.coils.view');
 const spec={widthMm:params.get('widthMm'),thicknessMm:params.get('thicknessMm'),materialType:params.get('materialType'),grade:params.get('grade')};spec.key=JSON.stringify([spec.widthMm,spec.thicknessMm,spec.materialType,spec.grade]);
 const valid=Number(spec.widthMm)>0&&Number(spec.thicknessMm)>0&&spec.materialType&&spec.grade;
 const query=useQuery({queryKey:['coils','invoices',spec.key],enabled:!!valid&&allowed,queryFn:()=>getStockInvoices(spec),refetchInterval:10000});
 const rows=(query.data||[]).filter(r=>[r.invoice,r.vendorCode,r.tcNumber,r.inwardReference].some(v=>String(v||'').toLowerCase().includes(search.trim().toLowerCase())));
 if(!allowed)return <p>Coil stock access is required.</p>;
 if(!valid)return <p>Select a stock size. <Link to="/coils">Back to stock</Link></p>;
 return <section className="coil-register"><header className="coil-register-heading"><h1>Stock invoices</h1><Link className="outline-button" to="/coils">Back to stock</Link></header><div className="coil-register-panel"><div className="coil-stock-form-panel"><p>{spec.widthMm} × {spec.thicknessMm} mm · {spec.materialType} · {spec.grade}</p><label className="form-field">Search invoices, vendor or TC number<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Invoice, vendor, TC or inward reference"/></label></div>{query.isPending&&<p>Loading invoices…</p>}{query.isError&&<p role="alert" className="notice error">{query.error?.response?.data?.error||query.error?.message}</p>}{query.isSuccess&&<div className="coil-register-table"><table><thead><tr>{['Invoice','TC number','Vendor','Received','Coil qty','Line weight (kg)','Rate / kg (₹)','Used (kg)','Available (kg)','Inward reference','Status','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.invoice||'—'}</td><td>{r.tcNumber||'—'}</td><td>{r.vendorCode||'—'}</td><td>{formatDateTime(r.receivedAt)}</td><td>{r.coilQty}</td><td>{fmt(r.totalWeightKg)}</td><td>₹{fmt(r.ratePerKg)}</td><td>{fmt(r.usedKg)}</td><td>{fmt(r.availableKg)}</td><td>{r.inwardReference}</td><td>{r.archivedAt?'Archived':'Recorded'}</td><td><button className="outline-button" title="Print QR" aria-label="Print QR" disabled={!!r.archivedAt} onClick={()=>setPrintInward(r)}><Printer size={17}/></button></td></tr>)}{!rows.length&&<tr><td colSpan={12}>{search?'No invoices match your search.':'No invoices found for this stock size.'}</td></tr>}</tbody></table></div>}{printInward&&<InvoiceQrPrint inward={printInward} onClose={()=>setPrintInward(null)}/>}<footer>{rows.length} invoices shown</footer></div></section>;
}
